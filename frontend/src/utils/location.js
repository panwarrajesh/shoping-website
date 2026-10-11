// The customer's chosen place -> the query params the API understands
export const locationParams = (loc) => {
  if (!loc) return {};
  const p = {};
  if (loc.latitude != null && loc.longitude != null) { p.lat = loc.latitude; p.lng = loc.longitude; }
  if (loc.pincode) p.pincode = loc.pincode;
  if (loc.city) p.city = loc.city;
  return p;
};
