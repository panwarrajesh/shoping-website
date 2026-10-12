const repo = require('./commissions.repository');

// Priority: PRODUCT > SELLER > CATEGORY (own category, then its parent) > GLOBAL.
// Returns the percent to FREEZE on the order item; later changes by the admin never touch old orders.
function pickPercent(rules, item, parentOf) {
  const newest = (fn) => rules.find(fn); // rules arrive newest-first
  const hit =
    newest((r) => r.scope === 'PRODUCT' && r.productId === item.productId) ||
    newest((r) => r.scope === 'SELLER' && r.sellerId === item.sellerId) ||
    newest((r) => r.scope === 'CATEGORY' && r.categoryId === item.categoryId) ||
    newest((r) => r.scope === 'CATEGORY' && parentOf.get(item.categoryId) && r.categoryId === parentOf.get(item.categoryId)) ||
    newest((r) => r.scope === 'GLOBAL');
  return hit ? Number(hit.percent) : null;
}

// items: [{ productId, sellerId, categoryId }]  ->  Map(productId -> percent)
async function resolveMany(items) {
  const uniq = (k) => [...new Set(items.map((i) => i[k]))];
  const cats = await repo.categoriesByIds(uniq('categoryId'));
  const parentOf = new Map(cats.filter((c) => c.parentId).map((c) => [c.id, c.parentId]));
  const rules = await repo.activeRules({
    productIds: uniq('productId'), sellerIds: uniq('sellerId'),
    categoryIds: [...new Set([...uniq('categoryId'), ...parentOf.values()])],
  });
  const out = new Map();
  for (const it of items) {
    const pct = pickPercent(rules, it, parentOf);
    // A missing rule means the platform is misconfigured. Failing loudly beats silently charging 0%.
    if (pct == null) throw new Error('No commission rule configured (run the seed or add a GLOBAL rule)');
    out.set(it.productId, pct);
  }
  return out;
}

module.exports = { pickPercent, resolveMany };
