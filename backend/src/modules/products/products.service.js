const crypto = require('crypto');
const repo = require('./products.repository');
const { AppError } = require('../../utils/apiResponse');
const { pageMeta } = require('../../utils/pagination');
const { toProductCard } = require('../../utils/productCard');
const { transformUrl, videoPoster, isOwnMedia } = require('../../utils/media');
const { uniqueSlug } = require('../../utils/slug');
const serviceArea = require('../locations/serviceArea');

const num = (v) => (v == null ? null : Number(v));
const available = (v) => Math.max(0, (v.inventory?.quantity || 0) - (v.inventory?.reserved || 0));
const discountOf = (p) => (Number(p.mrp) > Number(p.basePrice) ? Math.round(((Number(p.mrp) - Number(p.basePrice)) / Number(p.mrp)) * 100) : 0);

const imageViews = (images) => images.map((i) => ({
  id: i.id, angle: i.angle, width: i.width, height: i.height,
  thumb: transformUrl(i.url, 'thumb'), card: transformUrl(i.url, 'card'), detail: transformUrl(i.url, 'detail'), full: transformUrl(i.url, 'full'),
}));

// ---------- views ----------
function toSellerListItem(p) {
  return {
    id: p.id, title: p.title, image: transformUrl(p.images?.[0]?.url, 'thumb') || null, price: Number(p.basePrice), mrp: Number(p.mrp),
    status: p.status, isVerified: p.isVerified, rejectionReason: p.rejectionReason, createdAt: p.createdAt,
    stock: p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0), variantCount: p.variants.length,
  };
}

// Full product for the edit form (includes raw url/publicId so the form can send them back)
function toOwnedView(p) {
  return {
    id: p.id, title: p.title, slug: p.slug, brand: p.brand, description: p.description, specifications: p.specifications || [],
    categoryId: p.categoryId, parentCategoryId: p.category?.parentId || null,
    basePrice: Number(p.basePrice), mrp: Number(p.mrp), weightGrams: p.weightGrams, codAvailable: p.codAvailable,
    status: p.status, isVerified: p.isVerified, rejectionReason: p.rejectionReason,
    images: p.images.map((i) => ({ url: i.url, publicId: i.publicId, angle: i.angle, width: i.width, height: i.height, thumb: transformUrl(i.url, 'thumb') })),
    video: p.videos[0] ? { url: p.videos[0].url, publicId: p.videos[0].publicId, durationSec: p.videos[0].durationSec, poster: videoPoster(p.videos[0].url) } : null,
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, price: num(v.price), mrp: num(v.mrp), stock: v.inventory?.quantity || 0 })),
  };
}

function toDetailView(p) {
  const zone = p.seller.zones?.[0] || null;
  return {
    id: p.id, slug: p.slug, title: p.title, brand: p.brand, description: p.description, specifications: p.specifications || [],
    price: Number(p.basePrice), mrp: Number(p.mrp), discountPercent: discountOf(p), weightGrams: p.weightGrams,
    rating: Number(p.ratingAvg), ratingCount: p.ratingCount, isVerified: p.isVerified,
    codAvailable: Boolean(p.codAvailable && (zone ? zone.codAvailable : true)),
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug, parent: p.category.parent ? { name: p.category.parent.name, slug: p.category.parent.slug } : null },
    images: imageViews(p.images),
    video: p.videos[0] ? { url: p.videos[0].url, durationSec: p.videos[0].durationSec, poster: videoPoster(p.videos[0].url) } : null,
    variants: p.variants.map((v) => {
      const qty = available(v);
      return { id: v.id, size: v.size, color: v.color, price: v.price != null ? Number(v.price) : Number(p.basePrice), mrp: v.mrp != null ? Number(v.mrp) : Number(p.mrp), inStock: qty > 0, lowStock: qty > 0 && qty <= 10 ? qty : null };
    }),
    seller: {
      businessName: p.seller.businessName, slug: p.seller.slug, logoUrl: p.seller.logoUrl, isVerified: p.seller.isVerified,
      ratingAvg: Number(p.seller.ratingAvg), ratingCount: p.seller.ratingCount, city: p.seller.location.city, state: p.seller.location.state,
    },
    delivery: zone && { etaDays: zone.etaDays, deliveryCharge: Number(zone.deliveryCharge), freeDeliveryAbove: num(zone.freeDeliveryAbove), radiusKm: zone.radiusKm },
  };
}

