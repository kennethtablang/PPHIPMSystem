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

// ASP.NET model validation returns ProblemDetails ({ title, errors: { Field: [..] } })
// with no `message`. Pages read `err.response.data.message`, so lift the first
// validation error into it instead of showing a generic failure.
const normalizeErrorMessage = err => {
  const data = err.response?.data;
  if (!data || typeof data !== 'object' || data instanceof Blob || data.message) return;
  const first = data.errors && Object.values(data.errors).flat()[0];
  if (first) data.message = first;
  else if (err.response.status === 403) data.message = 'You do not have permission to perform this action.';
};

api.interceptors.response.use(
  r => r,
  async err => {
    normalizeErrorMessage(err);

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
        // Still reject: resolving with undefined crashes callers reading `res.data`.
        return Promise.reject(err);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
