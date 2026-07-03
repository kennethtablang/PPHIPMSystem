// Per-device behavioural preferences (as opposed to appearance — see displayPrefs.js).
// Stored in localStorage; each is read at the point it takes effect.

const KEY = 'appPrefs';
const LAST_PATH_KEY = 'lastPath';
const DEFAULTS = {
  landingPage: '/dashboard',        // where "/" redirects after login ('last' = resume)
  sessionTimeoutMinutes: 30,        // idle auto-logout; 0 = never
  notificationToasts: true,         // show pop-up toasts for real-time notifications
  notificationSound: false,         // play a chime when a notification arrives
  timeFormat: '12',                 // '12' or '24' — used by utils/format.js
  showWelcomeBanner: true,          // show the greeting banner on the dashboard
  tablePageSize: 25,                // rows per page in data tables — see usePagination
};

// Landing pages safe for every authenticated role (no admin/role route guard),
// avoiding redirect loops.
export const LANDING_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/inventory', label: 'Inventory Items' },
  { value: '/reports', label: 'Reports' },
  { value: '/notifications', label: 'Notifications' },
  { value: 'last', label: 'Last visited page' },
];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
];

export function getAppPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppPrefs(prefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

// Track the last visited app route so the "Last visited page" landing option can resume it.
export function rememberLastPath(path) {
  if (path && path !== '/') localStorage.setItem(LAST_PATH_KEY, path);
}

// The actual path "/" should redirect to, resolving the 'last' option.
export function getResolvedLandingPage() {
  const { landingPage } = getAppPrefs();
  if (landingPage === 'last') return localStorage.getItem(LAST_PATH_KEY) || '/dashboard';
  return landingPage;
}

// Clear all client-side preferences (this store, display prefs, and last path).
export function resetAllPreferences() {
  localStorage.removeItem(KEY);
  localStorage.removeItem('displayPrefs');
  localStorage.removeItem(LAST_PATH_KEY);
}
