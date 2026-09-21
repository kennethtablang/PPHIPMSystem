import { MdTrendingUp, MdTrendingDown, MdTrendingFlat, MdInventory2, MdShoppingCart, MdVerified, MdCheckCircle, MdWarning, MdError, MdLightbulbOutline } from 'react-icons/md';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const num = v => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const periodName = f => `${MONTH_NAMES[f.forecastMonth - 1]} ${f.forecastYear}`;

// Traffic-light verdict — the one thing a reader should take away. Rendered
// as the app's .alert variants so both themes are already handled.
const VERDICTS = {
  out: { icon: MdError, alert: 'alert-error', title: 'Out of stock — order now' },
  now: { icon: MdError, alert: 'alert-error', title: 'Order now' },
  soon: { icon: MdWarning, alert: 'alert-warning', title: 'Reorder soon' },
  ok: { icon: MdCheckCircle, alert: 'alert-success', title: 'Stock is sufficient' },
};

/**
 * Turns the forecast numbers into plain sentences — expected need, how long
 * current stock will last, which way demand is heading, what to order and how
 * much to trust the figure — for readers who find the trend chart hard to read.
 */
export default function ForecastExplainer({ item, nextForecast, upcoming, forecasts, consumption }) {
  const unit = item.unit;
  const expected = Number(nextForecast.forecastedQuantity ?? 0);
  const suggested = Number(nextForecast.suggestedReorderQuantity ?? expected);
  const stock = Number(item.quantityOnHand ?? 0);
  const monthsCovered = expected > 0 ? stock / expected : null;
  // Under a month, "0.6 month(s)" is hard to picture — say it in days.
  const coverText = monthsCovered == null ? null
    : monthsCovered < 1 ? `about ${Math.max(1, Math.round(monthsCovered * 30))} day(s)`
      : `roughly ${monthsCovered.toFixed(1)} month(s)`;

  let verdict, verdictText;
  if (stock <= 0) {
    verdict = VERDICTS.out;
    verdictText = `There is no stock left, but about ${num(expected)} ${unit} is expected to be needed in ${periodName(nextForecast)}.`;
  } else if (monthsCovered != null && monthsCovered < 1) {
    verdict = VERDICTS.now;
    verdictText = `The ${num(stock)} ${unit} on hand will not last through ${periodName(nextForecast)}.`;
  } else if (stock <= Number(item.reorderThreshold ?? 0) || (monthsCovered != null && monthsCovered < 2)) {
    verdict = VERDICTS.soon;
    verdictText = stock <= Number(item.reorderThreshold ?? 0)
      ? `Stock is at or below the reorder level of ${num(item.reorderThreshold)} ${unit}.`
      : `Current stock covers only about ${monthsCovered.toFixed(1)} month(s) of expected use.`;
  } else {
    verdict = VERDICTS.ok;
    verdictText = `Current stock should cover the expected use for ${periodName(nextForecast)} and beyond.`;
  }

  // Trend: the last three months of actual use against the three before them.
  // Months with nothing recorded count as zero, exactly as the forecast engine
  // treats them, so this never contradicts the forecast figure.
  const series = monthlySeries(consumption);
  const recent = series.slice(-3);
  const prior = series.slice(-6, -3);
  const avg = list => list.reduce((s, m) => s + m.qty, 0) / list.length;
  const recentAvg = recent.length ? avg(recent) : null;
  const priorAvg = prior.length ? avg(prior) : null;
  const change = priorAvg ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;
  const trend = priorAvg == null ? null
    : priorAvg === 0 ? (recentAvg > 0 ? 'up' : 'flat')
      : change > 10 ? 'up' : change < -10 ? 'down' : 'flat';
  const TrendIcon = trend === 'up' ? MdTrendingUp : trend === 'down' ? MdTrendingDown : MdTrendingFlat;
  const gaps = recent.filter(m => !m.recorded).map(m => MONTH_NAMES[m.month - 1]);
  const gapNote = gaps.length
    ? ` ${listNames(gaps)} had no usage recorded and ${gaps.length === 1 ? 'counts' : 'count'} as zero.`
    : '';

  // Reliability: how far past forecasts landed from what was really used.
  const evaluated = forecasts.filter(f => f.actualQuantity != null);
  const avgMiss = evaluated.length
    ? evaluated.reduce((s, f) => s + Math.abs(f.forecastedQuantity - f.actualQuantity), 0) / evaluated.length
    : null;

  const toOrder = Math.max(0, Math.ceil(suggested - stock));

  const facts = [
    {
      icon: MdInventory2,
      title: 'How long current stock will last',
      text: stock <= 0
        ? `Nothing on hand, while about ${num(expected)} ${unit} per month is expected to be used.`
        : monthsCovered == null
          ? `No usage is expected, so the ${num(stock)} ${unit} on hand is not being drawn down.`
          : monthsCovered >= 12
            ? `About ${num(stock)} ${unit} on hand — enough for more than a year at the expected rate.`
            : `About ${num(stock)} ${unit} on hand — enough for ${coverText} at the expected rate of ${num(expected)} ${unit} per month.`,
    },
    {
      icon: TrendIcon,
      title: 'Which way demand is heading',
      text: trend == null
        ? 'Not enough usage history yet to tell whether demand is rising or falling.'
        : (trend === 'flat' ? 'Steady' : trend === 'up' ? 'Going up' : 'Going down')
          + ` — the last 3 months averaged ${num(recentAvg)} ${unit} per month, compared with ${num(priorAvg)} in the ${prior.length} month${prior.length === 1 ? '' : 's'} before`
          + (trend === 'flat' || priorAvg === 0 ? '.' : ` (about ${Math.abs(change).toFixed(0)}% ${trend === 'up' ? 'more' : 'less'}).`)
          + gapNote,
    },
    {
      icon: MdShoppingCart,
      title: 'What to order',
      text: toOrder > 0
        ? `Order about ${num(toOrder)} ${unit}. The suggested stock for ${periodName(nextForecast)} is ${num(Math.ceil(suggested))} ${unit} (expected use plus a 10% safety buffer), minus the ${num(stock)} already on hand.`
        : `No purchase needed yet — the ${num(stock)} ${unit} on hand already covers the suggested ${num(Math.ceil(suggested))} ${unit} (expected use plus a 10% safety buffer).`,
    },
    {
      icon: MdVerified,
      title: 'How reliable this forecast is',
      text: avgMiss == null
        ? 'Accuracy will be shown once actual usage is recorded for a month that was forecasted.'
        : `Past forecasts for this item were off by about ${num(avgMiss)} ${unit} on average (checked against ${evaluated.length} month${evaluated.length === 1 ? '' : 's'} of actual use).`,
    },
  ];

  const VerdictIcon = verdict.icon;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">What This Forecast Means</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>A plain-language reading of the numbers and chart below</p>
        </div>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16 }}>
          <strong>{item.name}</strong> is expected to need about{' '}
          <strong style={{ color: 'var(--text-accent)' }}>{num(expected)} {unit}</strong> in{' '}
          <strong>{periodName(nextForecast)}</strong>.
        </p>

        <div className={`alert ${verdict.alert}`} style={{ alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <VerdictIcon size={26} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{verdict.title}</div>
            <div>{verdictText}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: upcoming.length > 1 ? 20 : 0 }}>
          {facts.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--green-50)', border: '1px solid var(--border)',
              }}>
                <f.icon size={18} color="var(--text-accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>

        {upcoming.length > 1 && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>Month by month</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {upcoming.map(f => (
                <div key={f.id} style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--green-50)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>{periodName(f)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Expected use: <strong style={{ color: 'var(--text-primary)' }}>{num(f.forecastedQuantity)}</strong> {unit}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Stock to have: <strong style={{ color: 'var(--text-accent)' }}>{num(Math.ceil(f.suggestedReorderQuantity ?? f.forecastedQuantity))}</strong> {unit}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Month-by-month usage from the first recorded month to the later of the last
 * recorded month and the last complete month, unrecorded months as zero —
 * mirrors ForecastService.BuildMonthlySeries on the server.
 */
function monthlySeries(consumption) {
  const byPeriod = new Map();
  consumption.forEach(c => {
    const k = c.year * 12 + (c.month - 1);
    byPeriod.set(k, (byPeriod.get(k) ?? 0) + Number(c.quantityConsumed ?? 0));
  });
  if (byPeriod.size === 0) return [];
  const now = new Date();
  const lastComplete = now.getFullYear() * 12 + now.getMonth() - 1;
  const keys = [...byPeriod.keys()];
  const start = Math.min(...keys);
  const end = Math.max(Math.max(...keys), lastComplete);
  const out = [];
  for (let k = start; k <= end; k++) {
    out.push({ month: (k % 12) + 1, qty: byPeriod.get(k) ?? 0, recorded: byPeriod.has(k) });
  }
  return out;
}

const listNames = names => names.length <= 1 ? names.join('')
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** One-line key under the trend chart so the three lines explain themselves. */
export function ChartReadingGuide() {
  const rows = [
    { color: '#1a6a36', dash: false, label: 'Actual Consumption', text: 'what was really used each month' },
    { color: '#3b82f6', dash: true, label: 'Forecasted', text: 'what the system expects will be used' },
    { color: '#f59e0b', dash: true, label: 'Suggested Reorder', text: 'how much stock to have (forecast + 10% buffer)' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, padding: '10px 14px',
      borderRadius: 'var(--radius-sm)', background: 'var(--green-50)', border: '1px solid var(--border)',
      fontSize: 12, color: 'var(--text-secondary)',
    }}>
      <MdLightbulbOutline size={16} color="var(--text-accent)" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>How to read this chart:</span>
        {rows.map(r => (
          <span key={r.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="22" y2="3" stroke={r.color} strokeWidth="2" strokeDasharray={r.dash ? '5 3' : undefined} />
            </svg>
            <span><strong>{r.label}</strong> — {r.text}</span>
          </span>
        ))}
        <span>Where the blue line is above the green one, demand is expected to rise.</span>
      </div>
    </div>
  );
}
