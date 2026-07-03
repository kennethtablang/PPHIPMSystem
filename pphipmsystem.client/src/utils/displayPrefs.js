// Client-side display preferences, persisted to localStorage and reflected as
// data-attributes on <html> so CSS can react (see index.css). These are purely
// cosmetic and per-device, so they don't belong on the server profile.

const KEY = 'displayPrefs';
const DEFAULTS = { theme: 'system', reduceMotion: false, compactTables: false, sidebarCollapsed: false };

export function getDisplayPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

// Resolves 'system' to the OS preference; 'light'/'dark' pass through.
function resolveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyDisplayPrefs(prefs = getDisplayPrefs()) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(prefs.theme);
  root.dataset.reduceMotion = String(prefs.reduceMotion);
  root.dataset.density = prefs.compactTables ? 'compact' : 'comfortable';
}

export function saveDisplayPrefs(prefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  applyDisplayPrefs(prefs);
}

// Re-apply the theme when the OS switches light/dark, but only while the user
// has chosen "system". Safe to call multiple times.
let mediaBound = false;
export function initThemeSync() {
  if (mediaBound || !window.matchMedia) return;
  mediaBound = true;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getDisplayPrefs().theme === 'system') applyDisplayPrefs();
  });
}
