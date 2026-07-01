import { useEffect, useState } from 'react';
import { MdAdd, MdSwapVert, MdTrendingUp, MdTrendingDown, MdRemove } from 'react-icons/md';
import { getMovements, createMovement } from '../../api/stockMovements';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
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

  // Selected item for preview
  const selectedItem = form.inventoryItemId ? items.find(i => i.id === +form.inventoryItemId) : null;
  const isOutbound = ['Issuance', 'Disposal'].includes(form.movementType);
  const projectedQty = selectedItem && form.quantity
    ? isOutbound
      ? selectedItem.quantityOnHand - +form.quantity
      : selectedItem.quantityOnHand + +form.quantity
    : null;

  // Summaries
  const totalReceipts = movements.filter(m => m.movementType === 'Receipt').reduce((s, m) => s + m.quantity, 0);
  const totalIssuances = movements.filter(m => m.movementType === 'Issuance').reduce((s, m) => s + m.quantity, 0);

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
          <div className="stat-value">{movements.filter(m => m.movementType === 'Disposal').length}</div>
          <div className="stat-label">Disposal Records</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <select className="form-control" value={itemFilter} onChange={e => setItemFilter(e.target.value)} style={{ minWidth: 220 }}>
          <option value="">All Items</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
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
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No movements found.</td></tr>
              ) : movements.map(m => (
                <tr key={m.id}>
                  <td><span className={`badge badge-${TYPE_COLOR[m.movementType] ?? 'gray'}`}>{m.movementType}</span></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.itemName}</div>
                    {m.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.itemCode}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    <span style={{ color: ['Issuance', 'Disposal'].includes(m.movementType) ? '#dc2626' : '#059669' }}>
                      {['Issuance', 'Disposal'].includes(m.movementType) ? '−' : '+'}{m.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{m.quantityBeforeMovement}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: m.quantityAfterMovement < m.quantityBeforeMovement ? '#dc2626' : '#059669' }}>
                    {m.quantityAfterMovement}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                    {m.remarks ?? '—'}
                  </td>
                  <td style={{ fontSize: 13 }}>{m.performedByFullName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.movementDate).toLocaleString('en-PH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <select className="form-control" value={form.inventoryItemId} onChange={set('inventoryItemId')} required>
              <option value="">Select item</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} — {i.quantityOnHand > 0 ? 'Available' : 'Not Available'} ({i.quantityOnHand} {i.unit})</option>
              ))}
            </select>
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
    </div>
  );
}
