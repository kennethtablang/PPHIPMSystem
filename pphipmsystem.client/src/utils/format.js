import { getAppPrefs } from './appPrefs';

// Centralized date/time formatting so the "24-hour time" preference applies
// consistently everywhere. Use fmtDateTime for timestamps (date + time) and
// fmtDate for date-only values.

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', { hour12: getAppPrefs().timeFormat !== '24' });
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH');
}
