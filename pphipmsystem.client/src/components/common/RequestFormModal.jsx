import { useEffect, useMemo, useState } from 'react';
import { MdAdd, MdCheck, MdClose, MdSearch, MdExpandMore, MdChevronRight } from 'react-icons/md';
import { createRequest, updateRequest, submitRequest } from '../../api/procurement';
import { getItems } from '../../api/inventory';
import { getDepartments } from '../../api/departments';
import Modal from './Modal';
import { toast } from './Toast';
import { useAuth } from '../../context/AuthContext';

// Supply request form laid out after the hospital's Requisition and Issue Slip:
// requesting office, requester, purpose, then the item lines (stock no., unit,
// description, quantity, stock available). Items are picked from a catalogue
// grouped by category with a search box and category chips, so a ward can
// build a long request without scrolling one giant dropdown per line.
//
// `request` given → edit mode (same form, pre-filled). `showCost` adds an
// estimated unit cost column for staff filing on a department's behalf.
// `replenishment` switches to the Supply Officer's Purchase Request for
// restocking the storeroom: low-stock items are one tap away and come
// pre-filled with a suggested reorder quantity.
export default function RequestFormModal({ request = null, prefill = null, showCost = false, replenishment = false, onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);
  const isSharedPc = user?.role === 'DepartmentStaff';
  const editing = !!request;
  const isPr = replenishment || request?.type === 'Replenishment';
  const canPickDept = isAdmin || (isPr && user?.role === 'ProcurementStaff');

  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departmentId, setDepartmentId] = useState(String(request?.departmentId ?? user?.departmentId ?? ''));
  // A shared PC logs in as the ward, so the person's name must be typed.
  const [requestedByName, setRequestedByName] = useState(request?.requestedByName ?? (isSharedPc ? '' : user?.fullName ?? ''));
  const [purpose, setPurpose] = useState(request?.justification ?? prefill?.justification ?? '');
  const [lines, setLines] = useState(() =>
    (request?.items ?? prefill?.items ?? []).map(i => ({
      inventoryItemId: String(i.inventoryItemId),
      quantityRequested: String(i.quantityRequested ?? ''),
      estimatedUnitCost: i.estimatedUnitCost != null ? String(i.estimatedUnitCost) : '',
      remarks: i.remarks ?? '',
    })));

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const LOW = '__low';

  useEffect(() => {
    Promise.all([getItems(), getDepartments()])
      .then(([i, d]) => {
        setItems(i.data.filter(x => x.isActive));
        setDepartments(d.data.filter(x => x.isActive));
      })
      .catch(() => toast.error('Failed to load items.'))
      .finally(() => setLoading(false));
  }, []);

  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [String(i.id), i])), [items]);
  const picked = useMemo(() => new Set(lines.map(l => l.inventoryItemId)), [lines]);

  const lowCount = useMemo(() => items.filter(i => i.isBelowReorder).length, [items]);
  // Restock to roughly twice the reorder threshold (same rule as the Items page).
  const suggestedQty = item => Math.max(Math.ceil(item.reorderThreshold * 2 - item.quantityOnHand), 1);

  const categories = useMemo(() => {
    const counts = {};
    items.forEach(i => { counts[i.categoryName || 'Uncategorized'] = (counts[i.categoryName || 'Uncategorized'] ?? 0) + 1; });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  // Catalogue grouped by category, narrowed by the search box and chip.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = {};
    items
      .filter(i => !category || (category === LOW ? i.isBelowReorder : (i.categoryName || 'Uncategorized') === category))
      .filter(i => !q || `${i.name} ${i.itemCode ?? ''} ${i.description ?? ''} ${i.categoryName ?? ''}`.toLowerCase().includes(q))
      .forEach(i => { (map[i.categoryName || 'Uncategorized'] ??= []).push(i); });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => [name, list.sort((a, b) => a.name.localeCompare(b.name))]);
  }, [items, query, category]);
  const matchCount = groups.reduce((n, [, list]) => n + list.length, 0);

  const toggleItem = item => {
    const id = String(item.id);
    setLines(p => p.some(l => l.inventoryItemId === id)
      ? p.filter(l => l.inventoryItemId !== id)
      : [...p, {
        inventoryItemId: id,
        quantityRequested: isPr && item.isBelowReorder ? String(suggestedQty(item)) : '',
        estimatedUnitCost: '',
        remarks: '',
      }]);
  };
  const setLine = (idx, k) => e => setLines(p => p.map((l, j) => (j === idx ? { ...l, [k]: e.target.value } : l)));
  const removeLine = idx => setLines(p => p.filter((_, j) => j !== idx));

  const save = async ({ submit = false } = {}) => {
    if (!departmentId) { toast.error('Choose the requesting department.'); return; }
    if (isSharedPc && !requestedByName.trim()) { toast.error('Enter your name — this PC is shared by the department.'); return; }
    if (!purpose.trim()) { toast.error('Purpose is required.'); return; }
    if (lines.length === 0) { toast.error('Add at least one item.'); return; }
    if (lines.some(l => !(+l.quantityRequested > 0))) { toast.error('Every item needs a quantity greater than zero.'); return; }

    const payload = {
      departmentId: +departmentId,
      requestedByName: requestedByName.trim() || null,
      isReplenishment: isPr,
      justification: purpose.trim(),
      items: lines.map(l => ({
        inventoryItemId: +l.inventoryItemId,
        quantityRequested: +l.quantityRequested,
        estimatedUnitCost: l.estimatedUnitCost ? +l.estimatedUnitCost : null,
        remarks: l.remarks.trim() || null,
      })),
    };

    setSaving(true);
    try {
      const res = editing ? await updateRequest(request.id, payload) : await createRequest(payload);
      if (submit) await submitRequest(res.data.id);
      toast.success(editing ? 'Request updated.'
        : submit ? (isPr ? 'Purchase Request sent to the Chief for approval.' : 'Request submitted for inventory review.')
        : 'Request saved as draft.');
      onSaved?.(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const ownDept = departments.find(d => String(d.id) === String(user?.departmentId));
  const today = new Date().toLocaleDateString('en-PH');

  return (
    <Modal
      title={editing
        ? `Edit ${isPr ? 'Purchase Request' : 'Request'}: ${request.requestNumber}`
        : isPr ? 'Purchase Request — Storeroom Replenishment' : 'Requisition and Issue Slip — New Request'}
      onClose={onClose}
      size="modal-xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {editing ? (
            <button className="btn btn-primary" onClick={() => save()} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => save()} disabled={saving}>Save Draft</button>
              <button className="btn btn-primary" onClick={() => save({ submit: true })} disabled={saving}>
                {saving ? 'Saving…' : 'Save & Submit'}
              </button>
            </>
          )}
        </>
      }
    >
      <style>{CSS}</style>

      {/* RIS header */}
      <div className="rf-head">
        <div className="form-group">
          <label className="form-label">{isPr ? 'Office / Section *' : 'Requesting Department *'}</label>
          {canPickDept ? (
            <select className="form-control" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : (
            <div className="form-control rf-readonly">{ownDept?.name ?? user?.departmentName ?? '—'}</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Requested By {isSharedPc && '*'}</label>
          <input
            className="form-control"
            value={requestedByName}
            onChange={e => setRequestedByName(e.target.value)}
            placeholder={isSharedPc ? 'Your full name' : 'Name of requester'}
            maxLength={150}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{isPr ? 'PR No. / Date' : 'RIS No. / Date'}</label>
          <div className="form-control rf-readonly">{request?.requestNumber ?? 'Assigned on save'} · {today}</div>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Purpose *</label>
        <textarea className="form-control" rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder={isPr ? 'e.g. Replenishment of items at or below reorder level' : 'What are these supplies for?'} maxLength={1000} />
      </div>

      <div className="rf-body">
        {/* Catalogue */}
        <div className="rf-catalog">
          <div className="rf-search">
            <MdSearch size={16} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search item name, code…" autoFocus />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search"><MdClose size={14} /></button>}
          </div>
          <div className="rf-chips">
            <button className={`rf-chip ${category === '' ? 'on' : ''}`} onClick={() => setCategory('')}>All <span>{items.length}</span></button>
            {isPr && lowCount > 0 && (
              <button className={`rf-chip rf-chip-low ${category === LOW ? 'on' : ''}`} onClick={() => setCategory(category === LOW ? '' : LOW)} title="Items at or below their reorder level">
                Low stock <span>{lowCount}</span>
              </button>
            )}
            {categories.map(([name, n]) => (
              <button key={name} className={`rf-chip ${category === name ? 'on' : ''}`} onClick={() => setCategory(category === name ? '' : name)}>
                {name} <span>{n}</span>
              </button>
            ))}
          </div>
          <div className="rf-list">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : matchCount === 0 ? (
              <div className="rf-empty">No items match.</div>
            ) : groups.map(([name, list]) => {
              // A search expands every group so matches are never hidden.
              const isCollapsed = !query && collapsed[name];
              return (
                <div key={name}>
                  <button className="rf-group" onClick={() => setCollapsed(p => ({ ...p, [name]: !p[name] }))}>
                    {isCollapsed ? <MdChevronRight size={16} /> : <MdExpandMore size={16} />}
                    {name} <span>{list.length}</span>
                  </button>
                  {!isCollapsed && list.map(it => {
                    const on = picked.has(String(it.id));
                    const out = it.quantityOnHand <= 0;
                    return (
                      <button key={it.id} className={`rf-item ${on ? 'on' : ''}`} onClick={() => toggleItem(it)}>
                        <span className="rf-item-main">
                          <strong>{it.name}</strong>
                          <small>{it.itemCode ? `${it.itemCode} · ` : ''}{it.unit}</small>
                        </span>
                        <span className={`rf-stock ${out ? 'out' : it.isBelowReorder ? 'low' : ''}`}>
                          {out ? 'Out of stock' : `${it.quantityOnHand} in stock`}
                        </span>
                        <span className="rf-add">{on ? <MdCheck size={15} /> : <MdAdd size={15} />}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Requested lines */}
        <div className="rf-lines">
          <div className="form-label" style={{ marginBottom: 8 }}>Requested Items ({lines.length})</div>
          {lines.length === 0 ? (
            <div className="rf-empty">Pick items from the list to add them here.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    {showCost && <th>Est. Unit Cost</th>}
                    {/* A PR restocks empty shelves, so "available?" is moot there;
                        on-hand is shown under the description instead. */}
                    {!isPr && <th>Stock Avail.</th>}
                    <th>Remarks</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const it = itemMap[l.inventoryItemId];
                    const qty = +l.quantityRequested || 0;
                    const enough = it && it.quantityOnHand >= qty && it.quantityOnHand > 0;
                    return (
                      <tr key={l.inventoryItemId}>
                        <td style={{ minWidth: 160 }}>
                          <strong style={{ fontSize: 13 }}>{it?.name ?? 'Unknown item'}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {it?.itemCode && <span style={{ fontFamily: 'monospace' }}>{it.itemCode} · </span>}{it?.unit}
                          </div>
                          {isPr && it && (
                            <div style={{ fontSize: 11, color: it.isBelowReorder ? 'var(--amber-600)' : 'var(--text-muted)' }}>
                              {it.quantityOnHand} on hand · reorder at {it.reorderThreshold}
                            </div>
                          )}
                        </td>
                        <td>
                          <input className="form-control" type="number" min="1" step="1" value={l.quantityRequested} onChange={setLine(idx, 'quantityRequested')} placeholder="0" style={{ padding: '6px 8px', minWidth: 72 }} />
                        </td>
                        {showCost && (
                          <td>
                            <input className="form-control" type="number" min="0" step="0.01" value={l.estimatedUnitCost} onChange={setLine(idx, 'estimatedUnitCost')} placeholder="0.00" style={{ padding: '6px 8px', minWidth: 88 }} />
                          </td>
                        )}
                        {!isPr && <td>
                          {it && (
                            <span className={`badge ${enough ? 'badge-green' : 'badge-amber'}`} title={`${it.quantityOnHand} ${it.unit} on hand`}>
                              {enough ? 'Yes' : it.quantityOnHand > 0 ? `Only ${it.quantityOnHand}` : 'No'}
                            </span>
                          )}
                        </td>}
                        <td>
                          <input className="form-control" value={l.remarks} onChange={setLine(idx, 'remarks')} placeholder="Optional" maxLength={300} style={{ padding: '6px 8px', minWidth: 90 }} />
                        </td>
                        <td>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeLine(idx)} aria-label="Remove item">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const CSS = `
.rf-head { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr; gap: 12px; }
.rf-readonly { background: var(--bg-muted); color: var(--text-secondary); cursor: default; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rf-body { display: grid; grid-template-columns: minmax(260px, 5fr) 7fr; gap: 16px; margin-top: 14px; }
.rf-catalog { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--border); border-radius: var(--radius-md, 18px); padding: 10px; background: var(--card-bg); }
.rf-search { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 99px; color: var(--text-muted); background: var(--bg-muted); }
.rf-search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; min-width: 0; }
.rf-search button { border: 0; background: none; color: var(--text-muted); cursor: pointer; display: flex; }
.rf-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 6px; }
.rf-chip { border: 1px solid var(--border); background: transparent; color: var(--text-secondary); border-radius: 99px; padding: 4px 10px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.rf-chip span { opacity: .6; margin-left: 2px; }
.rf-chip.on { background: var(--green-600); border-color: var(--green-600); color: #fff; }
.rf-chip-low { border-color: var(--amber-500); color: var(--amber-600); }
.rf-chip-low.on { background: var(--amber-500); border-color: var(--amber-500); color: #fff; }
.rf-list { max-height: 360px; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
.rf-group { width: 100%; display: flex; align-items: center; gap: 4px; border: 0; background: none; color: var(--text-accent); font: inherit; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 8px 2px 4px; cursor: pointer; position: sticky; top: 0; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.rf-group span { color: var(--text-muted); font-weight: 600; }
.rf-item { width: 100%; display: flex; align-items: center; gap: 8px; border: 1px solid transparent; background: none; color: var(--text-primary); text-align: left; font: inherit; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; }
.rf-item:hover { background: var(--green-50); }
.rf-item.on { border-color: var(--green-500); background: var(--green-50); }
.rf-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rf-item-main strong { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rf-item-main small { font-size: 10.5px; color: var(--text-muted); }
.rf-stock { font-size: 10.5px; font-weight: 600; color: var(--green-600); white-space: nowrap; }
.rf-stock.low { color: var(--amber-600); }
.rf-stock.out { color: var(--red-500); }
.rf-add { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-muted); color: var(--text-secondary); flex-shrink: 0; }
.rf-item.on .rf-add { background: var(--green-600); color: #fff; }
.rf-lines { min-width: 0; }
.rf-empty { padding: 28px 12px; text-align: center; color: var(--text-muted); font-size: 13px; border: 1px dashed var(--border); border-radius: var(--radius-sm); }
@media (max-width: 860px) {
  .rf-head, .rf-body { grid-template-columns: 1fr; }
}
`;
