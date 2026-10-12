const prisma = require('../../config/prisma');

// "Which sellers deliver to this customer?" The one place that answers it.
// Rule: customer coordinates + seller coordinates => distance must be within the seller's delivery radius.
// If either side has no coordinates we fall back to the same pincode or the same city (distance unknown).
const TTL_MS = 30 * 1000;
let cache = { at: 0, list: null };

const toRad = (d) => (d * Math.PI) / 180;
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};
const n = (v) => (v == null ? null : Number(v));

async function sellers() {
  if (cache.list && Date.now() - cache.at < TTL_MS) return cache.list;
  const rows = await prisma.sellerProfile.findMany({
    where: { status: 'APPROVED', deletedAt: null },
    select: {
      id: true, latitude: true, longitude: true,
      location: { select: { city: true, pincode: true, latitude: true, longitude: true } },
      zones: {
        where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1,
        select: { radiusKm: true, deliveryCharge: true, codAvailable: true, etaDays: true, location: { select: { city: true, pincode: true, latitude: true, longitude: true } } },
      },
    },
  });
  const list = rows.filter((s) => s.zones[0]).map((s) => {
    const z = s.zones[0];
    const loc = z.location || s.location;
    const exact = s.latitude != null && s.longitude != null; // shop's own pin vs. centre of its town
    const lat = exact ? n(s.latitude) : n(loc.latitude ?? s.location.latitude);
    const lng = exact ? n(s.longitude) : n(loc.longitude ?? s.location.longitude);
    return {
      id: s.id, lat, lng, exact, city: (loc.city || '').toLowerCase(), pincode: loc.pincode,
      radiusKm: z.radiusKm, etaDays: z.etaDays, deliveryCharge: Number(z.deliveryCharge), codAvailable: z.codAvailable,
    };
  });
  cache = { at: Date.now(), list };
  return list;
}

// loc = { lat, lng, pincode, city }  ->  Map(sellerId -> { distanceKm, approximate, etaDays, deliveryCharge, codAvailable })
async function resolve(loc) {
  const lat = n(loc.lat); const lng = n(loc.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const city = (loc.city || '').trim().toLowerCase();
  const pin = (loc.pincode || '').trim();
  const out = new Map();
  for (const s of await sellers()) {
    let hit = null;
    if (hasCoords && s.lat != null && s.lng != null) {
      const d = haversineKm(lat, lng, s.lat, s.lng);
      if (d <= s.radiusKm) hit = { distanceKm: Math.round(d * 10) / 10, approximate: !s.exact };
    } else if ((pin && s.pincode === pin) || (city && s.city === city)) {
      hit = { distanceKm: null, approximate: true };
    }
    if (hit) out.set(s.id, { ...hit, etaDays: s.etaDays, deliveryCharge: s.deliveryCharge, codAvailable: s.codAvailable });
  }
  return out;
}

const hasLocation = (q) => Boolean((q.lat != null && q.lng != null) || q.pincode || q.city);
const invalidate = () => { cache = { at: 0, list: null }; };

module.exports = { resolve, hasLocation, haversineKm, invalidate };
