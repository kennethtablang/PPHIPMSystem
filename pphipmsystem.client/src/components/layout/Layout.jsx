import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MdLogout } from 'react-icons/md';

const IDLE_MS    = 30 * 60 * 1000;
const WARNING_MS =  2 * 60 * 1000;
const EVENTS     = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export default function Layout() {
  const { logout } = useAuth();
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_MS / 1000);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const idleTimer    = useRef(null);
  const warnTimer    = useRef(null);
  const countdownRef = useRef(null);
  // Ref mirrors warning state so event listeners (registered once) always read current value
  const warningRef   = useRef(false);

  const showWarning = () => {
    warningRef.current = true;
    setWarning(true);
    setCountdown(WARNING_MS / 1000);
    warnTimer.current = setTimeout(() => { logout(); }, WARNING_MS);
    countdownRef.current = setInterval(() => setCountdown(c => c - 1), 1000);
  };

  const resetIdle = () => {
    if (warningRef.current) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(showWarning, IDLE_MS);
  };

  const stayLoggedIn = () => {
    warningRef.current = false;
    setWarning(false);
    clearTimeout(warnTimer.current);
    clearInterval(countdownRef.current);
    resetIdle();
  };

  useEffect(() => {
    EVENTS.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    idleTimer.current = setTimeout(showWarning, IDLE_MS);
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onRequestLogout={() => setConfirmLogout(true)} />
      <div style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.22s ease',
      }}>
        <Topbar />
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {confirmLogout && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5,46,16,.55)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255,255,255,.6)',
            boxShadow: '0 20px 60px rgba(5,46,16,.25)',
            padding: '36px 40px',
            maxWidth: 400, width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              border: '2px solid #fca5a5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MdLogout size={26} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Sign Out
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
              Are you sure you want to sign out? Any unsaved changes will be lost.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={logout}>
                <MdLogout size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {warning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5,46,16,.55)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255,255,255,.6)',
            boxShadow: '0 20px 60px rgba(5,46,16,.25)',
            padding: '36px 40px',
            maxWidth: 420, width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #fef9c3, #fef08a)',
              border: '2px solid #fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              ⏱
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Session Expiring Soon
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              You've been inactive for 30 minutes. You will be automatically logged out in:
            </p>
            <div style={{
              fontSize: 40, fontWeight: 800,
              color: countdown <= 30 ? '#dc2626' : 'var(--green-700)',
              letterSpacing: '-1px', marginBottom: 28,
              transition: 'color .3s',
            }}>
              {mins}:{secs}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={() => { logout(); }}>
                Log Out Now
              </button>
              <button className="btn btn-primary" onClick={stayLoggedIn}>
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
