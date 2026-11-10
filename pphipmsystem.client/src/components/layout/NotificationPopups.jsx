import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdClose } from 'react-icons/md';
import { signalRService } from '../../api/signalrService';
import { markRead, notifyNotificationsChanged } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import { getAppPrefs } from '../../utils/appPrefs';
import { metaFor, notificationLink } from '../../utils/notificationLinks';

const SHOW_MS = 7000;
const MAX_VISIBLE = 3;

// Facebook-style pop-up: each new notification slides in at the bottom-left
// of the screen. Clicking it opens the related request / PO / item directly
// and marks it read; it fades on its own after a few seconds (hovering keeps
// it up). Honours the "notification pop-ups" preference.
export default function NotificationPopups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const timers = useRef({});

  const dismiss = id => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setPopups(p => p.filter(x => x.id !== id));
  };
  const schedule = id => {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => dismiss(id), SHOW_MS);
  };

  useEffect(() => {
    const onNew = n => {
      if (!getAppPrefs().notificationToasts) return;
      setPopups(p => [n, ...p.filter(x => x.id !== n.id)].slice(0, MAX_VISIBLE));
      schedule(n.id);
    };
    signalRService.onNotificationReceived(onNew);
    const t = timers.current;
    return () => {
      signalRService.offNotificationReceived(onNew);
      Object.values(t).forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once
  }, []);

  const open = n => {
    dismiss(n.id);
    markRead(n.id).then(notifyNotificationsChanged).catch(() => {});
    navigate(notificationLink(n, user?.role));
  };

  if (popups.length === 0) return null;

  return (
    <div className="np-stack" aria-live="polite">
      <style>{CSS}</style>
      {popups.map(n => {
        const meta = metaFor(n.type);
        const Icon = meta.icon;
        return (
          <div
            key={n.id}
            className="np-card"
            role="button"
            tabIndex={0}
            onClick={() => open(n)}
            onKeyDown={e => { if (e.key === 'Enter') open(n); }}
            onMouseEnter={() => clearTimeout(timers.current[n.id])}
            onMouseLeave={() => schedule(n.id)}
          >
            <span className="np-icon" style={{ background: meta.color }}>
              <Icon size={18} color="#fff" />
            </span>
            <div className="np-body">
              <div className="np-title">{n.title}</div>
              <div className="np-msg">{n.message}</div>
              <div className="np-meta" style={{ color: meta.color }}>{meta.label} · Just now · Click to open</div>
            </div>
            <button
              className="np-close"
              aria-label="Dismiss"
              onClick={e => { e.stopPropagation(); dismiss(n.id); }}
            >
              <MdClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const CSS = `
.np-stack {
  position: fixed; bottom: 20px; left: calc(var(--sidebar-width, 252px) + 20px);
  z-index: 1900; display: flex; flex-direction: column-reverse; gap: 10px;
  width: min(360px, calc(100vw - var(--sidebar-width, 64px) - 40px));
}
.np-card {
  display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
  box-shadow: 0 12px 32px rgba(0,0,0,.28); cursor: pointer; position: relative;
  animation: npIn .28s cubic-bezier(.16,1,.3,1);
  font-family: inherit;
}
.np-card:hover { border-color: var(--green-500); }
.np-icon { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px rgba(255,255,255,.12); }
.np-body { flex: 1; min-width: 0; padding-right: 14px; }
.np-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.np-msg { font-size: 12px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.np-meta { font-size: 11px; font-weight: 600; margin-top: 4px; }
.np-close { position: absolute; top: 8px; right: 8px; border: 0; background: none; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 50%; display: flex; }
.np-close:hover { background: var(--bg-muted); }
@keyframes npIn { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
@media (max-width: 600px) { .np-stack { left: 12px; right: 12px; width: auto; } }
`;
