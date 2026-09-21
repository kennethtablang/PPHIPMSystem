import { useEffect, useState } from 'react';
import { MdAdd, MdTrendingUp, MdUndo } from 'react-icons/md';
import { getMovements, createMovement, voidMovement } from '../../api/stockMovements';
import { getItems } from '../../api/inventory';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import { toast } from '../../components/common/Toast';
import Pagination from '../../components/common/Pagination';
import { getAppPrefs } from '../../utils/appPrefs';
import { fmtDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

// Types that can be created from this page. Ward usage is deliberately absent:
// it is recorded on the Department Stock page, against a specific ward balance.
const TYPES = ['Receipt', 'Issuance', 'Return', 'Disposal'];
// …but ward usage and ward-to-ward transfers still show up in the ledger, so
// they are filterable here even though both are recorded elsewhere.
const FILTER_TYPES = [...TYPES, 'DepartmentConsumption', 'DepartmentTransfer'];
const BLANK = { inventoryItemId: '', movementType: 'Issuance', quantity: '', remarks: '', departmentId: '' };

const TYPE_COLOR = {
  Receipt: 'green', Issuance: 'blue', Return: 'teal',
  Disposal: 'red', Adjustment: 'amber', DepartmentConsumption: 'purple',
  DepartmentTransfer: 'blue',
};
// The enum names are a mouthful on a badge and a filter button.
const TYPE_LABEL = { DepartmentConsumption: 'Ward Usage', DepartmentTransfer: 'Ward Transfer' };
const typeLabel = t => TYPE_LABEL[t] ?? t;

export default function StockMovements() {
  const { user } = useAuth();
  const canCreate = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemFilter, setItemFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  // Server-side paging + whole-filter aggregates for the stat cards.
  const [page, setPage] = useState(1);
  const [pageSize] = useState(() => getAppPrefs().tablePageSize);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ unitsReceived: 0, unitsIssued: 0, disposalCount: 0 });

  const load = (p = 1) => {
    setLoading(true);
    const params = { page: p, pageSize };
    if (itemFilter) params.itemId = itemFilter;
    if (typeFilter) params.type = typeFilter;
    getMovements(params)
      .then(r => {
        setMovements(r.data.items);
        setTotal(r.data.total);
        setPage(r.data.page);
        setStats({ unitsReceived: r.data.unitsReceived, unitsIssued: r.data.unitsIssued, disposalCount: r.data.disposalCount });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getItems().then(r => setItems(r.data));
    getDepartments().then(r => setDepartments(r.data)).catch(() => {});
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  useEffect(() => { load(); }, [itemFilter, typeFilter]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await createMovement({ ...form, inventoryItemId: +form.inventoryItemId, quantity: +form.quantity, departmentId: form.departmentId ? +form.departmentId : null });
      toast.success('Stock movement recorded.');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to record movement.');
    } finally { setSaving(false); }
  };

  const submitVoid = async () => {
    if (!voidReason.trim()) { toast.error('A reason is required to void a movement.'); return; }
    setVoiding(true);
    try {
      await voidMovement(voidTarget.id, voidReason.trim());
      toast.success('Movement voided and reversed.');
      setVoidTarget(null);
      setVoidReason('');
      load(page); // stay on the current page
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to void movement.');
    } finally { setVoiding(false); }
  };

  // A movement can be voided once, isn't itself a reversal, and isn't PO-linked
  // (those are corrected through the delivery flow).
  const canVoid = m => canCreate && !m.isVoided && !m.isReversal && !m.purchaseOrderId;

  // Selected item for preview
  const selectedItem = form.inventoryItemId ? items.find(i => i.id === +form.inventoryItemId) : null;
  const isOutbound = ['Issuance', 'Disposal'].includes(form.movementType);
  const projectedQty = selectedItem && form.quantity
    ? isOutbound
      ? selectedItem.quantityOnHand - +form.quantity
      : selectedItem.quantityOnHand + +form.quantity
    : null;


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Movements</h1>
          <p className="page-subtitle">Record and view all stock receipts, issuances, returns and disposals</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setForm(BLANK); setModal(true); }}>
            <MdAdd size={16} /> Record Movement
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid-stat" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MdTrendingUp size={18} /></div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Movements</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{stats.unitsReceived.toLocaleString()}</div>
          <div className="stat-label">Units Received</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{stats.unitsIssued.toLocaleString()}</div>
          <div className="stat-label">Units Issued</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-value">{stats.disposalCount}</div>
          <div className="stat-label">Disposal Records</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <SearchSelect
          value={itemFilter}
          onChange={e => setItemFilter(e.target.value)}
          placeholder="All items — search to filter…"
          style={{ minWidth: 260 }}
          options={items.map(i => ({ value: i.id, label: i.name, sublabel: `${i.itemCode ? `${i.itemCode} · ` : ''}${i.quantityOnHand} ${i.unit} in stock` }))}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['', ...FILTER_TYPES].map(t => (
            <button
              key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t)}
            >{t ? typeLabel(t) : 'All Types'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Before</th>
                <th style={{ textAlign: 'right' }}>After</th>
                <th>Remarks</th>
                <th>Performed By</th>
                <th>Date & Time</th>
                {canCreate && <th />}
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={canCreate ? 9 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No movements found.</td></tr>
              ) : movements.map(m => {
                // Direction is derived from the actual before/after delta so that
                // reversals (which keep the original type) show the correct sign.
                const delta = m.quantityAfterMovement - m.quantityBeforeMovement;
                return (
                <tr key={m.id} style={m.isVoided ? { opacity: 0.55 } : undefined}>
                  <td>
                    <span className={`badge badge-${TYPE_COLOR[m.movementType] ?? 'gray'}`}>{typeLabel(m.movementType)}</span>
                    {m.isReversal && <span className="badge badge-gray" style={{ marginLeft: 4 }}>Reversal</span>}
                    {m.isVoided && <span className="badge badge-red" style={{ marginLeft: 4 }}>Voided</span>}
                    {m.departmentName && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        {/* → into a ward, ← back to central, ⊗ used up inside
                            the ward, A → B straight across between two wards */}
                        {m.movementType === 'DepartmentTransfer'
                          ? `${m.departmentName} → ${m.toDepartmentName ?? '—'}`
                          : `${m.movementType === 'Issuance' ? '→'
                              : m.movementType === 'DepartmentConsumption' ? '⊗ used at'
                              : '←'} ${m.departmentName}`}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, textDecoration: m.isVoided ? 'line-through' : undefined }}>{m.itemName}</div>
                    {m.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.itemCode}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {/* A zero delta means central stock never moved (ward usage,
                        ward-to-ward transfer) — a signed figure would imply it did. */}
                    <span style={{ color: delta === 0 ? 'var(--text-muted)' : delta < 0 ? '#dc2626' : '#059669' }}>
                      {delta === 0 ? '' : delta < 0 ? '−' : '+'}{m.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{m.quantityBeforeMovement}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: m.quantityAfterMovement < m.quantityBeforeMovement ? '#dc2626' : '#059669' }}>
                    {m.quantityAfterMovement}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}
                      title={m.isVoided ? `Voided by ${m.voidedByFullName}: ${m.voidReason}` : (m.remarks ?? '')}>
                    {m.remarks ?? '—'}
                  </td>
                  <td style={{ fontSize: 13 }}>{m.performedByFullName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(m.movementDate)}</td>
                  {canCreate && (
                    <td style={{ textAlign: 'right' }}>
                      {canVoid(m) && (
                        <button
                          className="btn btn-sm btn-secondary"
                          title="Void this movement"
                          onClick={() => { setVoidTarget(m); setVoidReason(''); }}
                        ><MdUndo size={14} /> Void</button>
                      )}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          setPage={load}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          pageSize={pageSize}
        />
        </>
      )}

      {modal && (
        <Modal
          title="Record Stock Movement"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Inventory Item *</label>
            <SearchSelect
              value={form.inventoryItemId}
              onChange={set('inventoryItemId')}
              placeholder="Search items…"
              options={items.map(i => ({
                value: i.id,
                label: i.name,
                sublabel: `${i.itemCode ? `${i.itemCode} · ` : ''}${i.quantityOnHand > 0 ? 'Available' : 'Not Available'} — ${i.quantityOnHand} ${i.unit}`,
              }))}
            />
            {/* Live stock card */}
            {selectedItem && (
              <div style={{
                marginTop: 8, padding: '10px 14px', borderRadius: 8,
                background: 'var(--green-50)', border: '1px solid var(--green-200)',
                display: 'flex', gap: 20, fontSize: 13,
              }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Current Stock:</span> <strong>{selectedItem.quantityOnHand} {selectedItem.unit}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Reorder At:</span> <strong>{selectedItem.reorderThreshold} {selectedItem.unit}</strong></div>
                {projectedQty !== null && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>After Movement:</span>{' '}
                    <strong style={{ color: projectedQty < 0 ? '#dc2626' : projectedQty <= selectedItem.reorderThreshold ? '#d97706' : '#059669' }}>
                      {projectedQty} {selectedItem.unit}
                    </strong>
                    {projectedQty < 0 && <span style={{ color: '#dc2626', fontSize: 11, marginLeft: 6 }}>⚠ Exceeds stock</span>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Movement Type *</label>
              <select className="form-control" value={form.movementType} onChange={set('movementType')}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-control" type="number" min="0.01" step="0.01" value={form.quantity} onChange={set('quantity')} required />
            </div>
          </div>
          {['Issuance', 'Return'].includes(form.movementType) && (
            <div className="form-group">
              <label className="form-label">
                {form.movementType === 'Issuance' ? 'Issue to department' : 'Returned from department'}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (optional)</span>
              </label>
              <SearchSelect
                value={form.departmentId}
                onChange={set('departmentId')}
                placeholder={form.movementType === 'Issuance' ? 'External / unattributed' : 'Not from a department'}
                options={departments.filter(d => d.isActive !== false).map(d => ({ value: d.id, label: d.name }))}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                {form.movementType === 'Issuance'
                  ? 'Selecting a department adds this quantity to its recorded balance (see Department Stock).'
                  : 'Selecting a department deducts this quantity from its recorded balance.'}
              </p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" value={form.remarks} onChange={set('remarks')} rows={2} placeholder="Optional notes…" />
          </div>
          {isOutbound && (
            <div className="alert alert-warning">
              This movement will <strong>decrease</strong> the item's quantity on hand.
            </div>
          )}
        </Modal>
      )}

      {voidTarget && (
        <Modal
          title="Void Stock Movement"
          onClose={() => setVoidTarget(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setVoidTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={submitVoid} disabled={voiding}>{voiding ? 'Voiding…' : 'Void Movement'}</button>
            </>
          }
        >
          <div className="alert alert-warning">
            This posts a compensating entry that reverses the movement's effect on stock
            {['Issuance', 'Disposal'].includes(voidTarget.movementType) ? ' (restoring batch quantities)' : ''}
            {voidTarget.movementType === 'DepartmentConsumption'
              ? ` (putting the units back into ${voidTarget.departmentName ?? "the ward's"} balance; central stock is unaffected)`
              : ''}
            {voidTarget.movementType === 'DepartmentTransfer'
              ? ` (taking the units back out of ${voidTarget.toDepartmentName ?? 'the receiving ward'} and returning them to ${voidTarget.departmentName ?? 'the sending ward'}; central stock is unaffected, and the void fails if the receiving ward has already used them)`
              : ''}.
            The original stays on record, marked as voided.
          </div>
          <div style={{ margin: '12px 0', fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <strong>{typeLabel(voidTarget.movementType)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Item:</span> <strong>{voidTarget.itemName}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <strong>{voidTarget.quantity}</strong></div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for voiding *</label>
            <textarea
              className="form-control"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Wrong item selected, duplicate entry…"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
