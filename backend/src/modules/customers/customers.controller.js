const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { parsePage } = require('../../utils/pagination');
const service = require('./customers.service');

exports.getMe = asyncHandler(async (req, res) => success(res, await service.getMe(req.user.id)));

exports.updateProfile = asyncHandler(async (req, res) =>
  success(res, { user: await service.updateProfile(req.user.id, req.body) }, 'Profile updated'));

exports.changePassword = asyncHandler(async (req, res) => {
  const session = await service.changePassword(req.user.id, req.body, { userAgent: req.headers['user-agent'] });
  res.cookie('lm_rt', session.refreshToken, {
    httpOnly: true, secure: env.isProd || env.cookieSameSite === 'none', sameSite: env.cookieSameSite,
    path: '/api/auth', maxAge: env.refreshDays * 86400000,
  });
  return success(res, { user: session.user, accessToken: session.accessToken }, 'Password changed. Other devices were logged out.');
});

exports.listAddresses = asyncHandler(async (req, res) =>
  success(res, { addresses: await service.listAddresses(req.user.id) }));
exports.createAddress = asyncHandler(async (req, res) =>
  success(res, { address: await service.createAddress(req.user.id, req.body) }, 'Address saved', 201));
exports.updateAddress = asyncHandler(async (req, res) =>
  success(res, { address: await service.updateAddress(req.user.id, req.params.id, req.body) }, 'Address updated'));
exports.setDefaultAddress = asyncHandler(async (req, res) =>
  success(res, { address: await service.setDefaultAddress(req.user.id, req.params.id) }, 'Default address changed'));
exports.deleteAddress = asyncHandler(async (req, res) => {
  await service.deleteAddress(req.user.id, req.params.id);
  return success(res, {}, 'Address deleted');
});

exports.getWishlist = asyncHandler(async (req, res) =>
  success(res, await service.getWishlist(req.user.id, parsePage(req.query, 20, 50))));
exports.getWishlistIds = asyncHandler(async (req, res) =>
  success(res, { ids: await service.getWishlistIds(req.user.id) }));
exports.addToWishlist = asyncHandler(async (req, res) => {
  await service.addToWishlist(req.user.id, req.params.productId);
  return success(res, {}, 'Added to wishlist');
});
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  await service.removeFromWishlist(req.user.id, req.params.productId);
  return success(res, {}, 'Removed from wishlist');
});
