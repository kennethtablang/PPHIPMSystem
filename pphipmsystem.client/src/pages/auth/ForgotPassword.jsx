import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../../components/common/Toast';
import { forgotPassword } from '../../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
      toast.success('If the email is registered, a password reset link has been sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .auth-root * { font-family: 'Montserrat', sans-serif !important; box-sizing: border-box; }
        .auth-root { margin: 0; padding: 0; }

        @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(40px, -40px) scale(1.05); } }
        @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-30px, 30px) scale(0.95); } }

        .lc { position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; }
        .lc-1 { width: 440px; height: 440px; top: -100px; left: -100px; background: radial-gradient(circle, rgba(37,152,78,0.2) 0%, transparent 70%); animation: float-1 15s ease-in-out infinite; }
        .lc-2 { width: 360px; height: 360px; bottom: -50px; right: -50px; background: radial-gradient(circle, rgba(79,208,122,0.15) 0%, transparent 70%); animation: float-2 18s ease-in-out infinite; }

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
          box-shadow: 0 8px 28px rgba(37,152,78,0.45); transition: filter .15s, transform .12s, box-shadow .15s;
        }
        .auth-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 12px 36px rgba(37,152,78,0.55); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="auth-root" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'linear-gradient(145deg, #041f0b 0%, #0a3016 25%, #145228 55%, #1a6a36 80%, #0d3d1a 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div className="lc lc-1" />
          <div className="lc lc-2" />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div style={{
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.16)', borderRadius: 36, padding: '44px 40px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.5px', marginBottom: 6 }}>Forgot Password</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, fontWeight: 400 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div style={{ background: 'rgba(79,208,122,.15)', border: '1px solid rgba(79,208,122,.35)', color: '#86e8a8', borderRadius: 16, padding: '16px', fontSize: 13, textAlign: 'center', fontWeight: 500, marginBottom: 20 }}>
              A password reset link has been sent to your email address. Please check your inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/login" style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
