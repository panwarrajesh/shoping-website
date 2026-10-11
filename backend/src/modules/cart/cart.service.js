const repo = require('./cart.repository');
const serviceArea = require('../locations/serviceArea');
const { AppError } = require('../../utils/apiResponse');
const { transformUrl } = require('../../utils/media');
const { round2, unitPrice, unitMrp, deliveryCharge } = require('./pricing');

const MAX_QTY = 10;     // per product line
const MAX_LINES = 30;   // different products in one cart

const available = (v) => Math.max(0, (v.inventory?.quantity || 0) - (v.inventory?.reserved || 0));
const isLive = (v) => {
  const p = v.product; const s = p.seller;
  return v.isActive && p.status === 'ACTIVE' && !p.deletedAt && s.status === 'APPROVED' && !s.deletedAt;
};

// ---------- view ----------
// line = { id, variantId, quantity, variant | null }. Same builder serves the saved cart and guest previews.
function lineView(line, userId, area) {
  const v = line.variant;
  if (!v) {
    return { id: line.id, variantId: line.variantId, quantity: line.quantity, title: 'Yeh product ab available nahi hai', image: null,
      price: 0, mrp: 0, issues: [{ code: 'UNAVAILABLE' }], purchasable: false, sellerId: null };
  }
  const p = v.product; const s = p.seller;
  const avail = available(v);
  const issues = [];
  if (!isLive(v)) issues.push({ code: 'UNAVAILABLE' });
  else {
    if (userId && s.userId === userId) issues.push({ code: 'OWN_PRODUCT' });
    if (avail === 0) issues.push({ code: 'OUT_OF_STOCK' });
    else if (line.quantity > avail) issues.push({ code: 'LOW_STOCK', availableQty: avail });
    if (area && !area.has(s.id)) issues.push({ code: 'NOT_DELIVERABLE' });
  }
  return {
    id: line.id, variantId: v.id, productId: p.id, slug: p.slug, title: p.title,
    image: transformUrl(p.images?.[0]?.url, 'thumb') || null, size: v.size, color: v.color,
    price: unitPrice(v, p), mrp: unitMrp(v, p), quantity: line.quantity, maxQty: Math.max(1, Math.min(MAX_QTY, avail)),
    codAvailable: p.codAvailable, sellerId: s.id, issues, purchasable: issues.length === 0,
  };
}

function buildView(lines, { userId = null, area = null } = {}) {
  const views = lines.map((l) => lineView(l, userId, area));
  const sellers = new Map(lines.filter((l) => l.variant).map((l) => [l.variant.product.seller.id, l.variant.product.seller]));
  const byGroup = new Map();
  views.forEach((it) => { const k = it.sellerId || 'none'; byGroup.set(k, [...(byGroup.get(k) || []), it]); });

  const groups = [...byGroup.entries()].map(([sid, items]) => {
    const s = sellers.get(sid);
    const zone = s?.zones?.[0] || null;
    const ok = items.filter((i) => i.purchasable);
    const subtotal = round2(ok.reduce((t, i) => t + i.price * i.quantity, 0));
    return {
      seller: s ? { id: s.id, businessName: s.businessName, isVerified: s.isVerified } : null,
      items, subtotal,
      mrpTotal: round2(ok.reduce((t, i) => t + i.mrp * i.quantity, 0)),
      deliveryCharge: deliveryCharge(zone, subtotal),
      freeDeliveryAbove: zone?.freeDeliveryAbove != null ? Number(zone.freeDeliveryAbove) : null,
      etaDays: zone?.etaDays ?? null,
      codAvailable: Boolean(zone?.codAvailable) && ok.every((i) => i.codAvailable),
    };
  });

  const itemsTotal = round2(groups.reduce((t, g) => t + g.subtotal, 0));
  const mrpTotal = round2(groups.reduce((t, g) => t + g.mrpTotal, 0));
  const deliveryTotal = round2(groups.reduce((t, g) => t + g.deliveryCharge, 0));
  return {
    groups,
    totals: { itemsTotal, mrpTotal, savings: round2(Math.max(0, mrpTotal - itemsTotal)), deliveryTotal, grandTotal: round2(itemsTotal + deliveryTotal) },
    count: views.reduce((t, i) => t + i.quantity, 0),
    lines: views.length,
    canCheckout: views.length > 0 && views.every((i) => i.purchasable),
  };
}

const areaFor = (loc) => (loc && serviceArea.hasLocation(loc) ? serviceArea.resolve(loc) : null);

// ---------- saved cart ----------
async function getCart(userId, loc) {
  const cart = await repo.getOrCreateCart(userId);
  return buildView(await repo.getItems(cart.id), { userId, area: await areaFor(loc) });
}

function assertBuyable(v, userId) {
  if (!v || !isLive(v)) throw new AppError('Yeh product ab available nahi hai', 409, { code: 'UNAVAILABLE' });
  if (v.product.seller.userId === userId) throw new AppError('Aap apna hi product nahi khareed sakte', 403, { code: 'OWN_PRODUCT' });
}

