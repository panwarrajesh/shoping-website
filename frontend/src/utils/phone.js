export const cleanMobile = (v) => String(v || '').replace(/\D/g, '').slice(-10);
export const isValidMobile = (v) => /^[6-9]\d{9}$/.test(cleanMobile(v));
