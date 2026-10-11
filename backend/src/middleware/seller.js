const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/apiResponse');
const repo = require('../modules/sellers/sellers.repository');

// Loads the logged-in user's seller profile into req.seller (any status)
const requireSeller = asyncHandler(async (req, res, next) => {
  const seller = await repo.findSellerByUser(req.user.id);
  if (!seller) throw new AppError('Seller account not found', 403, { code: 'NOT_A_SELLER' });
  req.seller = seller;
  next();
});

const messages = {
  PENDING: 'Your seller account is waiting for approval. You can add products once it is approved.',
  REJECTED: 'Your seller application was rejected. Please check your KYC details.',
  SUSPENDED: 'Your seller account is suspended. Please contact support.',
};

// Use on anything that lists products or takes orders
const requireApprovedSeller = (req, res, next) =>
  req.seller?.status === 'APPROVED'
    ? next()
    : next(new AppError(messages[req.seller?.status] || 'Seller account not approved', 403, { code: 'SELLER_NOT_APPROVED' }));

module.exports = { requireSeller, requireApprovedSeller };
