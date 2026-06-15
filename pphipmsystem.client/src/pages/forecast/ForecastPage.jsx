import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MdAutoGraph, MdRefresh } from 'react-icons/md';
import { getForecasts, generateForecast, getConsumptionRecords } from '../../api/forecast';
import { getItems } from '../../api/inventory';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ForecastPage() {
  const { user } = useAuth();
  const canGenerate = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [forecasts, setForecasts] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);

  const load = async id => {
    setLoading(true);
    try {
      const [fc, cc] = await Promise.all([
        getForecasts({ itemId: id }),
        getConsumptionRecords({ itemId: id })
      ]);
      setForecasts(fc.data ?? []);
      setConsumption(cc.data ?? []);
    } catch { toast.error('Failed to load forecast data.'); }
    finally { setLoading(false); }
  };

  const onSelect = e => {
    const id = e.target.value;
    setSelectedItem(id);
    if (id) load(id);
    else { setForecasts([]); setConsumption([]); }
  };

  const generate = async () => {
    if (!selectedItem) return;
    setGenerating(true);
    try {
      await generateForecast(selectedItem);
      toast.success('Forecast generated.');
      load(selectedItem);
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to generate forecast.'); }
    finally { setGenerating(false); }
  };

  const chartData = (() => {
    const map = {};
    consumption.forEach(c => { const k = `${c.year}-${String(c.month).padStart(2, '0')}`; map[k] = { period: `${MONTHS[c.month - 1]} ${c.year}`, consumption: c.quantity }; });
    forecasts.forEach(f => { const k = `${f.forecastYear}-${String(f.forecastMonth).padStart(2, '0')}`; map[k] = { ...(map[k] ?? { period: `${MONTHS[f.forecastMonth - 1]} ${f.forecastYear}` }), forecast: f.forecastedQuantity, reorder: f.suggestedReorderQuantity }; });
    return Object.keys(map).sort().map(k => map[k]);
  })();

  const currentItem = items.find(i => i.id == selectedItem);
  const latestForecast = forecasts.length > 0 ? forecasts[forecasts.length - 1] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demand Forecasting</h1>
          <p className="page-subtitle">Moving average and exponential smoothing forecasts based on consumption history</p>
        </div>
        {canGenerate && selectedItem && (
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            <MdAutoGraph size={16} /> {generating ? 'Generating…' : 'Generate Forecast'}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={selectedItem} onChange={onSelect} style={{ minWidth: 300 }}>
          <option value="">Select an inventory item to view forecast</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
        </select>
        {selectedItem && <button className="btn btn-ghost btn-sm" onClick={() => load(selectedItem)}><MdRefresh size={14} /></button>}
      </div>

      {!selectedItem ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <MdAutoGraph size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16 }}>Select an item to view demand forecasting</div>
        </div>
      ) : loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {currentItem && latestForecast && (
            <div className="grid-stat" style={{ marginBottom: 24 }}>
              <div className="stat-card green">
                <div className="stat-label">Forecasted Demand</div>
                <div className="stat-value">{latestForecast.forecastedQuantity?.toFixed(2)}</div>
                <div className="stat-sub">{currentItem.unit} / month</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-label">Suggested Reorder</div>
                <div className="stat-value">{latestForecast.suggestedReorderQuantity?.toFixed(2)}</div>
                <div className="stat-sub">{currentItem.unit} (+10% buffer)</div>
              </div>
              <div className="stat-card teal">
                <div className="stat-label">Forecast Method</div>
                <div className="stat-value" style={{ fontSize: 18, fontWeight: 700 }}>{latestForecast.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</div>
                <div className="stat-sub">
                  {latestForecast.method === 'MovingAverage' ? `${currentItem.movingAverageWindow}-month window` : `α = ${currentItem.smoothingConstant}`}
                </div>
              </div>
              <div className="stat-card amber">
                <div className="stat-label">Current Stock</div>
                <div className="stat-value" style={{ color: currentItem.isBelowReorder ? '#dc2626' : undefined }}>{currentItem.quantityOnHand}</div>
                <div className="stat-sub">Reorder at {currentItem.reorderThreshold} {currentItem.unit}</div>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {chartData.length > 0 ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Consumption vs Forecast Trend</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ fontWeight: 700, color: 'var(--text)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="consumption" name="Actual Consumption" stroke="#1a6a36" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="forecast" name="Forecasted" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="reorder" name="Suggested Reorder" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-body" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                No consumption or forecast data available. Generate a forecast to get started.
              </div>
            </div>
          )}

          {/* Consumption Records Table */}
          {consumption.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Monthly Consumption Records</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr><th>Month</th><th>Year</th><th>Quantity Consumed</th><th>Unit</th></tr>
                    </thead>
                    <tbody>
                      {[...consumption].reverse().map(c => (
                        <tr key={c.id}>
                          <td>{MONTHS[c.month - 1]}</td>
                          <td>{c.year}</td>
                          <td style={{ fontWeight: 600 }}>{c.quantity}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{currentItem?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Forecasts Table */}
          {forecasts.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Forecast Records</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr><th>Period</th><th>Method</th><th>Forecasted Qty</th><th>Suggested Reorder</th><th>Generated At</th></tr>
                    </thead>
                    <tbody>
                      {[...forecasts].reverse().map(f => (
                        <tr key={f.id}>
                          <td>{MONTHS[f.forecastMonth - 1]} {f.forecastYear}</td>
                          <td><span className="badge badge-blue">{f.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</span></td>
                          <td style={{ fontWeight: 600 }}>{f.forecastedQuantity?.toFixed(2)}</td>
                          <td style={{ color: 'var(--green-700)', fontWeight: 600 }}>{f.suggestedReorderQuantity?.toFixed(2)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(f.generatedAt).toLocaleString('en-PH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
