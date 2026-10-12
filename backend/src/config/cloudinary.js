const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

const { cloudName, apiKey, apiSecret } = env.cloudinary;
const configured = Boolean(cloudName && apiKey && apiSecret);
if (configured) cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

module.exports = { cloudinary, configured, cloudName };
