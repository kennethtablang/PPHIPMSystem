import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/inventory';
import { useAuth } from '../context/AuthContext';
import {
  MdInventory, MdWarning, MdEvent, MdShoppingCart,
  MdTune, MdNotifications, MdArrowForward, MdCircle
} from 'react-icons/md';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

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

function AlertRow({ label, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', transition: 'background .12s',
        borderBottom: '1px solid var(--border)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MdCircle size={8} color={color} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
        </div>
      </div>
      <MdArrowForward size={14} color="var(--text-muted)" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  const recentForChart = (data?.recentTransactions ?? [])
    .slice(0, 7)
    .map((t, i) => ({ name: `T${i + 1}`, value: 1, type: t.transactionType }));

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
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 500 }}>SYSTEM STATUS</div>
          <div style={{ color: '#4fd07a', fontSize: 13, fontWeight: 600, marginTop: 2 }}>● All Systems Operational</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <StatCard label="Total Items" value={data?.totalItems ?? 0} icon={MdInventory} color="green" onClick={() => navigate('/inventory')} />
        <StatCard label="Low Stock Alerts" value={data?.lowStockCount ?? 0} icon={MdWarning} color="amber" onClick={() => navigate('/inventory?lowStock=true')} />
        <StatCard label="Expiring Batches" value={data?.expiringItemCount ?? 0} icon={MdEvent} color="red" onClick={() => navigate('/batches')} />
        <StatCard label="Pending Requests" value={data?.pendingProcurementRequests ?? 0} icon={MdShoppingCart} color="blue" onClick={() => navigate('/procurement')} />
        <StatCard label="Pending Adjustments" value={data?.pendingStockAdjustments ?? 0} icon={MdTune} color="purple" onClick={() => navigate('/stock-adjustments')} />
        <StatCard label="Unread Notifications" value={data?.unreadNotifications ?? 0} icon={MdNotifications} color="teal" onClick={() => navigate('/notifications')} />
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdWarning color="#d97706" size={16} /> Low Stock Alerts
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventory?lowStock=true')}>
              View all <MdArrowForward size={14} />
            </button>
          </div>
          <div>
            {(data?.lowStockItems ?? []).length === 0 ? (
              <div className="empty-state">
                <h3>No low stock items</h3>
              </div>
            ) : (
              (data.lowStockItems).slice(0, 6).map(item => (
                <AlertRow
                  key={item.itemId}
                  label={item.itemName}
                  sub={`${item.quantityOnHand} ${item.unit} remaining · Reorder at ${item.reorderThreshold}`}
                  color="#f59e0b"
                  onClick={() => navigate('/inventory')}
                />
              ))
            )}
          </div>
        </div>

        {/* Expiring Batches */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdEvent color="#dc2626" size={16} /> Expiring Soon
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/batches')}>
              View all <MdArrowForward size={14} />
            </button>
          </div>
          <div>
            {(data?.expiringBatches ?? []).length === 0 ? (
              <div className="empty-state">
                <h3>No expiring batches</h3>
              </div>
            ) : (
              (data.expiringBatches).slice(0, 6).map(b => (
                <AlertRow
                  key={b.batchId}
                  label={b.itemName}
                  sub={`Lot: ${b.lotNumber ?? 'N/A'} · Expires in ${b.daysUntilExpiry} days · Qty: ${b.remainingQuantity}`}
                  color="#ef4444"
                  onClick={() => navigate('/batches')}
                />
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stock-movements')}>
              View all <MdArrowForward size={14} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {(data?.recentTransactions ?? []).length === 0 ? (
              <div className="empty-state"><h3>No recent transactions</h3></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Performed By</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentTransactions).slice(0, 8).map((t, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge badge-${
                          t.transactionType === 'Receipt' ? 'green'
                          : t.transactionType === 'Issuance' ? 'blue'
                          : t.transactionType === 'Disposal' ? 'red'
                          : 'amber'
                        }`}>{t.transactionType}</span>
                      </td>
                      <td>{t.description}</td>
                      <td>{t.performedBy}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(t.timestamp).toLocaleString('en-PH')}
                      </td>
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
