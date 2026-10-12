const prisma = require('../../config/prisma');

const TTL_MS = 60 * 1000;
let cache = { at: 0, data: null };

// Public category tree (parents with their children). Cached for 60s: it rarely changes.
async function getTree() {
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  const rows = await prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, parentId: true, name: true, slug: true, imageUrl: true },
  });
  const tree = rows.filter((c) => !c.parentId).map((p) => ({
    id: p.id, name: p.name, slug: p.slug, imageUrl: p.imageUrl,
    children: rows.filter((c) => c.parentId === p.id).map(({ id, name, slug, imageUrl }) => ({ id, name, slug, imageUrl })),
  }));
  cache = { at: Date.now(), data: tree };
  return tree;
}

const clearCache = () => { cache = { at: 0, data: null }; };

module.exports = { getTree, clearCache };
