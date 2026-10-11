import api from './api';

const data = (p) => p.then((r) => r.data);

export const sellerService = {
  register: (body) => data(api.post('/sellers/register', body)),
  me: () => data(api.get('/sellers/me')),
  dashboard: () => data(api.get('/sellers/me/dashboard')),
  updateProfile: (body) => data(api.patch('/sellers/me', body)),
  updateDelivery: (body) => data(api.put('/sellers/me/delivery', body)),
  updatePayout: (body) => data(api.put('/sellers/me/payout', body)),
  submitKyc: (body) => data(api.put('/sellers/me/kyc', body)),
};
