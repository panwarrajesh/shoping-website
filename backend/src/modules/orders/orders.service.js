const crypto = require('crypto');
const repo = require('./orders.repository');
const cartRepo = require('../cart/cart.repository');
const cartService = require('../cart/cart.service');
const commissions = require('../commissions/commissions.service');
const serviceArea = require('../locations/serviceArea');
const { AppError } = require('../../utils/apiResponse');
const { pageMeta } = require('../../utils/pagination');
const { transformUrl } = require('../../utils/media');
const { round2 } = require('../cart/pricing');
const { SELLER_NEXT, CANCELLABLE, buildTimeline } = require('./orders.transitions');
const gateway = require('../payments/razorpay');
const env = require('../../config/env');

const num = (v) => (v == null ? null : Number(v));
const ISSUE_MSG = {
  UNAVAILABLE: 'Cart mein ek product ab available nahi hai',
  OUT_OF_STOCK: 'Cart mein ek product ka stock khatam ho gaya',
  LOW_STOCK: 'Cart mein ek product ka stock kam hai',
  NOT_DELIVERABLE: 'Cart ke kuch products is address par deliver nahi hote',
  OWN_PRODUCT: 'Aap apna hi product nahi khareed sakte',
};

const addressView = (a) => ({
  fullName: a.fullName, mobile: a.mobile, line1: a.line1, line2: a.line2, landmark: a.landmark,
  city: a.city, state: a.state, pincode: a.pincode, latitude: num(a.latitude), longitude: num(a.longitude),
});
// Delivery eligibility is decided by the DELIVERY ADDRESS, not by the area picked on the home page
const addressLocation = (a) => ({
  ...(a.latitude != null && a.longitude != null ? { lat: Number(a.latitude), lng: Number(a.longitude) } : {}),
  pincode: a.pincode, city: a.city,
});

const orderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easy to read out over the phone
  return `LM${ymd}${Array.from(crypto.randomBytes(6)).map((b) => chars[b % chars.length]).join('')}`;
};

// ---------- checkout ----------
async function loadCart(userId, address) {
  const cart = await cartRepo.getOrCreateCart(userId);
  const lines = await cartRepo.getItems(cart.id);
  const area = await serviceArea.resolve(addressLocation(address));
  return { lines, area, view: cartService.buildView(lines, { userId, area }) };
}

async function quote(userId, addressId) {
  const address = await repo.findAddress(addressId, userId);
  if (!address) throw new AppError('Address not found', 404);
  const { view } = await loadCart(userId, address);
  return { cart: view, address: addressView(address) };
}

