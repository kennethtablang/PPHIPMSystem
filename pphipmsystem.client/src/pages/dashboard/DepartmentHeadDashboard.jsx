import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdShoppingCart, MdCheckCircle, MdWarning, MdNotifications,
  MdArrowForward, MdAdd, MdInventory, MdAccessTime, MdRefresh,
  MdTrendingUp, MdAssignment, MdDoneAll,
} from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { getRequests } from '../../api/procurement';
import { getNotifications } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';

function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div
      className={`stat-card ${color}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>{sub}</div>}
    </div>
  );
}

const STATUS_STEP = {
  Draft:                        0,
  SubmittedByDepartment:        1,
  SubmittedToProcurement:       2,
  ApprovedByInventoryOfficer:   3,
  ApprovedByProcurement:        4,
  FullyApproved:                5,
  PurchaseOrderGenerated:       6,
  Delivered:                    7,
  Cancelled:                    -1,
  Rejected:                     -1,
  ReturnedForRevision:          -1,
};

const STEPS_LABELS = [
  'Draft', 'Submitted', 'In Procurement', 'Inventory Approved',
  'Procurement Approved', 'Fully Approved', 'PO Generated', 'Delivered',
];

function RequestTimeline({ status }) {
  const step = STATUS_STEP[status] ?? 0;
  const isCancelled = status === 'Cancelled' || status === 'Rejected';
  const isReturned = status === 'ReturnedForRevision';

  if (isCancelled || isReturned) {
    return (
      <span
        className={`badge ${isCancelled ? 'badge-red' : 'badge-amber'}`}
        style={{ fontSize: 11 }}
      >
        {isCancelled ? '✗ Cancelled / Rejected' : '↩ Returned for Revision'}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {STEPS_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700,
            background: i <= step ? 'var(--green-600)' : 'var(--border)',
            color: i <= step ? '#fff' : 'var(--text-muted)',
            transition: 'all .2s ease',
          }}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < STEPS_LABELS.length - 1 && (
            <div style={{
              height: 2, width: 16,
              background: i < step ? 'var(--green-400)' : 'var(--border)',
              borderRadius: 1, transition: 'background .2s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DepartmentHeadDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      getRequests({ departmentId: user.departmentId }),
      getNotifications({ unreadOnly: true }),
    ])
      .then(([reqRes, notifRes]) => {
        setRequests(reqRes.data ?? []);
        setNotifications(notifRes.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    const handleNotification = () => loadDashboard();
    signalRService.onNotificationReceived(handleNotification);
    return () => signalRService.offNotificationReceived(handleNotification);
  }, [loadDashboard]);

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading department dashboard…</span>
    </div>
  );

  const pending  = requests.filter(r => ['SubmittedByDepartment', 'SubmittedToProcurement', 'ApprovedByInventoryOfficer', 'ApprovedByProcurement'].includes(r.status)).length;
  const returned = requests.filter(r => r.status === 'ReturnedForRevision').length;
  const approved = requests.filter(r => ['FullyApproved', 'PurchaseOrderGenerated', 'Delivered'].includes(r.status)).length;
  const rejected = requests.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length;

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
    .slice(0, 8);

  // Monthly chart data from requests
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    const monthReqs = requests.filter(r => {
      const rd = new Date(r.requestedAt);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    });
    return {
      month: label,
      total: monthReqs.length,
      approved: monthReqs.filter(r => ['FullyApproved', 'Delivered', 'PurchaseOrderGenerated'].includes(r.status)).length,
      pending: monthReqs.filter(r => !['FullyApproved', 'Delivered', 'PurchaseOrderGenerated', 'Rejected', 'Cancelled'].includes(r.status)).length,
    };
  });

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="fade-in slide-up">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 50%, var(--green-500) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
      }}>
        {[{ r: -20, t: -20, s: 180 }, { r: 60, b: -40, s: 110 }, { r: 130, t: 20, s: 60 }].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', right: c.r, top: c.t, bottom: c.b,
            width: c.s, height: c.s, borderRadius: '50%',
            background: `rgba(255,255,255,${0.03 + i * 0.02})`,
          }} />
        ))}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
            {greeting}, {user?.fullName?.split(' ')[0]}! 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 4 }}>
            Here's your department overview for today.
          </p>
        </div>
        <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Department</div>
          <div style={{
            color: '#fff', fontSize: 14, fontWeight: 700,
            background: 'rgba(255,255,255,.12)', padding: '6px 14px',
            borderRadius: 99, border: '1px solid rgba(255,255,255,.2)',
          }}>
            {user?.departmentName || 'Not Assigned'}
          </div>
          <button
            className="btn btn-sm"
            style={{ marginTop: 10, background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }}
            onClick={loadDashboard}
          >
            <MdRefresh size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Total Requests" value={requests.length} icon={MdAssignment} color="green" sub="all time" onClick={() => navigate('/department-requests')} />
        <StatCard label="Pending Approval" value={pending} icon={MdAccessTime} color="blue" sub="awaiting action" onClick={() => navigate('/department-requests')} />
        <StatCard label="Approved / Delivered" value={approved} icon={MdCheckCircle} color="teal" sub="fulfilled" onClick={() => navigate('/department-requests')} />
        <StatCard label="Returned / Rejected" value={returned + rejected} icon={MdWarning} color={returned + rejected > 0 ? 'red' : 'amber'} sub="needs attention" onClick={() => navigate('/department-requests')} />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/department-requests')}>
          <MdAdd size={16} /> New Procurement Request
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/notifications')}>
          <MdNotifications size={16} /> View Notifications
          {notifications.length > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '50%',
              minWidth: 18, height: 18, fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>
              {notifications.length}
            </span>
          )}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/procurement')}>
          <MdInventory size={16} /> View All Requests
        </button>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Monthly Requests Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTrendingUp size={16} color="var(--green-600)" /> Monthly Request Activity
            </span>
          </div>
          <div style={{ height: 240, padding: 16 }}>
            {monthlyData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ background: 'rgba(255,255,255,.95)', border: '1px solid var(--border)', borderRadius: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="approved" name="Approved" fill="var(--green-500)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="var(--blue-400)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><h3>No request data yet</h3></div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdDoneAll size={16} color="var(--green-600)" /> Request Status Breakdown
            </span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Draft', count: requests.filter(r => r.status === 'Draft').length, color: 'var(--text-muted)', bg: 'var(--bg-muted)' },
              { label: 'Pending / In Review', count: pending, color: 'var(--blue-600)', bg: 'var(--blue-50)' },
              { label: 'Returned for Revision', count: returned, color: 'var(--amber-600)', bg: 'var(--amber-50)' },
              { label: 'Fully Approved / Delivered', count: approved, color: 'var(--green-700)', bg: 'var(--green-50)' },
              { label: 'Rejected / Cancelled', count: rejected, color: 'var(--red-700)', bg: 'var(--red-50)' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  flex: 1, background: bg, borderRadius: 8,
                  padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color }}>{count}</span>
                </div>
                <div style={{ width: 80, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: requests.length ? `${(count / requests.length) * 100}%` : '0%',
                    background: color, transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="card">
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
            <div className="empty-state">
              <MdShoppingCart size={32} color="var(--text-muted)" />
              <h3>No requests found</h3>
              <p style={{ fontSize: 12, marginTop: 4 }}>Create your first procurement request to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Requested By</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Progress</th>
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
                    <td style={{ maxWidth: 200 }}><RequestTimeline status={r.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(r.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
