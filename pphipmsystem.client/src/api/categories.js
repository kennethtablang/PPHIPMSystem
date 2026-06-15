import api from './axios';
export const getCategories = () => api.get('/categories');
export const createCategory = d => api.post('/categories', d);
export const updateCategory = (id, d) => api.put(`/categories/${id}`, d);
export const deleteCategory = id => api.delete(`/categories/${id}`);
