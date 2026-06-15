import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdWarehouse, MdLogin, MdInventory, MdShoppingCart,
  MdAnalytics, MdVisibility, MdVisibilityOff,
} from 'react-icons/md';

const FEATURES = [
  { icon: MdInventory,    title: 'Inventory Tracking',    desc: 'Real-time stock levels, batch expiry monitoring, and low-stock alerts.' },
  { icon: MdShoppingCart, title: 'Procurement Workflow',  desc: 'Multi-stage approval process from request to purchase order delivery.' },
  { icon: MdAnalytics,    title: 'Demand Forecasting',    desc: 'Moving average and exponential smoothing to predict reorder needs.' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('Invalid username or password, or account is inactive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(155deg, #041f0b 0%, #0a3016 30%, #145228 60%, #1a6a36 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', border: '1px solid rgba(255,255,255,.06)', top: -120, right: -160, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(255,255,255,.05)', bottom: -60, left: -100, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.03)', bottom: 160, right: 40, pointerEvents: 'none' }} />
        {/* Grid dots pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'rgba(255,255,255,.14)',
              border: '1.5px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
            }}>
              <MdWarehouse size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-.3px' }}>PPH IPMS</div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11 }}>Pangasinan Provincial Hospital</div>
            </div>
          </div>
        </div>

        {/* Center copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            color: 'var(--green-300)', letterSpacing: '.1em', textTransform: 'uppercase',
            background: 'rgba(79,208,122,.12)', border: '1px solid rgba(79,208,122,.25)',
            padding: '5px 12px', borderRadius: 99, marginBottom: 20,
          }}>
            Hospital Management System
          </div>

          <h1 style={{
            color: '#fff', fontSize: 38, fontWeight: 800,
            lineHeight: 1.15, letterSpacing: '-.8px', marginBottom: 14,
          }}>
            Inventory &<br />Procurement<br />
            <span style={{ color: 'var(--green-300)' }}>Made Simple</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 36, maxWidth: 320 }}>
            A centralized platform to track supplies, manage procurement workflows, and forecast demand across all hospital departments.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="var(--green-300)" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title}</div>
                  <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,.1)', marginBottom: 16 }} />
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>
            &copy; {new Date().getFullYear()} Pangasinan Provincial Hospital. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        background: '#f7fbf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
      }}>
        {/* Subtle top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, var(--green-700), var(--green-400))',
        }} />

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, marginBottom: 20,
              background: 'linear-gradient(135deg, var(--green-700), var(--green-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(26,106,54,.3)',
            }}>
              <MdWarehouse size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.5px', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sign in to your account to continue managing hospital supplies.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', color: '#7f1d1d',
              borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1.3 }}>⚠</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Username">
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                placeholder="e.g. admin.santos"
                required
                autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
                onBlur={e => e.target.style.borderColor = '#d1e8d8'}
              />
            </Field>

            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Enter your password"
                  required
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
                  onBlur={e => e.target.style.borderColor = '#d1e8d8'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2,
                  }}
                  tabIndex={-1}
                >
                  {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 20px', marginTop: 4,
                background: loading
                  ? 'var(--green-600)'
                  : 'linear-gradient(135deg, var(--green-800) 0%, var(--green-600) 50%, var(--green-500) 100%)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(26,106,54,.35)',
                transition: 'filter .15s, box-shadow .15s',
                letterSpacing: '.01em',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: '#fff',
                    animation: 'spin .7s linear infinite',
                  }} />
                  Signing in…
                </>
              ) : (
                <>
                  <MdLogin size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>SYSTEM ACCESS ONLY</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Access is restricted to authorized hospital staff.<br />
            Contact your system administrator if you cannot log in.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        letterSpacing: '.04em', textTransform: 'uppercase',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 9,
  border: '1.5px solid #d1e8d8',
  background: '#fff',
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  boxShadow: '0 1px 3px rgba(5,46,16,.06)',
};
