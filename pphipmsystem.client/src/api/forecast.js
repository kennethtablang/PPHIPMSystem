import api from './axios';
export const getForecasts = (p = {}) => api.get('/forecast', { params: p });
export const generateForecast = (itemId, periodCount = 3) => api.post('/forecast/generate', { inventoryItemId: itemId, periodCount });
export const getConsumptionRecords = ({ itemId } = {}) => api.get(`/forecast/consumption/${itemId}`);
export const getConsumption = id => api.get(`/forecast/consumption/${id}`);
export const upsertConsumption = d => api.post('/forecast/consumption', d);
export const syncConsumption = itemId => api.post(`/forecast/consumption/${itemId}/sync`);
