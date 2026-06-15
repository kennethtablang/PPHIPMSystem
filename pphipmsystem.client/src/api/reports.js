import api from './axios';
export const getConsumptionReport = (p = {}) => api.get('/reports/consumption', { params: p });
export const getProcurementReport = (p = {}) => api.get('/reports/procurement', { params: p });
export const getForecastAccuracyReport = (p = {}) => api.get('/reports/forecast-accuracy', { params: p });
