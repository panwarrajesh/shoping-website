const prisma = require('../../config/prisma');

const variantInclude = {
  inventory: true,
  product: {
    include: {
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      seller: {
        select: {
          id: true, userId: true, businessName: true, isVerified: true, status: true, deletedAt: true,
          zones: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      },
    },
  },
};

const getOrCreateCart = (userId) => prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
const getItems = (cartId) =>
  prisma.cartItem.findMany({ where: { cartId }, orderBy: { createdAt: 'asc' }, include: { variant: { include: variantInclude } } });
const findVariant = (id) => prisma.productVariant.findUnique({ where: { id }, include: variantInclude });
const findVariants = (ids) => prisma.productVariant.findMany({ where: { id: { in: ids } }, include: variantInclude });

const findItem = (cartId, variantId) => prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
const findItemById = (id, cartId) => prisma.cartItem.findFirst({ where: { id, cartId } });
const setItemQty = (cartId, variantId, quantity) =>
  prisma.cartItem.upsert({ where: { cartId_variantId: { cartId, variantId } }, update: { quantity }, create: { cartId, variantId, quantity } });
const updateItemQty = (id, quantity) => prisma.cartItem.update({ where: { id }, data: { quantity } });
const removeItem = (id, cartId) => prisma.cartItem.deleteMany({ where: { id, cartId } }); // cartId = ownership check
const clear = (cartId) => prisma.cartItem.deleteMany({ where: { cartId } });
const countLines = (cartId) => prisma.cartItem.count({ where: { cartId } });
const sumQuantity = async (cartId) => (await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } }))._sum.quantity || 0;

module.exports = {
  getOrCreateCart, getItems, findVariant, findVariants, findItem, findItemById,
  setItemQty, updateItemQty, removeItem, clear, countLines, sumQuantity,
};
