import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LabelList, ReferenceLine,
} from 'recharts';
import { MdInsertChartOutlined, MdTableChart } from 'react-icons/md';
import { fmtQty, fmtCount, truncate } from './chartTheme';

// ── Shared chrome ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, palette, format = fmtQty }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: palette.surface, border: `1px solid ${palette.grid}`,
      borderRadius: 'var(--radius-sm)', padding: '9px 12px',
      boxShadow: 'var(--shadow-md)', fontSize: 12, minWidth: 150,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey ?? p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span>{p.name}</span>
          <strong style={{ marginLeft: 'auto', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {format(p.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

const legendLabel = v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>;

/**
 * A chart in a card, with a chart/table toggle so every value stays reachable
 * without hovering. Whichever view is showing is what the Print/PDF export
 * picks up, since that clones the live DOM.
 */
export function ChartCard({ title, subtitle, table, empty, children, style }) {
  const [view, setView] = useState('chart');
  const showTable = table && view === 'table';

  return (
    <div className="card" style={{ marginBottom: 24, ...style }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
        </div>
        {table && (
          <div className="chart-view-toggle" style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${view === 'chart' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('chart')} title="Chart view" aria-pressed={view === 'chart'}
            ><MdInsertChartOutlined size={15} /></button>
            <button
              className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('table')} title="Table view" aria-pressed={view === 'table'}
            ><MdTableChart size={15} /></button>
          </div>
        )}
      </div>
      <div className="card-body" style={showTable ? { padding: 0 } : undefined}>
        {empty
          ? <div className="empty-state" style={{ padding: '40px 20px' }}>{empty}</div>
          : showTable ? table : children}
      </div>
    </div>
  );
}

// ── Chart forms ──────────────────────────────────────────────────────────────

/**
 * Magnitude over 12 months — one series, so no legend (the title names it).
 * The average is drawn as a reference line rather than labelling every bar.
 */
export function MonthlyBars({ data, palette, name, average, format = fmtQty }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={palette.grid} />
        <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: palette.grid }} tick={{ fontSize: 11, fill: palette.axis }} />
        <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: palette.axis }} tickFormatter={fmtCount} />
        <Tooltip cursor={{ fill: palette.grid, fillOpacity: 0.4 }} content={<ChartTooltip palette={palette} format={format} />} />
        {average > 0 && (
          <ReferenceLine
            y={average} stroke={palette.axis} strokeWidth={1}
            label={{ value: `Avg ${fmtQty(average)}`, position: 'insideTopRight', fontSize: 10, fill: palette.axis }}
          />
        )}
        <Bar dataKey="total" name={name} fill={palette.series[0]} radius={[4, 4, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * A ranked list as horizontal bars — nominal categories, so every bar wears
 * slot 1 and the value is direct-labelled at the bar end.
 */
export function RankedBars({ data, palette, dataKey = 'value', name, format = fmtQty, labelWidth = 170 }) {
  const height = Math.max(140, data.length * 34 + 28);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap="26%">
        {/* No grid: the value axis is hidden, so gridlines would be rules
            without a scale. Values are direct-labelled instead. */}
        <XAxis type="number" hide />
        <YAxis
          type="category" dataKey="label" width={labelWidth}
          tickLine={false} axisLine={false}
          tick={{ fontSize: 11, fill: palette.axis }}
          tickFormatter={v => truncate(v, Math.floor(labelWidth / 8))}
        />
        <Tooltip cursor={{ fill: palette.grid, fillOpacity: 0.4 }} content={<ChartTooltip palette={palette} format={format} />} />
        <Bar dataKey={dataKey} name={name} fill={palette.series[0]} radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey={dataKey} position="right" formatter={format}
            fill="var(--text-secondary)" fontSize={11} fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Two measures per item on one shared axis (never a second y-scale) — a legend
 * is always present since identity must not rest on colour alone.
 */
export function GroupedBars({ data, palette, series, format = fmtQty, labelWidth = 170 }) {
  const height = Math.max(180, data.length * 46 + 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 4 }} barCategoryGap="24%" barGap={2}>
        {/* No grid: the value axis is hidden, so gridlines would be rules
            without a scale. Values are direct-labelled instead. */}
        <XAxis type="number" hide />
        <YAxis
          type="category" dataKey="label" width={labelWidth}
          tickLine={false} axisLine={false}
          tick={{ fontSize: 11, fill: palette.axis }}
          tickFormatter={v => truncate(v, Math.floor(labelWidth / 8))}
        />
        <Tooltip cursor={{ fill: palette.grid, fillOpacity: 0.4 }} content={<ChartTooltip palette={palette} format={format} />} />
        <Legend iconType="circle" iconSize={8} formatter={legendLabel} wrapperStyle={{ paddingTop: 8 }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={palette.series[i]} radius={[0, 4, 4, 0]} maxBarSize={13} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Two-part completion is a number, not a chart — a slim meter carries it
 * without spending a pie on two slices.
 */
export function ProgressMeter({ label, value, total, palette, caption }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: palette.grid, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: palette.series[0] }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{caption}</div>
    </div>
  );
}
