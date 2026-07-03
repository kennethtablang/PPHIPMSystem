import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../../api/users';
import { changePassword } from '../../../api/auth';
import { toast } from '../../../components/common/Toast';
import { validatePassword, passwordHint, usePasswordPolicy } from '../../../utils/password';
import { MdLock, MdVisibility, MdVisibilityOff, MdSecurity } from 'react-icons/md';

const BLANK_PW = { current: '', next: '', confirm: '' };

export default function SecurityTab() {
  const pwPolicy = usePasswordPolicy();

  // Change password
  const [pwForm, setPwForm] = useState(BLANK_PW);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // Two-factor (needs the full profile so saving never drops other fields)
  const [profile, setProfile] = useState(null);
  const [twoFaSaving, setTwoFaSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => toast.error('Failed to load security settings.'));
  }, []);

  const setPw = k => e => setPwForm(p => ({ ...p, [k]: e.target.value }));
  const toggleShow = k => setShowPw(p => ({ ...p, [k]: !p[k] }));

  const submitChangePw = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { toast.error('All password fields are required.'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('New passwords do not match.'); return; }
    const pwErr = validatePassword(pwForm.next, pwPolicy);
    if (pwErr) { toast.error(pwErr); return; }
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed successfully.');
      setPwForm(BLANK_PW);
      setShowPw({ current: false, next: false, confirm: false });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Current password is incorrect.');
    } finally {
      setPwSaving(false);
    }
  };

  const toggle2Fa = async () => {
    if (!profile) return;
    const enabling = !profile.twoFactorEnabled;
    if (enabling && !profile.email?.trim()) {
      toast.error('Add an email address in your Profile before enabling Two-Factor Authentication.');
      return;
    }
    setTwoFaSaving(true);
    try {
      const updated = { ...profile, twoFactorEnabled: enabling };
      await updateProfile(updated);
      setProfile(updated);
      toast.success(enabling ? 'Two-Factor Authentication enabled.' : 'Two-Factor Authentication disabled.');
    } catch {
      toast.error('Failed to update Two-Factor Authentication.');
    } finally {
      setTwoFaSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Change password */}
      <div className="card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdLock size={18} color="var(--green-600)" /> Change Password
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{passwordHint(pwPolicy)}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
          <PwField label="Current Password" value={pwForm.current} onChange={setPw('current')} show={showPw.current} toggle={() => toggleShow('current')} />
          <PwField label="New Password" value={pwForm.next} onChange={setPw('next')} show={showPw.next} toggle={() => toggleShow('next')} />
          <PwField label="Confirm New Password" value={pwForm.confirm} onChange={setPw('confirm')} show={showPw.confirm} toggle={() => toggleShow('confirm')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-primary" onClick={submitChangePw} disabled={pwSaving}>
            {pwSaving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Two-factor authentication */}
      <div className="card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdSecurity size={18} color="var(--green-600)" /> Two-Factor Authentication
        </h3>

        {!profile ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{
            background: profile.twoFactorEnabled ? 'rgba(79,208,122,.08)' : 'var(--bg-muted)',
            border: `1px solid ${profile.twoFactorEnabled ? 'rgba(79,208,122,.3)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16,
            transition: 'all .2s ease',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
                {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                When enabled, you'll enter a verification code sent to your email each time you log in.
              </p>
            </div>
            <button
              type="button"
              className={`btn ${profile.twoFactorEnabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={toggle2Fa}
              disabled={twoFaSaving}
            >
              {twoFaSaving ? 'Saving…' : profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, show, toggle }) {
  return (
    <div className="form-group">
      <label className="form-label">{label} *</label>
      <div style={{ position: 'relative' }}>
        <input className="form-control" type={show ? 'text' : 'password'} value={value} onChange={onChange} style={{ paddingRight: 40 }} />
        <button
          type="button"
          onClick={toggle}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
          tabIndex={-1}
        >
          {show ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
        </button>
      </div>
    </div>
  );
}
