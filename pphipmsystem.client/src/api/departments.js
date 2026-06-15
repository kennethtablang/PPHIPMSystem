import api from './axios';
export const getDepartments = () => api.get('/departments');
export const createDepartment = d => api.post('/departments', d);
export const updateDepartment = (id, d) => api.put(`/departments/${id}`, d);
export const deleteDepartment = id => api.delete(`/departments/${id}`);
