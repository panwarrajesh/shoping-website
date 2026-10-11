const prisma = require('../../config/prisma');
const { cardInclude } = require('../../utils/productCard');

const LIVE = { status: 'ACTIVE', deletedAt: null, seller: { status: 'APPROVED', deletedAt: null } };
const ownedFull = {
  images: { orderBy: { sortOrder: 'asc' } },
  videos: { take: 1 },
  variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { createdAt: 'asc' } },
  category: { include: { parent: true } },
};
const detailInclude = {
  ...ownedFull,
  seller: { include: { location: true, zones: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 } } },
};

// ---------- categories ----------
const findLeafCategory = async (id) => {
  const c = await prisma.category.findFirst({ where: { id, isActive: true, deletedAt: null }, include: { _count: { select: { children: { where: { isActive: true, deletedAt: null } } } } } });
  return c && c._count.children === 0 ? c : null;
};
const categoryIdsBySlug = async (slug) => {
  const c = await prisma.category.findFirst({ where: { slug, isActive: true, deletedAt: null }, include: { children: { where: { isActive: true }, select: { id: true } } } });
  return c ? [c.id, ...c.children.map((x) => x.id)] : null;
};

// ---------- seller side ----------
const findOwned = (id, sellerId) => prisma.product.findFirst({ where: { id, sellerId, deletedAt: null }, include: ownedFull });

const imageRows = (images) => images.map((i, n) => ({ url: i.url, publicId: i.publicId, angle: i.angle, width: i.width ?? null, height: i.height ?? null, sortOrder: n }));

const createProduct = ({ product, images, video, variants }) =>
  prisma.product.create({
    data: {
      ...product,
      images: { create: imageRows(images) },
      ...(video ? { videos: { create: { url: video.url, publicId: video.publicId, durationSec: video.durationSec ?? null } } } : {}),
      variants: { create: variants.map((v) => ({ sku: v.sku, size: v.size || null, color: v.color || null, price: v.price ?? null, mrp: v.mrp ?? null, inventory: { create: { quantity: v.stock } } })) },
      verification: { create: { status: 'PENDING' } },
    },
    include: ownedFull,
  });

// Edit = replace images/video, diff variants (never hard-delete a variant: old orders reference it)
const updateProduct = (id, { product, images, video, variants, resetVerification }) =>
  prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: product });
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productImage.createMany({ data: imageRows(images).map((r) => ({ ...r, productId: id })) });
    await tx.productVideo.deleteMany({ where: { productId: id } });
    if (video) await tx.productVideo.create({ data: { productId: id, url: video.url, publicId: video.publicId, durationSec: video.durationSec ?? null } });

    const existing = await tx.productVariant.findMany({ where: { productId: id, isActive: true }, select: { id: true } });
    const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
    const existingIds = new Set(existing.map((e) => e.id));
    const gone = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
    if (gone.length) {
      await tx.productVariant.updateMany({ where: { id: { in: gone } }, data: { isActive: false } });
      await tx.inventory.updateMany({ where: { variantId: { in: gone } }, data: { quantity: 0 } });
    }
    for (const v of variants) {
      const fields = { size: v.size || null, color: v.color || null, price: v.price ?? null, mrp: v.mrp ?? null };
      if (v.id && existingIds.has(v.id)) {
        await tx.productVariant.update({ where: { id: v.id }, data: fields });
        await tx.inventory.upsert({ where: { variantId: v.id }, update: { quantity: v.stock }, create: { variantId: v.id, quantity: v.stock } });
      } else {
        await tx.productVariant.create({ data: { productId: id, sku: v.sku, ...fields, inventory: { create: { quantity: v.stock } } } });
      }
    }
    if (resetVerification) {
      await tx.productVerification.upsert({
        where: { productId: id }, update: { status: 'PENDING', reviewNote: null, reviewedAt: null }, create: { productId: id, status: 'PENDING' },
      });
    }
    return tx.product.findFirst({ where: { id }, include: ownedFull });
  });

const softDelete = (id) => prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'REMOVED' } });

const listMine = async (sellerId, { status, lowStock, skip, take }) => {
  const where = {
    sellerId, deletedAt: null, ...(status ? { status } : {}),
    ...(lowStock ? { variants: { some: { isActive: true, inventory: { quantity: { lte: 5 } } } } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, include: { inventory: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return { rows, total };
};

const listInventory = async (sellerId, skip, take) => {
  const where = { isActive: true, product: { sellerId, deletedAt: null } };
  const [rows, total] = await Promise.all([
    prisma.productVariant.findMany({
      where, orderBy: [{ product: { title: 'asc' } }, { createdAt: 'asc' }], skip, take,
      include: { inventory: true, product: { select: { id: true, title: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } },
    }),
    prisma.productVariant.count({ where }),
  ]);
  return { rows, total };
};

const findOwnedVariant = (variantId, sellerId) =>
  prisma.productVariant.findFirst({ where: { id: variantId, isActive: true, product: { sellerId, deletedAt: null } }, select: { id: true } });
const setStock = (variantId, quantity) =>
  prisma.inventory.upsert({ where: { variantId }, update: { quantity }, create: { variantId, quantity } });

// ---------- public side ----------
const list = async (where, orderBy, skip, take) => {
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where: { ...LIVE, ...where }, orderBy, skip, take, include: cardInclude }),
    prisma.product.count({ where: { ...LIVE, ...where } }),
  ]);
  return { rows, total };
};
const findPublic = (idOrSlug) => prisma.product.findFirst({ where: { ...LIVE, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, include: detailInclude });

const sections = async (extra = {}) => {
  const q = (where, orderBy, take = 10) => prisma.product.findMany({ where: { ...LIVE, ...where, ...extra }, orderBy, take, include: cardInclude });
  const [newest, bestSellers, topRated, pool] = await Promise.all([
    q({}, { createdAt: 'desc' }),
    q({ soldCount: { gt: 0 } }, [{ soldCount: 'desc' }, { createdAt: 'desc' }]),
    q({ ratingCount: { gt: 0 } }, [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]),
    q({}, { createdAt: 'desc' }, 80),
  ]);
  return { newest, bestSellers, topRated, pool };
};

// Distance sorting needs every candidate's seller first, so we sort ids in memory (capped) and load just one page.
const candidateRefs = (where, take = 2000) =>
  prisma.product.findMany({ where: { ...LIVE, ...where }, select: { id: true, sellerId: true }, orderBy: { createdAt: 'desc' }, take });
const findByIds = async (ids) => {
  const rows = await prisma.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

module.exports = {
  findLeafCategory, categoryIdsBySlug, findOwned, createProduct, updateProduct, softDelete, listMine, listInventory,
  findOwnedVariant, setStock, list, findPublic, sections, candidateRefs, findByIds,
};
