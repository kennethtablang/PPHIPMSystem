import api from './axios';
export const getDashboard = () => api.get('/inventory/dashboard');
export const getItems = (p = {}) => api.get('/inventory', { params: p });
export const getItem = id => api.get(`/inventory/${id}`);
export const createItem = d => api.post('/inventory', d);
export const updateItem = (id, d) => api.put(`/inventory/${id}`, d);
export const deleteItem = id => api.delete(`/inventory/${id}`);

// Bulk import from spreadsheet
const asForm = file => { const f = new FormData(); f.append('file', file); return f; };
export const importPreview = file => api.post('/inventory/import/preview', asForm(file));
export const importItems = file => api.post('/inventory/import', asForm(file));
export const downloadImportTemplate = async () => {
  const res = await api.get('/inventory/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'item-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Duplicate items: review groups, live "similar items" check, and merge.
export const getDuplicateGroups = () => api.get('/inventory/duplicates');
export const getSimilarItems = p => api.get('/inventory/similar', { params: p });
export const mergeItems = d => api.post('/inventory/merge', d);
