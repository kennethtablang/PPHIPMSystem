import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdLockReset } from 'react-icons/md';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/common/Toast';
import { validatePassword, passwordHint, usePasswordPolicy } from '../../utils/password';

// Shown after login when the account's password was set by someone else
// (seeded account, admin-created, or admin reset). The app is unreachable
// until the user picks their own password.
export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const pwPolicy = usePasswordPolicy();

  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.next !== form.confirm) { setError('New passwords do not match.'); return; }
    if (form.next === form.current) { setError('The new password must be different from the current one.'); return; }
    const pwErr = validatePassword(form.next, pwPolicy);
    if (pwErr) { setError(pwErr); return; }

    setSaving(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next });
      updateUser({ mustChangePassword: false });
      toast.success('Password updated — welcome!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Current password is incorrect.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .auth-root * { font-family: 'Montserrat', sans-serif !important; box-sizing: border-box; }

        .auth-input {
          width: 100%; padding: 13px 16px; border-radius: 50px;
          border: 1.5px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          font-size: 14px; font-weight: 500; color: #fff; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.4); }
        .auth-input:focus { border-color: rgba(79,208,122,0.6); box-shadow: 0 0 0 3px rgba(79,208,122,0.15); background: rgba(255,255,255,0.16); }

        .auth-btn {
          width: 100%; padding: 14px 20px; border-radius: 50px;
          background: linear-gradient(135deg, #25984e, #4fd07a);
          color: #fff; border: none; font-size: 15px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 28px rgba(37,152,78,0.45); transition: filter .15s, transform .12s;
        }
        .auth-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="auth-root" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'linear-gradient(145deg, #041f0b 0%, #0a3016 25%, #145228 55%, #1a6a36 80%, #0d3d1a 100%)',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.16)', borderRadius: 36, padding: '44px 40px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #1a6a36, #4fd07a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(79,208,122,.4)',
            }}>
              <MdLockReset size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-.5px', marginBottom: 6 }}>
              Set Your Own Password
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
              Hi {user?.fullName?.split(' ')[0] ?? 'there'} — this account's password was assigned by an administrator.
              Please choose a new one before continuing.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)', color: '#fca5a5', borderRadius: 16, padding: '12px 16px', fontSize: 13, textAlign: 'center', fontWeight: 500, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="password" className="auth-input" placeholder="Current password" value={form.current} onChange={set('current')} required autoFocus />
            <input type="password" className="auth-input" placeholder="New password" value={form.next} onChange={set('next')} required />
            <input type="password" className="auth-input" placeholder="Confirm new password" value={form.confirm} onChange={set('confirm')} required />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, margin: '0 4px' }}>
              {passwordHint(pwPolicy)}
            </p>
            <button type="submit" className="auth-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              type="button"
              onClick={logout}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
