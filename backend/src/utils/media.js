const env = require('../config/env');

// Cloudinary delivery presets: one uploaded original, many optimized sizes (auto format + auto quality)
const PRESETS = {
  thumb: 'c_fill,w_160,h_160,f_auto,q_auto',
  card: 'c_fill,w_480,h_480,f_auto,q_auto',
  detail: 'c_limit,w_1000,f_auto,q_auto',
  full: 'c_limit,w_1600,f_auto,q_auto',
};

const transformUrl = (url, preset = 'card') =>
  url && url.includes('/upload/') ? url.replace('/upload/', `/upload/${PRESETS[preset]}/`) : url;

const videoPoster = (url) =>
  url && url.includes('/upload/') ? url.replace('/upload/', '/upload/so_0,w_900,f_jpg/').replace(/\.\w+$/, '.jpg') : null;

// A client may only attach media that WE uploaded for THIS seller (stops hotlinking / foreign URLs).
const isOwnMedia = (url, publicId, folderPrefix) =>
  Boolean(env.cloudinary.cloudName) &&
  typeof url === 'string' && typeof publicId === 'string' &&
  url.startsWith(`https://res.cloudinary.com/${env.cloudinary.cloudName}/`) &&
  publicId.startsWith(folderPrefix) && !publicId.includes('..') && url.includes(publicId);

// Real file type from the first bytes (the browser-supplied mimetype can be faked)
const sniff = (b) => {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  return null;
};

module.exports = { transformUrl, videoPoster, isOwnMedia, sniff, PRESETS };
