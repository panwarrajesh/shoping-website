const crypto = require('crypto');
const env = require('../config/env');

// Keyed hash: stolen DB rows (refresh tokens / OTPs) are useless without the server secret.
const hmac = (value) => crypto.createHmac('sha256', env.jwtRefreshSecret).update(String(value)).digest('hex');
const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { hmac, randomToken, safeEqual };
