const crypto = require('crypto');
const env = require('../config/env');

// AES-256-GCM: authenticated encryption. Output = base64(iv | authTag | ciphertext).
const KEY = Buffer.from(env.encryptionKey, 'hex');

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
};

const decrypt = (payload) => {
  const buf = Buffer.from(payload, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
};

// Returns null instead of throwing when data is missing or the key changed
const safeDecrypt = (payload) => {
  if (!payload) return null;
  try { return decrypt(payload); } catch { return null; }
};

module.exports = { encrypt, decrypt, safeDecrypt };
