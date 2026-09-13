import { useEffect, useState } from 'react';

/* ── Series palette ───────────────────────────────────────────────────────────
   Two theme-specific slot orders drawn from the app's own green/blue/amber
   ramps. Both were run through the dataviz palette validator (lightness band,
   chroma floor, protan/deutan separation, normal-vision floor, contrast vs the
   chart surface) and pass every check — light on #ffffff, dark on #18241d.
   Slots are assigned in fixed order and never cycled: no chart here carries
   more than two series, so slot 3 is held in reserve.                        */
const PALETTE = {
  light: {
    series: ['#1f8042', '#2563eb', '#b45309'],
    grid: '#e2efe7',
    axis: '#7a9484',
    surface: '#ffffff',
  },
  dark: {
    series: ['#2ba658', '#4d94f0', '#c4800a'],
    grid: '#263a2e',
    axis: '#7f9a89',
    surface: '#18241d',
  },
};

// Recharts needs literal colors, not CSS variables, so the palette can't come
// from index.css — track the theme attribute instead and re-render on change.
export function useChartPalette() {
  const [theme, setTheme] = useState(
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() =>
      setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light'));
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return PALETTE[theme];
}

// ── Formatters ───────────────────────────────────────────────────────────────

export const fmtQty = v => (v == null ? '—' : Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 }));
export const fmtPeso = v => (v == null ? '—' : `₱${Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`);
export const fmtCount = v => (v == null ? '—' : Number(v).toLocaleString('en-PH'));

export const truncate = (s, n) => (s?.length > n ? `${s.slice(0, n - 1)}…` : s ?? '');
