const { transformUrl } = require('./media');

// Include this in any query whose rows are turned into cards
const cardInclude = {
  images: { take: 1, orderBy: { sortOrder: 'asc' } },
  seller: { select: { isVerified: true, businessName: true, zones: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1, select: { etaDays: true } } } },
};

const deliveryText = (days) => (days == null ? undefined : days <= 1 ? 'Kal tak delivery' : `${days} din mein delivery`);

// area (optional) = Map(sellerId -> { distanceKm, approximate, etaDays }) from locations/serviceArea
const toProductCard = (p, area) => {
  const a = area?.get(p.sellerId);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    image: transformUrl(p.images?.[0]?.url, 'card') || null,
    price: Number(p.basePrice),
    mrp: Number(p.mrp),
    rating: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    isVerified: p.isVerified,
    sellerVerified: Boolean(p.seller?.isVerified),
    sellerName: p.seller?.businessName,
    deliveryText: deliveryText(a?.etaDays ?? p.seller?.zones?.[0]?.etaDays),
    distanceKm: a?.distanceKm ?? undefined,
    distanceApprox: a ? a.approximate : undefined,
  };
};

module.exports = { toProductCard, cardInclude };