async function add(userId, { variantId, quantity }, loc) {
  const v = await repo.findVariant(variantId);
  assertBuyable(v, userId);
  const avail = available(v);
  if (avail === 0) throw new AppError('Yeh abhi stock mein nahi hai', 409, { code: 'OUT_OF_STOCK' });
  const area = await areaFor(loc);
  if (area && !area.has(v.product.seller.id)) throw new AppError('Yeh seller aapke area mein delivery nahi karta', 409, { code: 'NOT_DELIVERABLE' });

  const cart = await repo.getOrCreateCart(userId);
  const existing = await repo.findItem(cart.id, variantId);
  if (!existing && (await repo.countLines(cart.id)) >= MAX_LINES) throw new AppError(`Cart mein maximum ${MAX_LINES} alag products ho sakte hain`, 400, { code: 'CART_FULL' });

  const cap = Math.min(MAX_QTY, avail);
  const current = existing?.quantity || 0;
  if (current >= cap) {
    throw new AppError(avail < MAX_QTY ? `Sirf ${avail} piece bache hain aur woh aapke cart mein hain` : `Ek product ke maximum ${MAX_QTY} piece le sakte ho`, 409, { code: 'QTY_LIMIT' });
  }
  const target = Math.min(cap, current + quantity);
  await repo.setItemQty(cart.id, variantId, target);
  const notice = target < current + quantity ? `Sirf ${target} piece add ho paye (limit)` : null;
  return { cart: buildView(await repo.getItems(cart.id), { userId, area }), notice };
}

async function setQuantity(userId, itemId, quantity, loc) {
  const cart = await repo.getOrCreateCart(userId);
  const item = await repo.findItemById(itemId, cart.id);
  if (!item) throw new AppError('Cart item not found', 404);
  const v = await repo.findVariant(item.variantId);
  assertBuyable(v, userId);
  const cap = Math.min(MAX_QTY, available(v));
  if (cap === 0) throw new AppError('Yeh abhi stock mein nahi hai', 409, { code: 'OUT_OF_STOCK' });
  if (quantity > cap) throw new AppError(cap < MAX_QTY ? `Sirf ${cap} piece bache hain` : `Ek product ke maximum ${MAX_QTY} piece le sakte ho`, 409, { code: 'QTY_LIMIT' });
  await repo.updateItemQty(itemId, quantity);
  return buildView(await repo.getItems(cart.id), { userId, area: await areaFor(loc) });
}

async function removeItem(userId, itemId, loc) {
  const cart = await repo.getOrCreateCart(userId);
  await repo.removeItem(itemId, cart.id);
  return buildView(await repo.getItems(cart.id), { userId, area: await areaFor(loc) });
}

async function clearCart(userId) {
  const cart = await repo.getOrCreateCart(userId);
  await repo.clear(cart.id);
  return buildView([], { userId });
}

async function count(userId) {
  const cart = await repo.getOrCreateCart(userId);
  return repo.sumQuantity(cart.id);
}

// ---------- guest cart ----------
// Guests keep [{variantId, quantity}] on their device. This turns it into the same cart view (no database write).
async function preview(items, loc, userId = null) {
  const merged = mergeDuplicates(items);
  const found = new Map((await repo.findVariants(merged.map((i) => i.variantId))).map((v) => [v.id, v]));
  const lines = merged.map((i) => ({ id: i.variantId, variantId: i.variantId, quantity: i.quantity, variant: found.get(i.variantId) || null }));
  return buildView(lines, { userId, area: await areaFor(loc) });
}

// After login: fold the guest cart into the saved cart. Anything that cannot be added is skipped, never an error.
async function merge(userId, items, loc) {
  const cart = await repo.getOrCreateCart(userId);
  let skipped = 0;
  let lineCount = await repo.countLines(cart.id);
  for (const it of mergeDuplicates(items)) {
    const v = await repo.findVariant(it.variantId);
    if (!v || !isLive(v) || v.product.seller.userId === userId || available(v) === 0) { skipped += 1; continue; }
    const existing = await repo.findItem(cart.id, it.variantId);
    if (!existing && lineCount >= MAX_LINES) { skipped += 1; continue; }
    const cap = Math.min(MAX_QTY, available(v));
    await repo.setItemQty(cart.id, it.variantId, Math.min(cap, (existing?.quantity || 0) + it.quantity));
    if (!existing) lineCount += 1;
  }
  return { cart: buildView(await repo.getItems(cart.id), { userId, area: await areaFor(loc) }), skipped };
}

function mergeDuplicates(items) {
  const m = new Map();
  items.forEach((i) => m.set(i.variantId, Math.min(MAX_QTY, (m.get(i.variantId) || 0) + i.quantity)));
  return [...m.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

module.exports = { MAX_QTY, MAX_LINES, buildView, getCart, add, setQuantity, removeItem, clearCart, count, preview, merge };
