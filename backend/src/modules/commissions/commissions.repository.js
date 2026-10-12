const prisma = require('../../config/prisma');

const categoriesByIds = (ids) => prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, parentId: true } });
const activeRules = ({ productIds, sellerIds, categoryIds }) =>
  prisma.commission.findMany({
    where: {
      isActive: true,
      OR: [
        { scope: 'GLOBAL' },
        { scope: 'CATEGORY', categoryId: { in: categoryIds } },
        { scope: 'SELLER', sellerId: { in: sellerIds } },
        { scope: 'PRODUCT', productId: { in: productIds } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

module.exports = { categoriesByIds, activeRules };
