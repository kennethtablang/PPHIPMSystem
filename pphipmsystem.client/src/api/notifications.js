import api from './axios';
export const getNotifications = (p = {}) => api.get('/notifications', { params: p });
export const getUnreadCount = () => api.get('/notifications/count');
export const markRead = id => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');
// Unread counts per record type, for the sidebar "N New" badges.
export const getNotificationSummary = () => api.get('/notifications/summary');
// Marks every unread notice about one record read (the user opened it).
export const markReferenceRead = (type, id) => api.patch('/notifications/read-reference', null, { params: { type, id } });

// Window event fired after notifications are marked read so the topbar badge re-syncs.
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

// Call when a record is opened: clears its notifications and re-syncs badges.
export const markSeen = (type, id) => {
  if (!type || id == null) return;
  markReferenceRead(type, id).then(notifyNotificationsChanged).catch(() => {});
};
