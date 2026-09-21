import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MdAutoGraph, MdRefresh, MdAdd } from 'react-icons/md';
import { getForecasts, generateForecast, getConsumptionRecords, upsertConsumption, syncConsumption } from '../../api/forecast';
import { getItems } from '../../api/inventory';
import { signalRService } from '../../api/signalrService';
import { toast } from '../../components/common/Toast';
import { fmtDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import ForecastExplainer, { ChartReadingGuide } from './ForecastExplainer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ForecastPage() {
  const { user } = useAuth();
  const canGenerate = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const now = new Date();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [forecasts, setForecasts] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [consumptionModal, setConsumptionModal] = useState(false);
  const [consumptionForm, setConsumptionForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), quantity: '' });
  const [savingConsumption, setSavingConsumption] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [periodCount, setPeriodCount] = useState(3);
  const [method, setMethod] = useState('');

  useEffect(() => { 
    getItems().then(r => setItems(r.data)); 
    signalRService.startForecastConnection();
  }, []);

  useEffect(() => {
    const handleUpdate = (updatedForecasts) => {
      if (!updatedForecasts || updatedForecasts.length === 0) return;
      if (updatedForecasts[0].inventoryItemId != selectedItem) return;

      setForecasts(prev => {
        const map = new Map(prev.map(f => [f.id, f]));
        updatedForecasts.forEach(f => map.set(f.id, f));
        return Array.from(map.values()).sort((a, b) => {
          if (a.forecastYear !== b.forecastYear) return b.forecastYear - a.forecastYear;
          return b.forecastMonth - a.forecastMonth;
        });
      });
      toast.info('Forecast data updated in real-time.');
    };

    signalRService.onForecastUpdated(handleUpdate);
    return () => {
      signalRService.offForecastUpdated(handleUpdate);
    };
  }, [selectedItem]);

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
      await generateForecast(selectedItem, periodCount, method || null);
      toast.success(`Forecast generated for next ${periodCount} month(s).`);
      load(selectedItem);
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to generate forecast.'); }
    finally { setGenerating(false); }
  };

  const saveConsumption = async () => {
    if (!consumptionForm.quantity || +consumptionForm.quantity < 0) return;
    setSavingConsumption(true);
    try {
      await upsertConsumption({ inventoryItemId: +selectedItem, month: +consumptionForm.month, year: +consumptionForm.year, quantityConsumed: +consumptionForm.quantity });
      toast.success('Consumption record saved.');
      setConsumptionModal(false);
      load(selectedItem);
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to save consumption.'); }
    finally { setSavingConsumption(false); }
  };

  const sync = async () => {
    if (!selectedItem) return;
    setSyncing(true);
    try {
      await syncConsumption(selectedItem);
      toast.success('Consumption records synced with stock movements.');
      load(selectedItem);
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to sync consumption records.'); }
    finally { setSyncing(false); }
  };

  const chartData = (() => {
    const map = {};
    consumption.forEach(c => { const k = `${c.year}-${String(c.month).padStart(2, '0')}`; map[k] = { period: `${MONTHS[c.month - 1]} ${c.year}`, consumption: c.quantityConsumed }; });
    forecasts.forEach(f => { const k = `${f.forecastYear}-${String(f.forecastMonth).padStart(2, '0')}`; map[k] = { ...(map[k] ?? { period: `${MONTHS[f.forecastMonth - 1]} ${f.forecastYear}` }), forecast: f.forecastedQuantity, reorder: f.suggestedReorderQuantity }; });
    // Keep the axis continuous. A month with no record inside the consumption
    // history is plotted as zero — the forecast engine counts it the same way.
    const keys = Object.keys(map).sort();
    if (keys.length > 1) {
      const lastConsumed = consumption.reduce((m, c) => Math.max(m, c.year * 12 + c.month - 1), -1);
      const toIdx = k => +k.slice(0, 4) * 12 + (+k.slice(5) - 1);
      for (let i = toIdx(keys[0]); i < toIdx(keys[keys.length - 1]); i++) {
        const y = Math.floor(i / 12), m = (i % 12) + 1;
        const k = `${y}-${String(m).padStart(2, '0')}`;
        if (!map[k]) map[k] = { period: `${MONTHS[m - 1]} ${y}`, ...(i < lastConsumed ? { consumption: 0 } : {}) };
      }
    }
    return Object.keys(map).sort().map(k => map[k]);
  })();

  const currentItem = items.find(i => i.id == selectedItem);
  // Forecasts arrive newest-period-first; the summary cards should show the
  // nearest upcoming month, falling back to the most recent one.
  const ascending = [...forecasts].sort((a, b) =>
    (a.forecastYear - b.forecastYear) || (a.forecastMonth - b.forecastMonth));
  const isUpcoming = f =>
    f.forecastYear > now.getFullYear() ||
    (f.forecastYear === now.getFullYear() && f.forecastMonth > now.getMonth());
  const upcoming = ascending.filter(isUpcoming);
  const nextForecast = upcoming[0] ?? ascending[ascending.length - 1] ?? null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demand Forecasting</h1>
          <p className="page-subtitle">Moving average and exponential smoothing forecasts based on consumption history</p>
        </div>
        {selectedItem && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canGenerate && (
              <button className="btn btn-secondary" onClick={sync} disabled={syncing}>
                <MdRefresh size={16} /> {syncing ? 'Syncing…' : 'Sync Records'}
              </button>
            )}
            {canGenerate && (
              <button className="btn btn-secondary" onClick={() => setConsumptionModal(true)}>
                <MdAdd size={16} /> Add Consumption
              </button>
            )}
            {canGenerate && (
              <>
                <select
                  className="form-control"
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  style={{ width: 160 }}
                  title="Forecasting method"
                >
                  <option value="">Item default method</option>
                  <option value="MovingAverage">Moving Average</option>
                  <option value="ExponentialSmoothing">Exp. Smoothing</option>
                </select>
                <select
                  className="form-control"
                  value={periodCount}
                  onChange={e => setPeriodCount(+e.target.value)}
                  style={{ width: 130 }}
                  title="Months to forecast ahead"
                >
                  {[1,2,3,6,9,12].map(n => (
                    <option key={n} value={n}>{n} month{n > 1 ? 's' : ''} ahead</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={generate} disabled={generating}>
                  <MdAutoGraph size={16} /> {generating ? 'Generating…' : 'Generate Forecast'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="filter-bar">
        <SearchSelect
          value={selectedItem}
          onChange={onSelect}
          placeholder="Search an inventory item to view forecast…"
          style={{ minWidth: 300 }}
          options={items.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
        />
        {selectedItem && <button className="btn btn-ghost btn-sm" onClick={() => load(selectedItem)}><MdRefresh size={14} /></button>}
      </div>

      {!selectedItem ? (
        <div className="empty-state">
          <MdAutoGraph size={64} style={{ opacity: 0.2 }} />
          <h3>Select an item to view demand forecasting</h3>
        </div>
      ) : loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {currentItem && nextForecast && (
            <div className="grid-stat" style={{ marginBottom: 24 }}>
              <div className="stat-card green">
                <div className="stat-label">Forecasted Demand — {MONTHS[nextForecast.forecastMonth - 1]} {nextForecast.forecastYear}</div>
                <div className="stat-value">{nextForecast.forecastedQuantity?.toFixed(2)}</div>
                <div className="stat-sub">{currentItem.unit} / month</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-label">Suggested Reorder</div>
                <div className="stat-value">{nextForecast.suggestedReorderQuantity?.toFixed(2)}</div>
                <div className="stat-sub">{currentItem.unit} (+10% buffer)</div>
              </div>
              <div className="stat-card teal">
                <div className="stat-label">Forecast Method</div>
                <div className="stat-value" style={{ fontSize: 18, fontWeight: 700 }}>{nextForecast.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</div>
                <div className="stat-sub">
                  {nextForecast.method === 'MovingAverage' ? `${currentItem.movingAverageWindow}-month window` : `α = ${currentItem.smoothingConstant}`}
                </div>
              </div>
              <div className="stat-card amber">
                <div className="stat-label">Current Stock</div>
                <div className="stat-value" style={{ color: currentItem.isBelowReorder ? '#dc2626' : undefined }}>{currentItem.quantityOnHand}</div>
                <div className="stat-sub">Reorder at {currentItem.reorderThreshold} {currentItem.unit}</div>
              </div>
            </div>
          )}

          {/* Plain-language reading of the forecast */}
          {currentItem && nextForecast ? (
            <ForecastExplainer
              item={currentItem}
              nextForecast={nextForecast}
              upcoming={upcoming}
              forecasts={forecasts}
              consumption={consumption}
            />
          ) : consumption.length > 0 && (
            <div className="alert alert-info" style={{ marginBottom: 24 }}>
              No forecast yet for this item. {canGenerate
                ? <>Select <strong>Generate Forecast</strong> above to get a plain-language summary of expected demand and what to order.</>
                : 'Once a forecast is generated, a plain-language summary of expected demand and what to order will appear here.'}
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
                <ChartReadingGuide />
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
                          <td style={{ fontWeight: 600 }}>{c.quantityConsumed}</td>
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
                      <tr><th>Period</th><th>Method</th><th>Forecasted Qty</th><th>Actual</th><th>Abs. Error</th><th>Suggested Reorder</th><th>Generated At</th></tr>
                    </thead>
                    <tbody>
                      {[...forecasts].reverse().map(f => (
                        <tr key={f.id}>
                          <td>{MONTHS[f.forecastMonth - 1]} {f.forecastYear}</td>
                          <td><span className="badge badge-blue">{f.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</span></td>
                          <td style={{ fontWeight: 600 }}>{f.forecastedQuantity?.toFixed(2)}</td>
                          <td>{f.actualQuantity != null ? f.actualQuantity.toFixed(2) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td>{f.forecastError != null ? f.forecastError.toFixed(2) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td style={{ color: 'var(--green-700)', fontWeight: 600 }}>{f.suggestedReorderQuantity?.toFixed(2)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(f.generatedAt)}</td>
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

      {consumptionModal && (
        <Modal
          title={`Add Consumption — ${currentItem?.name ?? ''}`}
          onClose={() => setConsumptionModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConsumptionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveConsumption} disabled={savingConsumption}>
                {savingConsumption ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Month *</label>
              <select className="form-control" value={consumptionForm.month} onChange={e => setConsumptionForm(p => ({ ...p, month: +e.target.value }))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <input className="form-control" type="number" min="2020" max={now.getFullYear()} value={consumptionForm.year} onChange={e => setConsumptionForm(p => ({ ...p, year: +e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity Consumed *</label>
            <input className="form-control" type="number" min="0" step="0.01" value={consumptionForm.quantity} onChange={e => setConsumptionForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="alert alert-info">
            Saving will overwrite any existing record for the same month/year. Used to calculate demand forecasts.
          </div>
        </Modal>
      )}
    </div>
  );
}
