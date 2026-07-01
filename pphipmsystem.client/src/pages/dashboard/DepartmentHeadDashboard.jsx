import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdShoppingCart, MdCheckCircle, MdWarning, MdNotifications, MdArrowForward, MdAdd } from 'react-icons/md';
import { getRequests } from '../../api/procurement';
import { getNotifications } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';

function StatCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div className={`stat-card ${color}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function DepartmentHeadDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = () => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getRequests({ departmentId: user.departmentId }),
      getNotifications({ unreadOnly: true })
    ])
      .then(([reqRes, notifRes]) => {
        setRequests(reqRes.data);
        setNotifications(notifRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  useEffect(() => {
    const handleNotification = () => loadDashboard();
    signalRService.onNotificationReceived(handleNotification);
    return () => signalRService.offNotificationReceived(handleNotification);
  }, [user]);

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading department dashboard…</span>
    </div>
  );

  const pending = requests.filter(r => r.status === 'SubmittedToProcurement' || r.status === 'ApprovedByProcurement' || r.status === 'ApprovedByInventoryOfficer').length;
  const returned = requests.filter(r => r.status === 'ReturnedForRevision').length;
  const approved = requests.filter(r => r.status === 'FullyApproved' || r.status === 'PurchaseOrderGenerated' || r.status === 'Delivered').length;
  
  const recentRequests = [...requests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)).slice(0, 5);

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 50%, var(--green-500) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.fullName?.split(' ')[0]}!
          </h2>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 500 }}>DEPARTMENT</div>
          <div style={{ color: '#4fd07a', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{user?.departmentName || 'Not Assigned'}</div>
        </div>
      </div>

      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <StatCard label="Pending Requests" value={pending} icon={MdShoppingCart} color="blue" onClick={() => navigate('/department-requests')} />
        <StatCard label="Returned for Revision" value={returned} icon={MdWarning} color="amber" onClick={() => navigate('/department-requests')} />
        <StatCard label="Approved Requests" value={approved} icon={MdCheckCircle} color="green" onClick={() => navigate('/department-requests')} />
        <StatCard label="Unread Notifications" value={notifications.length} icon={MdNotifications} color="teal" onClick={() => navigate('/notifications')} />
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title">Recent Department Requests</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/department-requests')}>
                <MdAdd size={14} /> New Request
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/department-requests')}>
                View all <MdArrowForward size={14} />
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {recentRequests.length === 0 ? (
              <div className="empty-state"><h3>No recent requests</h3></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Requested By</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/department-requests')}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.requestNumber}</td>
                      <td>{r.requestedByFullName}</td>
                      <td><span className="badge badge-blue">{r.items?.length ?? 0} items</span></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString('en-PH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
