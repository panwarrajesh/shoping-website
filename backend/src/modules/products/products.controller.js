const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./products.service');

exports.home = asyncHandler(async (req, res) => {
  // Cacheable only when the answer does not depend on the customer's location
  if (!Object.keys(req.query).length) res.set('Cache-Control', 'public, max-age=30');
  return success(res, await service.home(req.query));
});
exports.search = asyncHandler(async (req, res) => success(res, await service.search(req.query)));
exports.detail = asyncHandler(async (req, res) => success(res, { product: await service.getPublic(req.params.id, req.query) }));

exports.create = asyncHandler(async (req, res) =>
  success(res, { product: await service.create(req.seller, req.body) }, 'Product submitted for review', 201));
exports.update = asyncHandler(async (req, res) =>
  success(res, { product: await service.update(req.seller, req.params.id, req.body) }, 'Product updated'));
exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.seller, req.params.id);
  return success(res, {}, 'Product deleted');
});
exports.mine = asyncHandler(async (req, res) => success(res, await service.listMine(req.seller, req.query)));
exports.mineOne = asyncHandler(async (req, res) => success(res, { product: await service.getOwned(req.seller, req.params.id) }));
exports.inventory = asyncHandler(async (req, res) => success(res, await service.inventory(req.seller, req.query)));
exports.setStock = asyncHandler(async (req, res) =>
  success(res, await service.setStock(req.seller, req.params.variantId, req.body.quantity), 'Stock updated'));
