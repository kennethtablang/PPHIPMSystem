import { useState, useEffect } from 'react';
import { MdDns, MdSave, MdInventory2, MdLock, MdCampaign, MdStorage } from 'react-icons/md';
import { getSystemSettings, updateSystemSettings } from '../../../api/systemSettings';
import { toast } from '../../../components/common/Toast';

export default function SystemTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSystemSettings()
      .then(r => setSettings(r.data))
      .catch(() => toast.error('Failed to load system settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setSettings(s => ({ ...s, [k]: e.target.value }));
  const toggle = k => () => setSettings(s => ({ ...s, [k]: !s[k] }));

  const save = async () => {
    if (!settings.organizationName.trim()) { toast.error('Organization name is required.'); return; }
    const minLen = Number(settings.passwordMinLength);
    if (!Number.isInteger(minLen) || minLen < 8 || minLen > 64) { toast.error('Minimum password length must be between 8 and 64.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...settings,
        backupRetentionDays: Number(settings.backupRetentionDays),
        defaultExpirationWarningDays: Number(settings.defaultExpirationWarningDays),
        defaultReorderThreshold: Number(settings.defaultReorderThreshold),
        passwordMinLength: minLen,
        notificationRetentionDays: Number(settings.notificationRetentionDays),
        auditLogRetentionDays: Number(settings.auditLogRetentionDays),
      };
      const { data } = await updateSystemSettings(payload);
      setSettings(data);
      toast.success('System settings saved.');
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div className="card" style={{ padding: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MdDns size={18} color="var(--green-600)" /> System Settings
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Server-wide settings that apply to everyone. Only administrators can change these.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
        <Field label="Organization name" desc="Shown in the top bar and system emails.">
          <input className="form-control" value={settings.organizationName} onChange={set('organizationName')} maxLength={150} />
        </Field>

        <Field label="Daily backup time" desc="When the automatic database backup runs each day (server time).">
          <input type="time" className="form-control" style={{ width: 160 }} value={settings.backupTime} onChange={set('backupTime')} />
        </Field>

        <Field label="Backup retention (days)" desc="Backups older than this are deleted automatically.">
          <input type="number" min={1} max={365} className="form-control" style={{ width: 160 }} value={settings.backupRetentionDays} onChange={set('backupRetentionDays')} />
        </Field>

        <Section Icon={MdInventory2} title="New item defaults" desc="Prefilled when adding an inventory item; each item stays individually editable." />

        <Field label="Default expiration warning (days)" desc="How many days before expiry to start warning, for newly created items.">
          <input type="number" min={1} max={365} className="form-control" style={{ width: 160 }} value={settings.defaultExpirationWarningDays} onChange={set('defaultExpirationWarningDays')} />
        </Field>

        <Field label="Default reorder threshold" desc="Low-stock threshold prefilled for newly created items.">
          <input type="number" min={0} className="form-control" style={{ width: 160 }} value={settings.defaultReorderThreshold} onChange={set('defaultReorderThreshold')} />
        </Field>

        <Section Icon={MdLock} title="Password policy" desc="Applied whenever anyone sets or changes a password. 8 characters, an uppercase letter, a lowercase letter, and a number are always required." />

        <Field label="Minimum password length" desc="Between 8 and 64 characters.">
          <input type="number" min={8} max={64} className="form-control" style={{ width: 160 }} value={settings.passwordMinLength} onChange={set('passwordMinLength')} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Require a special character</label>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>Passwords must include at least one symbol (e.g. ! @ #).</p>
          </div>
          <Toggle on={settings.passwordRequireSpecial} onClick={toggle('passwordRequireSpecial')} />
        </div>

        <Section Icon={MdStorage} title="Data & reports" desc="Nightly housekeeping and automatic reporting." />

        <Field label="Notification retention (days)" desc="Notifications older than this are deleted nightly. 0 keeps them forever.">
          <input type="number" min={0} max={3650} className="form-control" style={{ width: 160 }} value={settings.notificationRetentionDays} onChange={set('notificationRetentionDays')} />
        </Field>

        <Field label="Audit log retention (days)" desc="Audit records older than this are deleted nightly. 0 (recommended) keeps the full history.">
          <input type="number" min={0} max={3650} className="form-control" style={{ width: 160 }} value={settings.auditLogRetentionDays} onChange={set('auditLogRetentionDays')} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Monthly summary email</label>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>On the 1st of each month, email administrators a consumption and procurement summary of the previous month.</p>
          </div>
          <Toggle on={settings.monthlyReportEmails} onClick={toggle('monthlyReportEmails')} />
        </div>

        <Section Icon={MdCampaign} title="Announcement" desc="Shown as a banner to every user until they dismiss it. Leave empty for no banner." />

        <Field label="Announcement message" desc="e.g. “System maintenance this Sunday, 10 PM – 12 MN.”">
          <textarea
            className="form-control"
            rows={2}
            maxLength={300}
            value={settings.announcementMessage}
            onChange={set('announcementMessage')}
            style={{ resize: 'vertical' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
            {settings.announcementMessage.length}/300
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : <><MdSave size={16} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}

function Section({ Icon, title, desc }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon size={16} color="var(--green-600)" /> {title}
      </div>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</label>
      <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 12 }}>{desc}</p>
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
