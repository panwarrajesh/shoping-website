const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./payments.service');

exports.config = asyncHandler(async (req, res) => success(res, service.config()));
exports.create = asyncHandler(async (req, res) => success(res, await service.createPayment(req.user.id, req.body.orderIds), 'Payment ready'));
exports.verify = asyncHandler(async (req, res) => {
  const r = await service.verify(req.user.id, req.body);
  return success(res, r, r.status === 'PAID' ? 'Payment ho gaya' : 'Payment process ho raha hai');
});

// Razorpay retries on any non-2xx, so: 200 once we have handled it, 4xx for a bad signature, 5xx only for real failures
exports.webhook = asyncHandler(async (req, res) => {
  await service.handleWebhook(req.rawBody, req.headers['x-razorpay-signature']);
  return success(res, {}, 'ok');
});
