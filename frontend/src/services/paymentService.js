import api from './api';

const data = (p) => p.then((r) => r.data);

export const paymentService = {
  config: () => data(api.get('/payments/config')),
  create: (orderIds) => data(api.post('/payments/create', { orderIds })),
  verify: (body) => data(api.post('/payments/verify', body)),
};
