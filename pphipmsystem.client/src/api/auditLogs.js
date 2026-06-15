import api from './axios';
export const getAuditLogs = (p = {}) => api.get('/auditlogs', { params: p });
