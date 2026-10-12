// The order life-cycle in one place (pure functions, easy to test).
const SELLER_NEXT = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'PACKED',
  PACKED: 'SHIPPED',
  SHIPPED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING']; // both customer and seller, until packing
const FORWARD = Object.keys(SELLER_NEXT).concat('DELIVERED');

const NOTIFY = {
  PENDING: ['Order place ho gaya', 'Aapka order seller ko bhej diya gaya hai.'],
  CONFIRMED: ['Order confirm ho gaya', 'Seller ne aapka order confirm kar diya.'],
  PROCESSING: ['Order taiyaar ho raha hai', 'Seller aapka order taiyaar kar raha hai.'],
  PACKED: ['Order pack ho gaya', 'Aapka order pack ho gaya hai.'],
  SHIPPED: ['Order bhej diya gaya', 'Aapka order bhej diya gaya hai.'],
  OUT_FOR_DELIVERY: ['Order aapke paas aa raha hai', 'Aapka order delivery ke liye nikal chuka hai.'],
  DELIVERED: ['Order deliver ho gaya', 'Aapka order deliver ho gaya. Shukriya!'],
  CANCELLED: ['Order cancel ho gaya', 'Aapka order cancel ho gaya hai.'],
};

const STEPS = [
  { key: 'PLACED', label: 'Order place hua', status: 'PENDING' },
  { key: 'PAYMENT', label: '' },
  { key: 'CONFIRMED', label: 'Seller ne confirm kiya', status: 'CONFIRMED' },
  { key: 'PROCESSING', label: 'Taiyaar ho raha hai', status: 'PROCESSING' },
  { key: 'PACKED', label: 'Pack ho gaya', status: 'PACKED' },
  { key: 'SHIPPED', label: 'Bheja gaya', status: 'SHIPPED' },
  { key: 'OUT_FOR_DELIVERY', label: 'Delivery ke liye nikla', status: 'OUT_FOR_DELIVERY' },
  { key: 'DELIVERED', label: 'Deliver ho gaya', status: 'DELIVERED' },
];

// order: { status, paymentMethod, paymentStatus, cancelReason } ; history: [{ status, createdAt, note }]
function buildTimeline(order, history) {
  const at = new Map();
  history.forEach((h) => { if (!at.has(h.status)) at.set(h.status, h.createdAt); });
  const cancelled = order.status === 'CANCELLED';

  const steps = STEPS.map((s) => {
    if (s.key === 'PAYMENT') {
      const cod = order.paymentMethod === 'COD';
      const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.paymentStatus);
      return { key: 'PAYMENT', label: cod ? 'Cash on Delivery chuna' : 'Payment confirm hua', done: cod || paid, at: cod ? at.get('PENDING') || null : order.paidAt || null };
    }
    return { key: s.key, label: s.label, done: at.has(s.status), at: at.get(s.status) || null };
  });

  if (cancelled) {
    // Steps after the point of cancellation are not going to happen
    const lastDone = steps.reduce((n, s, i) => (s.done ? i : n), 0);
    steps.forEach((s, i) => { if (i > lastDone) s.skipped = true; });
    steps.push({ key: 'CANCELLED', label: 'Order cancel hua', done: true, at: at.get('CANCELLED') || null, note: order.cancelReason || null });
  }
  const current = [...steps].reverse().find((s) => s.done)?.key || 'PLACED';
  return { steps, current, cancelled };
}

module.exports = { SELLER_NEXT, CANCELLABLE, FORWARD, NOTIFY, buildTimeline };
