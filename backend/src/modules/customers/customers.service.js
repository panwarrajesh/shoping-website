const bcrypt = require('bcryptjs');
const repo = require('./customers.repository');
const authRepo = require('../auth/auth.repository');
const authService = require('../auth/auth.service');
const notifRepo = require('../notifications/notifications.repository');
const { AppError } = require('../../utils/apiResponse');
const { pageMeta } = require('../../utils/pagination');
const { toProductCard } = require('../../utils/productCard');

const mustFindUser = async (id) => {
  const user = await repo.findUser(id);
  if (!user) throw new AppError('Account not found', 401);
  return user;
};

// ---------- profile ----------
async function getMe(userId) {
  const user = await mustFindUser(userId);
  const [wishlistCount, unreadNotifications, addressCount] = await Promise.all([
    repo.countWishlist(userId), notifRepo.countUnread(userId), repo.countAddresses(userId),
  ]);
  return { user: authService.publicUser(user), stats: { wishlistCount, unreadNotifications, addressCount } };
}

async function updateProfile(userId, data) {
  const user = await mustFindUser(userId);
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.email !== undefined && data.email !== user.email) {
    if (data.email) {
      const taken = await repo.findUserByEmail(data.email);
      if (taken && taken.id !== userId) throw new AppError('This email is already used by another account.', 409, { code: 'EMAIL_EXISTS' });
    }
    patch.email = data.email;
    patch.emailVerifiedAt = null; // a changed email is unverified again
  }
  if (!Object.keys(patch).length) return authService.publicUser(user);
  return authService.publicUser(await repo.updateUser(userId, patch));
}

async function changePassword(userId, { currentPassword, newPassword }, meta) {
  const user = await mustFindUser(userId);
  if (!user.passwordHash) {
    throw new AppError('You have no password yet. Use "Forgot password" on the login page to set one with an OTP.', 400, { code: 'NO_PASSWORD' });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400, { code: 'BAD_CURRENT_PASSWORD' });
  }
  if (currentPassword === newPassword) throw new AppError('New password must be different from the current one', 422);
  await repo.updateUser(userId, { passwordHash: await bcrypt.hash(newPassword, 12) });
  await authRepo.revokeAllRefreshTokens(userId); // every other device is logged out
  return authService.issueSession(user, meta, { touchLogin: false }); // this device stays logged in
}

// ---------- addresses ----------
const cleanOptional = (d) => {
  const out = { ...d };
  ['line2', 'landmark'].forEach((k) => { if (k in out) out[k] = out[k] || null; });
  return out;
};

async function listAddresses(userId) {
  return repo.listAddresses(userId);
}

async function createAddress(userId, data) {
  if ((await repo.countAddresses(userId)) >= repo.MAX_ADDRESSES) {
    throw new AppError(`You can save up to ${repo.MAX_ADDRESSES} addresses. Please delete an old one.`, 400);
  }
  return repo.createAddress(userId, cleanOptional(data));
}

async function updateAddress(userId, id, data) {
  const updated = await repo.updateAddress(id, userId, cleanOptional(data));
  if (!updated) throw new AppError('Address not found', 404);
  return updated;
}

async function setDefaultAddress(userId, id) {
  const updated = await repo.setDefaultAddress(id, userId);
  if (!updated) throw new AppError('Address not found', 404);
  return updated;
}

async function deleteAddress(userId, id) {
  if (!(await repo.deleteAddress(id, userId))) throw new AppError('Address not found', 404);
}

// ---------- wishlist ----------
async function getWishlist(userId, { page, limit, skip }) {
  const [rows, total] = await Promise.all([repo.listWishlist(userId, skip, limit), repo.countWishlist(userId)]);
  return { items: rows.map((w) => toProductCard(w.product)), pagination: pageMeta(total, page, limit) };
}

async function addToWishlist(userId, productId) {
  if (!(await repo.findLiveProduct(productId))) throw new AppError('Product not found', 404);
  await repo.addWishlist(userId, productId);
}

const removeFromWishlist = (userId, productId) => repo.removeWishlist(userId, productId);
const getWishlistIds = (userId) => repo.wishlistIds(userId);

module.exports = {
  getMe, updateProfile, changePassword,
  listAddresses, createAddress, updateAddress, setDefaultAddress, deleteAddress,
  getWishlist, addToWishlist, removeFromWishlist, getWishlistIds,
};
