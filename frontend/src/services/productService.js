import api from './api';

const data = (p) => p.then((r) => r.data);
const form = (file) => { const fd = new FormData(); fd.append('file', file); return fd; };
const upload = (url, file, onProgress, method = 'post') =>
  data(api[method](url, form(file), {
    timeout: 120000,
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || file.size))),
  }));

export const productService = {
  home: (params) => data(api.get('/products/home', { params })),
  list: (params) => data(api.get('/products', { params })),
  detail: (id, params) => data(api.get(`/products/${id}`, { params })),

  mine: (params) => data(api.get('/products/mine', { params })),
  mineOne: (id) => data(api.get(`/products/mine/${id}`)),
  inventory: (params) => data(api.get('/products/mine/inventory', { params })),
  setStock: (variantId, quantity) => data(api.put(`/products/variants/${variantId}/stock`, { quantity })),
  create: (body) => data(api.post('/products', body)),
  update: (id, body) => data(api.put(`/products/${id}`, body)),
  remove: (id) => data(api.delete(`/products/${id}`)),

  uploadImage: (file, onProgress) => upload('/uploads/product-image', file, onProgress),
  uploadVideo: (file, onProgress) => upload('/uploads/product-video', file, onProgress),
  uploadLogo: (file) => upload('/uploads/seller-logo', file, undefined, 'put'),
};
