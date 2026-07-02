import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/inventory';
import { createMovement } from '../api/stockMovements';
import { signalRService } from '../api/signalrService';
import { useAuth } from '../context/AuthContext';
import {
  MdInventory, MdWarning, MdEvent, MdShoppingCart,
  MdTune, MdNotifications, MdArrowForward, MdCircle, MdRepeat,
  MdAddShoppingCart, MdFilterList,
} from 'react-icons/md';
import Modal from '../components/common/Modal';
import { toast } from '../components/common/Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import DepartmentHeadDashboard from './dashboard/DepartmentHeadDashboard';

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

function AlertRow({ label, sub, color, onClick, action }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        transition: 'background .12s',
        borderBottom: '1px solid var(--border)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
        onClick={onClick}
      >
        <MdCircle size={8} color={color} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {action}
        <MdArrowForward size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={onClick} />
      </div>
    </div>
  );
}

const REPEATABLE = ['Receipt', 'Issuance'];
const CAN_CREATE_PR = ['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Hooks must all run before any conditional return; the Department Head
  // branch is rendered at the bottom and the effects no-op for that role.
  const isDeptHead = user?.role === 'DepartmentHead';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [repeatTx, setRepeatTx] = useState(null);
  const [repeatQty, setRepeatQty] = useState('');
  const [repeatRemarks, setRepeatRemarks] = useState('');
  const [repeating, setRepeating] = useState(false);

  const loadDashboard = () => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isDeptHead) return;
    loadDashboard();
  }, [isDeptHead]);

  useEffect(() => {
    if (isDeptHead) return;
    const handleNotification = () => loadDashboard();
    signalRService.onNotificationReceived(handleNotification);
    return () => signalRService.offNotificationReceived(handleNotification);
  }, [isDeptHead]);

  const openRepeat = tx => {
    setRepeatTx(tx);
    setRepeatQty(String(tx.quantity ?? ''));
    setRepeatRemarks('');
  };

  const submitRepeat = async () => {
    if (!repeatQty || +repeatQty <= 0) { toast.error('Quantity must be greater than 0.'); return; }
    setRepeating(true);
    try {
      await createMovement({
        inventoryItemId: repeatTx.inventoryItemId,
        movementType: repeatTx.transactionType,
        quantity: +repeatQty,
        remarks: repeatRemarks || `Repeated from transaction #${repeatTx.referenceId}`,
      });
      toast.success(`${repeatTx.transactionType} repeated successfully.`);
      setRepeatTx(null);
      getDashboard().then(r => setData(r.data)).catch(() => {});
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to repeat transaction.');
    } finally { setRepeating(false); }
  };

  if (isDeptHead) return <DepartmentHeadDashboard />;

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

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

      {/* FR-2.4: Category filter */}
      {(() => {
        const cats = [...new Set((data?.lowStockItems ?? []).map(i => i.categoryName).filter(Boolean))];
        if (cats.length < 2) return null;
        return (
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <MdFilterList size={15} style={{ color: 'var(--text-muted)' }} />
            <button className={`btn btn-sm ${catFilter === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter('')}>All Categories</button>
            {cats.map(c => (
              <button key={c} className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
        );
      })()}

      {/* Analytics Section */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Monthly Trend Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Procurement vs Consumption (6 Months)</span>
          </div>
          <div style={{ height: 300, padding: 10 }}>
            {data?.monthlyTrends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="Month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => '₱' + val.toLocaleString()} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(5,46,16,0.9)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
                    formatter={(value) => ['₱' + Number(value).toLocaleString(undefined, {minimumFractionDigits:2}), '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Bar dataKey="ProcurementValue" name="Received (₱)" fill="var(--blue-500)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ConsumptionValue" name="Issued (₱)" fill="var(--amber-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><h3>No trend data available</h3></div>
            )}
          </div>
        </div>

        {/* Stock Value by Category Pie Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stock Value by Category</span>
          </div>
          <div style={{ height: 300, padding: 10 }}>
            {data?.stockByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.stockByCategory}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={5}
                    dataKey="TotalValue"
                    nameKey="CategoryName"
                  >
                    {data.stockByCategory.map((entry, index) => {
                      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(5,46,16,0.9)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
                    formatter={(value) => ['₱' + Number(value).toLocaleString(undefined, {minimumFractionDigits:2}), 'Total Value']}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><h3>No category data</h3></div>
            )}
          </div>
        </div>
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
            {(() => {
              const filtered = (data?.lowStockItems ?? []).filter(i => !catFilter || i.categoryName === catFilter);
              if (filtered.length === 0) return <div className="empty-state"><h3>No low stock items</h3></div>;
              return filtered.slice(0, 6).map(item => (
                <AlertRow
                  key={item.itemId}
                  label={item.itemName}
                  sub={`${item.quantityOnHand} ${item.unit} remaining · Reorder at ${item.reorderThreshold} · ${item.categoryName}`}
                  color="#f59e0b"
                  onClick={() => navigate('/inventory')}
                  action={CAN_CREATE_PR.includes(user?.role) ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Create procurement request for this item"
                      style={{ fontSize: 11, gap: 4, flexShrink: 0 }}
                      onClick={e => {
                        e.stopPropagation();
                        navigate('/procurement', { state: { prefillItem: { id: item.itemId, name: item.itemName, unit: item.unit } } });
                      }}
                    >
                      <MdAddShoppingCart size={13} /> Create PR
                    </button>
                  ) : null}
                />
              ));
            })()}
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentTransactions).slice(0, 8).map(t => (
                    <tr key={t.referenceId ?? `${t.transactionType}-${t.timestamp}`}>
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
                      <td>
                        {REPEATABLE.includes(t.transactionType) && t.inventoryItemId && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openRepeat(t)}
                            title="Repeat this transaction"
                            style={{ fontSize: 11, gap: 4 }}
                          >
                            <MdRepeat size={13} /> Repeat
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {repeatTx && (
        <Modal
          title={`Repeat ${repeatTx.transactionType} — ${repeatTx.inventoryItemName}`}
          onClose={() => setRepeatTx(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRepeatTx(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRepeat} disabled={repeating}>
                {repeating ? 'Saving…' : `Confirm ${repeatTx.transactionType}`}
              </button>
            </>
          }
        >
          <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 4 }}>
            <strong>Item:</strong> {repeatTx.inventoryItemName} &nbsp;·&nbsp;
            <strong>Original qty:</strong> {repeatTx.quantity} {repeatTx.unit}
          </div>
          <div className="form-group">
            <label className="form-label">Quantity ({repeatTx.unit}) *</label>
            <input
              className="form-control"
              type="number"
              min="0.01"
              step="0.01"
              value={repeatQty}
              onChange={e => setRepeatQty(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input
              className="form-control"
              value={repeatRemarks}
              onChange={e => setRepeatRemarks(e.target.value)}
              placeholder={`Repeated ${repeatTx.transactionType} — ${repeatTx.inventoryItemName}`}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
