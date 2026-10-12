const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./orders.service');

exports.quote = asyncHandler(async (req, res) => success(res, await service.quote(req.user.id, req.query.addressId)));
exports.place = asyncHandler(async (req, res) => success(res, await service.placeOrder(req.user.id, req.body), 'Order place ho gaya', 201));
exports.listMine = asyncHandler(async (req, res) => success(res, await service.listMine(req.user.id, req.query)));
exports.getMine = asyncHandler(async (req, res) => success(res, { order: await service.getMine(req.user.id, req.params.id) }));
exports.cancelMine = asyncHandler(async (req, res) =>
  success(res, { order: await service.cancelMine(req.user.id, req.params.id, req.body.reason) }, 'Order cancel ho gaya'));

exports.listSeller = asyncHandler(async (req, res) => success(res, await service.listForSeller(req.seller, req.query)));
exports.getSeller = asyncHandler(async (req, res) => success(res, { order: await service.getForSeller(req.seller, req.params.id) }));
exports.setStatus = asyncHandler(async (req, res) =>
  success(res, { order: await service.setStatus(req.seller, req.params.id, req.body.status) }, 'Order status update ho gaya'));
exports.cancelSeller = asyncHandler(async (req, res) =>
  success(res, { order: await service.cancelForSeller(req.seller, req.params.id, req.body.reason) }, 'Order cancel ho gaya'));
