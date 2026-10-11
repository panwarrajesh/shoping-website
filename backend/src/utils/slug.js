const crypto = require('crypto');

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'store';
// Random suffix keeps slugs unique and un-guessable
const uniqueSlug = (base) => `${slugify(base)}-${crypto.randomBytes(2).toString('hex')}`;

module.exports = { slugify, uniqueSlug };
