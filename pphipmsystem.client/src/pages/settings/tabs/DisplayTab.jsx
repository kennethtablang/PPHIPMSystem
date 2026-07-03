import { useState } from 'react';
import { MdPalette, MdLightMode, MdDarkMode, MdSettingsBrightness } from 'react-icons/md';
import { getDisplayPrefs, saveDisplayPrefs } from '../../../utils/displayPrefs';
import { toast } from '../../../components/common/Toast';

const OPTIONS = [
  { key: 'reduceMotion', title: 'Reduce motion', desc: 'Minimize animations and transitions across the app.' },
  { key: 'compactTables', title: 'Compact tables', desc: 'Tighter row spacing to fit more data on screen.' },
  { key: 'sidebarCollapsed', title: 'Start with sidebar collapsed', desc: 'Open the app with the sidebar minimized to icons. Applies on next load.' },
];

const THEMES = [
  { value: 'light', label: 'Light', Icon: MdLightMode },
  { value: 'dark', label: 'Dark', Icon: MdDarkMode },
  { value: 'system', label: 'System', Icon: MdSettingsBrightness },
];

export default function DisplayTab() {
  const [prefs, setPrefs] = useState(getDisplayPrefs);

  const update = next => {
    setPrefs(next);
    saveDisplayPrefs(next);
    toast.success('Display preferences saved.');
  };

  const toggle = key => update({ ...prefs, [key]: !prefs[key] });
  const setTheme = theme => update({ ...prefs, theme });

  return (
    <div className="card" style={{ padding: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MdPalette size={18} color="var(--green-600)" /> Appearance
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        These preferences are saved on this device only.
      </p>

      {/* Theme selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>Theme</div>
        <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: 13 }}>
          Choose light, dark, or match your device.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEMES.map(t => {
            const on = (prefs.theme ?? 'system') === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={on}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  background: on ? 'var(--green-50)' : 'var(--bg-muted)',
                  color: on ? 'var(--green-700)' : 'var(--text-secondary)',
                  border: `1.5px solid ${on ? 'var(--green-500)' : 'var(--border)'}`,
                  transition: 'all .15s ease',
                }}
              >
                <t.Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map(o => {
          const on = prefs[o.key];
          return (
            <div key={o.key} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: 20, borderRadius: 12,
              background: on ? 'rgba(79,208,122,.08)' : 'var(--bg-muted)',
              border: `1px solid ${on ? 'rgba(79,208,122,.3)' : 'var(--border)'}`,
              transition: 'all .2s ease',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{o.title}</div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{o.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggle(o.key)}
                style={{
                  flexShrink: 0, width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: on ? 'var(--green-500)' : 'var(--border)',
                  position: 'relative', transition: 'background .2s ease',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: on ? 23 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s ease',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
