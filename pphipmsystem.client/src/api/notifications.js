import api from './axios';
export const getNotifications = (p = {}) => api.get('/notifications', { params: p });
export const getUnreadCount = () => api.get('/notifications/count');
export const markRead = id => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');

// Window event fired after notifications are marked read so the topbar badge re-syncs.
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
