import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdNotifications, MdRefresh } from 'react-icons/md';
import { getUnreadCount } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';

const TITLES = {
  '/': 'Dashboard',
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
  '/audit-logs': 'Audit Logs',
};

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const title = TITLES[location.pathname] ?? 'IPMS';

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
    const iv = setInterval(() => {
      getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--border)',
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--green-50)', border: '1px solid var(--green-100)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--green-600), var(--green-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            {user?.fullName?.charAt(0) ?? 'U'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {user?.fullName}
            </div>
            <div style={{ fontSize: 10, color: 'var(--green-700)', fontWeight: 500 }}>
              {user?.role?.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
