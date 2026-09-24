import { useEffect, useMemo, useState } from 'react';
import { MdBalance, MdWarning, MdCheckCircle } from 'react-icons/md';
import { getAllocation, saveAllocation } from '../../api/procurement';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

const fmt = n => Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

// Inventory Officer's view across every request waiting on inventory review,
// one card per item. When departments together ask for more than is free
// (e.g. 30 + 20 + 40 gloves against 80 on the shelf), the officer splits the
// stock here instead of letting the first request drain it. Saving records
// the allocations; approving each request then starts from these figures.
export default function AllocationBoard({ onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [alloc, setAlloc] = useState({}); // requestItemId → string
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shortOnly, setShortOnly] = useState(true);

  useEffect(() => {
    getAllocation()
      .then(r => {
        setRows(r.data);
        // Start from what was saved before, else the fair share (which is the
        // full request whenever stock covers everyone).
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
  const visible = useMemo(() => (shortOnly && shortCount > 0 ? rows.filter(r => r.isShort) : rows), [rows, shortOnly, shortCount]);

  const totalAllocated = item => item.lines.reduce((s, l) => s + (+alloc[l.procurementRequestItemId] || 0), 0);
  const setLine = id => e => setAlloc(p => ({ ...p, [id]: e.target.value }));
  const fill = (item, pick) => setAlloc(p => {
    const next = { ...p };
    item.lines.forEach(l => { next[l.procurementRequestItemId] = String(pick(l)); });
    return next;
  });

  // First come, first served — the behaviour the fair share replaces; kept so
  // the officer can compare the two.
  const firstCome = item => {
    let left = item.available;
    const out = {};
    item.lines.forEach(l => { out[l.procurementRequestItemId] = Math.max(0, Math.min(l.quantityRequested, left)); left -= out[l.procurementRequestItemId]; });
    return l => out[l.procurementRequestItemId];
  };

  const save = async () => {
    for (const item of rows) {
      for (const l of item.lines) {
        const v = +alloc[l.procurementRequestItemId];
        if (!(v >= 0) || v > l.quantityRequested) {
          toast.error(`${item.itemName} (${l.requestNumber}): allocation must be between 0 and ${fmt(l.quantityRequested)}.`);
          return;
        }
      }
      if (totalAllocated(item) > item.available) {
        toast.error(`${item.itemName}: ${fmt(totalAllocated(item))} allocated but only ${fmt(item.available)} ${item.unit} is available.`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveAllocation(rows.flatMap(item => item.lines.map(l => ({
        procurementRequestItemId: l.procurementRequestItemId,
        quantityApproved: +alloc[l.procurementRequestItemId],
      }))));
      toast.success('Allocations saved. Review each request to approve it with these quantities.');
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save allocations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Stock Allocation — Pending Department Requests"
      onClose={onClose}
      size="modal-xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || rows.length === 0}>{saving ? 'Saving…' : 'Save Allocations'}</button>
        </>
      }
    >
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No department requests are waiting on inventory review.</div>
      ) : (
        <>
          <div className={`alert ${shortCount ? 'alert-warning' : 'alert-info'}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {shortCount ? <MdWarning size={16} /> : <MdCheckCircle size={16} />}
            <span style={{ flex: 1 }}>
              {shortCount
                ? <><strong>{shortCount}</strong> item{shortCount > 1 ? 's are' : ' is'} requested beyond the stock available. Fair share splits it in proportion to each request so every department gets some.</>
                : 'Stock covers every pending request in full.'}
              {' '}<em>Available</em> excludes stock already allocated to approved requests not yet released.
            </span>
            {shortCount > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={shortOnly} onChange={e => setShortOnly(e.target.checked)} /> Shortages only
              </label>
            )}
          </div>

          {visible.map(item => {
            const allocated = totalAllocated(item);
            const remaining = item.available - allocated;
            const over = remaining < 0;
            return (
              <div key={item.inventoryItemId} className="card" style={{ padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>{item.itemName}</strong>{' '}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.itemCode ? `${item.itemCode} · ` : ''}{item.categoryName} · {item.unit}</span>
                    {item.isShort && <span className="badge badge-amber" style={{ marginLeft: 8 }}>Short by {fmt(item.totalRequested - item.available)}</span>}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => fill(item, l => l.fairShare)} title="Split available stock in proportion to each request">
                    <MdBalance size={14} /> Fair Share
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => fill(item, firstCome(item))} title="Fill the earliest requests first">
                    First Come
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                  {[
                    ['Available', item.available, item.reserved > 0 ? `${fmt(item.quantityOnHand)} on hand − ${fmt(item.reserved)} reserved` : 'on hand'],
                    ['Total Requested', item.totalRequested, `${item.lines.length} request${item.lines.length > 1 ? 's' : ''}`],
                    ['Allocated', allocated, null],
                    ['Remaining Stock', remaining, over ? 'over-allocated' : null],
                  ].map(([label, value, sub]) => (
                    <div key={label} style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: label === 'Remaining Stock' && over ? 'var(--red-500)' : undefined }}>{fmt(value)}</div>
                      {sub && <div style={{ fontSize: 10, color: over && label === 'Remaining Stock' ? 'var(--red-500)' : 'var(--text-muted)' }}>{sub}</div>}
                    </div>
                  ))}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Request #</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Requested</th>
                        <th>Fair Share</th>
                        <th style={{ width: 120 }}>Allocate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.lines.map(l => {
                        const v = +alloc[l.procurementRequestItemId] || 0;
                        return (
                          <tr key={l.procurementRequestItemId}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{l.requestNumber}</td>
                            <td>{l.departmentName}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(l.requestedAt).toLocaleDateString('en-PH')}</td>
                            <td style={{ fontWeight: 600 }}>{fmt(l.quantityRequested)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{fmt(l.fairShare)}</td>
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
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}
