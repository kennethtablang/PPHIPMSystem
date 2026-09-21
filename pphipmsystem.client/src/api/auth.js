import api from './axios';
export const login = d => api.post('/auth/login', d);
export const changePassword = d => api.post('/auth/change-password', d);
export const forgotPassword = email => api.post('/auth/forgot-password', { email });
export const resetPasswordWithToken = d => api.post('/auth/reset-password-token', d);
export const login2Fa = d => api.post('/auth/login-2fa', d);
export const setupAuthenticator = () => api.post('/auth/authenticator/setup');
export const confirmAuthenticator = code => api.post('/auth/authenticator/confirm', { code });
export const removeAuthenticator = () => api.post('/auth/authenticator/remove');
