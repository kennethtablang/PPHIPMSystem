import api from './axios';
export const getAdjustments = (p = {}) => api.get('/stockadjustments', { params: p });
export const getAdjustment = id => api.get(`/stockadjustments/${id}`);
export const createAdjustment = d => api.post('/stockadjustments', d);
export const approveAdjustment = (id, d) => api.patch(`/stockadjustments/${id}/approve`, d);
