import { useState, useEffect } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdClose, MdInfo } from 'react-icons/md';

let addToastFn = null;
let nextToastId = 0; // Date.now() collided when two toasts fired in the same millisecond
export const toast = {
  success: msg => addToastFn?.({ type: 'success', msg }),
  error: msg => addToastFn?.({ type: 'error', msg }),
  warning: msg => addToastFn?.({ type: 'warning', msg }),
  info: msg => addToastFn?.({ type: 'info', msg }),
};

const ICONS = { success: MdCheckCircle, error: MdError, warning: MdWarning, info: MdInfo };
const COLORS = { success: 'var(--green-500)', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastFn = ({ type, msg }) => {
      const id = ++nextToastId;
      setToasts(prev => [...prev, { id, type, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  const remove = id => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, left: 'auto', maxWidth: 'calc(100vw - 48px)', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 2000 }}>
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id} style={{
            minWidth: 'min(280px, calc(100vw - 48px))', maxWidth: 360, padding: '14px 18px',
            background: 'var(--surface)', borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)', borderLeft: `4px solid ${COLORS[t.type]}`,
            animation: 'slideInRight .25s ease',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Icon size={18} style={{ color: COLORS[t.type], flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{t.msg}</span>
            <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
              <MdClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
