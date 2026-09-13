import api from './axios';

export const getBackups = () => api.get('/backup');
export const runBackup = () => api.post('/backup/run');
export const deleteBackup = id => api.delete(`/backup/${id}`);
export const downloadBackup = (id, format = 'xlsx') => api.get(`/backup/${id}/download`, { params: { format }, responseType: 'blob' });
export const verifyBackup = id => api.post(`/backup/${id}/verify`);
export const getBackupSchedule = () => api.get('/backup/schedule');
export const updateBackupSchedule = time => api.put('/backup/schedule', { time });
