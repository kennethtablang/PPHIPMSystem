import api from './axios';
export const getSuppliers = (p = {}) => api.get('/suppliers', { params: p });
export const getSupplier = id => api.get(`/suppliers/${id}`);
export const getSupplierOrders = id => api.get(`/suppliers/${id}/orders`);
export const createSupplier = d => api.post('/suppliers', d);
export const updateSupplier = (id, d) => api.put(`/suppliers/${id}`, d);
export const updateAccreditation = (id, d) => api.patch(`/suppliers/${id}/accreditation`, d);
export const deleteSupplier = id => api.delete(`/suppliers/${id}`);