// ---------- validation helpers ----------
async function checkInput(seller, d) {
  if (!(await repo.findLeafCategory(d.categoryId))) throw new AppError('Please choose a valid sub-category', 422, { fieldErrors: { categoryId: ['Choose a valid sub-category'] } });
  const prefix = `localmart/products/${seller.id}/`;
  const bad = d.images.some((i) => !isOwnMedia(i.url, i.publicId, prefix)) || (d.video && !isOwnMedia(d.video.url, d.video.publicId, prefix));
  if (bad) throw new AppError('One of the photos/videos is not valid. Please upload it again.', 422, { fieldErrors: { images: ['Upload the photos again'] } });
}

const productFields = (d) => ({
  title: d.title, categoryId: d.categoryId, brand: d.brand || null, description: d.description,
  specifications: d.specifications || [], basePrice: d.basePrice, mrp: d.mrp, weightGrams: d.weightGrams ?? null, codAvailable: d.codAvailable,
});
const withSkus = (variants) => variants.map((v) => ({ ...v, sku: v.sku || `LM-${crypto.randomBytes(4).toString('hex').toUpperCase()}` }));

// Did anything the customer relies on for trust change? Then it must be re-checked by an admin.
const contentChanged = (old, d) => {
  const sig = (x) => JSON.stringify([x.title, x.description, x.brand || '', x.categoryId, x.specifications || [], x.images.map((i) => [i.url, i.angle]), x.video?.url || '']);
  return sig({ title: old.title, description: old.description, brand: old.brand, categoryId: old.categoryId, specifications: old.specifications, images: old.images, video: old.videos?.[0] }) !==
         sig({ ...d, specifications: d.specifications });
};

// ---------- seller operations ----------
async function create(seller, d) {
  await checkInput(seller, d);
  for (let i = 0; i < 5; i += 1) {
    try {
      const p = await repo.createProduct({
        product: { ...productFields(d), sellerId: seller.id, slug: uniqueSlug(d.title), status: 'PENDING_REVIEW' },
        images: d.images, video: d.video, variants: withSkus(d.variants),
      });
      return toOwnedView(p);
    } catch (e) {
      if (e.code !== 'P2002') throw e;
      if (String(e.meta?.target).includes('sku')) throw new AppError('This SKU is already used. Use a different one.', 409);
    }
  }
  throw new Error('Could not generate a unique product slug');
}

async function update(seller, id, d) {
  const old = await repo.findOwned(id, seller.id);
  if (!old) throw new AppError('Product not found', 404);
  await checkInput(seller, d);
  const changed = contentChanged(old, d);
  const resubmit = changed || old.status === 'REJECTED' || old.status === 'DRAFT';
  const product = { ...productFields(d), ...(resubmit ? { status: 'PENDING_REVIEW', isVerified: false, rejectionReason: null } : {}) };
  try {
    return toOwnedView(await repo.updateProduct(id, { product, images: d.images, video: d.video, variants: withSkus(d.variants.filter((v) => !v.id)).concat(d.variants.filter((v) => v.id)), resetVerification: resubmit }));
  } catch (e) {
    if (e.code === 'P2002') throw new AppError('This SKU is already used. Use a different one.', 409);
    throw e;
  }
}

async function remove(seller, id) {
  if (!(await repo.findOwned(id, seller.id))) throw new AppError('Product not found', 404);
  await repo.softDelete(id);
}

async function getOwned(seller, id) {
  const p = await repo.findOwned(id, seller.id);
  if (!p) throw new AppError('Product not found', 404);
  return toOwnedView(p);
}

async function listMine(seller, q) {
  const { rows, total } = await repo.listMine(seller.id, { status: q.status, lowStock: q.lowStock, skip: (q.page - 1) * q.limit, take: q.limit });
  return { items: rows.map(toSellerListItem), pagination: pageMeta(total, q.page, q.limit) };
}

async function inventory(seller, q) {
  const { rows, total } = await repo.listInventory(seller.id, (q.page - 1) * q.limit, q.limit);
  return {
    items: rows.map((v) => ({
      variantId: v.id, sku: v.sku, size: v.size, color: v.color, stock: v.inventory?.quantity || 0, reserved: v.inventory?.reserved || 0,
      product: { id: v.product.id, title: v.product.title, status: v.product.status, image: transformUrl(v.product.images?.[0]?.url, 'thumb') || null },
    })),
    pagination: pageMeta(total, q.page, q.limit),
  };
}

