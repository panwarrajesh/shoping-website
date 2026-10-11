import axios from 'axios';

// Centralized API layer. The access token lives only in memory (never localStorage),
// the refresh token lives in an httpOnly cookie that JavaScript cannot read.
let accessToken = null;
let handlers = {};
let refreshing = null;

export const setAccessToken = (t) => { accessToken = t; };
export const setAuthHandlers = (h) => { handlers = h; };

const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One refresh at a time, even if many requests fail together
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = axios.post('/api/auth/refresh', null, { withCredentials: true, timeout: 20000 })
      .then((r) => { const d = r.data.data; accessToken = d.accessToken; handlers.onRefresh?.(d); return d; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

const normalize = (err) => ({
  status: err.response?.status,
  message: err.response?.data?.message || 'Internet connection check karo aur dobara try karo.',
  code: err.response?.data?.error?.code,
  fields: err.response?.data?.error?.fieldErrors,
  details: err.response?.data?.error,
});

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (response?.status === 401 && !config._retry && !isAuthCall && accessToken) {
      config._retry = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        accessToken = null;
        handlers.onFail?.();
      }
    }
    return Promise.reject(normalize(error));
  }
);

export default api;
