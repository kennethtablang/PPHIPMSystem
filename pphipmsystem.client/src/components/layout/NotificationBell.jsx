import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdNotifications, MdDoneAll } from 'react-icons/md';
import {
  getNotifications, getUnreadCount, markRead, markAllRead,
  notifyNotificationsChanged, NOTIFICATIONS_CHANGED,
} from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { useAuth } from '../../context/AuthContext';
import { getAppPrefs } from '../../utils/appPrefs';
import { playNotificationSound } from '../../utils/sound';
import { metaFor, notificationLink, timeAgo } from '../../utils/notificationLinks';

// Bell with an unread badge. Clicking it drops down the latest notifications;
// clicking one goes straight to the request, purchase order or item it is
// about. "See all" opens the full Notifications page.
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const refreshCount = () => getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
  const loadList = () => {
    setLoading(true);
    getNotifications().then(r => setList(r.data.slice(0, 12))).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshCount();
    const onChanged = () => { refreshCount(); if (open) loadList(); };
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged);
  }, [open]);

  useEffect(() => {
    const onNew = n => {
      setUnread(u => u + 1);
      setList(p => [n, ...p.filter(x => x.id !== n.id)].slice(0, 12));
      if (getAppPrefs().notificationSound) playNotificationSound();
    };
    signalRService.onNotificationReceived(onNew);
    return () => signalRService.offNotificationReceived(onNew);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = () => { if (!open) loadList(); setOpen(o => !o); };

  const go = n => {
    setOpen(false);
    if (!n.isRead) {
      setList(p => p.map(x => (x.id === n.id ? { ...x, isRead: true } : x)));
      markRead(n.id).then(notifyNotificationsChanged).catch(() => {});
    }
    navigate(notificationLink(n, user?.role));
  };

  const readAll = () => {
    markAllRead().then(() => {
      setList(p => p.map(x => ({ ...x, isRead: true })));
      notifyNotificationsChanged();
    }).catch(() => {});
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{CSS}</style>
      <button
        className="btn btn-ghost btn-icon"
        style={{ position: 'relative' }}
        onClick={toggle}
        title="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MdNotifications size={20} />
        {unread > 0 && <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="nb-link" onClick={readAll}><MdDoneAll size={14} /> Mark all read</button>
            )}
          </div>
          <div className="nb-list">
            {loading && list.length === 0 ? (
              <div className="nb-empty">Loading…</div>
            ) : list.length === 0 ? (
              <div className="nb-empty">You're all caught up.</div>
            ) : list.map(n => {
              const meta = metaFor(n.type);
              const Icon = meta.icon;
              return (
                <button key={n.id} className={`nb-row ${n.isRead ? '' : 'unread'}`} onClick={() => go(n)}>
                  <span className="nb-icon" style={{ background: meta.color }}><Icon size={16} color="#fff" /></span>
                  <span className="nb-text">
                    <span className="nb-title">{n.title}</span>
                    <span className="nb-msg">{n.message}</span>
                    <span className="nb-time" style={{ color: n.isRead ? undefined : meta.color }}>{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="nb-dot" />}
                </button>
              );
            })}
          </div>
          <button className="nb-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>See all notifications</button>
        </div>
      )}
    </div>
  );
}

const CSS = `
.nb-badge { position: absolute; top: 0; right: 0; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 99px; background: #ef4444; color: #fff; font-size: 9.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
.nb-panel { position: absolute; top: calc(100% + 8px); right: -60px; width: min(380px, calc(100vw - 24px)); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 300; overflow: hidden; }
.nb-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text-primary); }
.nb-link { border: 0; background: none; color: var(--text-accent, var(--green-600)); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.nb-list { max-height: 420px; overflow-y: auto; padding: 6px; }
.nb-row { width: 100%; display: flex; gap: 10px; align-items: flex-start; text-align: left; border: 0; background: none; padding: 9px 10px; border-radius: 14px; cursor: pointer; font: inherit; color: inherit; position: relative; }
.nb-row:hover { background: var(--bg-muted); }
.nb-row.unread { background: var(--green-50); }
.nb-row.unread:hover { filter: brightness(1.05); }
.nb-icon { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.nb-text { flex: 1; min-width: 0; display: flex; flex-direction: column; padding-right: 12px; }
.nb-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.nb-row:not(.unread) .nb-title { font-weight: 500; }
.nb-msg { font-size: 12px; color: var(--text-secondary); margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nb-time { font-size: 11px; color: var(--text-muted); margin-top: 3px; font-weight: 600; }
.nb-dot { position: absolute; right: 10px; top: 50%; width: 9px; height: 9px; border-radius: 50%; background: #3b82f6; transform: translateY(-50%); }
.nb-empty { padding: 32px 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.nb-all { width: 100%; border: 0; border-top: 1px solid var(--border); background: none; padding: 11px; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--text-accent, var(--green-600)); cursor: pointer; }
.nb-all:hover { background: var(--bg-muted); }
@media (max-width: 600px) { .nb-panel { position: fixed; top: calc(var(--topbar-height, 64px) + 6px); right: 12px; left: 12px; width: auto; } }
`;
