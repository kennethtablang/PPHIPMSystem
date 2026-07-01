import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MdNotifications, MdRefresh, MdLock, MdVisibility, MdVisibilityOff, MdPerson } from 'react-icons/md';
import { getUnreadCount } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import { toast } from '../common/Toast';

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
  '/audit-logs': 'Audit Logs',
};

const BLANK_PW = { current: '', next: '', confirm: '' };

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState(BLANK_PW);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  const title = TITLES[location.pathname] ?? 'IPMS';

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
    
    signalRService.startNotificationConnection();

    const handleNotification = (notif) => {
      setUnread(u => u + 1);
      
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
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openChangePw = () => { setMenuOpen(false); setPwForm(BLANK_PW); setShowPw({ current: false, next: false, confirm: false }); setPwModal(true); };

  const submitChangePw = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { toast.error('All fields are required.'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('New passwords do not match.'); return; }
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed successfully.');
      setPwModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Current password is incorrect.');
    } finally {
      setSaving(false);
    }
  };

  const setPw = k => e => setPwForm(p => ({ ...p, [k]: e.target.value }));
  const toggleShow = k => setShowPw(p => ({ ...p, [k]: !p[k] }));

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
              onClick={() => setMenuOpen(v => !v)}
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
                background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)',
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
                <button
                  onClick={openChangePw}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    transition: 'background .12s', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <MdLock size={15} color="var(--green-600)" />
                  Change Password
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {pwModal && (
        <Modal
          title="Change Password"
          onClose={() => setPwModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPwModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitChangePw} disabled={saving}>
                {saving ? 'Saving…' : 'Change Password'}
              </button>
            </>
          }
        >
          <PwField label="Current Password" value={pwForm.current} onChange={setPw('current')} show={showPw.current} toggle={() => toggleShow('current')} />
          <PwField label="New Password" value={pwForm.next} onChange={setPw('next')} show={showPw.next} toggle={() => toggleShow('next')} hint="Minimum 8 characters" />
          <PwField label="Confirm New Password" value={pwForm.confirm} onChange={setPw('confirm')} show={showPw.confirm} toggle={() => toggleShow('confirm')} />
        </Modal>
      )}
    </>
  );
}

function PwField({ label, value, onChange, show, toggle, hint }) {
  return (
    <div className="form-group">
      <label className="form-label">{label} *</label>
      <div style={{ position: 'relative' }}>
        <input
          className="form-control"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={toggle}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2,
          }}
          tabIndex={-1}
        >
          {show ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
        </button>
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
