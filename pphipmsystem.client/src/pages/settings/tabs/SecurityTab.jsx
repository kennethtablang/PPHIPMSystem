import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getProfile, updateProfile } from '../../../api/users';
import { changePassword, setupAuthenticator, confirmAuthenticator, removeAuthenticator } from '../../../api/auth';
import Modal from '../../../components/common/Modal';
import { toast } from '../../../components/common/Toast';
import { validatePassword, passwordHint, usePasswordPolicy } from '../../../utils/password';
import { MdLock, MdVisibility, MdVisibilityOff, MdSecurity, MdPhonelinkLock } from 'react-icons/md';

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

  // Authenticator-app enrolment
  const [enrolModal, setEnrolModal] = useState(null); // { sharedKey, otpauthUri }
  const [enrolCode, setEnrolCode] = useState('');
  const [enrolBusy, setEnrolBusy] = useState(false);

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

  const startEnrol = async () => {
    try {
      const { data } = await setupAuthenticator();
      setEnrolCode('');
      setEnrolModal(data);
    } catch { toast.error('Failed to start authenticator setup.'); }
  };

  const confirmEnrol = async () => {
    if (!enrolCode.trim()) { toast.error('Enter the 6-digit code from your app.'); return; }
    setEnrolBusy(true);
    try {
      await confirmAuthenticator(enrolCode.trim());
      toast.success('Authenticator enabled — you will now use app codes to sign in.');
      setEnrolModal(null);
      setProfile(p => ({ ...p, hasAuthenticator: true, twoFactorEnabled: true }));
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'That code didn\'t match.');
    } finally { setEnrolBusy(false); }
  };

  const removeEnrol = async () => {
    setEnrolBusy(true);
    try {
      await removeAuthenticator();
      toast.success('Authenticator removed. Email codes will be used while 2FA stays on.');
      setProfile(p => ({ ...p, hasAuthenticator: false }));
    } catch { toast.error('Failed to remove authenticator.'); }
    finally { setEnrolBusy(false); }
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

      {/* Authenticator app (TOTP) */}
      <div className="card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdPhonelinkLock size={18} color="var(--green-600)" /> Authenticator App
        </h3>

        {!profile ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{
            background: profile.hasAuthenticator ? 'rgba(79,208,122,.08)' : 'var(--bg-muted)',
            border: `1px solid ${profile.hasAuthenticator ? 'rgba(79,208,122,.3)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
                {profile.hasAuthenticator ? 'Enrolled' : 'Not set up'}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                {profile.hasAuthenticator
                  ? 'Sign-in codes come from your authenticator app — they work even when email is down.'
                  : 'Use Google/Microsoft Authenticator instead of emailed codes. Codes work offline and don\'t depend on the mail server.'}
              </p>
            </div>
            {profile.hasAuthenticator ? (
              <button type="button" className="btn btn-danger" onClick={removeEnrol} disabled={enrolBusy}>
                {enrolBusy ? 'Removing…' : 'Remove'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={startEnrol}>
                Set Up
              </button>
            )}
          </div>
        )}
      </div>

      {enrolModal && (
        <Modal
          title="Set Up Authenticator App"
          onClose={() => setEnrolModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEnrolModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmEnrol} disabled={enrolBusy}>
                {enrolBusy ? 'Verifying…' : 'Verify & Enable'}
              </button>
            </>
          }
        >
          <ol style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, paddingLeft: 20, marginBottom: 16 }}>
            <li>Install Google Authenticator or Microsoft Authenticator on your phone.</li>
            <li>Scan the QR code below (or enter the key manually).</li>
            <li>Type the 6-digit code the app shows to confirm.</li>
          </ol>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
              <QRCodeSVG value={enrolModal.otpauthUri} size={160} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                Manual entry key
              </div>
              <code style={{ display: 'block', fontSize: 13, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', wordBreak: 'break-all' }}>
                {enrolModal.sharedKey}
              </code>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Verification code *</label>
            <input
              className="form-control"
              value={enrolCode}
              onChange={e => setEnrolCode(e.target.value)}
              placeholder="123 456"
              maxLength={10}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confirmEnrol()}
              style={{ width: 180, fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}
            />
          </div>
        </Modal>
      )}
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
