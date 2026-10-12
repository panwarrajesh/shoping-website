const repo = require('./payments.repository');
const env = require('../../config/env');

async function expireUnpaid() {
  try {
    const n = await repo.expireUnpaid(new Date(Date.now() - env.paymentWindowMinutes * 60000), 100);
    if (n) console.log(`[jobs] cancelled ${n} unpaid online order(s)`);
  } catch (e) {
    console.error('[jobs] expireUnpaid failed:', e.message);
  }
}

// Single-server friendly. Several servers can run it at once safely: every cancel is a conditional update.
function start() {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_JOBS === '1') return;
  setTimeout(expireUnpaid, 60 * 1000).unref();
  setInterval(expireUnpaid, 5 * 60 * 1000).unref();
}

module.exports = { start, expireUnpaid };
