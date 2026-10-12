const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./cart.service');

exports.get = asyncHandler(async (req, res) => success(res, { cart: await service.getCart(req.user.id, req.query) }));
exports.count = asyncHandler(async (req, res) => success(res, { count: await service.count(req.user.id) }));

exports.add = asyncHandler(async (req, res) => {
  const { cart, notice } = await service.add(req.user.id, req.body, req.query);
  return success(res, { cart, notice }, notice || 'Added to cart', 201);
});
exports.setQuantity = asyncHandler(async (req, res) =>
  success(res, { cart: await service.setQuantity(req.user.id, req.params.itemId, req.body.quantity, req.query) }, 'Cart updated'));
exports.remove = asyncHandler(async (req, res) =>
  success(res, { cart: await service.removeItem(req.user.id, req.params.itemId, req.query) }, 'Removed from cart'));
exports.clear = asyncHandler(async (req, res) => success(res, { cart: await service.clearCart(req.user.id) }, 'Cart cleared'));

exports.merge = asyncHandler(async (req, res) => {
  const { cart, skipped } = await service.merge(req.user.id, req.body.items, req.query);
  return success(res, { cart, skipped }, 'Cart merged');
});
exports.preview = asyncHandler(async (req, res) => success(res, { cart: await service.preview(req.body.items, req.query) }));
