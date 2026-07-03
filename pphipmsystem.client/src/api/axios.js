import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Single-flight refresh: when several requests 401 at once, only one refresh
// call goes out and the rest wait on the same promise.
let refreshing = null;

const refreshSession = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('no refresh token');
  // Plain axios (not `api`) so a failure here can't recurse into this interceptor.
  const { data } = await axios.post('/api/auth/refresh', { refreshToken });
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data));
  return data.token;
};

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config;
    const status = err.response?.status;

    // Try a silent refresh exactly once per request; auth endpoints excluded
    // (a failed login/refresh must not trigger another refresh).
    if (status === 401 && !original._retried && !original.url?.startsWith('/auth/')) {
      original._retried = true;
      try {
        refreshing ??= refreshSession().finally(() => { refreshing = null; });
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
