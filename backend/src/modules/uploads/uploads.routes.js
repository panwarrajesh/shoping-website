const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../../utils/asyncHandler');
const { success, failure, AppError } = require('../../utils/apiResponse');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireSeller, requireApprovedSeller } = require('../../middleware/seller');
const { imageUpload, videoUpload } = require('../../middleware/upload');
const sellersRepo = require('../sellers/sellers.repository');
const service = require('./uploads.service');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => failure(res, 'Too many uploads. Please wait a few minutes.', 429),
});
const sellerOnly = [authenticate, authorize('SELLER'), requireSeller, limiter];
const needFile = (req) => { if (!req.file) throw new AppError('Please choose a file', 400); return req.file.buffer; };

// Files are stored under the seller's own folder; products validate this prefix when saving.
router.post('/product-image', ...sellerOnly, requireApprovedSeller, imageUpload, asyncHandler(async (req, res) =>
  success(res, await service.uploadImage(needFile(req), `localmart/products/${req.seller.id}`), 'Photo uploaded', 201)));

router.post('/product-video', ...sellerOnly, requireApprovedSeller, videoUpload, asyncHandler(async (req, res) =>
  success(res, await service.uploadVideo(needFile(req), `localmart/products/${req.seller.id}/video`), 'Video uploaded', 201)));

// Logo can be set even while approval is pending
router.put('/seller-logo', ...sellerOnly, imageUpload, asyncHandler(async (req, res) => {
  const img = await service.uploadImage(needFile(req), `localmart/sellers/${req.seller.id}`);
  const old = req.seller.logoPublicId;
  await sellersRepo.updateSeller(req.seller.id, { logoUrl: img.url, logoPublicId: img.publicId });
  if (old) service.destroy(old);
  return success(res, { logoUrl: img.url }, 'Logo updated');
}));

module.exports = router;
