import api from './api';

const data = (p) => p.then((r) => r.data);

export const orderService = {
  quote: (addressId) => data(api.get('/orders/quote', { params: { addressId } })),
  place: (body) => data(api.post('/orders', body)),
  list: (params) => data(api.get('/orders', { params })),
  detail: (id) => data(api.get(`/orders/${id}`)),
  cancel: (id, reason) => data(api.post(`/orders/${id}/cancel`, { reason })),

  sellerList: (params) => data(api.get('/orders/seller', { params })),
  sellerDetail: (id) => data(api.get(`/orders/seller/${id}`)),
  sellerStatus: (id, status) => data(api.post(`/orders/seller/${id}/status`, { status })),
  sellerCancel: (id, reason) => data(api.post(`/orders/seller/${id}/cancel`, { reason })),
};
