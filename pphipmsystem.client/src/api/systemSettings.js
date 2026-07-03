import api from './axios';

export const getSystemSettings = () => api.get('/systemsettings');
export const updateSystemSettings = d => api.put('/systemsettings', d);
// Anonymous — usable on the reset-password page before login.
export const getPasswordPolicy = () => api.get('/systemsettings/password-policy');
