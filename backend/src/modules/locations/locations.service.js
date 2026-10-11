const repo = require('./locations.repository');
const serviceArea = require('./serviceArea');
const { AppError } = require('../../utils/apiResponse');

const REVERSE_MAX_KM = 25; // GPS point must be this close to a known place to be named after it
const num = (v) => (v == null ? null : Number(v));

const toView = (l) => ({
  id: l.id, city: l.city, area: l.area, state: l.state, pincode: l.pincode,
  label: l.area ? `${l.area}, ${l.city}` : l.city,
  latitude: num(l.latitude), longitude: num(l.longitude),
});

let coordCache = { at: 0, rows: null };
const knownPlaces = async () => {
  if (!coordCache.rows || Date.now() - coordCache.at > 5 * 60 * 1000) coordCache = { at: Date.now(), rows: await repo.withCoords() };
  return coordCache.rows;
};

async function search(q, limit) {
  const text = (q || '').trim();
  const rows = text.length >= 2 || /^\d+$/.test(text) ? await repo.search(text, limit) : await repo.popular(limit);
  return rows.map(toView);
}

const popular = async (limit = 12) => (await repo.popular(limit)).map(toView);
const byPincode = async (pincode) => (await repo.byPincode(pincode)).map(toView);

// GPS point -> nearest known place (if close enough). Without a maps provider we only name places we know.
async function reverse(lat, lng) {
  let best = null;
  for (const l of await knownPlaces()) {
    const d = serviceArea.haversineKm(lat, lng, Number(l.latitude), Number(l.longitude));
    if (d <= REVERSE_MAX_KM && (!best || d < best.d)) best = { l, d };
  }
  return best ? { location: toView(best.l), distanceKm: Math.round(best.d * 10) / 10 } : { location: null };
}

async function getMine(userId) {
  const p = await repo.getDefault(userId);
  return p?.defaultLocation && p.defaultLocation.isActive ? toView(p.defaultLocation) : null;
}

async function saveMine(userId, locationId) {
  const l = await repo.findActive(locationId);
  if (!l) throw new AppError('Location not found', 404);
  await repo.setDefault(userId, locationId);
  return toView(l);
}

// "How many sellers deliver here?" shown right after a customer picks an area
async function serviceability(loc) {
  const area = await serviceArea.resolve(loc);
  const ids = [...area.keys()];
  return { sellerCount: ids.length, productCount: ids.length ? await repo.countLiveProducts(ids) : 0 };
}

module.exports = { toView, search, popular, byPincode, reverse, getMine, saveMine, serviceability };
