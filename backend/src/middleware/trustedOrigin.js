const env = require('../config/env');
const { AppError } = require('../utils/apiResponse');

// CSRF defence for cookie-based endpoints (refresh/logout): browsers always send Origin on POST.
module.exports = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== env.clientUrl) return next(new AppError('Request blocked', 403));
  return next();
};
