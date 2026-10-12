const { z } = require('zod');

const money = (max = 10000000) => z.number().positive('Must be more than 0').max(max);
const optText = (n) => z.string().trim().max(n).optional();

const image = z.object({
  url: z.string().url().max(500), publicId: z.string().max(200),
  angle: z.enum(['FRONT', 'BACK', 'SIDE', 'PACKAGING', 'SIZE_CHART', 'OTHER']).default('OTHER'),
  width: z.number().int().positive().optional(), height: z.number().int().positive().optional(),
});
const video = z.object({ url: z.string().url().max(500), publicId: z.string().max(200), durationSec: z.number().int().positive().nullable().optional() });
const variant = z.object({
  id: z.string().max(40).optional(),
  sku: z.string().trim().max(40).regex(/^[A-Za-z0-9_-]+$/, 'SKU can only have letters, numbers, - and _').optional(),
  size: optText(30), color: optText(30),
  price: money().nullable().optional(), mrp: money().nullable().optional(),
  stock: z.number().int('Stock must be a whole number').min(0).max(100000),
});
const spec = z.object({ label: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(120) });

const productSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  categoryId: z.string().min(1, 'Choose a category').max(40),
  brand: optText(40),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(3000),
  specifications: z.array(spec).max(20).optional(),
  basePrice: money(),
  mrp: money(),
  weightGrams: z.number().int().min(1).max(100000).nullable().optional(),
  codAvailable: z.boolean().default(true),
  images: z.array(image).min(1, 'Add at least one real photo').max(8, 'Maximum 8 photos'),
  video: video.nullable().optional(),
  variants: z.array(variant).min(1, 'Add stock details').max(30, 'Maximum 30 variants'),
}).superRefine((d, ctx) => {
  if (d.mrp < d.basePrice) ctx.addIssue({ code: 'custom', path: ['mrp'], message: 'MRP cannot be less than the selling price' });
  const seen = new Set();
  d.variants.forEach((v) => {
    const k = `${(v.size || '').toLowerCase()}|${(v.color || '').toLowerCase()}`;
    if (seen.has(k)) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Two variants have the same size and colour' });
    seen.add(k);
  });
  const fronts = d.images.filter((i) => i.angle === 'FRONT').length;
  if (fronts > 1) ctx.addIssue({ code: 'custom', path: ['images'], message: 'Only one photo can be marked as Front' });
});

const { locationFields, bothOrNone, bothMsg } = require('../locations/locations.validation');

const stockSchema = z.object({ quantity: z.number().int('Stock must be a whole number').min(0).max(100000) });

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});
// Same filters, plus the customer's location and "distance" sorting
const listQueryLoc = listQuery
  .extend({ ...locationFields, sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'distance']).default('relevance') })
  .refine(bothOrNone, bothMsg);
const locationQuery = z.object(locationFields).refine(bothOrNone, bothMsg);

const mineQuery = z.object({
  status: z.enum(['PENDING_REVIEW', 'ACTIVE', 'REJECTED']).optional(),
  lowStock: z.enum(['1']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = { productSchema, stockSchema, listQuery, listQueryLoc, locationQuery, mineQuery };
