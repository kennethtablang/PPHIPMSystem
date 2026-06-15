import api from './axios';
export const getAllBatches = () => api.get('/itembatches');
export const getBatchesByItem = id => api.get(`/itembatches/by-item/${id}`);
export const getExpiringBatches = days => api.get('/itembatches/expiring', { params: { warningDays: days } });
export const createBatch = d => api.post('/itembatches', d);
export const disposeBatch = id => api.patch(`/itembatches/${id}/dispose`);
