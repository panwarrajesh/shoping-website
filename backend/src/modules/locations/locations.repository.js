const prisma = require('../../config/prisma');

const ACTIVE = { isActive: true };

const search = (q, take) => {
  const or = [{ city: { contains: q } }, { area: { contains: q } }, { state: { contains: q } }];
  if (/^\d{1,6}$/.test(q)) or.push({ pincode: { startsWith: q } });
  return prisma.location.findMany({ where: { ...ACTIVE, OR: or }, orderBy: [{ city: 'asc' }, { area: 'asc' }], take });
};
// Places that already have sellers come first, so customers land on areas where something is sold
const popular = (take) =>
  prisma.location.findMany({ where: ACTIVE, orderBy: [{ sellers: { _count: 'desc' } }, { city: 'asc' }], take });
const byPincode = (pincode) => prisma.location.findMany({ where: { ...ACTIVE, pincode }, orderBy: { area: 'asc' }, take: 10 });
const findActive = (id) => prisma.location.findFirst({ where: { id, ...ACTIVE } });
const withCoords = () => prisma.location.findMany({ where: { ...ACTIVE, latitude: { not: null }, longitude: { not: null } } });

const getDefault = (userId) =>
  prisma.customerProfile.findUnique({ where: { userId }, include: { defaultLocation: true } });
const setDefault = (userId, locationId) =>
  prisma.customerProfile.upsert({ where: { userId }, update: { defaultLocationId: locationId }, create: { userId, defaultLocationId: locationId } });

const countLiveProducts = (sellerIds) =>
  prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null, sellerId: { in: sellerIds } } });

module.exports = { search, popular, byPincode, findActive, withCoords, getDefault, setDefault, countLiveProducts };
