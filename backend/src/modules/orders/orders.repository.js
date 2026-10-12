const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { AppError } = require('../../utils/apiResponse');
const { NOTIFY } = require('./orders.transitions');

const listItems = { items: { select: { id: true, titleSnapshot: true, imageSnapshot: true, quantity: true } } };
const fullInclude = {
  items: true,
  history: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'asc' }, include: { refunds: true } },
  seller: { select: { id: true, userId: true, businessName: true, slug: true, isVerified: true, location: { select: { city: true, state: true } } } },
  settlement: true,
};

// An online order that is still waiting for its payment is invisible to the seller (nothing to pack yet)
const PAID_OR_COD = { NOT: { paymentMethod: 'ONLINE', paymentStatus: { in: ['PENDING', 'FAILED'] } } };

const findAddress = (id, userId) => prisma.address.findFirst({ where: { id, userId, deletedAt: null } });

const notify = (tx, userId, status, orderNumber, extra) => {
  const [title, body] = NOTIFY[status];
  return tx.notification.create({ data: { userId, title, body: `${body} (${orderNumber})${extra ? ` ${extra}` : ''}`, type: 'ORDER', data: { orderNumber } } });
};

// ---------------- placing ----------------
// ONE transaction: consume the cart lines, reserve stock, create every order. Any failure rolls it all back.
const placeOrders = ({ userId, cartItemIds, drafts }) =>
  prisma.$transaction(async (tx) => {
    // Deleting the lines first doubles as a guard against double-taps: a second request finds nothing to delete.
    const del = await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });
    if (del.count !== cartItemIds.length) throw new AppError('Aapka cart badal gaya. Dobara check karke try karo.', 409, { code: 'CART_CHANGED' });

    const need = new Map();
    drafts.forEach((d) => d.items.forEach((i) => need.set(i.variantId, (need.get(i.variantId) || 0) + i.quantity)));
    for (const [variantId, qty] of [...need.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const inv = await tx.inventory.findUnique({ where: { variantId } });
      if (!inv || inv.quantity - inv.reserved < qty) throw new AppError('Koi item abhi stock mein nahi raha. Cart check karo.', 409, { code: 'OUT_OF_STOCK' });
      // Only succeeds if nobody changed the row since we read it: no overselling under concurrent orders
      const r = await tx.inventory.updateMany({ where: { variantId, quantity: inv.quantity, reserved: inv.reserved }, data: { reserved: { increment: qty } } });
      if (r.count !== 1) throw new AppError('Stock abhi badal gaya. Dobara try karo.', 409, { code: 'STOCK_CONFLICT' });
    }

    const created = [];
    for (const d of drafts) {
      const order = await tx.order.create({
        data: {
          orderNumber: d.orderNumber, userId, sellerId: d.sellerId, addressId: d.addressId, addressSnapshot: d.addressSnapshot,
          status: 'PENDING', paymentMethod: d.paymentMethod, paymentStatus: d.paymentStatus,
          subtotal: d.subtotal, discount: 0, deliveryCharge: d.deliveryCharge, total: d.total, distanceKm: d.distanceKm,
          items: { create: d.items },
          history: { create: { status: 'PENDING', note: 'Order placed', actorId: userId } },
          payments: { create: { method: d.paymentMethod, status: d.paymentStatus, amount: d.total, gateway: d.paymentMethod === 'ONLINE' ? 'razorpay' : null } },
        },
      });
      // Online orders: nobody is told until the payment is confirmed (see payments.repository.markPaid)
      if (d.paymentMethod === 'COD') {
        await notify(tx, userId, 'PENDING', d.orderNumber);
        await tx.notification.create({ data: { userId: d.sellerUserId, title: 'Naya order mila', body: `Naya order ${d.orderNumber} (₹${d.total}). Jaldi confirm karo.`, type: 'ORDER', data: { orderNumber: d.orderNumber } } });
      }
      created.push({ id: order.id, orderNumber: order.orderNumber, total: Number(order.total), sellerName: d.sellerName });
    }
    return created;
  }, { maxWait: 5000, timeout: 20000 });

