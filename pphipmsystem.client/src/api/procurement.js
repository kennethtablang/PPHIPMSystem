import api from './axios';
export const getRequests = (p = {}) => api.get('/procurement', { params: p });
export const getRequest = id => api.get(`/procurement/${id}`);
export const createRequest = d => api.post('/procurement', d);
export const updateRequest = (id, d) => api.put(`/procurement/${id}`, d);
export const cancelRequest = (id, reason) => api.patch(`/procurement/${id}/cancel`, { reason });
export const submitRequest = id => api.patch(`/procurement/${id}/submit`);
export const releaseRequest = id => api.patch(`/procurement/${id}/release`);
// Inventory Officer's fair-share allocation board
export const getAllocation = () => api.get('/procurement/allocation');
export const saveAllocation = lines => api.put('/procurement/allocation', { lines });
export const approveRequest = (id, d) => api.patch(`/procurement/${id}/approve`, d);
export const generatePO = (id, d) => api.post(`/procurement/${id}/purchase-order`, d);
export const getPurchaseOrders = () => api.get('/procurement/purchase-orders');
export const getPurchaseOrder = id => api.get(`/procurement/purchase-orders/${id}`);
export const confirmDelivery = (id, body = { lines: [] }) => api.patch(`/procurement/purchase-orders/${id}/confirm-delivery`, body);

// Attachments (quotes, canvass sheets, supporting documents)
export const getAttachments = requestId => api.get(`/procurement/${requestId}/attachments`);
export const uploadAttachment = (requestId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/procurement/${requestId}/attachments`, form);
};
export const downloadAttachment = id => api.get(`/procurement/attachments/${id}/download`, { responseType: 'blob' });
export const deleteAttachment = id => api.delete(`/procurement/attachments/${id}`);
