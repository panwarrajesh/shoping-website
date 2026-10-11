// Normalizes Indian mobile numbers to the 10-digit form. Returns null if invalid.
const normalizeMobile = (input) => {
  if (input == null) return null;
  let d = String(input).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};

module.exports = { normalizeMobile };
