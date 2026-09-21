import { useId, useMemo, useState } from 'react';
import { MdLeaderboard } from 'react-icons/md';
import { fmtQty, fmtPeso } from './chartTheme';

const MODES = {
  used: {
    label: 'Most Used Items',
    short: 'used',
    measure: i => Number(i.quantityUsed ?? 0),
    blurb: 'Ranked by total units consumed/issued',
  },
  procured: {
    label: 'Most Procured Items',
    short: 'procured',
    measure: i => Number(i.quantityProcured ?? 0),
    blurb: 'Ranked by total units ordered on purchase orders',
  },
};

// Categories get a stable badge colour from their position in the category
// list, so the same category reads the same everywhere on the page. The name
// is always printed too — colour is only a scanning aid.
const BADGES = ['badge-green', 'badge-blue', 'badge-amber', 'badge-purple', 'badge-teal', 'badge-red', 'badge-gray'];

const ALL = 'all';
const PER_CATEGORY = 'per-category';

/**
 * Rankings of the most used and most procured items, switchable by dropdown,
 * with each item's category shown and an option to rank within one category or
 * see every category's own leaderboard side by side.
 *
 * `embedded` renders a single self-contained card (no summary tiles) for use
 * inside another report, e.g. the Consumption Report.
 */
export default function ItemRankingsReport({ data, year, embedded = false }) {
  const [mode, setMode] = useState('used');
  const [category, setCategory] = useState(ALL);
  const [top, setTop] = useState(10);

  const categories = useMemo(() => data.categories ?? [], [data.categories]);
  const badgeFor = useMemo(() => {
    const map = new Map(categories.map((c, i) => [c.categoryId, BADGES[i % BADGES.length]]));
    return id => map.get(id) ?? 'badge-gray';
  }, [categories]);

  const { measure } = MODES[mode];

  // Only items that actually moved under the chosen measure are ranked.
  const ranked = useMemo(() => (data.items ?? [])
    .filter(i => measure(i) > 0)
    .sort((a, b) => measure(b) - measure(a) || a.itemName.localeCompare(b.itemName)),
  [data.items, measure]);

  const scoped = category === ALL || category === PER_CATEGORY
    ? ranked
    : ranked.filter(i => String(i.categoryId) === category);

  const limit = list => (top > 0 ? list.slice(0, top) : list);

  const groups = useMemo(() => {
    const byCat = new Map();
    ranked.forEach(i => {
      if (!byCat.has(i.categoryId)) byCat.set(i.categoryId, { categoryId: i.categoryId, category: i.category, items: [], total: 0 });
      const g = byCat.get(i.categoryId);
      g.items.push(i);
      g.total += measure(i);
    });
    return [...byCat.values()].sort((a, b) => b.total - a.total);
  }, [ranked, measure]);

  const total = scoped.reduce((s, i) => s + measure(i), 0);
  const leader = scoped[0];
  const leadingGroup = groups[0];
  const selectedCategoryName = categories.find(c => String(c.categoryId) === category)?.category;

  const scopeText = category === ALL
    ? 'all categories'
    : category === PER_CATEGORY ? 'each category separately' : selectedCategoryName;

  const header = (
    <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h3 className="card-title">{embedded ? `Item Rankings — ${MODES[mode].label}` : `${MODES[mode].label} — ${year}`}</h3>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {MODES[mode].blurb} in {year} · showing {top > 0 ? `top ${top}` : 'all items'} for {scopeText}
        </p>
      </div>
      {/* Hidden in the printed copy — the subtitle above states the view. */}
      <div className="chart-view-toggle" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Picker label="Ranking" value={mode} onChange={setMode} width={190}>
          <option value="used">Most Used Items</option>
          <option value="procured">Most Procured Items</option>
        </Picker>
        <Picker label="Category" value={category} onChange={setCategory} width={220}>
          <option value={ALL}>All categories (overall)</option>
          <option value={PER_CATEGORY}>Per category (side by side)</option>
          <optgroup label="Only this category">
            {categories.map(c => <option key={c.categoryId} value={String(c.categoryId)}>{c.category}</option>)}
          </optgroup>
        </Picker>
        <Picker label="Show" value={top} onChange={v => setTop(+v)} width={110}>
          {[5, 10, 20, 50].map(n => <option key={n} value={n}>Top {n}</option>)}
          <option value={0}>All</option>
        </Picker>
      </div>
    </div>
  );

  // Inside another report: one card, with each category's leaderboard as a
  // bordered panel rather than a nested card.
  if (embedded) {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        {header}
        <div className="card-body">
          {category === PER_CATEGORY ? (
            groups.length === 0 ? <EmptyRanking mode={mode} year={year} /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 16 }}>
                {groups.map(g => (
                  <div key={g.categoryId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <span className={`badge ${badgeFor(g.categoryId)}`} style={{ fontSize: 12 }}>{g.category}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {g.items.length} item{g.items.length === 1 ? '' : 's'} · {fmtQty(g.total)} units {MODES[mode].short}
                      </span>
                    </div>
                    <RankingList items={limit(g.items)} mode={mode} measure={measure} badgeFor={badgeFor} showCategory={false} />
                  </div>
                ))}
              </div>
            )
          ) : scoped.length === 0
            ? <EmptyRanking mode={mode} year={year} category={selectedCategoryName} />
            : <RankingList items={limit(scoped)} mode={mode} measure={measure} badgeFor={badgeFor} showCategory={category === ALL} />}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        {header}
      </div>

      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-label">Items Ranked</div>
          <div className="stat-value">{scoped.length}</div>
          <div className="stat-sub">with units {MODES[mode].short} in {year}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">#1 Item</div>
          <div className="stat-value" style={{ fontSize: 16, lineHeight: 1.3 }}>{leader?.itemName ?? '—'}</div>
          <div className="stat-sub">{leader ? `${fmtQty(measure(leader))} ${leader.unit} · ${leader.category}` : 'No activity'}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">{category === ALL || category === PER_CATEGORY ? 'Leading Category' : 'Category'}</div>
          <div className="stat-value" style={{ fontSize: 16, lineHeight: 1.3 }}>
            {category === ALL || category === PER_CATEGORY ? (leadingGroup?.category ?? '—') : selectedCategoryName}
          </div>
          <div className="stat-sub">
            {category === ALL || category === PER_CATEGORY
              ? (leadingGroup ? `${fmtQty(leadingGroup.total)} units ${MODES[mode].short}` : 'No activity')
              : `${fmtQty(total)} units ${MODES[mode].short}`}
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Total Units</div>
          <div className="stat-value">{fmtQty(total)}</div>
          <div className="stat-sub">{MODES[mode].short} across ranked items</div>
        </div>
      </div>

      {category === PER_CATEGORY ? (
        groups.length === 0 ? <EmptyRanking mode={mode} year={year} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 20 }}>
            {groups.map(g => (
              <div key={g.categoryId} className="card" style={{ pageBreakInside: 'avoid' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <span className={`badge ${badgeFor(g.categoryId)}`} style={{ fontSize: 12 }}>{g.category}</span>
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {g.items.length} item{g.items.length === 1 ? '' : 's'} · {fmtQty(g.total)} units {MODES[mode].short}
                    </p>
                  </div>
                </div>
                <div className="card-body">
                  <RankingList items={limit(g.items)} mode={mode} measure={measure} badgeFor={badgeFor} showCategory={false} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card">
          <div className="card-body">
            {scoped.length === 0
              ? <EmptyRanking mode={mode} year={year} category={selectedCategoryName} />
              : <RankingList items={limit(scoped)} mode={mode} measure={measure} badgeFor={badgeFor} showCategory={category === ALL} />}
          </div>
        </div>
      )}
    </>
  );
}

function Picker({ label, value, onChange, width, children }) {
  const id = useId();
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} className="form-control" value={value} onChange={e => onChange(e.target.value)} style={{ width }}>
        {children}
      </select>
    </div>
  );
}

