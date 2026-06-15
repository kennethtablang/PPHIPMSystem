import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdWarehouse, MdPerson, MdLock, MdLogin } from 'react-icons/md';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #052e10 0%, #0d3d1a 35%, #1a6a36 65%, #25984e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decorative circles */}
      {[
        { w: 400, h: 400, top: '-10%', left: '-8%', op: .06 },
        { w: 600, h: 600, bottom: '-15%', right: '-12%', op: .05 },
        { w: 200, h: 200, top: '30%', right: '5%', op: .08 },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', width: c.w, height: c.h,
          borderRadius: '50%', border: `2px solid rgba(255,255,255,${c.op})`,
          top: c.top, left: c.left, bottom: c.bottom, right: c.right,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(255,255,255,.15)',
            border: '2px solid rgba(255,255,255,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', backdropFilter: 'blur(4px)',
          }}>
            <MdWarehouse size={32} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>
            PPH IPMS
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 4 }}>
            Inventory & Procurement Management System
          </p>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 2 }}>
            Pangasinan Provincial Hospital
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,.97)',
          borderRadius: 20, padding: '32px 36px',
          boxShadow: '0 24px 64px rgba(5,46,16,.4)',
          border: '1px solid rgba(255,255,255,.5)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
            Sign in to your account
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <MdPerson size={16} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={set('username')}
                  style={{ paddingLeft: 34 }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <MdLock size={16} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={set('password')}
                  style={{ paddingLeft: 34 }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
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
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 20 }}>
          &copy; {new Date().getFullYear()} Pangasinan Provincial Hospital — All rights reserved
        </p>
      </div>
    </div>
  );
}
