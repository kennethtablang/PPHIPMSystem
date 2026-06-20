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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .login-root * { font-family: 'Montserrat', sans-serif !important; box-sizing: border-box; }
        .login-root { margin: 0; padding: 0; }

        /* ── Moving circles ── */
        @keyframes float-1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(60px, -80px) scale(1.08); }
          66%  { transform: translate(-40px, 40px) scale(0.94); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(-70px, 50px) scale(1.06); }
          66%  { transform: translate(50px, -60px) scale(0.96); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          25%  { transform: translate(40px, 70px) scale(1.1); }
          50%  { transform: translate(-50px, 30px) scale(0.92); }
          75%  { transform: translate(30px, -50px) scale(1.05); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-4 {
          0%   { transform: translate(0px, 0px) scale(1); }
          40%  { transform: translate(-30px, -70px) scale(1.12); }
          80%  { transform: translate(60px, 40px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-5 {
          0%   { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          50%  { transform: translate(50px, -40px) scale(1.07) rotate(180deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        .lc { position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; }
        .lc-1 { width: 440px; height: 440px; top: -140px; left: -120px; background: radial-gradient(circle, rgba(37,152,78,0.32) 0%, transparent 70%); animation: float-1 18s ease-in-out infinite; }
        .lc-2 { width: 360px; height: 360px; bottom: -100px; right: 80px; background: radial-gradient(circle, rgba(79,208,122,0.22) 0%, transparent 70%); animation: float-2 22s ease-in-out infinite; animation-delay: -6s; }
        .lc-3 { width: 260px; height: 260px; top: 38%; left: 36%; background: radial-gradient(circle, rgba(26,106,54,0.38) 0%, transparent 70%); animation: float-3 16s ease-in-out infinite; animation-delay: -4s; }
        .lc-4 { width: 180px; height: 180px; top: 20%; right: 22%; background: radial-gradient(circle, rgba(79,208,122,0.28) 0%, transparent 70%); animation: float-4 14s ease-in-out infinite; animation-delay: -9s; }
        .lc-5 { width: 120px; height: 120px; bottom: 28%; left: 18%; background: radial-gradient(circle, rgba(133,232,157,0.20) 0%, transparent 70%); animation: float-5 20s linear infinite; animation-delay: -3s; }
        .lc-6 { width: 320px; height: 320px; top: 55%; right: -80px; background: radial-gradient(circle, rgba(20,82,40,0.4) 0%, transparent 70%); animation: float-2 25s ease-in-out infinite; animation-delay: -12s; }
        .lc-7 { width: 90px; height: 90px; top: 12%; left: 45%; background: radial-gradient(circle, rgba(79,208,122,0.35) 0%, transparent 70%); animation: float-1 12s ease-in-out infinite; animation-delay: -7s; }
        .lc-8 { width: 500px; height: 500px; bottom: -200px; left: -60px; background: radial-gradient(circle, rgba(13,61,26,0.5) 0%, transparent 65%); animation: float-3 30s ease-in-out infinite; animation-delay: -15s; }
        .login-input {
          width: 100%; padding: 13px 16px;
          border-radius: 50px;
          border: 1.5px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 14px; font-weight: 500;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.4); }
        .login-input:focus {
          border-color: rgba(79,208,122,0.6);
          box-shadow: 0 0 0 3px rgba(79,208,122,0.15);
          background: rgba(255,255,255,0.16);
        }
        .login-btn {
          width: 100%; padding: 14px 20px;
          border-radius: 50px;
          background: linear-gradient(135deg, #25984e, #4fd07a);
          color: #fff; border: none;
          font-size: 15px; font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 28px rgba(37,152,78,0.45);
          transition: filter .15s, transform .12s, box-shadow .15s;
          letter-spacing: .02em;
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 12px 36px rgba(37,152,78,0.55);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes login-spin { to { transform: rotate(360deg); } }
        @keyframes login-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .feature-card {
          display: flex; gap: 14px; align-items: flex-start;
          padding: 14px 16px;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          transition: background .2s;
        }
        .feature-card:hover { background: rgba(255,255,255,0.11); }
      `}</style>

      <div className="login-root" style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(145deg, #041f0b 0%, #0a3016 25%, #145228 55%, #1a6a36 80%, #0d3d1a 100%)',
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── Animated moving circles ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div className="lc lc-1" />
          <div className="lc lc-2" />
          <div className="lc lc-3" />
          <div className="lc lc-4" />
          <div className="lc lc-5" />
          <div className="lc lc-6" />
          <div className="lc lc-7" />
          <div className="lc lc-8" />
          {/* Dot grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* ── Left panel ── */}
        <div style={{
          flex: '0 0 46%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 64px 52px 52px',
          position: 'relative',
          zIndex: 1,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '0 80px 80px 0',
          boxShadow: '4px 0 40px rgba(0,0,0,0.12)',
        }}>

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
                border: '1.5px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}>
                <MdWarehouse size={26} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>PPH IPMS</div>
                <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 500 }}>Pangasinan Provincial Hospital</div>
              </div>
            </div>
          </div>

          {/* Center copy */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              color: '#4fd07a', letterSpacing: '.12em', textTransform: 'uppercase',
              background: 'rgba(79,208,122,.12)',
              border: '1px solid rgba(79,208,122,.3)',
              padding: '6px 14px', borderRadius: 99, marginBottom: 22,
            }}>
              Hospital Management System
            </div>

            <h1 style={{
              color: '#fff', fontSize: 40, fontWeight: 800,
              lineHeight: 1.12, letterSpacing: '-1px', marginBottom: 16,
            }}>
              Inventory &amp;<br />Procurement<br />
              <span style={{
                background: 'linear-gradient(90deg, #4fd07a, #86e8a8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Made Simple</span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13.5, lineHeight: 1.75, marginBottom: 32, maxWidth: 320, fontWeight: 400 }}>
              A centralized platform to track supplies, manage procurement workflows, and forecast demand across all hospital departments.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="feature-card">
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(79,208,122,.15)',
                    border: '1px solid rgba(79,208,122,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color="#4fd07a" />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                    <div style={{ color: 'rgba(255,255,255,.42)', fontSize: 12, lineHeight: 1.5, fontWeight: 400 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', marginBottom: 14 }} />
            <p style={{ color: 'rgba(255,255,255,.25)', fontSize: 11, fontWeight: 400 }}>
              &copy; {new Date().getFullYear()} Pangasinan Provincial Hospital. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Glass form card */}
          <div style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(255,255,255,0.09)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 36,
            padding: '44px 40px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}>

            {/* Icon + heading */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', marginBottom: 20,
                background: 'linear-gradient(135deg, rgba(37,152,78,0.6), rgba(79,208,122,0.4))',
                border: '1.5px solid rgba(79,208,122,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(37,152,78,0.35)',
              }}>
                <MdWarehouse size={26} color="#fff" />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.5px', marginBottom: 6 }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, fontWeight: 400 }}>
                Sign in to manage hospital inventory and procurement.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,.15)',
                border: '1px solid rgba(239,68,68,.35)',
                color: '#fca5a5',
                borderRadius: 16, padding: '12px 16px', fontSize: 13, marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 500,
              }}>
                <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,.55)', letterSpacing: '.1em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={set('username')}
                  placeholder="e.g. admin.santos"
                  required
                  autoFocus
                  className="login-input"
                />
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,.55)', letterSpacing: '.1em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Enter your password"
                    required
                    className="login-input"
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', padding: 2,
                    }}
                    tabIndex={-1}
                  >
                    {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn"
                style={{ marginTop: 8 }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTopColor: '#fff',
                      animation: 'login-spin .7s linear infinite',
                      flexShrink: 0,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 20px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '.1em' }}>
                SYSTEM ACCESS ONLY
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
            </div>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center', lineHeight: 1.7, fontWeight: 400 }}>
              Access is restricted to authorized hospital staff.<br />
              Contact your system administrator if you cannot log in.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