/**
 * A leaderboard: rank, item with its category, a bar scaled to the #1 item so
 * relative size reads at a glance, and the exact figure. Rows share one grid
 * (display: contents) so the figure column is sized once and every bar track
 * has the same length — otherwise equal values would draw unequal bars.
 */
function RankingList({ items, mode, measure, badgeFor, showCategory }) {
  const max = Math.max(...items.map(measure), 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
      {items.map((it, i) => {
        const value = measure(it);
        const rank = i + 1;
        return (
          <div key={it.itemId} style={{ display: 'contents' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: rank <= 3 ? 'var(--green-700)' : 'var(--green-50)',
              color: rank <= 3 ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>{rank}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{it.itemName}</span>
                {showCategory && <span className={`badge ${badgeFor(it.categoryId)}`}>{it.category}</span>}
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${(value / max) * 100}%`, height: '100%', borderRadius: 99, background: 'var(--text-accent)' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-accent)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtQty(value)} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{it.unit}</span>
              </div>
              {mode === 'procured' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {it.purchaseOrderCount} PO{it.purchaseOrderCount === 1 ? '' : 's'} · {fmtPeso(it.procuredAmount)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyRanking({ mode, year, category }) {
  return (
    <div className="empty-state" style={{ padding: '40px 20px' }}>
      <MdLeaderboard size={40} style={{ opacity: 0.35 }} />
      <p style={{ marginTop: 10 }}>
        No items were {mode === 'used' ? 'used' : 'procured'} in {year}{category ? ` under ${category}` : ''}.
      </p>
    </div>
  );
}
