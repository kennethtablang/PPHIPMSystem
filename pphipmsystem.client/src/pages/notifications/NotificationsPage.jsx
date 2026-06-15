import { useEffect, useState } from 'react';
import { MdNotifications, MdDoneAll, MdWarning, MdError, MdInfo, MdCheckCircle, MdInventory, MdShoppingCart } from 'react-icons/md';
import { getNotifications, markRead, markAllRead } from '../../api/notifications';
import { toast } from '../../components/common/Toast';

const TYPE_ICON = {
  LowStock: <MdWarning size={18} />,
  ExpirationWarning: <MdWarning size={18} />,
  StockOut: <MdError size={18} />,
  AdjustmentRequested: <MdInventory size={18} />,
  AdjustmentApproved: <MdCheckCircle size={18} />,
  AdjustmentRejected: <MdError size={18} />,
  ProcurementSubmitted: <MdShoppingCart size={18} />,
  ProcurementApproved: <MdCheckCircle size={18} />,
  ProcurementRejected: <MdError size={18} />,
  PurchaseOrderGenerated: <MdShoppingCart size={18} />,
  DeliveryConfirmed: <MdCheckCircle size={18} />,
};

const TYPE_COLOR = {
  LowStock: '#f59e0b',
  ExpirationWarning: '#f59e0b',
  StockOut: '#dc2626',
  AdjustmentRejected: '#dc2626',
  ProcurementRejected: '#dc2626',
  AdjustmentRequested: '#3b82f6',
  ProcurementSubmitted: '#3b82f6',
  AdjustmentApproved: '#059669',
  ProcurementApproved: '#059669',
  PurchaseOrderGenerated: '#059669',
  DeliveryConfirmed: '#059669',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = () => {
    setLoading(true);
    getNotifications(unreadOnly ? { unreadOnly: true } : {})
      .then(r => setNotifications(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const markOne = async id => {
    try { await markRead(id); setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x)); }
    catch { toast.error('Failed to mark as read.'); }
  };

  const markAll = async () => {
    try { await markAllRead(); toast.success('All notifications marked as read.'); load(); }
    catch { toast.error('Failed to mark all as read.'); }
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">System alerts for low stock, expiry warnings, and workflow updates</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={markAll}>
            <MdDoneAll size={16} /> Mark All Read ({unread})
          </button>
        )}
      </div>

      <div className="filter-bar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {unread} unread of {notifications.length} total
        </span>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <MdNotifications size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16 }}>{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const color = TYPE_COLOR[n.type] ?? '#6b7280';
            const icon = TYPE_ICON[n.type] ?? <MdInfo size={18} />;
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                  background: n.isRead ? 'var(--surface)' : 'var(--green-50)',
                  border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--green-200)'}`,
                  borderRadius: 'var(--radius)', borderLeft: `4px solid ${color}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ color, marginTop: 2, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 14, color: 'var(--text)' }}>{n.message}</div>
                    {!n.isRead && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markOne(n.id)} style={{ flexShrink: 0, fontSize: 11, padding: '2px 8px' }}>
                        Mark read
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, background: color + '20', color, padding: '1px 8px', borderRadius: 999, fontWeight: 500 }}>{n.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString('en-PH')}</span>
                    {n.isRead && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• Read</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
