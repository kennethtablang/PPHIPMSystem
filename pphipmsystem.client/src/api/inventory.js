import api from './axios';
export const getDashboard = () => api.get('/inventory/dashboard');
export const getItems = (p = {}) => api.get('/inventory', { params: p });
export const getItem = id => api.get(`/inventory/${id}`);
export const createItem = d => api.post('/inventory', d);
export const updateItem = (id, d) => api.put(`/inventory/${id}`, d);
export const deleteItem = id => api.delete(`/inventory/${id}`);
