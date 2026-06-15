import api from './axios';
export const getForecasts = (p = {}) => api.get('/forecast', { params: p });
export const generateForecast = itemId => api.post('/forecast/generate', { itemId });
export const getConsumptionRecords = (p = {}) => api.get('/forecast/consumption', { params: p });
export const getConsumption = id => api.get(`/forecast/consumption/${id}`);
export const upsertConsumption = d => api.post('/forecast/consumption', d);
