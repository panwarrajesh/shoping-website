const bcrypt = require('bcryptjs');
const repo = require('./sellers.repository');
const authService = require('../auth/auth.service');
const { AppError } = require('../../utils/apiResponse');
const { encrypt, safeDecrypt } = require('../../utils/encryption');
const { uniqueSlug } = require('../../utils/slug');

const num = (v) => (v == null ? null : Number(v));

// Never returns raw bank account or PAN: only masked versions.
function toSellerView(s) {
  const zone = s.zones?.[0] || null;
  const v = s.verification;
  const account = safeDecrypt(s.bankAccountNumber);
  const pan = safeDecrypt(v?.panNumber);
  return {
    id: s.id, businessName: s.businessName, slug: s.slug, description: s.description, logoUrl: s.logoUrl,
    status: s.status, isVerified: s.isVerified, suspendedReason: s.suspendedReason,
    qualityScore: num(s.qualityScore), ratingAvg: num(s.ratingAvg), ratingCount: s.ratingCount, gstin: s.gstin,
    address: {
      addressLine: s.addressLine, area: s.location.area, city: s.location.city, state: s.location.state,
      pincode: s.location.pincode, latitude: num(s.latitude), longitude: num(s.longitude),
    },
    delivery: zone && {
      radiusKm: zone.radiusKm, deliveryCharge: num(zone.deliveryCharge), freeDeliveryAbove: num(zone.freeDeliveryAbove),
      codAvailable: zone.codAvailable, etaDays: zone.etaDays,
    },
    payout: { accountName: s.bankAccountName, accountLast4: account ? account.slice(-4) : null, ifsc: s.bankIfsc, upiId: s.upiId },
    verification: {
      status: v?.status || 'NOT_SUBMITTED', reviewNote: v?.reviewNote || null,
      panMasked: pan ? `******${pan.slice(6)}` : null, submittedAt: v?.submittedAt || null,
    },
    createdAt: s.createdAt,
  };
}

async function register(userId, d) {
  const user = await repo.findUser(userId);
  if (!user) throw new AppError('Account not found', 401);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot become sellers', 403);
  if (user.role === 'SELLER' || (await repo.findSellerByUser(userId))) {
    throw new AppError('You already have a seller account', 409, { code: 'SELLER_EXISTS' });
  }
  if (!user.mobileVerifiedAt) {
    throw new AppError('Please verify your mobile number before becoming a seller', 403, { code: 'MOBILE_NOT_VERIFIED' });
  }

  const input = {
    userId,
    loc: { state: d.state, city: d.city, area: d.area || '', pincode: d.pincode, latitude: d.latitude ?? null, longitude: d.longitude ?? null },
    zone: {
      radiusKm: d.radiusKm, deliveryCharge: d.deliveryCharge, freeDeliveryAbove: d.freeDeliveryAbove ?? null,
      codAvailable: d.codAvailable, etaDays: d.etaDays,
    },
    verification: { status: 'PENDING', panNumber: encrypt(d.panNumber), submittedAt: new Date() },
  };
  const profile = {
    businessName: d.businessName, description: d.description || null, addressLine: d.addressLine,
    defaultRadiusKm: d.radiusKm, status: 'PENDING', gstin: d.gstin || null,
    bankAccountName: d.accountName, bankAccountNumber: encrypt(d.accountNumber), bankIfsc: d.ifsc, upiId: d.upiId || null,
  };

  let seller = null;
  for (let i = 0; i < 5 && !seller; i += 1) {
    try {
      seller = await repo.createSeller({ ...input, profile: { ...profile, slug: uniqueSlug(d.businessName) } });
    } catch (e) {
      if (e.code !== 'P2002') throw e;
      if (!String(e.meta?.target).includes('slug')) throw new AppError('You already have a seller account', 409, { code: 'SELLER_EXISTS' });
    }
  }
  if (!seller) throw new Error('Could not generate a unique seller slug');
  return { seller: toSellerView(seller), user: authService.publicUser({ ...user, role: 'SELLER' }) };
}

async function updateProfile(seller, d) {
  const patch = {};
  if (d.businessName !== undefined) patch.businessName = d.businessName;
  if (d.description !== undefined) patch.description = d.description || null;
  if (d.addressLine !== undefined) patch.addressLine = d.addressLine;
  if (d.gstin !== undefined) patch.gstin = d.gstin || null;
  if (d.latitude !== undefined) patch.latitude = d.latitude;
  if (d.longitude !== undefined) patch.longitude = d.longitude;

  let loc = null;
  if (['state', 'city', 'area', 'pincode'].some((k) => d[k] !== undefined)) {
    const cur = seller.location;
    loc = {
      state: d.state ?? cur.state, city: d.city ?? cur.city, area: (d.area ?? cur.area) || '', pincode: d.pincode ?? cur.pincode,
      latitude: d.latitude !== undefined ? d.latitude : num(seller.latitude), longitude: d.longitude !== undefined ? d.longitude : num(seller.longitude),
    };
  }
  return toSellerView(await repo.updateSeller(seller.id, patch, loc));
}

async function updateDelivery(seller, d) {
  return toSellerView(await repo.saveZone(seller, {
    radiusKm: d.radiusKm, deliveryCharge: d.deliveryCharge, freeDeliveryAbove: d.freeDeliveryAbove ?? null,
    codAvailable: d.codAvailable, etaDays: d.etaDays,
  }));
}

// Bank details decide where the money goes, so changing them needs the account password again.
async function updatePayout(seller, d) {
  const user = await repo.findUser(seller.userId);
  if (!user?.passwordHash) {
    throw new AppError('Please set a password first (Login page > Forgot password), then change payout details.', 400, { code: 'NO_PASSWORD' });
  }
  if (!(await bcrypt.compare(d.password, user.passwordHash))) {
    throw new AppError('Password is incorrect', 400, { code: 'BAD_PASSWORD' });
  }
  return toSellerView(await repo.updatePayout(seller.id, {
    bankAccountName: d.accountName, bankAccountNumber: encrypt(d.accountNumber), bankIfsc: d.ifsc, upiId: d.upiId || null,
  }));
}

async function resubmitKyc(seller, d) {
  const status = seller.verification?.status || 'NOT_SUBMITTED';
  if (!['NOT_SUBMITTED', 'REJECTED'].includes(status)) {
    throw new AppError(status === 'VERIFIED' ? 'Your KYC is already verified' : 'Your KYC is already under review', 400);
  }
  await repo.upsertVerification(seller.id, { status: 'PENDING', panNumber: encrypt(d.panNumber), submittedAt: new Date(), reviewNote: null });
  return toSellerView(await repo.findSellerById(seller.id));
}

async function getMe(seller) {
  return toSellerView(seller);
}

const dashboard = (seller) => repo.dashboardStats(seller.id);

async function publicProfile(slug) {
  const s = await repo.findApprovedBySlug(slug);
  if (!s) throw new AppError('Seller not found', 404);
  return {
    businessName: s.businessName, slug: s.slug, logoUrl: s.logoUrl, description: s.description, isVerified: s.isVerified,
    ratingAvg: num(s.ratingAvg), ratingCount: s.ratingCount, city: s.location.city, state: s.location.state,
  };
}

module.exports = { toSellerView, register, updateProfile, updateDelivery, updatePayout, resubmitKyc, getMe, dashboard, publicProfile };
