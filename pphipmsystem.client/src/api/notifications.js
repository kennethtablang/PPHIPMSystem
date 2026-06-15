import api from './axios';
export const getNotifications = (p = {}) => api.get('/notifications', { params: p });
export const getUnreadCount = () => api.get('/notifications/count');
export const markRead = id => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');
