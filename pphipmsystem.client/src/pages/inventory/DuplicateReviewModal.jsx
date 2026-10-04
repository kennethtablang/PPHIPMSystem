import { useEffect, useState } from 'react';
import { MdMergeType } from 'react-icons/md';
import { getDuplicateGroups, mergeItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

// Lists items that look like the same item entered more than once (same
// Category + Description/Generic Name + Brand + Unit once spelling is ignored)
// and lets an administrator fold each group into a single record.
export default function DuplicateReviewModal({ canMerge, onClose, onChanged }) {
  const [groups, setGroups] = useState(null);
  const [filter, setFilter] = useState('All');
  // Group index → id of the item to keep. Defaults to the oldest record.
  const [keep, setKeep] = useState({});
  const [merging, setMerging] = useState(null);

  const load = () => {
    setGroups(null);
    getDuplicateGroups()
      .then(r => { setGroups(r.data); setKeep({}); })
      .catch(() => { toast.error('Failed to check for duplicates.'); setGroups([]); });
  };
  useEffect(load, []);

  const keptId = (g, idx) => keep[idx] ?? g.items[0].id;

  const merge = async (g, idx) => {
    const keepId = keptId(g, idx);
    const kept = g.items.find(i => i.id === keepId);
    const others = g.items.filter(i => i.id !== keepId);
    const units = new Set(g.items.map(i => i.unit.trim().toLowerCase()));
    const unitNote = units.size > 1 ? `\nUnit spellings differ (${[...units].join(', ')}) — they are treated as the same unit.` : '';
    if (!confirm(
      `Merge ${others.length} item(s) into "${kept.name}"${kept.itemCode ? ` (${kept.itemCode})` : ''}?\n\n` +
      'Their stock, batches, department stock and request history move to the kept item, and they are deactivated. ' +
      `This cannot be undone.${unitNote}`
    )) return;

    setMerging(idx);
    try {
      const { data } = await mergeItems({ keepItemId: keepId, mergeItemIds: others.map(i => i.id) });
      toast.success(`Merged ${data.mergedCount} item(s). Stock on hand is now ${data.newQuantityOnHand} ${kept.unit}.`);
      onChanged();
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to merge items.');
    } finally { setMerging(null); }
  };

  const shown = (groups ?? []).map((g, idx) => ({ g, idx })).filter(({ g }) => filter === 'All' || g.matchType === filter);
  const count = t => (groups ?? []).filter(g => g.matchType === t).length;

  return (
    <Modal
      title="Duplicate Items"
      onClose={onClose}
      size="modal-xl"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="alert alert-info" style={{ fontSize: 12 }}>
        Items are compared by <strong>Category, Description/Generic Name, Brand and Unit</strong>, ignoring
        capitalization, punctuation and unit spelling (e.g. <em>3CC SYRINGE</em> vs <em>3CC, SYRINGE</em>).
        {' '}<strong>Exact</strong> matches are the same item recorded twice. <strong>Similar</strong> matches share the
        same words and unit but differ in a detail — check them before merging. Items with different brands are
        never grouped.
        {canMerge
          ? ' Pick the record to keep, then merge: the others’ stock and history move to it.'
          : ' Only an administrator can merge items; you can still correct them from the item list.'}
      </div>

      {groups === null ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No duplicate items found — the item list is clean.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['All', groups.length], ['Exact', count('Exact')], ['Similar', count('Similar')]].map(([k, n]) => (
              <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(k)}>
                {k} ({n})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
            {shown.map(({ g, idx }) => (
              <div key={g.items.map(i => i.id).join('-')} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className={`badge ${g.matchType === 'Exact' ? 'badge-red' : 'badge-amber'}`}>{g.matchType}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {g.items.length} records
                    {g.differences.length > 0 && <> · Differs in: {g.differences.join(', ')}</>}
                  </span>
                  {canMerge && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => merge(g, idx)}
                      disabled={merging !== null}
                    >
                      <MdMergeType size={14} /> {merging === idx ? 'Merging…' : 'Merge into Kept'}
                    </button>
                  )}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {canMerge && <th style={{ width: 50 }}>Keep</th>}
                        <th>Item Code</th><th>Category</th><th>Description / Generic Name</th><th>Brand</th><th>Unit</th><th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map(i => (
                        <tr key={i.id} className={canMerge && keptId(g, idx) === i.id ? 'row-selected' : undefined}>
                          {canMerge && (
                            <td>
                              <input
                                type="radio"
                                name={`keep-${idx}`}
                                checked={keptId(g, idx) === i.id}
                                onChange={() => setKeep(k => ({ ...k, [idx]: i.id }))}
                                aria-label={`Keep ${i.name}`}
                              />
                            </td>
                          )}
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.itemCode ?? '—'}</td>
                          <td style={{ fontSize: 12 }}>{i.categoryName}</td>
                          <td style={{ fontWeight: 500 }}>{i.name}</td>
                          <td>{i.brand || '—'}</td>
                          <td>{i.unit}</td>
                          <td>{i.quantityOnHand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
