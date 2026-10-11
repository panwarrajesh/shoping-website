const rateLimit = require('express-rate-limit');
const { failure } = require('../utils/apiResponse');

const make = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => failure(res, message, 429),
});

module.exports = {
  authLimiter: make(25, 'Too many attempts. Please try again after 15 minutes.'),
  otpLimiter: make(10, 'Too many OTP requests. Please try again after 15 minutes.'),
};
