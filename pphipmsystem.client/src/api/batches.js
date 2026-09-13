import api from './axios';
export const getAllBatches = () => api.get('/itembatches');
export const getBatchesByItem = id => api.get(`/itembatches/by-item/${id}`);
export const getExpiringBatches = days => api.get('/itembatches/expiring', { params: { warningDays: days } });
export const createBatch = d => api.post('/itembatches', d);
// All-or-nothing multi-line receipt: { batches: [ …createBatch payloads ] }
export const receiveBatches = batches => api.post('/itembatches/bulk', { batches });
export const updateBatchDetails = (id, d) => api.patch(`/itembatches/${id}`, d);
export const disposeBatch = (id, reason) => api.patch(`/itembatches/${id}/dispose`, JSON.stringify(reason), { headers: { 'Content-Type': 'application/json' } });
export const disposeExpired = reason => api.post('/itembatches/dispose-expired', JSON.stringify(reason), { headers: { 'Content-Type': 'application/json' } });
