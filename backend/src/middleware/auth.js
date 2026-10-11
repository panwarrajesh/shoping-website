const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/apiResponse');
const { verifyAccessToken } = require('../utils/jwt');

const readToken = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

const load = async (token) => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Session expired. Please login again.', 401, { code: 'TOKEN_EXPIRED' });
  }
  // Role + status always come from the DB, never from the client. Suspended users are cut off immediately.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub }, select: { id: true, role: true, status: true, deletedAt: true },
  });
  if (!user || user.deletedAt) throw new AppError('Account not found', 401);
  if (user.status !== 'ACTIVE') throw new AppError('Your account is suspended. Please contact support.', 403);
  return { id: user.id, role: user.role };
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw new AppError('Please login to continue', 401);
  req.user = await load(token);
  next();
});

// For public routes that behave differently for logged-in users (e.g. wishlist hearts)
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try { req.user = await load(token); } catch { /* treat as guest */ }
  }
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this', 403));
  }
  return next();
};

module.exports = { authenticate, optionalAuth, authorize };
