require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Secrets must exist. In production they must also be long and not the sample values.
const secret = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env variable: ${key}`);
  if (isProd && (v.length < 32 || /change_me/i.test(v))) {
    throw new Error(`${key} must be a long random value (32+ chars) in production`);
  }
  return v;
};

const smsProvider = process.env.SMS_PROVIDER || 'console';
if (isProd && smsProvider === 'console') {
  throw new Error('SMS_PROVIDER=console is not allowed in production. Configure a real SMS provider.');
}

// 32-byte key (64 hex chars) used to encrypt bank account + PAN numbers in the database
const encryptionKey = process.env.ENCRYPTION_KEY || '';
if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters. Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

module.exports = {
  encryptionKey,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  // An online order that is not paid within this time is cancelled and its stock is released
  paymentWindowMinutes: Number(process.env.PAYMENT_WINDOW_MINUTES) > 0 ? Number(process.env.PAYMENT_WINDOW_MINUTES) : 30,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  nodeEnv,
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtAccessSecret: secret('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET'), // also used as HMAC key for stored token/OTP hashes
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS) || 30,
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax', // 'lax' | 'strict' | 'none'
  smsProvider,
  // Days after delivery before a seller's money becomes payable (return window)
  settlementHoldDays: Number(process.env.SETTLEMENT_HOLD_DAYS) >= 0 && process.env.SETTLEMENT_HOLD_DAYS !== undefined ? Number(process.env.SETTLEMENT_HOLD_DAYS) : 7,
  exposeDevOtp: !isProd && smsProvider === 'console', // dev only: OTP is echoed in API response
};
