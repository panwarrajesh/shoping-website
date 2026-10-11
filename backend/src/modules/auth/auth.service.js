const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../config/env');
const repo = require('./auth.repository');
const { AppError } = require('../../utils/apiResponse');
const { hmac, safeEqual, randomToken } = require('../../utils/crypto');
const { signAccessToken } = require('../../utils/jwt');
const { normalizeMobile } = require('../../utils/phone');
const { sendSms } = require('../../utils/sms');

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_HOURLY_CAP = 6;
const REUSE_GRACE_MS = 10 * 1000; // tolerate two tabs refreshing at the same moment
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12);

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, mobile: u.mobile, role: u.role,
  mobileVerified: Boolean(u.mobileVerifiedAt), createdAt: u.createdAt,
});

const assertActive = (user) => {
  if (user.status !== 'ACTIVE') throw new AppError('Your account is suspended. Please contact support.', 403);
};

// ---------- OTP ----------
async function sendOtp({ target, purpose, userId = null }) {
  const last = await repo.latestOtp(target, purpose);
  if (last) {
    const wait = OTP_RESEND_MS - (Date.now() - last.createdAt.getTime());
    if (wait > 0) throw new AppError(`Please wait ${Math.ceil(wait / 1000)} seconds before requesting a new OTP`, 429);
  }
  if ((await repo.countOtpsSince(target, new Date(Date.now() - 3600 * 1000))) >= OTP_HOURLY_CAP) {
    throw new AppError('Too many OTP requests. Please try again after some time.', 429);
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await repo.invalidateOtps(target, purpose);
  await repo.createOtp({
    userId, target, purpose,
    codeHash: hmac(`${target}:${purpose}:${code}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await sendSms(target, `${code} is your LocalMart OTP. Valid for 5 minutes. Do not share it with anyone.`);
  return { expiresInSec: OTP_TTL_MS / 1000, resendAfterSec: OTP_RESEND_MS / 1000, ...(env.exposeDevOtp ? { devOtp: code } : {}) };
}

async function verifyOtp(target, purpose, code) {
  const otp = await repo.latestActiveOtp(target, purpose);
  if (!otp) throw new AppError('OTP expired. Please request a new one.', 400, { code: 'OTP_EXPIRED' });
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError('Too many wrong attempts. Please request a new OTP.', 429, { code: 'OTP_LOCKED' });
  }
  if (!safeEqual(otp.codeHash, hmac(`${target}:${purpose}:${code}`))) {
    await repo.bumpOtpAttempts(otp.id);
    throw new AppError('Incorrect OTP. Please check and try again.', 400, { code: 'OTP_INVALID' });
  }
  if (!(await repo.consumeOtp(otp.id))) throw new AppError('OTP already used. Please request a new one.', 400);
}

// ---------- Sessions ----------
async function issueSession(user, meta = {}, { touchLogin = true } = {}) {
  const refreshToken = randomToken();
  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: hmac(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshDays * 86400000),
    userAgent: (meta.userAgent || '').slice(0, 255) || null,
  });
  if (touchLogin) await repo.updateUser(user.id, { lastLoginAt: new Date() });
  return { user: publicUser(user), accessToken: signAccessToken(user), refreshToken };
}

async function refresh(rawToken, meta) {
  const invalid = () => new AppError('Session expired. Please login again.', 401, { code: 'SESSION_EXPIRED' });
  if (!rawToken) throw invalid();
  const rec = await repo.findRefreshToken(hmac(rawToken));
  if (!rec) throw invalid();
  if (rec.revokedAt) {
    // A rotated token was presented again => possible theft. Kill every session of this user.
    if (Date.now() - rec.revokedAt.getTime() > REUSE_GRACE_MS) await repo.revokeAllRefreshTokens(rec.userId);
    throw invalid();
  }
  if (rec.expiresAt <= new Date()) throw invalid();
  if (rec.user.deletedAt || rec.user.status !== 'ACTIVE') throw invalid();
  if (!(await repo.revokeRefreshToken(rec.id))) throw invalid(); // rotation: old token dies on use
  return issueSession(rec.user, meta, { touchLogin: false });
}

async function logout(rawToken) {
  if (!rawToken) return;
  const rec = await repo.findRefreshToken(hmac(rawToken));
  if (rec && !rec.revokedAt) await repo.revokeRefreshToken(rec.id);
}

const logoutAll = (userId) => repo.revokeAllRefreshTokens(userId);

// ---------- Flows ----------
async function register({ name, mobile, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const byMobile = await repo.findUserByMobile(mobile);
  if (byMobile?.mobileVerifiedAt) {
    throw new AppError('This mobile number is already registered. Please login.', 409, { code: 'MOBILE_EXISTS' });
  }
  if (email) {
    const byEmail = await repo.findUserByEmail(email);
    if (byEmail && byEmail.id !== byMobile?.id) throw new AppError('This email is already registered.', 409, { code: 'EMAIL_EXISTS' });
  }
  let user = byMobile;
  if (user) {
    // Unverified earlier attempt: let the real owner re-claim it (prevents number squatting)
    user = await repo.updateUser(user.id, { name, email: email || null, passwordHash });
  } else {
    user = await repo.createCustomer({ name, mobile, email, passwordHash, mobileVerifiedAt: null });
  }
  const otp = await sendOtp({ target: mobile, purpose: 'REGISTER', userId: user.id });
  return { mobile, ...otp };
}

async function loginWithPassword({ identifier, password }, meta) {
  const mobile = identifier.includes('@') ? null : normalizeMobile(identifier);
  const user = identifier.includes('@')
    ? await repo.findUserByEmail(identifier.toLowerCase())
    : mobile ? await repo.findUserByMobile(mobile) : null;
  // Always run a bcrypt compare so response time does not reveal whether the account exists
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) throw new AppError('Incorrect mobile/email or password', 401, { code: 'BAD_CREDENTIALS' });
  assertActive(user);
  if (user.mobile && !user.mobileVerifiedAt) {
    await sendOtp({ target: user.mobile, purpose: 'REGISTER', userId: user.id }).catch(() => null);
    throw new AppError('Please verify your mobile number first. We sent you an OTP.', 403, { code: 'MOBILE_NOT_VERIFIED', mobile: user.mobile });
  }
  return issueSession(user, meta);
}

async function requestOtp({ mobile, purpose }) {
  const user = await repo.findUserByMobile(mobile);
  if (user) assertActive(user);
  if (purpose === 'REGISTER') {
    if (!user || user.mobileVerifiedAt) throw new AppError('Please register first.', 400);
  }
  if (purpose === 'RESET_PASSWORD' && !user) {
    // Do not reveal whether the number is registered
    return { expiresInSec: OTP_TTL_MS / 1000, resendAfterSec: OTP_RESEND_MS / 1000 };
  }
  return sendOtp({ target: mobile, purpose, userId: user?.id || null });
}

async function verifyOtpAndLogin({ mobile, otp, purpose }, meta) {
  await verifyOtp(mobile, purpose, otp);
  let user = await repo.findUserByMobile(mobile);
  if (purpose === 'REGISTER') {
    if (!user) throw new AppError('Account not found. Please register again.', 400);
  } else if (!user) {
    // First-time OTP login: create a customer account (name can be completed later in profile)
    user = await repo.createCustomer({ name: 'Customer', mobile, email: undefined, passwordHash: null, mobileVerifiedAt: new Date() });
  }
  assertActive(user);
  if (!user.mobileVerifiedAt) user = await repo.updateUser(user.id, { mobileVerifiedAt: new Date() });
  return issueSession(user, meta);
}

async function resetPassword({ mobile, otp, newPassword }) {
  await verifyOtp(mobile, 'RESET_PASSWORD', otp);
  const user = await repo.findUserByMobile(mobile);
  if (!user) throw new AppError('Account not found', 400);
  await repo.updateUser(user.id, { passwordHash: await bcrypt.hash(newPassword, 12), mobileVerifiedAt: user.mobileVerifiedAt || new Date() });
  await repo.revokeAllRefreshTokens(user.id); // log out every device after a password reset
}

async function me(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('Account not found', 401);
  return publicUser(user);
}

module.exports = { issueSession, publicUser, register, loginWithPassword, requestOtp, verifyOtpAndLogin, resetPassword, refresh, logout, logoutAll, me };
