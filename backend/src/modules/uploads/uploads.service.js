const { cloudinary, configured } = require('../../config/cloudinary');
const { AppError } = require('../../utils/apiResponse');
const { sniff, transformUrl, videoPoster } = require('../../utils/media');

const IMAGE_TYPES = ['jpeg', 'png', 'webp'];
const VIDEO_TYPES = ['mp4', 'webm'];

const ensureConfigured = () => {
  if (!configured) throw new AppError('Photo upload is not set up yet. Please contact support.', 503, { code: 'UPLOAD_NOT_CONFIGURED' });
};

const pushBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result))).end(buffer);
  });

async function uploadImage(buffer, folder) {
  ensureConfigured();
  if (!IMAGE_TYPES.includes(sniff(buffer))) throw new AppError('Only JPG, PNG or WebP photos are allowed', 415);
  const r = await pushBuffer(buffer, { folder, resource_type: 'image' });
  return { url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height, thumb: transformUrl(r.secure_url, 'thumb') };
}

async function uploadVideo(buffer, folder) {
  ensureConfigured();
  if (!VIDEO_TYPES.includes(sniff(buffer))) throw new AppError('Only MP4 or WebM videos are allowed', 415);
  const r = await pushBuffer(buffer, { folder, resource_type: 'video' });
  return { url: r.secure_url, publicId: r.public_id, durationSec: r.duration ? Math.round(r.duration) : null, poster: videoPoster(r.secure_url) };
}

// Best effort: failing to delete an old file must never fail the request
const destroy = async (publicId, resourceType = 'image') => {
  if (!configured || !publicId) return;
  try { await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }); } catch { /* ignore */ }
};

module.exports = { uploadImage, uploadVideo, destroy };
