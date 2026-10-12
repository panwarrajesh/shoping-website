const repo = require('./payments.repository');
const gateway = require('./razorpay');
const env = require('../../config/env');
const { AppError } = require('../../utils/apiResponse');
const { round2 } = require('../cart/pricing');

const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const expiresAt = (o) => new Date(new Date(o.createdAt).getTime() + env.paymentWindowMinutes * 60000);
const notConfigured = () => new AppError('Online payment abhi available nahi hai.', 503, { code: 'PAYMENTS_NOT_CONFIGURED' });

const config = () => ({ online: gateway.configured, keyId: gateway.configured ? gateway.keyId : null, mode: gateway.configured ? gateway.mode : null });

// Step 1: the server decides the amount (from our own orders) and creates the Razorpay order. The browser never sets a price.
async function createPayment(userId, orderIds) {
  if (!gateway.configured) throw notConfigured();
  const ids = [...new Set(orderIds)];
  let orders = await repo.ordersForUser(userId, ids);
  if (orders.length !== ids.length) throw new AppError('Order not found', 404);

  // If these orders were created in one checkout, pay for the whole checkout together
  const siblings = new Set(orders.flatMap((o) => o.payments.map((p) => p.gatewayOrderId)).filter(Boolean));
  for (const gid of siblings) {
    for (const s of await repo.ordersByGatewayOrder(gid)) if (s.userId === userId && !orders.some((o) => o.id === s.id)) orders.push(s);
  }
  const now = new Date();
  const payable = (o) => o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PENDING' && o.status === 'PENDING';
  const requested = orders.filter((o) => ids.includes(o.id));
  if (requested.some((o) => o.paymentStatus === 'PAID')) throw new AppError('Is order ka payment ho chuka hai', 409, { code: 'ALREADY_PAID' });
  if (!requested.every(payable)) throw new AppError('Is order ka payment ab nahi ho sakta', 409, { code: 'NOT_PAYABLE' });
  if (requested.some((o) => expiresAt(o) <= now)) throw new AppError('Payment ka time nikal gaya. Dobara order karo.', 409, { code: 'PAYMENT_EXPIRED' });
  orders = orders.filter((o) => payable(o) && expiresAt(o) > now);

  const total = round2(orders.reduce((t, o) => t + Number(o.total), 0));
  const amountPaise = toPaise(total);

  // Reuse the open Razorpay order when it covers exactly these orders (customer reopened the payment window)
  const gids = new Set(orders.flatMap((o) => o.payments.filter((p) => p.status === 'PENDING').map((p) => p.gatewayOrderId)));
  let gatewayOrderId = gids.size === 1 && !gids.has(null) ? [...gids][0] : null;
  if (gatewayOrderId) {
    const covered = await repo.ordersByGatewayOrder(gatewayOrderId);
    if (covered.length !== orders.length || !covered.every((c) => orders.some((o) => o.id === c.id))) gatewayOrderId = null;
  }
  if (!gatewayOrderId) {
    const rz = await gateway.createOrder({
      amountPaise, receipt: `LM-${orders[0].orderNumber}`.slice(0, 40),
      notes: { orders: orders.map((o) => o.orderNumber).join(',').slice(0, 250) },
    });
    gatewayOrderId = rz.id;
    await repo.attachGatewayOrder(orders.map((o) => o.id), gatewayOrderId);
  }

  const user = await repo.findUser(userId);
  return {
    keyId: gateway.keyId, gatewayOrderId, amount: amountPaise, currency: 'INR', orderIds: orders.map((o) => o.id),
    description: orders.length === 1 ? `Order ${orders[0].orderNumber}` : `${orders.length} orders`,
    prefill: { name: user?.name || undefined, contact: user?.mobile ? `+91${user.mobile}` : undefined, email: user?.email || undefined },
  };
}

// Shared by verify() and the webhook: check the amount against OUR records, then flip the orders to paid.
async function confirm({ gatewayOrderId, gatewayPaymentId, amountPaise, raw }) {
  const rows = await repo.paymentsByGatewayOrder(gatewayOrderId);
  if (!rows.length) return { matched: false };
  const expected = rows.reduce((t, r) => t + toPaise(r.amount), 0);
  if (amountPaise != null && amountPaise !== expected) {
    console.error(`[payments] AMOUNT MISMATCH gatewayOrder=${gatewayOrderId} paid=${amountPaise} expected=${expected}`);
    await repo.recordFailure(gatewayOrderId, `Amount mismatch (paid ${amountPaise}, expected ${expected})`, raw);
    return { matched: true, mismatch: true };
  }
  const r = await repo.markPaid({ gatewayOrderId, gatewayPaymentId, raw });
  return { matched: true, mismatch: false, ...r };
}

// Step 2: the browser reports success. Never believed on its own: signature first, then the gateway is asked.
async function verify(userId, { razorpay_order_id: gatewayOrderId, razorpay_payment_id: gatewayPaymentId, razorpay_signature: signature }) {
  if (!gateway.configured) throw notConfigured();
  if (!gateway.verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, signature)) {
    throw new AppError('Payment verify nahi ho paya', 400, { code: 'INVALID_SIGNATURE' });
  }
  const orders = await repo.ordersByGatewayOrder(gatewayOrderId);
  if (!orders.length || orders.some((o) => o.userId !== userId)) throw new AppError('Payment not found', 404);

  let amountPaise = null;
  try {
    let p = await gateway.fetchPayment(gatewayPaymentId);
    if (p.order_id !== gatewayOrderId) throw new AppError('Payment verify nahi ho paya', 400, { code: 'ORDER_MISMATCH' });
    if (p.status === 'authorized') p = await gateway.capturePayment(gatewayPaymentId, p.amount);
    if (p.status !== 'captured') return { status: 'PROCESSING' };
    amountPaise = p.amount;
  } catch (e) {
    if (e instanceof AppError) throw e;
    // Gateway lookup failed, but the signature already proves Razorpay confirmed this payment for this order.
    console.warn('[payments] could not fetch payment from Razorpay, using the verified signature only:', e.message);
  }

  const r = await confirm({ gatewayOrderId, gatewayPaymentId, amountPaise, raw: { source: 'verify', paymentId: gatewayPaymentId } });
  if (r.mismatch) throw new AppError('Payment amount match nahi hua. Support se baat karo.', 409, { code: 'AMOUNT_MISMATCH' });
  return { status: 'PAID', orderIds: orders.map((o) => o.id) };
}

// Step 3 (safety net): Razorpay tells us directly, even if the customer closed the app after paying.
async function handleWebhook(rawBody, signature) {
  if (!gateway.webhookConfigured) throw new AppError('Webhook not configured', 503);
  if (!gateway.verifyWebhookSignature(rawBody, signature)) throw new AppError('Invalid signature', 400);
  const evt = JSON.parse(rawBody.toString('utf8'));
  const pay = evt.payload?.payment?.entity;
  if (!pay?.order_id) return { handled: false };
  // Keep only what we need (no email/phone) in our database
  const raw = { event: evt.event, paymentId: pay.id, method: pay.method, status: pay.status, amount: pay.amount };

  if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
    const r = await confirm({ gatewayOrderId: pay.order_id, gatewayPaymentId: pay.id, amountPaise: pay.amount, raw });
    return { handled: true, ...r };
  }
  if (evt.event === 'payment.failed') {
    await repo.recordFailure(pay.order_id, pay.error_description || 'Payment fail hua', raw);
    return { handled: true };
  }
  return { handled: false };
}

module.exports = { config, createPayment, verify, handleWebhook, toPaise };
