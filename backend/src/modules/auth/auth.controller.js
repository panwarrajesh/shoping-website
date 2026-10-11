const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./auth.service');

const COOKIE = 'lm_rt';
const cookieOpts = {
  httpOnly: true, // JavaScript can never read the refresh token (XSS safe)
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/api/auth',
};
const setCookie = (res, token) => res.cookie(COOKIE, token, { ...cookieOpts, maxAge: env.refreshDays * 86400000 });
const clearCookie = (res) => res.clearCookie(COOKIE, cookieOpts);
const meta = (req) => ({ userAgent: req.headers['user-agent'] });

// Sends the access token in the body and the refresh token ONLY in the httpOnly cookie
const sendSession = (res, session, message, status = 200) => {
  setCookie(res, session.refreshToken);
  return success(res, { user: session.user, accessToken: session.accessToken }, message, status);
};

exports.register = asyncHandler(async (req, res) =>
  success(res, await service.register(req.body), 'OTP sent to your mobile number', 201));

exports.login = asyncHandler(async (req, res) =>
  sendSession(res, await service.loginWithPassword(req.body, meta(req)), 'Login successful'));

exports.sendOtp = asyncHandler(async (req, res) =>
  success(res, await service.requestOtp(req.body), 'OTP sent'));

exports.verifyOtp = asyncHandler(async (req, res) =>
  sendSession(res, await service.verifyOtpAndLogin(req.body, meta(req)), 'Verified successfully'));

exports.resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body);
  clearCookie(res);
  return success(res, {}, 'Password changed. Please login with your new password.');
});

exports.refresh = asyncHandler(async (req, res) => {
  try {
    return sendSession(res, await service.refresh(req.cookies[COOKIE], meta(req)), 'Session refreshed');
  } catch (e) {
    clearCookie(res);
    throw e;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  await service.logout(req.cookies[COOKIE]);
  clearCookie(res);
  return success(res, {}, 'Logged out');
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await service.logoutAll(req.user.id);
  clearCookie(res);
  return success(res, {}, 'Logged out from all devices');
});

exports.me = asyncHandler(async (req, res) => success(res, { user: await service.me(req.user.id) }));
