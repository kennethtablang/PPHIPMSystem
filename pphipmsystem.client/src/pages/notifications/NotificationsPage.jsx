import { useEffect, useState } from 'react';
import {
  MdNotifications, MdDoneAll, MdWarning, MdError, MdInfo,
  MdCheckCircle, MdInventory, MdShoppingCart, MdLocalShipping,
  MdTune, MdDeleteForever, MdCircle,
} from 'react-icons/md';
import { getNotifications, markRead, markAllRead } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { toast } from '../../components/common/Toast';

const TYPE_META = {
  LowStock:                    { icon: MdWarning,      color: '#f59e0b', label: 'Low Stock Alert',          group: 'inventory' },
  ExpirationWarning:           { icon: MdWarning,      color: '#f59e0b', label: 'Expiration Warning',        group: 'inventory' },
  StockOut:                    { icon: MdError,        color: '#dc2626', label: 'Stock Out',                 group: 'inventory' },
  AdjustmentRequested:         { icon: MdTune,         color: '#3b82f6', label: 'Adjustment Requested',      group: 'adjustments' },
  AdjustmentApproved:          { icon: MdCheckCircle,  color: '#059669', label: 'Adjustment Approved',       group: 'adjustments' },
  AdjustmentRejected:          { icon: MdDeleteForever,color: '#dc2626', label: 'Adjustment Rejected',       group: 'adjustments' },
  ProcurementSubmitted:        { icon: MdShoppingCart, color: '#3b82f6', label: 'Request Submitted',         group: 'procurement' },
  ProcurementApproved:         { icon: MdCheckCircle,  color: '#059669', label: 'Request Approved',          group: 'procurement' },
  ProcurementRejected:         { icon: MdError,        color: '#dc2626', label: 'Request Rejected',          group: 'procurement' },
  ProcurementReturnedForRevision: { icon: MdInfo,      color: '#f59e0b', label: 'Returned for Revision',     group: 'procurement' },
  PurchaseOrderGenerated:      { icon: MdLocalShipping,color: '#059669', label: 'Purchase Order Generated',  group: 'procurement' },
  DeliveryConfirmed:           { icon: MdLocalShipping,color: '#059669', label: 'Delivery Confirmed',        group: 'procurement' },
};

const GROUPS = [
  { id: '',           label: 'All' },
  { id: 'inventory',  label: 'Inventory' },
  { id: 'procurement',label: 'Procurement' },
  { id: 'adjustments',label: 'Adjustments' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH');
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [groupFilter, setGroupFilter] = useState('');

  const load = () => {
    setLoading(true);
    getNotifications(unreadOnly ? { unreadOnly: true } : {})
      .then(r => setNotifications(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [unreadOnly]);

  // Real-time: prepend new notifications to the list the moment they arrive
  useEffect(() => {
    const handleNew = (notif) => {
      // only prepend if we're not in 'unread only' mode or if the new one is unread
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev; // de-dupe
        return [notif, ...prev];
      });
    };
    signalRService.onNotificationReceived(handleNew);
    return () => signalRService.offNotificationReceived(handleNew);
  }, []);

  const markOne = async id => {
    try {
      await markRead(id);
      setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    } catch { toast.error('Failed to mark as read.'); }
  };

  const markAll = async () => {
    try { await markAllRead(); toast.success('All notifications marked as read.'); load(); }
    catch { toast.error('Failed to mark all as read.'); }
  };

  const filtered = notifications.filter(n => {
    if (!groupFilter) return true;
    const meta = TYPE_META[n.type];
    return meta?.group === groupFilter;
  });

  const unread = notifications.filter(n => !n.isRead).length;
  const unreadFiltered = filtered.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">System alerts for inventory, expiry warnings, adjustments, and procurement updates</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unread > 0 && (
            <button className="btn btn-secondary" onClick={markAll}>
              <MdDoneAll size={16} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-stat" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: notifications.length, color: 'green' },
          { label: 'Unread', value: unread, color: 'blue' },
          { label: 'Inventory', value: notifications.filter(n => TYPE_META[n.type]?.group === 'inventory').length, color: 'amber' },
          { label: 'Procurement', value: notifications.filter(n => TYPE_META[n.type]?.group === 'procurement').length, color: 'teal' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {GROUPS.map(g => (
          <button
            key={g.id}
            className={`btn btn-sm ${groupFilter === g.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGroupFilter(g.id)}
          >
            {g.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
            Unread only
          </label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {unreadFiltered} unread
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <MdNotifications size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          </div>
          <div style={{ fontSize: 13 }}>You're all caught up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(n => {
            const meta = TYPE_META[n.type] ?? { icon: MdInfo, color: '#6b7280', label: n.type, group: 'other' };
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                  background: n.isRead ? 'var(--surface)' : 'var(--green-50)',
                  border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--green-200)'}`,
                  borderRadius: 'var(--radius)',
                  borderLeft: `4px solid ${meta.color}`,
                  transition: 'opacity 0.2s',
                  opacity: n.isRead ? 0.72 : 1,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: meta.color + '18',
                  border: `1px solid ${meta.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: meta.color,
                }}>
                  <Icon size={18} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 14, color: 'var(--text)' }}>
                        {n.title || n.message}
                      </div>
                      {n.title && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          {n.message}
                        </div>
                      )}
                    </div>
                    {!n.isRead && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => markOne(n.id)}
                        style={{ flexShrink: 0, fontSize: 11, padding: '2px 10px' }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, background: meta.color + '18', color: meta.color,
                      padding: '2px 9px', borderRadius: 999, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      · {new Date(n.createdAt).toLocaleString('en-PH')}
                    </span>
                    {!n.isRead && (
                      <MdCircle size={7} color={meta.color} style={{ marginLeft: 2 }} />
                    )}
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
