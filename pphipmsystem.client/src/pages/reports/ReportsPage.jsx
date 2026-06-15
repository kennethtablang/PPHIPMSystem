import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MdFileDownload, MdBarChart, MdShowChart, MdPieChart } from 'react-icons/md';
import { getConsumptionReport, getProcurementReport, getForecastAccuracyReport } from '../../api/reports';
import { toast } from '../../components/common/Toast';

const COLORS = ['#1a6a36', '#2d9b5a', '#3bb870', '#5ece8a', '#82e8a8', '#a7f3c5', '#3b82f6', '#60a5fa', '#f59e0b', '#fcd34d'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsPage() {
  const now = new Date();
  const [tab, setTab] = useState('consumption');
  const [params, setParams] = useState({
    year: now.getFullYear(),
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().split('T')[0],
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = k => e => setParams(p => ({ ...p, [k]: e.target.value }));

  const generate = async () => {
    setLoading(true);
    setData(null);
    try {
      let r;
      if (tab === 'consumption') r = await getConsumptionReport({ year: params.year });
      else if (tab === 'procurement') r = await getProcurementReport({ startDate: params.startDate, endDate: params.endDate });
      else r = await getForecastAccuracyReport({ year: params.year });
      setData(r.data);
    } catch { toast.error('Failed to generate report.'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'consumption', label: 'Consumption Report', icon: <MdBarChart /> },
    { id: 'procurement', label: 'Procurement Report', icon: <MdShowChart /> },
    { id: 'forecast', label: 'Forecast Accuracy', icon: <MdPieChart /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate consumption, procurement, and forecast accuracy reports</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab(t.id); setData(null); }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {(tab === 'consumption' || tab === 'forecast') && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Year</label>
                <input className="form-control" type="number" value={params.year} onChange={set('year')} style={{ width: 100 }} min="2020" max={now.getFullYear()} />
              </div>
            )}
            {tab === 'procurement' && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="date" value={params.startDate} onChange={set('startDate')} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">End Date</label>
                  <input className="form-control" type="date" value={params.endDate} onChange={set('endDate')} />
                </div>
              </>
            )}
            <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ alignSelf: 'flex-end' }}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {data && tab === 'consumption' && <ConsumptionReport data={data} year={params.year} />}
      {data && tab === 'procurement' && <ProcurementReport data={data} />}
      {data && tab === 'forecast' && <ForecastAccuracyReport data={data} year={params.year} />}
    </div>
  );
}

function ConsumptionReport({ data, year }) {
  const byMonth = MONTHS.map((m, i) => ({
    month: m,
    total: (data.byMonth ?? []).find(b => b.month === i + 1)?.totalQuantity ?? 0,
  }));

  const topItems = (data.topItems ?? []).slice(0, 10);

  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Total Consumption</div><div className="stat-value">{data.totalQuantity?.toLocaleString()}</div><div className="stat-sub">units in {year}</div></div>
        <div className="stat-card blue"><div className="stat-label">Unique Items</div><div className="stat-value">{data.uniqueItems}</div><div className="stat-sub">consumed</div></div>
        <div className="stat-card teal"><div className="stat-label">Peak Month</div><div className="stat-value">{MONTHS[(data.peakMonth ?? 1) - 1]}</div><div className="stat-sub">{data.peakMonthQty?.toLocaleString()} units</div></div>
        <div className="stat-card amber"><div className="stat-label">Avg / Month</div><div className="stat-value">{data.avgMonthlyConsumption?.toFixed(1)}</div><div className="stat-sub">units</div></div>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Monthly Consumption — {year}</h3></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="total" name="Quantity Consumed" fill="#1a6a36" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {topItems.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Top Consumed Items</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Total Qty</th><th>Unit</th></tr></thead>
                <tbody>
                  {topItems.map((it, i) => (
                    <tr key={it.itemId}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{it.itemName}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.category}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green-700)' }}>{it.totalQuantity?.toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProcurementReport({ data }) {
  const statusData = Object.entries(data.byStatus ?? {}).map(([k, v]) => ({ name: k, value: v }));

  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Total Requests</div><div className="stat-value">{data.totalRequests}</div></div>
        <div className="stat-card blue"><div className="stat-label">Fully Approved</div><div className="stat-value">{data.fullyApproved}</div></div>
        <div className="stat-card teal"><div className="stat-label">Total PO Amount</div><div className="stat-value" style={{ fontSize: 20 }}>₱{(data.totalPOAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
        <div className="stat-card amber"><div className="stat-label">Delivered POs</div><div className="stat-value">{data.deliveredPOs}</div><div className="stat-sub">of {data.totalPOs} total POs</div></div>
      </div>
      {statusData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">Requests by Status</h3></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={400} height={280}>
              <Pie data={statusData} cx={200} cy={140} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
            </PieChart>
          </div>
        </div>
      )}
      {(data.topSuppliers ?? []).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Top Suppliers by PO Amount</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead><tr><th>Supplier</th><th>No. of POs</th><th>Total Amount</th></tr></thead>
                <tbody>
                  {data.topSuppliers.map(s => (
                    <tr key={s.supplierId}>
                      <td style={{ fontWeight: 500 }}>{s.supplierName}</td>
                      <td>{s.poCount}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green-700)' }}>₱{s.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ForecastAccuracyReport({ data, year }) {
  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Forecasts Generated</div><div className="stat-value">{data.totalForecasts}</div><div className="stat-sub">in {year}</div></div>
        <div className="stat-card blue"><div className="stat-label">Moving Average</div><div className="stat-value">{data.movingAverageCount}</div></div>
        <div className="stat-card teal"><div className="stat-label">Exp. Smoothing</div><div className="stat-value">{data.expSmoothingCount}</div></div>
        <div className="stat-card amber"><div className="stat-label">Items with Forecast</div><div className="stat-value">{data.itemsWithForecast}</div></div>
      </div>
      {(data.itemForecasts ?? []).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Per-Item Forecast Summary — {year}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr><th>Item</th><th>Method</th><th>Latest Forecast</th><th>Suggested Reorder</th><th>Current Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.itemForecasts.map(f => (
                    <tr key={f.itemId}>
                      <td style={{ fontWeight: 500 }}>{f.itemName}</td>
                      <td><span className="badge badge-blue">{f.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</span></td>
                      <td style={{ fontWeight: 600 }}>{f.latestForecast?.toFixed(2)}</td>
                      <td style={{ color: 'var(--green-700)', fontWeight: 600 }}>{f.suggestedReorder?.toFixed(2)}</td>
                      <td style={{ color: f.isBelowReorder ? '#dc2626' : undefined, fontWeight: f.isBelowReorder ? 700 : 400 }}>{f.currentStock}</td>
                      <td><span className={`badge ${f.isBelowReorder ? 'badge-red' : 'badge-green'}`}>{f.isBelowReorder ? 'Low Stock' : 'Adequate'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
