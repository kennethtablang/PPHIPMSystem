import api from './axios';
export const getDepartmentStock = (departmentId = null) =>
  api.get('/departmentstock', { params: departmentId ? { departmentId } : {} });

// Ward-level usage: draws down the department's balance only. Central stock on
// hand is untouched (it left the storeroom at issuance).
export const recordConsumption = d => api.post('/departmentstock/consume', d);

// Ward-to-ward handover: source balance down, destination balance up. Central
// stock on hand is untouched — the units never come back to the storeroom.
export const transferStock = d => api.post('/departmentstock/transfer', d);