async function setStock(seller, variantId, quantity) {
  if (!(await repo.findOwnedVariant(variantId, seller.id))) throw new AppError('Item not found', 404);
  const inv = await repo.setStock(variantId, quantity);
  return { variantId, stock: inv.quantity };
}

// ---------- public ----------
const SORTS = {
  relevance: [{ soldCount: 'desc' }, { ratingAvg: 'desc' }, { createdAt: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ basePrice: 'asc' }],
  price_desc: [{ basePrice: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
};

const EMPTY = (q) => ({ items: [], pagination: pageMeta(0, q.page, q.limit) });

async function search(q) {
  // Customer location (optional): only products from sellers who deliver there
  const area = serviceArea.hasLocation(q) ? await serviceArea.resolve(q) : null;
  if (area && area.size === 0) return EMPTY(q);

  const where = {};
  if (area) where.sellerId = { in: [...area.keys()] };
  if (q.category) {
    const ids = await repo.categoryIdsBySlug(q.category);
    if (!ids) return EMPTY(q);
    where.categoryId = { in: ids };
  }
  if (q.minPrice != null || q.maxPrice != null) where.basePrice = { ...(q.minPrice != null ? { gte: q.minPrice } : {}), ...(q.maxPrice != null ? { lte: q.maxPrice } : {}) };
  if (q.minRating) where.ratingAvg = { gte: q.minRating };
  if (q.q) {
    const words = q.q.split(/\s+/).filter(Boolean).slice(0, 5);
    where.AND = words.map((w) => ({
      OR: [{ title: { contains: w } }, { brand: { contains: w } }, { seller: { businessName: { contains: w } } }, { category: { name: { contains: w } } }],
    }));
  }

  if (q.sort === 'distance' && area) {
    const refs = await repo.candidateRefs(where);
    const dist = (r) => area.get(r.sellerId)?.distanceKm ?? Infinity;
    const ordered = refs.map((r, i) => ({ r, i })).sort((a, b) => dist(a.r) - dist(b.r) || a.i - b.i).map((x) => x.r);
    const start = (q.page - 1) * q.limit;
    const rows = await repo.findByIds(ordered.slice(start, start + q.limit).map((r) => r.id));
    return { items: rows.map((p) => toProductCard(p, area)), pagination: pageMeta(ordered.length, q.page, q.limit) };
  }

  const { rows, total } = await repo.list(where, SORTS[q.sort] || SORTS.relevance, (q.page - 1) * q.limit, q.limit);
  return { items: rows.map((p) => toProductCard(p, area)), pagination: pageMeta(total, q.page, q.limit) };
}

async function getPublic(idOrSlug, loc = {}) {
  const p = await repo.findPublic(idOrSlug);
  if (!p) throw new AppError('Product not found', 404);
  const view = toDetailView(p);
  // deliverable: true / false when the customer has chosen a location, null when we do not know
  view.deliverable = null;
  if (serviceArea.hasLocation(loc)) {
    const hit = (await serviceArea.resolve(loc)).get(p.sellerId);
    view.deliverable = Boolean(hit);
    view.distanceKm = hit?.distanceKm ?? null;
    view.distanceApprox = hit ? hit.approximate : null;
  }
  return view;
}

async function home(loc = {}) {
  const area = serviceArea.hasLocation(loc) ? await serviceArea.resolve(loc) : null;
  if (area && area.size === 0) return { located: true, nearby: [], newest: [], bestSellers: [], topRated: [], deals: [] };
  const s = await repo.sections(area ? { sellerId: { in: [...area.keys()] } } : {});
  const cards = (rows) => rows.map((p) => toProductCard(p, area));
  const deals = s.pool.filter((p) => Number(p.mrp) > Number(p.basePrice)).sort((a, b) => discountOf(b) - discountOf(a)).slice(0, 10);
  const dist = (p) => area?.get(p.sellerId)?.distanceKm ?? Infinity;
  const nearby = area ? [...s.pool].sort((a, b) => dist(a) - dist(b) || Number(b.ratingAvg) - Number(a.ratingAvg)).slice(0, 10) : [];
  return { located: Boolean(area), nearby: cards(nearby), newest: cards(s.newest), bestSellers: cards(s.bestSellers), topRated: cards(s.topRated), deals: cards(deals) };
}

module.exports = { toDetailView, toOwnedView, contentChanged, create, update, remove, getOwned, listMine, inventory, setStock, search, getPublic, home };
