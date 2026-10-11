import api from './api';

const data = (p) => p.then((r) => r.data);

export const locationService = {
  search: (q) => data(api.get('/locations/search', { params: { q } })),
  popular: () => data(api.get('/locations/popular')),
  reverse: (lat, lng) => data(api.get('/locations/reverse', { params: { lat, lng } })),
  serviceability: (params) => data(api.get('/locations/serviceability', { params })),
  mine: () => data(api.get('/locations/me')),
  saveMine: (locationId) => data(api.put('/locations/me', { locationId })),
};