// ---------------- moving an order forward / cancelling ----------------
const releaseStock = async (tx, items) => {
  for (const i of items) {
    await tx.inventory.updateMany({ where: { variantId: i.variantId, reserved: { gte: i.quantity } }, data: { reserved: { decrement: i.quantity } } });
  }
};

const cancel = ({ order, fromStatuses, reason, actorId, notifyUserId, byLabel }) =>
  prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: order.id, status: { in: fromStatuses } }, data: { status: 'CANCELLED', cancelReason: reason } });
    if (r.count !== 1) throw new AppError('Order ka status badal chuka hai. Page refresh karo.', 409, { code: 'STATUS_CHANGED' });
    await releaseStock(tx, order.items);
    if (order.paymentMethod === 'ONLINE') {
      if (order.paymentStatus === 'PAID') {
        // The money was already taken: queue a refund (it is processed in Step 14)
        const paid = (order.payments || []).find((p) => p.status === 'PAID');
        if (paid) await tx.refund.create({ data: { paymentId: paid.id, amount: order.total, status: 'INITIATED', reason } });
      } else {
        await tx.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Order cancel hua' } });
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
      }
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: 'CANCELLED', note: `${byLabel}: ${reason}`, actorId } });
    await notify(tx, notifyUserId, 'CANCELLED', order.orderNumber, `Reason: ${reason}`);
  });

const advance = ({ order, to, actorId }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const r = await tx.order.updateMany({
      where: { id: order.id, sellerId: order.sellerId, status: order.status },
      data: { status: to, ...(to === 'DELIVERED' ? { deliveredAt: now } : {}) },
    });
    if (r.count !== 1) throw new AppError('Order ka status badal chuka hai. Page refresh karo.', 409, { code: 'STATUS_CHANGED' });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: to, actorId } });

    if (to === 'DELIVERED') {
      // The sale is final: stock leaves the shelf, sold count goes up, COD cash is collected, seller earnings are recorded
      for (const i of order.items) {
        await tx.inventory.updateMany({ where: { variantId: i.variantId, quantity: { gte: i.quantity }, reserved: { gte: i.quantity } }, data: { quantity: { decrement: i.quantity }, reserved: { decrement: i.quantity } } });
        await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: i.quantity } } });
      }
      if (order.paymentMethod === 'COD') {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } });
        await tx.payment.updateMany({ where: { orderId: order.id, method: 'COD' }, data: { status: 'PAID', paidAt: now } });
      }
      const commission = order.items.reduce((t, i) => t + Number(i.commissionAmount), 0);
      const gross = Number(order.total);
      const settleAfter = new Date(now.getTime() + env.settlementHoldDays * 86400000);
      await tx.sellerSettlement.create({
        data: { sellerId: order.sellerId, orderId: order.id, grossAmount: gross, commission: Math.round(commission * 100) / 100, netAmount: Math.round((gross - commission) * 100) / 100, status: 'PENDING', settleAfter },
      });
    }
    await notify(tx, order.userId, to, order.orderNumber);
  });

// ---------------- reading ----------------
const findForUser = (id, userId) => prisma.order.findFirst({ where: { id, userId }, include: fullInclude });
const findForSeller = (id, sellerId) => prisma.order.findFirst({ where: { id, sellerId, ...PAID_OR_COD }, include: fullInclude });

const listForUser = async (userId, { status, skip, take }) => {
  const where = { userId, ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { ...listItems, seller: { select: { businessName: true } } } }),
    prisma.order.count({ where }),
  ]);
  return { rows, total };
};

const GROUPS = {
  new: ['PENDING'],
  active: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'],
  done: ['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'],
};
const listForSeller = async (sellerId, { status, group, skip, take }) => {
  const where = { sellerId, ...PAID_OR_COD, ...(status ? { status } : group ? { status: { in: GROUPS[group] } } : {}) };
  const [rows, total, counts] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: listItems }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], where: { sellerId, ...PAID_OR_COD }, _count: { _all: true } }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const sum = (arr) => arr.reduce((t, s) => t + (byStatus[s] || 0), 0);
  return { rows, total, tabs: { new: sum(GROUPS.new), active: sum(GROUPS.active), done: sum(GROUPS.done) } };
};

module.exports = { findAddress, placeOrders, cancel, advance, findForUser, findForSeller, listForUser, listForSeller };
