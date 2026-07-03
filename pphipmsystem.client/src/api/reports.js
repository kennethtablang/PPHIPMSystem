import api from './axios';
export const getConsumptionReport = (p = {}) => api.get('/reports/consumption', { params: p });
export const getProcurementReport = (p = {}) => api.get('/reports/procurement', { params: p });
export const getForecastAccuracyReport = (p = {}) => api.get('/reports/forecast-accuracy', { params: p });

// Excel document exports — returns the .xlsx as a blob and triggers a download.
const downloadBlob = (data, headers, fallbackName) => {
  const name = /filename="?([^";]+)"?/.exec(headers['content-disposition'] ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportReportExcel = async (type, p = {}) => {
  // type: 'consumption' | 'procurement' | 'forecast-accuracy'
  const res = await api.get(`/reports/${type}/export`, { params: p, responseType: 'blob' });
  downloadBlob(res.data, res.headers, `${type}-report.xlsx`);
};

export const exportInventorySnapshot = async () => {
  const res = await api.get('/reports/inventory-snapshot/export', { responseType: 'blob' });
  downloadBlob(res.data, res.headers, 'inventory-snapshot.xlsx');
};

export const exportDisposalCertificate = async (startDate, endDate) => {
  const res = await api.get('/reports/disposals/export', { params: { startDate, endDate }, responseType: 'blob' });
  downloadBlob(res.data, res.headers, 'disposal-certificate.xlsx');
};

// LGU forms for a procurement request
export const exportRisForm = async id => {
  const res = await api.get(`/reports/requests/${id}/ris`, { responseType: 'blob' });
  downloadBlob(res.data, res.headers, `ris-${id}.xlsx`);
};
export const exportPurchaseRequestForm = async id => {
  const res = await api.get(`/reports/requests/${id}/purchase-request`, { responseType: 'blob' });
  downloadBlob(res.data, res.headers, `purchase-request-${id}.xlsx`);
};
