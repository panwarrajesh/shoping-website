const { z } = require('zod');

const ALL = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];

const placeSchema = z.object({
  addressId: z.string().min(1).max(40),
  paymentMethod: z.enum(['COD', 'ONLINE']),
});
const reason = z.string().trim().min(3, 'Please give a reason (at least 3 characters)').max(200);
const cancelSchema = z.object({ reason });
const statusSchema = z.object({ status: z.enum(['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']) });
const quoteQuery = z.object({ addressId: z.string().min(1).max(40) });
const listQuery = z.object({
  status: z.enum(ALL).optional(),
  group: z.enum(['new', 'active', 'done']).optional(), // seller tabs
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = { placeSchema, cancelSchema, statusSchema, quoteQuery, listQuery };
