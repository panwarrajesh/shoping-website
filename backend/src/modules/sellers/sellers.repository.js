const prisma = require('../../config/prisma');

const include = {
  location: true,
  zones: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
  verification: true,
};

const findUser = (id) => prisma.user.findFirst({ where: { id, deletedAt: null } });
const findSellerByUser = (userId) => prisma.sellerProfile.findFirst({ where: { userId, deletedAt: null }, include });
const findSellerById = (id) => prisma.sellerProfile.findFirst({ where: { id, deletedAt: null }, include });
const findApprovedBySlug = (slug) =>
  prisma.sellerProfile.findFirst({ where: { slug, status: 'APPROVED', deletedAt: null }, include: { location: true } });

const locationKey = (l) => ({ city_area_pincode: { city: l.city, area: l.area || '', pincode: l.pincode } });
const upsertLocation = (tx, l) =>
  tx.location.upsert({
    where: locationKey(l), update: {},
    create: { state: l.state, city: l.city, area: l.area || '', pincode: l.pincode, latitude: l.latitude ?? null, longitude: l.longitude ?? null },
  });

// Creates seller + default delivery zone + KYC record, and upgrades the user's role, all-or-nothing
const createSeller = ({ userId, profile, loc, zone, verification }) =>
  prisma.$transaction(async (tx) => {
    const location = await upsertLocation(tx, loc);
    const seller = await tx.sellerProfile.create({
      data: {
        ...profile, userId, locationId: location.id,
        latitude: loc.latitude ?? null, longitude: loc.longitude ?? null,
        zones: { create: { ...zone, locationId: location.id } },
        verification: { create: verification },
      },
      include,
    });
    await tx.user.update({ where: { id: userId }, data: { role: 'SELLER' } });
    return seller;
  });

const updateSeller = (id, patch, loc) =>
  prisma.$transaction(async (tx) => {
    const data = { ...patch };
    if (loc) {
      const location = await upsertLocation(tx, loc);
      data.locationId = location.id;
      await tx.deliveryZone.updateMany({ where: { sellerId: id }, data: { locationId: location.id } });
    }
    return tx.sellerProfile.update({ where: { id }, data, include });
  });

const saveZone = (seller, zone) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.deliveryZone.findFirst({ where: { sellerId: seller.id, isActive: true }, orderBy: { createdAt: 'asc' } });
    if (existing) await tx.deliveryZone.update({ where: { id: existing.id }, data: zone });
    else await tx.deliveryZone.create({ data: { ...zone, sellerId: seller.id, locationId: seller.locationId } });
    return tx.sellerProfile.update({ where: { id: seller.id }, data: { defaultRadiusKm: zone.radiusKm }, include });
  });

const updatePayout = (id, data) => prisma.sellerProfile.update({ where: { id }, data, include });

const upsertVerification = (sellerId, data) =>
  prisma.sellerVerification.upsert({ where: { sellerId }, update: data, create: { sellerId, ...data } });

const dashboardStats = async (sellerId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const own = { sellerId };
  const [products, activeProducts, pendingOrders, todayOrders, sales, settlement, lowStock] = await Promise.all([
    prisma.product.count({ where: { ...own, deletedAt: null } }),
    prisma.product.count({ where: { ...own, deletedAt: null, status: 'ACTIVE' } }),
    prisma.order.count({ where: { ...own, status: { in: ['PENDING', 'CONFIRMED'] } } }),
    prisma.order.count({ where: { ...own, createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({ where: { ...own, status: 'DELIVERED' }, _sum: { total: true } }),
    prisma.sellerSettlement.aggregate({ where: { ...own, status: 'PENDING' }, _sum: { netAmount: true } }),
    // "low stock" = 5 or fewer units left (per-variant thresholds come with inventory management)
    prisma.inventory.count({ where: { quantity: { lte: 5 }, variant: { isActive: true, product: { ...own, deletedAt: null } } } }),
  ]);
  return {
    products, activeProducts, pendingOrders, todayOrders, lowStock,
    totalSales: Number(sales._sum.total || 0),
    pendingSettlement: Number(settlement._sum.netAmount || 0),
  };
};

module.exports = {
  findUser, findSellerByUser, findSellerById, findApprovedBySlug,
  createSeller, updateSeller, saveZone, updatePayout, upsertVerification, dashboardStats,
};