async function placeOrder(userId, { addressId, paymentMethod }) {
  if (paymentMethod === 'ONLINE' && !gateway.configured) throw new AppError('Online payment abhi available nahi hai. Cash on Delivery chuno.', 400, { code: 'ONLINE_NOT_AVAILABLE' });
  const address = await repo.findAddress(addressId, userId);
  if (!address) throw new AppError('Address not found', 404);

  const { lines, area, view } = await loadCart(userId, address);
  if (!lines.length) throw new AppError('Aapka cart khali hai', 400, { code: 'CART_EMPTY' });
  if (!view.canCheckout) {
    const code = view.groups.flatMap((g) => g.items).flatMap((i) => i.issues)[0]?.code;
    throw new AppError(ISSUE_MSG[code] || 'Cart mein kuch items order nahi ho sakte', 409, { code: code || 'CART_BLOCKED' });
  }
  const noCod = paymentMethod === 'COD' ? view.groups.find((g) => !g.codAvailable) : null;
  if (noCod) throw new AppError(`${noCod.seller.businessName} ke order par Cash on Delivery available nahi hai`, 409, { code: 'COD_NOT_AVAILABLE' });

  const byVariant = new Map(lines.map((l) => [l.variantId, l]));
  const percents = await commissions.resolveMany(lines.map((l) => ({ productId: l.variant.product.id, sellerId: l.variant.product.seller.id, categoryId: l.variant.product.categoryId })));

  const snapshot = addressView(address);
  const draftsFor = () => view.groups.map((g) => {
    const items = g.items.map((i) => {
      const p = byVariant.get(i.variantId).variant.product;
      const pct = percents.get(p.id);
      const lineTotal = round2(i.price * i.quantity);
      const commissionAmount = round2((lineTotal * pct) / 100);
      const label = [i.size, i.color].filter(Boolean).join(', ');
      return {
        productId: p.id, variantId: i.variantId, titleSnapshot: label ? `${p.title} (${label})` : p.title, imageSnapshot: p.images?.[0]?.url || null,
        quantity: i.quantity, unitPrice: i.price, lineTotal,
        // FROZEN now: later changes to commission rules never touch this order
        commissionPercent: pct, commissionAmount, sellerAmount: round2(lineTotal - commissionAmount),
      };
    });
    const subtotal = round2(items.reduce((t, i) => t + i.lineTotal, 0));
    return {
      orderNumber: orderNumber(), sellerId: g.seller.id, sellerUserId: byVariant.get(g.items[0].variantId).variant.product.seller.userId, sellerName: g.seller.businessName,
      addressId, addressSnapshot: snapshot, paymentMethod, paymentStatus: paymentMethod === 'COD' ? 'COD' : 'PENDING',
      subtotal, deliveryCharge: g.deliveryCharge, total: round2(subtotal + g.deliveryCharge), distanceKm: area.get(g.seller.id)?.distanceKm ?? null, items,
    };
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const orders = await repo.placeOrders({ userId, cartItemIds: lines.map((l) => l.id), drafts: draftsFor() });
      return { orders, requiresPayment: paymentMethod === 'ONLINE' };
    } catch (e) {
      if (e.code === 'P2002' && String(e.meta?.target).includes('orderNumber')) continue; // new number, try again
      throw e;
    }
  }
  throw new Error('Could not generate a unique order number');
}

// ---------- views ----------
const itemView = (i) => ({
  id: i.id, productId: i.productId, title: i.titleSnapshot, image: transformUrl(i.imageSnapshot, 'thumb') || null,
  quantity: i.quantity, unitPrice: num(i.unitPrice), lineTotal: num(i.lineTotal),
});
const listCard = (o, extra = {}) => ({
  id: o.id, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
  total: num(o.total), createdAt: o.createdAt, itemCount: o.items.reduce((t, i) => t + i.quantity, 0),
  items: o.items.slice(0, 3).map((i) => ({ title: i.titleSnapshot, image: transformUrl(i.imageSnapshot, 'thumb') || null, quantity: i.quantity })), ...extra,
});

const paidAtOf = (o) => (o.payments || []).find((p) => p.paidAt)?.paidAt || null;
const withPaid = (o) => ({ ...o, paidAt: paidAtOf(o) });
const paymentInfo = (o) => {
  const awaiting = o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PENDING' && o.status === 'PENDING';
  const expiresAt = awaiting ? new Date(new Date(o.createdAt).getTime() + env.paymentWindowMinutes * 60000) : null;
  return { method: o.paymentMethod, status: o.paymentStatus, canPay: Boolean(awaiting && expiresAt > new Date()), expiresAt };
};
const refundInfo = (o) => {
  const r = (o.payments || []).flatMap((p) => p.refunds || [])[0];
  return r ? { status: r.status, amount: num(r.amount) } : null;
};

function customerDetail(o) {
  return {
    id: o.id, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
    createdAt: o.createdAt, deliveredAt: o.deliveredAt, cancelReason: o.cancelReason,
    items: o.items.map(itemView), address: o.addressSnapshot,
    price: { subtotal: num(o.subtotal), discount: num(o.discount), delivery: num(o.deliveryCharge), total: num(o.total) },
    seller: { businessName: o.seller.businessName, isVerified: o.seller.isVerified, city: o.seller.location.city },
    timeline: buildTimeline(withPaid(o), o.history), canCancel: CANCELLABLE.includes(o.status),
    payment: paymentInfo(o), refund: refundInfo(o),
  };
}

