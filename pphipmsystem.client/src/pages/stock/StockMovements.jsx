import { useEffect, useState } from 'react';
import { MdAdd, MdTrendingUp, MdUndo } from 'react-icons/md';
import { getMovements, createMovement, voidMovement } from '../../api/stockMovements';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import { toast } from '../../components/common/Toast';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { fmtDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const TYPES = ['Receipt', 'Issuance', 'Return', 'Disposal'];
const BLANK = { inventoryItemId: '', movementType: 'Issuance', quantity: '', remarks: '' };

const TYPE_COLOR = { Receipt: 'green', Issuance: 'blue', Return: 'teal', Disposal: 'red', Adjustment: 'amber' };

export default function StockMovements() {
  const { user } = useAuth();
  const canCreate = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemFilter, setItemFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const pager = usePagination(movements);

  const load = () => {
    setLoading(true);
    const p = {};
    if (itemFilter) p.itemId = itemFilter;
    if (typeFilter) p.type = typeFilter;
    getMovements(p).then(r => setMovements(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [itemFilter, typeFilter]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await createMovement({ ...form, inventoryItemId: +form.inventoryItemId, quantity: +form.quantity });
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
      load();
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

  // Summaries — exclude voided originals and their reversals so the totals
  // reflect net stock activity rather than double-counting corrections.
  const effective = movements.filter(m => !m.isVoided && !m.isReversal);
  const totalReceipts = effective.filter(m => m.movementType === 'Receipt').reduce((s, m) => s + m.quantity, 0);
  const totalIssuances = effective.filter(m => m.movementType === 'Issuance').reduce((s, m) => s + m.quantity, 0);

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
          <div className="stat-value">{movements.length}</div>
          <div className="stat-label">Total Movements</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{totalReceipts.toLocaleString()}</div>
          <div className="stat-label">Units Received</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{totalIssuances.toLocaleString()}</div>
          <div className="stat-label">Units Issued</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-value">{effective.filter(m => m.movementType === 'Disposal').length}</div>
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
          options={items.map(i => ({ value: i.id, label: i.name, sublabel: `${i.quantityOnHand} ${i.unit} in stock` }))}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['', ...TYPES].map(t => (
            <button
              key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t)}
            >{t || 'All Types'}</button>
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
              ) : pager.pageItems.map(m => {
                // Direction is derived from the actual before/after delta so that
                // reversals (which keep the original type) show the correct sign.
                const delta = m.quantityAfterMovement - m.quantityBeforeMovement;
                return (
                <tr key={m.id} style={m.isVoided ? { opacity: 0.55 } : undefined}>
                  <td>
                    <span className={`badge badge-${TYPE_COLOR[m.movementType] ?? 'gray'}`}>{m.movementType}</span>
                    {m.isReversal && <span className="badge badge-gray" style={{ marginLeft: 4 }}>Reversal</span>}
                    {m.isVoided && <span className="badge badge-red" style={{ marginLeft: 4 }}>Voided</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, textDecoration: m.isVoided ? 'line-through' : undefined }}>{m.itemName}</div>
                    {m.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.itemCode}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    <span style={{ color: delta < 0 ? '#dc2626' : '#059669' }}>
                      {delta < 0 ? '−' : '+'}{m.quantity}
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
        <Pagination {...pager} />
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
                sublabel: `${i.quantityOnHand > 0 ? 'Available' : 'Not Available'} — ${i.quantityOnHand} ${i.unit}`,
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
            {['Issuance', 'Disposal'].includes(voidTarget.movementType) ? ' (restoring batch quantities)' : ''}.
            The original stays on record, marked as voided.
          </div>
          <div style={{ margin: '12px 0', fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <strong>{voidTarget.movementType}</strong></div>
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
