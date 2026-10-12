import api from './api';

const data = (p) => p.then((r) => r.data);

export const customerService = {
  me: () => data(api.get('/customers/me')),
  updateProfile: (body) => data(api.patch('/customers/me', body)),
  changePassword: (body) => data(api.post('/customers/me/change-password', body)),

  addresses: () => data(api.get('/customers/me/addresses')),
  addAddress: (body) => data(api.post('/customers/me/addresses', body)),
  updateAddress: (id, body) => data(api.patch(`/customers/me/addresses/${id}`, body)),
  setDefaultAddress: (id) => data(api.post(`/customers/me/addresses/${id}/default`)),
  deleteAddress: (id) => data(api.delete(`/customers/me/addresses/${id}`)),

  wishlist: (page = 1) => data(api.get('/customers/me/wishlist', { params: { page, limit: 20 } })),
  wishlistIds: () => data(api.get('/customers/me/wishlist/ids')),
  addToWishlist: (productId) => data(api.put(`/customers/me/wishlist/${productId}`)),
  removeFromWishlist: (productId) => data(api.delete(`/customers/me/wishlist/${productId}`)),
};

export const notificationService = {
  list: (page = 1) => data(api.get('/notifications', { params: { page, limit: 20 } })),
  unreadCount: () => data(api.get('/notifications/unread-count')),
  markRead: (id) => data(api.post(`/notifications/${id}/read`)),
  markAllRead: () => data(api.post('/notifications/read-all')),
};

export const categoryService = {
  tree: () => data(api.get('/categories')),
};