function sellerDetail(o) {
  const commission = round2(o.items.reduce((t, i) => t + Number(i.commissionAmount), 0));
  const itemsNet = round2(o.items.reduce((t, i) => t + Number(i.sellerAmount), 0));
  const a = o.addressSnapshot;
  const next = SELLER_NEXT[o.status] || null;
  return {
    id: o.id, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
    createdAt: o.createdAt, deliveredAt: o.deliveredAt, cancelReason: o.cancelReason,
    items: o.items.map((i) => ({ ...itemView(i), commissionPercent: num(i.commissionPercent), commissionAmount: num(i.commissionAmount), sellerAmount: num(i.sellerAmount) })),
    customer: { name: a.fullName, mobile: a.mobile }, address: a,
    price: { subtotal: num(o.subtotal), delivery: num(o.deliveryCharge), total: num(o.total) },
    earnings: { itemsTotal: num(o.subtotal), commission, delivery: num(o.deliveryCharge), net: round2(itemsNet + Number(o.deliveryCharge)) },
    collectCash: o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID' ? num(o.total) : 0,
    timeline: buildTimeline(withPaid(o), o.history), next, canCancel: CANCELLABLE.includes(o.status),
    settlement: o.settlement ? { status: o.settlement.status, netAmount: num(o.settlement.netAmount), settleAfter: o.settlement.settleAfter } : null,
  };
}

// ---------- customer ----------
async function listMine(userId, q) {
  const { rows, total } = await repo.listForUser(userId, { status: q.status, skip: (q.page - 1) * q.limit, take: q.limit });
  return { items: rows.map((o) => listCard(o, { sellerName: o.seller.businessName })), pagination: pageMeta(total, q.page, q.limit) };
}
async function getMine(userId, id) {
  const o = await repo.findForUser(id, userId);
  if (!o) throw new AppError('Order not found', 404);
  return customerDetail(o);
}
async function cancelMine(userId, id, reason) {
  const o = await repo.findForUser(id, userId);
  if (!o) throw new AppError('Order not found', 404);
  if (!CANCELLABLE.includes(o.status)) throw new AppError('Ab yeh order cancel nahi ho sakta. Return ke liye support se baat karo.', 409, { code: 'NOT_CANCELLABLE' });
  await repo.cancel({ order: o, fromStatuses: CANCELLABLE, reason, actorId: userId, notifyUserId: o.seller.userId, byLabel: 'Customer' });
  return customerDetail(await repo.findForUser(id, userId));
}

// ---------- seller ----------
async function listForSeller(seller, q) {
  const { rows, total, tabs } = await repo.listForSeller(seller.id, { status: q.status, group: q.group, skip: (q.page - 1) * q.limit, take: q.limit });
  return {
    items: rows.map((o) => listCard(o, { customerName: o.addressSnapshot.fullName, city: o.addressSnapshot.city, next: SELLER_NEXT[o.status] || null })),
    tabs, pagination: pageMeta(total, q.page, q.limit),
  };
}
async function getForSeller(seller, id) {
  const o = await repo.findForSeller(id, seller.id);
  if (!o) throw new AppError('Order not found', 404);
  return sellerDetail(o);
}
async function setStatus(seller, id, to) {
  const o = await repo.findForSeller(id, seller.id);
  if (!o) throw new AppError('Order not found', 404);
  if (SELLER_NEXT[o.status] !== to) {
    throw new AppError(`Is order ko abhi "${to}" par nahi le ja sakte (abhi: ${o.status}).`, 409, { code: 'BAD_TRANSITION' });
  }
  await repo.advance({ order: o, to, actorId: seller.userId });
  return sellerDetail(await repo.findForSeller(id, seller.id));
}
async function cancelForSeller(seller, id, reason) {
  const o = await repo.findForSeller(id, seller.id);
  if (!o) throw new AppError('Order not found', 404);
  if (!CANCELLABLE.includes(o.status)) throw new AppError('Packing ke baad order cancel nahi ho sakta.', 409, { code: 'NOT_CANCELLABLE' });
  await repo.cancel({ order: o, fromStatuses: CANCELLABLE, reason, actorId: seller.userId, notifyUserId: o.userId, byLabel: 'Seller' });
  return sellerDetail(await repo.findForSeller(id, seller.id));
}

module.exports = { orderNumber, quote, placeOrder, listMine, getMine, cancelMine, listForSeller, getForSeller, setStatus, cancelForSeller };
