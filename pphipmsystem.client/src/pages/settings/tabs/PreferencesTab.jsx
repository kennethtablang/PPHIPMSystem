import { useState } from 'react';
import { MdTune, MdRestartAlt } from 'react-icons/md';
import { getAppPrefs, saveAppPrefs, resetAllPreferences, LANDING_OPTIONS, SESSION_TIMEOUT_OPTIONS, PAGE_SIZE_OPTIONS } from '../../../utils/appPrefs';
import { applyDisplayPrefs } from '../../../utils/displayPrefs';
import { toast } from '../../../components/common/Toast';

export default function PreferencesTab() {
  const [prefs, setPrefs] = useState(getAppPrefs);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const update = next => {
    setPrefs(next);
    saveAppPrefs(next);
    toast.success('Preferences saved.');
  };

  const doReset = () => {
    resetAllPreferences();
    applyDisplayPrefs();          // re-apply default theme/motion/density immediately
    toast.success('All preferences reset to defaults.');
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="card" style={{ padding: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MdTune size={18} color="var(--green-600)" /> Preferences
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        These preferences are saved on this device only.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
        {/* Default landing page */}
        <Row title="Default start page" desc="The page you land on after signing in.">
          <select
            className="form-control"
            style={{ width: 200 }}
            value={prefs.landingPage}
            onChange={e => update({ ...prefs, landingPage: e.target.value })}
          >
            {LANDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>

        {/* Session timeout */}
        <Row title="Auto sign-out when idle" desc="Log out automatically after a period of inactivity. Applies on your next sign-in.">
          <select
            className="form-control"
            style={{ width: 200 }}
            value={prefs.sessionTimeoutMinutes}
            onChange={e => update({ ...prefs, sessionTimeoutMinutes: Number(e.target.value) })}
          >
            {SESSION_TIMEOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>

        {/* Table page size */}
        <Row title="Rows per table page" desc="How many rows data tables (users, inventory, audit log, movements) show per page.">
          <select
            className="form-control"
            style={{ width: 200 }}
            value={prefs.tablePageSize}
            onChange={e => update({ ...prefs, tablePageSize: Number(e.target.value) })}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} rows</option>)}
          </select>
        </Row>

        {/* Notification toasts */}
        <Row title="Notification pop-ups" desc="Show toast alerts when new notifications arrive. The bell badge still updates either way.">
          <Toggle on={prefs.notificationToasts} onClick={() => update({ ...prefs, notificationToasts: !prefs.notificationToasts })} />
        </Row>

        {/* Notification sound */}
        <Row title="Notification sound" desc="Play a short chime when a new notification arrives.">
          <Toggle on={prefs.notificationSound} onClick={() => update({ ...prefs, notificationSound: !prefs.notificationSound })} />
        </Row>

        {/* Time format */}
        <Row title="24-hour time" desc="Show timestamps in 24-hour format (e.g. 14:30 instead of 2:30 PM).">
          <Toggle on={prefs.timeFormat === '24'} onClick={() => update({ ...prefs, timeFormat: prefs.timeFormat === '24' ? '12' : '24' })} />
        </Row>

        {/* Welcome banner */}
        <Row title="Dashboard welcome banner" desc="Show the greeting banner at the top of your dashboard.">
          <Toggle on={prefs.showWelcomeBanner} onClick={() => update({ ...prefs, showWelcomeBanner: !prefs.showWelcomeBanner })} />
        </Row>

        {/* Reset */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>Reset preferences</div>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
            Restore all Preferences and Display settings on this device to their defaults.
          </p>
          {confirmingReset ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Are you sure?</span>
              <button className="btn btn-danger" onClick={doReset}>Yes, reset</button>
              <button className="btn btn-secondary" onClick={() => setConfirmingReset(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setConfirmingReset(true)}>
              <MdRestartAlt size={16} /> Reset to defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: 20, borderRadius: 12,
      background: 'var(--bg-muted)', border: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{title}</div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
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
  );
}
