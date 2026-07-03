import api from './axios';

export const getBackups = () => api.get('/backup');
export const runBackup = () => api.post('/backup/run');
export const deleteBackup = id => api.delete(`/backup/${id}`);
export const downloadBackup = id => api.get(`/backup/${id}/download`, { responseType: 'blob' });
export const getBackupSchedule = () => api.get('/backup/schedule');
export const updateBackupSchedule = time => api.put('/backup/schedule', { time });
