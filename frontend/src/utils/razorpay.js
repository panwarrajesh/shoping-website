import { paymentService } from '../services/paymentService';

let loading = null;
// Razorpay's checkout window is loaded only when someone actually pays
export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = () => { loading = null; reject(new Error('Payment window load nahi ho payi. Internet check karo.')); };
      document.body.appendChild(s);
    });
  }
  return loading;
};

// Opens the payment window for these orders. Resolves with:
//   { status: 'PAID' | 'PROCESSING' }  payment done (PROCESSING = bank still confirming)
//   { status: 'DISMISSED' }            customer closed the window
//   { status: 'UNVERIFIED', message }  paid in the window but our check failed (webhook will still settle it)
// Throws if the payment could not even be started.
export async function payForOrders(orderIds, { onFailure } = {}) {
  await loadRazorpay();
  const cfg = await paymentService.create(orderIds); // amount comes from the server, never from this page

  return new Promise((resolve) => {
    let verifying = false;
    const rzp = new window.Razorpay({
      key: cfg.keyId,
      amount: cfg.amount,
      currency: cfg.currency,
      order_id: cfg.gatewayOrderId,
      name: 'LocalMart',
      description: cfg.description,
      prefill: cfg.prefill,
      theme: { color: '#0F7D5A' },
      retry: { enabled: true },
      handler: async (resp) => {
        verifying = true;
        try {
          const v = await paymentService.verify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve({ status: v.status });
        } catch (e) {
          resolve({ status: 'UNVERIFIED', message: e.message });
        }
      },
      modal: { ondismiss: () => { if (!verifying) resolve({ status: 'DISMISSED' }); } },
    });
    rzp.on('payment.failed', (r) => onFailure?.(r?.error?.description));
    rzp.open();
  });
}

export const PAY_MESSAGES = {
  PAID: ['success', 'Payment ho gaya! Seller jaldi confirm karega.'],
  PROCESSING: ['success', 'Payment process ho raha hai. Thodi der mein order page par status dikhega.'],
  DISMISSED: ['error', 'Payment adhura reh gaya. Order page se dobara pay kar sakte ho.'],
  UNVERIFIED: ['error', 'Payment check nahi ho paya. Paise kate hon to ghabrao mat, order page par thodi der mein status aa jayega.'],
};
