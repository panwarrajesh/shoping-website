const { z } = require('zod');

const createSchema = z.object({ orderIds: z.array(z.string().min(1).max(40)).min(1).max(10) });
const verifySchema = z.object({
  razorpay_order_id: z.string().min(5).max(60),
  razorpay_payment_id: z.string().min(5).max(60),
  razorpay_signature: z.string().min(10).max(200),
});

module.exports = { createSchema, verifySchema };
