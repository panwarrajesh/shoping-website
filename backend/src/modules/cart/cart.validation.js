const { z } = require('zod');

const quantity = z.number().int('Quantity must be a whole number').min(1).max(10);
const variantId = z.string().min(1).max(40);

const addSchema = z.object({ variantId, quantity: quantity.default(1) });
const qtySchema = z.object({ quantity });
const itemsSchema = z.object({
  items: z.array(z.object({ variantId, quantity })).max(30, 'Too many items'),
});

module.exports = { addSchema, qtySchema, itemsSchema };
