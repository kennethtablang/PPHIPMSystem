import { useState } from 'react';
import { MdBarChart, MdShowChart, MdPieChart, MdPrint, MdFileDownload, MdInsights } from 'react-icons/md';
import { getConsumptionReport, getProcurementReport, getForecastAccuracyReport, exportReportExcel } from '../../api/reports';
import { toast } from '../../components/common/Toast';
import { ChartCard, MonthlyBars, RankedBars, GroupedBars, ProgressMeter } from './ReportCharts';
import { useChartPalette, fmtQty, fmtPeso, fmtCount } from './chartTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TAB_LABELS = {
  consumption: 'Consumption Report',
  procurement: 'Procurement Report',
  forecast: 'Forecast Accuracy Report',
};

// Pipeline order for the status breakdown, with the shortened labels used on
// StatusBadge so the chart and the request lists read the same.
const STATUS_ORDER = [
  'Draft', 'SubmittedByDepartment', 'SubmittedToProcurement', 'ApprovedByInventoryOfficer',
  'ApprovedByProcurement', 'FullyApproved', 'PurchaseOrderGenerated', 'Delivered',
  'ReturnedForRevision', 'Rejected', 'Cancelled',
];
const STATUS_LABELS = {
  SubmittedByDepartment: 'Dept. Request',
  SubmittedToProcurement: 'Submitted',
  ApprovedByInventoryOfficer: 'Inv. Approved',
  ApprovedByProcurement: 'Proc. Approved',
  FullyApproved: 'Approved',
  PurchaseOrderGenerated: 'PO Generated',
  ReturnedForRevision: 'Returned',
};

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
  .print-header { border-bottom: 2px solid #1a6a36; padding-bottom: 12px; margin-bottom: 20px; }
  .print-header h1 { font-size: 18px; font-weight: 700; color: #1a6a36; }
  .print-header p { font-size: 11px; color: #555; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  thead th { background: #1a6a36; color: #fff; padding: 8px 10px; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: .04em; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
  tbody tr:nth-child(even) { background: #f5fbf7; }
  .grid-stat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { border: 1px solid #d1e8d8; border-radius: 8px; padding: 12px; }
  .stat-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
  .stat-value { font-size: 20px; font-weight: 700; color: #1a6a36; margin-top: 4px; }
  .stat-sub { font-size: 10px; color: #888; margin-top: 2px; }
  .card { border: 1px solid #d1e8d8; border-radius: 8px; margin-bottom: 16px; page-break-inside: avoid; }
  .card-header { padding: 10px 14px; border-bottom: 1px solid #d1e8d8; }
  .card-title { font-size: 13px; font-weight: 700; color: #111; }
  .card-body { padding: 14px; }
  .table-wrap { overflow: visible; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-blue  { background: #dbeafe; color: #1e40af; }
  .badge-red   { background: #fee2e2; color: #991b1b; }
  .badge-amber { background: #fef9c3; color: #78350f; }
  /* Charts are cloned as live SVG — keep them inside the page box. */
  svg { max-width: 100%; height: auto; }
  .recharts-responsive-container, .recharts-wrapper { max-width: 100% !important; }
  .chart-view-toggle { display: none; }
  .print-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 1.5cm; }
  }
`;

function printReport(tab) {
  const printArea = document.getElementById('report-print-area');
  if (!printArea) return;

  const win = window.open('', '_blank');
  if (!win) { toast.error('Pop-up blocked — please allow pop-ups for this site to export reports.'); return; }

  const doc = win.document;

  doc.title = TAB_LABELS[tab];

  const style = doc.createElement('style');
  style.textContent = PRINT_CSS;
  doc.head.appendChild(style);

  const header = doc.createElement('div');
  header.className = 'print-header';

  const h1 = doc.createElement('h1');
  h1.textContent = 'Pangasinan Provincial Hospital — IPMS';
  header.appendChild(h1);

  const meta = doc.createElement('p');
  meta.textContent = `${TAB_LABELS[tab]}  ·  Generated: ${new Date().toLocaleString('en-PH')}`;
  header.appendChild(meta);

  doc.body.appendChild(header);

  // Clone the already-rendered report DOM (React-sanitized content)
  doc.body.appendChild(printArea.cloneNode(true));

  const footer = doc.createElement('div');
  footer.className = 'print-footer';

  const footerLeft = doc.createElement('span');
  footerLeft.textContent = 'Pangasinan Provincial Hospital — Inventory & Procurement Management System';
  footer.appendChild(footerLeft);

  const footerRight = doc.createElement('span');
  footerRight.textContent = `Printed: ${new Date().toLocaleString('en-PH')}`;
  footer.appendChild(footerRight);

  doc.body.appendChild(footer);

  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

export default function ReportsPage() {
  const now = new Date();
  const palette = useChartPalette();
  const [tab, setTab] = useState('consumption');
  const [params, setParams] = useState({
    year: now.getFullYear(),
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().split('T')[0],
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const set = k => e => setParams(p => ({ ...p, [k]: e.target.value }));

  // Same filters the on-screen preview used, mapped to the export endpoint.
  const exportExcel = async () => {
    const type = tab === 'forecast' ? 'forecast-accuracy' : tab;
    const p = tab === 'procurement'
      ? { startDate: params.startDate, endDate: params.endDate }
      : { year: params.year };
    setExporting(true);
    try {
      await exportReportExcel(type, p);
      toast.success('Report downloaded.');
    } catch {
      toast.error('Failed to export report.');
    } finally {
      setExporting(false);
    }
  };

  const preview = async () => {
    setLoading(true);
    setData(null);
    try {
      let r;
      if (tab === 'consumption') r = await getConsumptionReport({ year: params.year });
      else if (tab === 'procurement') r = await getProcurementReport({ startDate: params.startDate, endDate: params.endDate });
      else r = await getForecastAccuracyReport({ year: params.year });
      setData(r.data);
    } catch { toast.error('Failed to load report data.'); }
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
          <p className="page-subtitle">Visualize the data first, then generate the consumption, procurement, or forecast accuracy report</p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
              <MdFileDownload size={16} /> {exporting ? 'Exporting…' : 'Generate Excel'}
            </button>
            <button className="btn btn-secondary" onClick={() => printReport(tab)}>
              <MdPrint size={16} /> Generate PDF
            </button>
          </div>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab(t.id); setData(null); }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* One filter row scoping everything below it. */}
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
            <button className="btn btn-primary" onClick={preview} disabled={loading} style={{ alignSelf: 'flex-end' }}>
              <MdInsights size={16} /> {loading ? 'Loading…' : 'Visualize Data'}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {!loading && !data && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <MdInsights size={40} style={{ opacity: .35 }} />
              <p style={{ marginTop: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>No data visualized yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Choose your {tab === 'procurement' ? 'date range' : 'year'} above and select <strong>Visualize Data</strong>.
                Review the charts, then generate the Excel or PDF report.
              </p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--green-50)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <MdInsights size={16} color="var(--green-700)" />
          <span>
            Preview of <strong>{TAB_LABELS[tab]}</strong> — review the figures below, then use
            <strong> Generate Excel</strong> or <strong> Generate PDF</strong> to produce the report.
          </span>
        </div>
      )}

      <div id="report-print-area">
        {data && tab === 'consumption' && <ConsumptionReport data={data} year={params.year} palette={palette} />}
        {data && tab === 'procurement' && <ProcurementReport data={data} palette={palette} />}
        {data && tab === 'forecast' && <ForecastAccuracyReport data={data} year={params.year} palette={palette} />}
      </div>
    </div>
  );
}

function ConsumptionReport({ data, year, palette }) {
  const byMonth = MONTHS.map((m, i) => ({
    month: m,
    total: Number((data.byMonth ?? []).find(b => b.month === i + 1)?.totalQuantity ?? 0),
  }));
  const hasMonthly = byMonth.some(m => m.total > 0);

  const topItems = (data.topItems ?? []).slice(0, 10);
  const topItemBars = topItems.map(it => ({ label: it.itemName, value: Number(it.totalQuantity ?? 0), unit: it.unit }));

  // Rolled up server-side across every consumed item, so these shares are of
  // the true annual total — not just the top 10.
  const byCategory = data.byCategory ?? [];
  const categoryBars = byCategory.map(c => ({ label: c.category, value: Number(c.totalQuantity ?? 0) }));

  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Total Consumption</div><div className="stat-value">{fmtCount(data.totalQuantity)}</div><div className="stat-sub">units in {year}</div></div>
        <div className="stat-card blue"><div className="stat-label">Unique Items</div><div className="stat-value">{data.uniqueItems}</div><div className="stat-sub">consumed</div></div>
        <div className="stat-card teal"><div className="stat-label">Peak Month</div><div className="stat-value">{MONTHS[(data.peakMonth ?? 1) - 1]}</div><div className="stat-sub">{fmtCount(data.peakMonthQty)} units</div></div>
        <div className="stat-card amber"><div className="stat-label">Avg / Month</div><div className="stat-value">{data.avgMonthlyConsumption?.toFixed(1) ?? '—'}</div><div className="stat-sub">units</div></div>
      </div>

      <ChartCard
        title={`Monthly Consumption — ${year}`}
        subtitle="Units issued per month, against the monthly average"
        empty={!hasMonthly && 'No consumption recorded for this year.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Month</th><th>Quantity Consumed</th></tr></thead>
              <tbody>
                {byMonth.map(m => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 500 }}>{m.month}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtQty(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <MonthlyBars
          data={byMonth} palette={palette} name="Quantity consumed"
          average={Number(data.avgMonthlyConsumption ?? 0)}
        />
      </ChartCard>

      <ChartCard
        title="Consumption by Category"
        subtitle={`Total units issued per category in ${year} — every consumed item, not just the top 10`}
        empty={categoryBars.length === 0 && 'No consumption recorded for this year.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Category</th><th>Items Consumed</th><th>Total Qty</th><th>Share of Total</th></tr></thead>
              <tbody>
                {byCategory.map(c => (
                  <tr key={c.category}>
                    <td style={{ fontWeight: 500 }}>{c.category}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.uniqueItems}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-700)', fontVariantNumeric: 'tabular-nums' }}>{fmtQty(c.totalQuantity)}</td>
                    <td style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.sharePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <RankedBars data={categoryBars} palette={palette} name="Quantity consumed" labelWidth={150} />
      </ChartCard>

      <ChartCard
        title="Top Consumed Items"
        subtitle={`Highest total consumption in ${year} (top ${topItemBars.length})`}
        empty={topItemBars.length === 0 && 'No item consumption to rank.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Total Qty</th><th>Unit</th></tr></thead>
              <tbody>
                {topItems.map((it, i) => (
                  <tr key={it.itemId}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{it.itemName}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.category}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-700)', fontVariantNumeric: 'tabular-nums' }}>{fmtQty(it.totalQuantity)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <RankedBars data={topItemBars} palette={palette} name="Quantity consumed" />
      </ChartCard>
    </>
  );
}

function ProcurementReport({ data, palette }) {
  const byStatus = data.byStatus ?? {};
  const statusBars = STATUS_ORDER
    .filter(s => byStatus[s])
    .map(s => ({ label: STATUS_LABELS[s] ?? s, value: byStatus[s] }));
  // Anything the server returned that isn't in the known pipeline order.
  const extraStatuses = Object.keys(byStatus)
    .filter(s => !STATUS_ORDER.includes(s))
    .map(s => ({ label: s, value: byStatus[s] }));
  const allStatusBars = [...statusBars, ...extraStatuses];

  const supplierBars = (data.topSuppliers ?? []).map(s => ({ label: s.supplierName, value: Number(s.totalAmount ?? 0) }));

  const approvalRate = data.totalRequests > 0 ? Math.round((data.fullyApproved / data.totalRequests) * 100) : 0;

  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Total Requests</div><div className="stat-value">{data.totalRequests}</div></div>
        <div className="stat-card blue"><div className="stat-label">Fully Approved</div><div className="stat-value">{data.fullyApproved}</div><div className="stat-sub">{approvalRate}% of requests</div></div>
        <div className="stat-card teal"><div className="stat-label">Total PO Amount</div><div className="stat-value" style={{ fontSize: 20 }}>₱{(data.totalPOAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
        <div className="stat-card amber"><div className="stat-label">Delivered POs</div><div className="stat-value">{data.deliveredPOs}</div><div className="stat-sub">of {data.totalPOs} total POs</div></div>
      </div>

      <ChartCard
        title="Requests by Status"
        subtitle="Where every request in the selected range currently sits in the pipeline"
        empty={allStatusBars.length === 0 && 'No procurement requests in this date range.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Status</th><th>Requests</th><th>Share</th></tr></thead>
              <tbody>
                {allStatusBars.map(s => (
                  <tr key={s.label}>
                    <td style={{ fontWeight: 500 }}>{s.label}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{data.totalRequests > 0 ? `${Math.round((s.value / data.totalRequests) * 100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <RankedBars data={allStatusBars} palette={palette} name="Requests" format={fmtCount} labelWidth={130} />
      </ChartCard>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Purchase Order Fulfillment</h3></div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
          <ProgressMeter
            label="POs delivered" value={data.deliveredPOs ?? 0} total={data.totalPOs ?? 0} palette={palette}
            caption={`${data.deliveredPOs ?? 0} of ${data.totalPOs ?? 0} purchase orders received`}
          />
          <ProgressMeter
            label="Requests fully approved" value={data.fullyApproved ?? 0} total={data.totalRequests ?? 0} palette={palette}
            caption={`${data.fullyApproved ?? 0} of ${data.totalRequests ?? 0} requests cleared all approvals`}
          />
        </div>
      </div>

      <ChartCard
        title="Top Suppliers by PO Amount"
        subtitle="Total value of purchase orders awarded in the selected range"
        empty={supplierBars.length === 0 && 'No purchase orders issued in this date range.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Supplier</th><th>No. of POs</th><th>Total Amount</th></tr></thead>
              <tbody>
                {(data.topSuppliers ?? []).map(s => (
                  <tr key={s.supplierId}>
                    <td style={{ fontWeight: 500 }}>{s.supplierName}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.poCount}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-700)', fontVariantNumeric: 'tabular-nums' }}>₱{s.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <RankedBars data={supplierBars} palette={palette} name="PO amount" format={fmtPeso} />
      </ChartCard>
    </>
  );
}

function ForecastAccuracyReport({ data, year, palette }) {
  const itemForecasts = data.itemForecasts ?? [];

  // The items where projected demand most exceeds what's on the shelf — the
  // reason anyone opens this report.
  const gapBars = itemForecasts
    .filter(f => f.latestForecast != null)
    .map(f => ({
      label: f.itemName,
      forecast: Number(f.latestForecast ?? 0),
      stock: Number(f.currentStock ?? 0),
      gap: Number(f.latestForecast ?? 0) - Number(f.currentStock ?? 0),
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  const maeBars = itemForecasts
    .filter(f => f.meanAbsoluteError != null)
    .map(f => ({ label: f.itemName, value: Number(f.meanAbsoluteError) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const belowReorder = itemForecasts.filter(f => f.isBelowReorder).length;

  return (
    <>
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Forecasts Generated</div><div className="stat-value">{data.totalForecasts}</div><div className="stat-sub">in {year}</div></div>
        <div className="stat-card blue"><div className="stat-label">Moving Average</div><div className="stat-value">{data.movingAverageCount}</div></div>
        <div className="stat-card teal"><div className="stat-label">Exp. Smoothing</div><div className="stat-value">{data.expSmoothingCount}</div></div>
        <div className="stat-card amber"><div className="stat-label">Items with Forecast</div><div className="stat-value">{data.itemsWithForecast}</div></div>
        <div className="stat-card purple">
          <div className="stat-label">Overall MAE</div>
          <div className="stat-value">{data.overallMae != null ? data.overallMae.toFixed(2) : '—'}</div>
          <div className="stat-sub">{data.evaluatedForecasts ?? 0} forecast(s) evaluated vs actual</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Below Reorder</div>
          <div className="stat-value">{belowReorder}</div>
          <div className="stat-sub">of {itemForecasts.length} forecasted items</div>
        </div>
      </div>

      <ChartCard
        title="Projected Demand vs Stock on Hand"
        subtitle={`The ${gapBars.length} items with the largest shortfall between the latest forecast and current stock`}
        empty={gapBars.length === 0 && 'No forecasts generated for this year yet.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Item</th><th>Latest Forecast</th><th>Current Stock</th><th>Shortfall</th></tr></thead>
              <tbody>
                {gapBars.map(g => (
                  <tr key={g.label}>
                    <td style={{ fontWeight: 500 }}>{g.label}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtQty(g.forecast)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtQty(g.stock)}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: g.gap > 0 ? 'var(--red-700)' : 'var(--text-muted)' }}>
                      {g.gap > 0 ? fmtQty(g.gap) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <GroupedBars
          data={gapBars} palette={palette}
          series={[{ key: 'forecast', name: 'Latest forecast' }, { key: 'stock', name: 'Current stock' }]}
        />
      </ChartCard>

      <ChartCard
        title="Forecast Error by Item (MAE)"
        subtitle="Mean absolute error against actuals — lower is a more reliable forecast"
        empty={maeBars.length === 0 && 'No forecast periods have completed yet, so there is nothing to score against actuals.'}
        table={
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead><tr><th>Item</th><th>MAE</th></tr></thead>
              <tbody>
                {maeBars.map(m => (
                  <tr key={m.label}>
                    <td style={{ fontWeight: 500 }}>{m.label}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{m.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <RankedBars data={maeBars} palette={palette} name="Mean absolute error" format={v => v.toFixed(2)} />
      </ChartCard>

      {itemForecasts.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Per-Item Forecast Summary — {year}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr><th>Item</th><th>Method</th><th>Latest Forecast</th><th>MAE</th><th>Suggested Reorder</th><th>Current Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {itemForecasts.map(f => (
                    <tr key={f.itemId}>
                      <td style={{ fontWeight: 500 }}>{f.itemName}</td>
                      <td><span className="badge badge-blue">{f.method === 'MovingAverage' ? 'Moving Avg' : 'Exp. Smooth'}</span></td>
                      <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{f.latestForecast?.toFixed(2)}</td>
                      <td title={f.evaluatedForecasts ? `${f.evaluatedForecasts} period(s) evaluated` : 'No completed periods to evaluate yet'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {f.meanAbsoluteError != null ? f.meanAbsoluteError.toFixed(2) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--green-700)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{f.suggestedReorder?.toFixed(2)}</td>
                      <td style={{ color: f.isBelowReorder ? 'var(--red-700)' : undefined, fontWeight: f.isBelowReorder ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{f.currentStock}</td>
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
