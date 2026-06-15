import api from './axios';
export const login = d => api.post('/auth/login', d);
export const changePassword = d => api.post('/auth/change-password', d);
export const resetPassword = (uid, pwd) => api.post(`/auth/reset-password/${uid}`, JSON.stringify(pwd), { headers: { 'Content-Type': 'application/json' } });
