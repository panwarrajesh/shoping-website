const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./categories.service');

router.get('/', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  return success(res, { categories: await service.getTree() });
}));

module.exports = router;
