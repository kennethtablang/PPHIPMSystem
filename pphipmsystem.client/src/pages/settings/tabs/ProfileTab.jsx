import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../../api/users';
import { toast } from '../../../components/common/Toast';
import { MdSave, MdEmail, MdNotificationsActive } from 'react-icons/md';

export default function ProfileTab() {
  // The full profile is kept in state (including twoFactorEnabled and email
  // preferences) so that saving personal info never clears fields owned by
  // other tabs.
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '',
    twoFactorEnabled: false, role: '', departmentName: '',
    emailNotificationsEnabled: true, emailNotifyInventory: true,
    emailNotifyProcurement: true, emailNotifyAdjustments: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getProfile();
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          twoFactorEnabled: data.twoFactorEnabled || false,
          role: data.role || '',
          departmentName: data.departmentName || 'N/A',
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
          emailNotifyInventory: data.emailNotifyInventory ?? true,
          emailNotifyProcurement: data.emailNotifyProcurement ?? true,
          emailNotifyAdjustments: data.emailNotifyAdjustments ?? true,
        });
      } catch {
        toast.error('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = k => e => setProfile(p => ({ ...p, [k]: e.target.value }));
  const toggle = k => () => setProfile(p => ({ ...p, [k]: !p[k] }));

  const submit = async e => {
    e.preventDefault();
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (profile.twoFactorEnabled && !profile.email.trim()) {
      toast.error('Email is required while Two-Factor Authentication is enabled.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success('Profile updated successfully.');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading profile…</div>;

  return (
    <div className="card" style={{ padding: 32 }}>
      <form onSubmit={submit}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          Personal Information
        </h3>

        <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>First Name</label>
            <input type="text" className="form-control" value={profile.firstName} onChange={set('firstName')} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Last Name</label>
            <input type="text" className="form-control" value={profile.lastName} onChange={set('lastName')} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <MdEmail size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input type="email" className="form-control" value={profile.email} onChange={set('email')} placeholder="Enter your email" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Role</label>
            <input type="text" className="form-control" value={profile.role} disabled style={{ background: 'var(--bg-muted)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Department</label>
            <input type="text" className="form-control" value={profile.departmentName} disabled style={{ background: 'var(--bg-muted)' }} />
          </div>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdNotificationsActive size={18} color="var(--green-600)" /> Email Notifications
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Choose which alerts are also emailed to you. In-app notifications are unaffected.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <PrefRow
            title="Email notifications"
            desc="Master switch for all notification emails."
            on={profile.emailNotificationsEnabled}
            onToggle={toggle('emailNotificationsEnabled')}
          />
          <PrefRow
            title="Inventory alerts"
            desc="Low stock and expiration warnings."
            on={profile.emailNotifyInventory}
            onToggle={toggle('emailNotifyInventory')}
            disabled={!profile.emailNotificationsEnabled}
          />
          <PrefRow
            title="Procurement updates"
            desc="Requests, approvals, and purchase orders."
            on={profile.emailNotifyProcurement}
            onToggle={toggle('emailNotifyProcurement')}
            disabled={!profile.emailNotificationsEnabled}
          />
          <PrefRow
            title="Stock adjustments"
            desc="Adjustment requests and decisions."
            on={profile.emailNotifyAdjustments}
            onToggle={toggle('emailNotifyAdjustments')}
            disabled={!profile.emailNotificationsEnabled}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : <><MdSave size={16} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function PrefRow({ title, desc, on, onToggle, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 18px', borderRadius: 12,
      background: 'var(--bg-muted)', border: '1px solid var(--border)',
      opacity: disabled ? 0.55 : 1,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{title}</div>
        <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4 }}>{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        style={{
          flexShrink: 0, width: 46, height: 26, borderRadius: 99, border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
}
