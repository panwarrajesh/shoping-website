const prisma = require('../../config/prisma');

const MAX_ADDRESSES = 10;
const NOT_DELETED = { deletedAt: null };

// ---- profile ----
const findUser = (id) => prisma.user.findFirst({ where: { id, ...NOT_DELETED } });
const findUserByEmail = (email) => prisma.user.findFirst({ where: { email, ...NOT_DELETED } });
const updateUser = (id, data) => prisma.user.update({ where: { id }, data });

// ---- addresses (every query is scoped by userId: users can only ever touch their own rows) ----
const listAddresses = (userId) =>
  prisma.address.findMany({
    where: { userId, ...NOT_DELETED },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
const countAddresses = (userId) => prisma.address.count({ where: { userId, ...NOT_DELETED } });
const findAddress = (id, userId) => prisma.address.findFirst({ where: { id, userId, ...NOT_DELETED } });

const createAddress = (userId, data) =>
  prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId, ...NOT_DELETED } });
    const isDefault = Boolean(data.isDefault) || count === 0; // first address is always default
    if (isDefault) await tx.address.updateMany({ where: { userId, ...NOT_DELETED }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, userId, isDefault } });
  });

const updateAddress = (id, userId, data) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId, ...NOT_DELETED } });
    if (!existing) return null;
    const patch = { ...data };
    if (patch.isDefault === false && existing.isDefault) delete patch.isDefault; // must keep one default
    if (patch.isDefault === true) {
      await tx.address.updateMany({ where: { userId, ...NOT_DELETED }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id }, data: patch });
  });

const setDefaultAddress = (id, userId) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId, ...NOT_DELETED } });
    if (!existing) return null;
    await tx.address.updateMany({ where: { userId, ...NOT_DELETED }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { isDefault: true } });
  });

// Soft delete: old orders keep their address snapshot. If the default is removed, promote the newest one.
const deleteAddress = (id, userId) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId, ...NOT_DELETED } });
    if (!existing) return false;
    await tx.address.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId, ...NOT_DELETED }, orderBy: { createdAt: 'desc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return true;
  });

// ---- wishlist ----
const LIVE_PRODUCT = { status: 'ACTIVE', deletedAt: null };
const productCardInclude = {
  images: { take: 1, orderBy: { sortOrder: 'asc' } },
  seller: { select: { isVerified: true } },
};

const listWishlist = (userId, skip, take) =>
  prisma.wishlist.findMany({
    where: { userId, product: LIVE_PRODUCT },
    orderBy: { createdAt: 'desc' }, skip, take,
    include: { product: { include: productCardInclude } },
  });
const countWishlist = (userId) => prisma.wishlist.count({ where: { userId, product: LIVE_PRODUCT } });
const wishlistIds = async (userId) =>
  (await prisma.wishlist.findMany({ where: { userId, product: LIVE_PRODUCT }, select: { productId: true } })).map((w) => w.productId);
const findLiveProduct = (id) => prisma.product.findFirst({ where: { id, ...LIVE_PRODUCT }, select: { id: true } });
const addWishlist = (userId, productId) =>
  prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } }, update: {}, create: { userId, productId },
  });
const removeWishlist = (userId, productId) => prisma.wishlist.deleteMany({ where: { userId, productId } });

module.exports = {
  MAX_ADDRESSES, findUser, findUserByEmail, updateUser,
  listAddresses, countAddresses, findAddress, createAddress, updateAddress, setDefaultAddress, deleteAddress,
  listWishlist, countWishlist, wishlistIds, findLiveProduct, addWishlist, removeWishlist,
};
