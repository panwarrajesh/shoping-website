const crypto = require('crypto');
const env = require('../../config/env');

const { keyId, keySecret, webhookSecret } = env.razorpay;
const configured = Boolean(keyId && keySecret);
const webhookConfigured = Boolean(webhookSecret);

let client = null;
const sdk = () => {
  if (!configured) throw new Error('Razorpay is not configured');
  if (!client) {
    const Razorpay = require('razorpay'); // loaded only when payments are really used
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
};

const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmacHex = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

// Checkout success proof: HMAC_SHA256(order_id + "|" + payment_id, key_secret). Only Razorpay (and we) know the secret.
const verifyPaymentSignature = (orderId, paymentId, signature) =>
  configured && safeEqualHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);

// Webhook proof: HMAC_SHA256(raw request body, webhook secret)
const verifyWebhookSignature = (rawBody, signature) =>
  webhookConfigured && Buffer.isBuffer(rawBody) && safeEqualHex(hmacHex(webhookSecret, rawBody), signature);

const createOrder = ({ amountPaise, receipt, notes }) =>
  sdk().orders.create({ amount: amountPaise, currency: 'INR', receipt, notes });
const fetchPayment = (paymentId) => sdk().payments.fetch(paymentId);
const capturePayment = (paymentId, amountPaise) => sdk().payments.capture(paymentId, amountPaise, 'INR');

module.exports = {
  configured, webhookConfigured, keyId, mode: keyId.startsWith('rzp_live') ? 'live' : 'test',
  verifyPaymentSignature, verifyWebhookSignature, createOrder, fetchPayment, capturePayment,
};
