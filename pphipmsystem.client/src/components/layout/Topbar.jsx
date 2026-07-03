import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MdNotifications, MdRefresh, MdLogout, MdPerson } from 'react-icons/md';
import { getUnreadCount } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { useAuth } from '../../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import { toast } from '../common/Toast';
import { getAppPrefs } from '../../utils/appPrefs';
import { playNotificationSound } from '../../utils/sound';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory Items',
  '/batches': 'Batches & Expiry',
  '/stock-movements': 'Stock Movements',
  '/stock-adjustments': 'Stock Adjustments',
  '/procurement': 'Procurement Requests',
  '/purchase-orders': 'Purchase Orders',
  '/suppliers': 'Supplier Management',
  '/forecast': 'Demand Forecasting',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/users': 'User Management',
  '/departments': 'Departments',
  '/categories': 'Categories',
  '/backups': 'Backup Management',
  '/audit-logs': 'Audit Logs',
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const menuRef = useRef(null);

  const title = TITLES[location.pathname] ?? 'IPMS';

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
    
    signalRService.startNotificationConnection();

    const handleNotification = (notif) => {
      setUnread(u => u + 1);

      const prefs = getAppPrefs();
      if (prefs.notificationSound) playNotificationSound();

      // Respect the user's "notification pop-ups" preference; the badge still updates.
      if (!prefs.notificationToasts) return;

      const type = notif.type;
      const message = `${notif.title}: ${notif.message}`;

      if (type.includes('Warning') || type.includes('Rejected')) toast.warning(message);
      else if (type.includes('Expired')) toast.error(message);
      else toast.info(message);
    };

    signalRService.onNotificationReceived(handleNotification);

    return () => {
      signalRService.offNotificationReceived(handleNotification);
    };
  }, []);

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
      <header style={{
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
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            Pangasinan Provincial Hospital
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GlobalSearch />
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <MdRefresh size={18} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            style={{ position: 'relative' }}
            onClick={() => navigate('/notifications')}
            title="Notifications"
          >
            <MdNotifications size={20} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

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
              <div style={{ textAlign: 'left' }}>
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
