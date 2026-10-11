const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./sellers.service');

exports.register = asyncHandler(async (req, res) =>
  success(res, await service.register(req.user.id, req.body), 'Seller account created. Verification is in progress.', 201));

exports.me = asyncHandler(async (req, res) => success(res, { seller: await service.getMe(req.seller) }));
exports.updateProfile = asyncHandler(async (req, res) =>
  success(res, { seller: await service.updateProfile(req.seller, req.body) }, 'Business details updated'));
exports.updateDelivery = asyncHandler(async (req, res) =>
  success(res, { seller: await service.updateDelivery(req.seller, req.body) }, 'Delivery settings updated'));
exports.updatePayout = asyncHandler(async (req, res) =>
  success(res, { seller: await service.updatePayout(req.seller, req.body) }, 'Payout details updated'));
exports.resubmitKyc = asyncHandler(async (req, res) =>
  success(res, { seller: await service.resubmitKyc(req.seller, req.body) }, 'KYC submitted for review'));
exports.dashboard = asyncHandler(async (req, res) => success(res, { stats: await service.dashboard(req.seller) }));
exports.publicProfile = asyncHandler(async (req, res) => success(res, { seller: await service.publicProfile(req.params.slug) }));
