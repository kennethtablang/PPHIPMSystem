import api from './axios';

// Department appropriations per fiscal year (calendar year). The server returns
// a row for every department — budgeted or not — with spend derived from the
// purchase orders raised against that department's requests.
export const getBudgets = (year, departmentId = null) =>
  api.get('/departmentbudgets', { params: { year, ...(departmentId ? { departmentId } : {}) } });

// "Can this department still afford this request?" — estimated value of the
// request weighed against what is left of its budget.
export const checkRequestBudget = requestId => api.get(`/departmentbudgets/check/${requestId}`);

export const saveBudget = d => api.post('/departmentbudgets', d);
export const deleteBudget = id => api.delete(`/departmentbudgets/${id}`);
