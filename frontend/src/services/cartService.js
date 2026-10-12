import api from './api';

const data = (p) => p.then((r) => r.data);

// params = the customer's location (lat/lng/pincode/city) so the cart can flag items that cannot be delivered there
export const cartService = {
  get: (params) => data(api.get('/cart', { params })),
  count: () => data(api.get('/cart/count')),
  add: (body, params) => data(api.post('/cart/items', body, { params })),
  setQty: (itemId, quantity, params) => data(api.patch(`/cart/items/${itemId}`, { quantity }, { params })),
  remove: (itemId, params) => data(api.delete(`/cart/items/${itemId}`, { params })),
  clear: () => data(api.delete('/cart')),
  merge: (items, params) => data(api.post('/cart/merge', { items }, { params })),
  preview: (items, params) => data(api.post('/cart/preview', { items }, { params })),
};
