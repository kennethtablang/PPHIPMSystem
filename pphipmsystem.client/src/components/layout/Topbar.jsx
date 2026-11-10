import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MdRefresh, MdLogout, MdPerson } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory Items',
  '/materials': 'Available Supplies',
  '/batches': 'Batches & Expiry',
  '/department-stock': 'Department Stock',
  '/stock-movements': 'Stock History',
  '/stock-adjustments': 'Stock History',
  '/procurement': 'Supply & Purchase Requests',
  '/department-requests': 'My Requests',
  '/purchase-orders': 'Purchase Orders',
  '/forecast': 'Demand Forecasting',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/profile': 'Settings',
  '/users': 'User Management',
  '/departments': 'Departments',
  '/categories': 'Categories',
  '/backups': 'Backup Management',
  '/audit-logs': 'Audit Logs',
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const menuRef = useRef(null);

  const title = TITLES[location.pathname] ?? 'IPMS';

  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmOut(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="topbar" style={{
        height: 'var(--topbar-height)',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="topbar-title" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h1>
          <p className="topbar-subtitle" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            Pangasinan Provincial Hospital
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="topbar-search"><GlobalSearch /></div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <MdRefresh size={18} />
          </button>
          <NotificationBell />

          {/* User chip — clickable */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(v => !v); setConfirmOut(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px 6px 6px', borderRadius: 99,
                background: menuOpen ? 'rgba(37,152,78,.14)' : 'rgba(37,152,78,.08)',
                border: `1px solid ${menuOpen ? 'rgba(37,152,78,.35)' : 'rgba(37,152,78,.16)'}`,
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--green-600), var(--green-400))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}>
                {user?.fullName?.charAt(0) ?? 'U'}
              </div>
              <div className="topbar-user-text" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--green-700)', fontWeight: 500 }}>
                  {user?.role?.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--surface)', backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 200, zIndex: 200,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--green-50)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.username}</div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    textDecoration: 'none',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <MdPerson size={15} color="var(--green-600)" />
                  Profile Settings
                </Link>
                {confirmOut ? (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Sign out of your account?
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => setConfirmOut(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1 }}
                        onClick={logout}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOut(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '11px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, color: '#dc2626',
                      textAlign: 'left', fontFamily: 'inherit',
                      borderTop: '1px solid var(--border)',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <MdLogout size={15} />
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
