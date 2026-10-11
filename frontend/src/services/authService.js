import api from './api';

const data = (p) => p.then((r) => r.data);

export const authService = {
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  sendOtp: (body) => data(api.post('/auth/otp/send', body)),
  verifyOtp: (body) => data(api.post('/auth/otp/verify', body)),
  resetPassword: (body) => data(api.post('/auth/reset-password', body)),
  logout: () => data(api.post('/auth/logout')),
  me: () => data(api.get('/auth/me')),
};
