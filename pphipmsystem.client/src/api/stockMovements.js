import api from './axios';
export const getMovements = (p = {}) => api.get('/stockmovements', { params: p });
export const createMovement = d => api.post('/stockmovements', d);
