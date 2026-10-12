const prisma = require('../../config/prisma');

const orderForPayment = { payments: true, seller: { select: { userId: true } } };

const findUser = (id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, mobile: true } });
const ordersForUser = (userId, ids) => prisma.order.findMany({ where: { id: { in: ids }, userId }, include: orderForPayment });
const ordersByGatewayOrder = (gatewayOrderId) =>
  prisma.order.findMany({ where: { payments: { some: { gatewayOrderId } } }, include: orderForPayment });
const attachGatewayOrder = (orderIds, gatewayOrderId) =>
  prisma.payment.updateMany({ where: { orderId: { in: orderIds }, method: 'ONLINE', status: 'PENDING' }, data: { gatewayOrderId, gateway: 'razorpay' } });
const paymentsByGatewayOrder = (gatewayOrderId) =>
  prisma.payment.findMany({ where: { gatewayOrderId }, include: { order: { select: { id: true, orderNumber: true, userId: true, status: true, seller: { select: { userId: true } } } } } });
const recordFailure = (gatewayOrderId, reason, raw) =>
  prisma.payment.updateMany({ where: { gatewayOrderId, status: 'PENDING' }, data: { failureReason: String(reason).slice(0, 190), rawWebhook: raw } });

const note = (tx, userId, title, body, orderNumber) =>
  tx.notification.create({ data: { userId, title, body, type: 'PAYMENT', data: { orderNumber } } });

// Marks every order of one gateway payment as paid. Safe to call twice (verify + webhook both do): each row flips only once.
const markPaid = ({ gatewayOrderId, gatewayPaymentId, raw }) =>
  prisma.$transaction(async (tx) => {
    const rows = await tx.payment.findMany({
      where: { gatewayOrderId }, include: { order: { select: { id: true, orderNumber: true, userId: true, status: true, total: true, seller: { select: { userId: true } } } } },
    });
    const now = new Date();
    const out = { paid: [], already: 0, refunds: 0 };
    for (const row of rows) {
      // FAILED is included on purpose: a late payment can arrive after the order was expired
      const flip = await tx.payment.updateMany({
        where: { id: row.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'PAID', gatewayPaymentId, paidAt: now, failureReason: null, rawWebhook: raw },
      });
      if (flip.count !== 1) { out.already += 1; continue; }
      const o = row.order;
      await tx.order.update({ where: { id: o.id }, data: { paymentStatus: 'PAID' } });
      if (o.status === 'CANCELLED') {
        // Paid after the order was cancelled/expired: the customer must get the money back
        await tx.refund.create({ data: { paymentId: row.id, amount: row.amount, status: 'INITIATED', reason: 'Payment order cancel hone ke baad aaya' } });
        await note(tx, o.userId, 'Payment mila, order cancel tha', `Order ${o.orderNumber} cancel ho chuka tha, isliye aapka ₹${row.amount} wapas kiya jayega.`, o.orderNumber);
        out.refunds += 1;
        continue;
      }
      await tx.orderStatusHistory.create({ data: { orderId: o.id, status: o.status, note: 'Payment mil gaya' } });
      await note(tx, o.userId, 'Payment mil gaya', `Order ${o.orderNumber} ka payment ho gaya. Seller jaldi confirm karega.`, o.orderNumber);
      await tx.notification.create({ data: { userId: o.seller.userId, title: 'Naya order mila', body: `Naya order ${o.orderNumber} (₹${o.total}), payment ho chuka hai. Jaldi confirm karo.`, type: 'ORDER', data: { orderNumber: o.orderNumber } } });
      out.paid.push(o.id);
    }
    return out;
  }, { maxWait: 5000, timeout: 20000 });

// Unpaid online orders past the payment window: cancel them and give the stock back
const expireUnpaid = async (cutoff, limit = 100) => {
  const stale = await prisma.order.findMany({
    where: { paymentMethod: 'ONLINE', paymentStatus: 'PENDING', status: 'PENDING', createdAt: { lt: cutoff } },
    include: { items: true }, take: limit,
  });
  let n = 0;
  for (const o of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        const r = await tx.order.updateMany({
          where: { id: o.id, status: 'PENDING', paymentStatus: 'PENDING' },
          data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelReason: 'Payment time par nahi hua' },
        });
        if (r.count !== 1) return;
        for (const i of o.items) {
          await tx.inventory.updateMany({ where: { variantId: i.variantId, reserved: { gte: i.quantity } }, data: { reserved: { decrement: i.quantity } } });
        }
        await tx.payment.updateMany({ where: { orderId: o.id, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Payment time par nahi hua' } });
        await tx.orderStatusHistory.create({ data: { orderId: o.id, status: 'CANCELLED', note: 'Payment time par nahi hua' } });
        await note(tx, o.userId, 'Order cancel ho gaya', `Order ${o.orderNumber} ka payment time par nahi hua, isliye cancel ho gaya.`, o.orderNumber);
        n += 1;
      });
    } catch (e) { console.error('[jobs] could not expire order', o.id, e.message); }
  }
  return n;
};

module.exports = { findUser, ordersForUser, ordersByGatewayOrder, attachGatewayOrder, paymentsByGatewayOrder, recordFailure, markPaid, expireUnpaid };
