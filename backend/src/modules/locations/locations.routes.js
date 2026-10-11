const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { success, AppError } = require('../../utils/apiResponse');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { validateQuery } = require('../../middleware/validateQuery');
const service = require('./locations.service');
const v = require('./locations.validation');

router.get('/search', validateQuery(v.searchQuery), asyncHandler(async (req, res) =>
  success(res, { locations: await service.search(req.query.q, req.query.limit) })));

router.get('/popular', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  return success(res, { locations: await service.popular() });
}));

router.get('/pincode/:pincode', asyncHandler(async (req, res) => {
  if (!/^[1-9]\d{5}$/.test(req.params.pincode)) throw new AppError('Enter a valid 6-digit pincode', 422);
  return success(res, { locations: await service.byPincode(req.params.pincode) });
}));

router.get('/reverse', validateQuery(v.reverseQuery), asyncHandler(async (req, res) =>
  success(res, await service.reverse(req.query.lat, req.query.lng))));

router.get('/serviceability', validateQuery(v.locationQuery), asyncHandler(async (req, res) =>
  success(res, await service.serviceability(req.query))));

// Saved location of the logged-in customer (so it follows them to another phone)
router.get('/me', authenticate, asyncHandler(async (req, res) => success(res, { location: await service.getMine(req.user.id) })));
router.put('/me', authenticate, validate(v.saveSchema), asyncHandler(async (req, res) =>
  success(res, { location: await service.saveMine(req.user.id, req.body.locationId) }, 'Location saved')));

module.exports = router;
