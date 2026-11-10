import { useEffect, useMemo, useState } from 'react';
import { MdWarning, MdCheckCircle } from 'react-icons/md';
import { getAllocation, saveAllocation } from '../../api/procurement';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

const fmt = n => Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

// Inventory Officer's view across every request waiting on inventory review,
// one card per item. When departments together ask for more than is free,
// the amounts start pre-filled with a fair split (in proportion to what each
// asked for); the officer only changes a number if needed and saves. Each
// request's review then starts from these figures.
export default function AllocationBoard({ onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [alloc, setAlloc] = useState({}); // requestItemId → string
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getAllocation()
      .then(r => {
        setRows(r.data);
        // What was saved before, else the fair split (the full request
        // whenever stock covers everyone).
        const init = {};
        r.data.forEach(item => item.lines.forEach(l => {
          init[l.procurementRequestItemId] = String(l.quantityApproved ?? l.fairShare);
        }));
        setAlloc(init);
      })
      .catch(() => toast.error('Failed to load allocation data.'))
      .finally(() => setLoading(false));
  }, []);

  const shortCount = rows.filter(r => r.isShort).length;
  // Items with enough stock need no decision, so only shortages show by default.
  const visible = useMemo(() => (showAll || shortCount === 0 ? rows : rows.filter(r => r.isShort)), [rows, showAll, shortCount]);

  const given = item => item.lines.reduce((s, l) => s + (+alloc[l.procurementRequestItemId] || 0), 0);
  const setLine = id => e => setAlloc(p => ({ ...p, [id]: e.target.value }));
  const resetItem = item => setAlloc(p => {
    const next = { ...p };
    item.lines.forEach(l => { next[l.procurementRequestItemId] = String(l.fairShare); });
    return next;
  });

  const save = async () => {
    for (const item of rows) {
      for (const l of item.lines) {
        const v = +alloc[l.procurementRequestItemId];
        if (!(v >= 0) || v > l.quantityRequested) {
          toast.error(`${item.itemName} (${l.departmentName}): give between 0 and ${fmt(l.quantityRequested)}.`);
          return;
        }
      }
      if (given(item) > item.available) {
        toast.error(`${item.itemName}: giving ${fmt(given(item))} but only ${fmt(item.available)} ${item.unit} is available.`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveAllocation(rows.flatMap(item => item.lines.map(l => ({
        procurementRequestItemId: l.procurementRequestItemId,
        quantityApproved: +alloc[l.procurementRequestItemId],
      }))));
      toast.success('Saved. Each request\'s review now starts from these amounts.');
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save allocations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Stock Allocation — Share Short Stock"
      onClose={onClose}
      size="modal-lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || rows.length === 0}>{saving ? 'Saving…' : 'Save Amounts'}</button>
        </>
      }
    >
      <style>{CSS}</style>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No department requests are waiting on inventory review.</div>
      ) : (
        <>
          <div className={`alert ${shortCount ? 'alert-warning' : 'alert-success'}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            {shortCount ? <MdWarning size={16} /> : <MdCheckCircle size={16} />}
            <span style={{ flex: 1 }}>
              {shortCount
                ? <><strong>{shortCount}</strong> item{shortCount > 1 ? 's don\'t' : ' doesn\'t'} have enough stock for every department. The amounts are already split fairly — change any number if needed, then save.</>
                : 'There is enough stock for every pending request. Nothing to decide here.'}
            </span>
            {shortCount > 0 && shortCount < rows.length && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)} style={{ whiteSpace: 'nowrap' }}>
                {showAll ? 'Show shortages only' : `Show all ${rows.length} items`}
              </button>
            )}
          </div>

          {visible.map(item => {
            const total = given(item);
            const left = item.available - total;
            const changed = item.lines.some(l => +alloc[l.procurementRequestItemId] !== l.fairShare);
            return (
              <div key={item.inventoryItemId} className="ab-card">
                <div className="ab-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{item.itemName}</strong>{' '}
                    <span className="ab-sub">{item.itemCode ? `${item.itemCode} · ` : ''}{item.unit}</span>
                  </div>
                  {changed && <button className="btn btn-ghost btn-sm" onClick={() => resetItem(item)}>Reset to fair split</button>}
                </div>
                <div className={`ab-sum ${left < 0 ? 'over' : ''}`}>
                  <span><b>{fmt(item.available)}</b> available</span>
                  <span><b>{fmt(item.totalRequested)}</b> requested</span>
                  <span><b>{fmt(total)}</b> given</span>
                  <span className="ab-left">{left < 0 ? `${fmt(-left)} too many` : `${fmt(left)} left`}</span>
                </div>

                <table className="ab-table">
                  <thead>
                    <tr><th>Department</th><th>Requested</th><th style={{ width: 150 }}>Give</th></tr>
                  </thead>
                  <tbody>
                    {item.lines.map(l => {
                      const v = +alloc[l.procurementRequestItemId] || 0;
                      return (
                        <tr key={l.procurementRequestItemId}>
                          <td>
                            {l.departmentName}
                            {l.isUrgent && <span className="badge badge-red" style={{ marginLeft: 6 }} title="Urgent / emergency request">URGENT</span>}
                            <div className="ab-sub">{l.requestNumber} · {new Date(l.requestedAt).toLocaleDateString('en-PH')}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{fmt(l.quantityRequested)}</td>
                          <td>
                            <input
                              className="form-control"
                              type="number" min="0" max={l.quantityRequested} step="1"
                              value={alloc[l.procurementRequestItemId] ?? ''}
                              onChange={setLine(l.procurementRequestItemId)}
                              style={{ padding: '6px 8px', borderColor: v < l.quantityRequested ? 'var(--amber-500)' : undefined }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}

const CSS = `
.ab-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; background: var(--card-bg); }
.ab-head { display: flex; align-items: center; gap: 10px; }
.ab-sub { font-size: 11px; color: var(--text-muted); font-weight: 400; }
.ab-sum { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--text-secondary); margin: 8px 0 10px; }
.ab-sum b { color: var(--text-primary); }
.ab-left { margin-left: auto; font-weight: 700; color: var(--green-600); }
.ab-sum.over .ab-left { color: var(--red-500); }
.ab-table { width: 100%; }
.ab-table th, .ab-table td { padding: 8px 10px; }
`;
