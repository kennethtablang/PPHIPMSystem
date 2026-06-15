import { useEffect, useState } from 'react';
import { MdAdd, MdSwapVert } from 'react-icons/md';
import { getMovements, createMovement } from '../../api/stockMovements';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const TYPES = ['Receipt', 'Issuance', 'Return', 'Disposal'];
const BLANK = { inventoryItemId: '', movementType: 'Issuance', quantity: '', remarks: '' };

export default function StockMovements() {
  const { user } = useAuth();
  const canCreate = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemFilter, setItemFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const p = {};
    if (itemFilter) p.itemId = itemFilter;
    getMovements(p).then(r => setMovements(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [itemFilter]);

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

  const typeColor = t => ({ Receipt: 'green', Issuance: 'blue', Return: 'teal', Disposal: 'red', Adjustment: 'amber' }[t] ?? 'gray');

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

      <div className="filter-bar">
        <select className="form-control" value={itemFilter} onChange={e => setItemFilter(e.target.value)} style={{ minWidth: 220 }}>
          <option value="">All Items</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
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
                <th>Quantity</th>
                <th>Before</th>
                <th>After</th>
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
                  <td><span className={`badge badge-${typeColor(m.movementType)}`}>{m.movementType}</span></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.itemName}</div>
                    {m.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.itemCode}</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.quantity}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.quantityBeforeMovement}</td>
                  <td style={{ fontWeight: 600, color: m.quantityAfterMovement < m.quantityBeforeMovement ? '#dc2626' : '#059669' }}>
                    {m.quantityAfterMovement}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                    {m.remarks ?? '—'}
                  </td>
                  <td>{m.performedByFullName}</td>
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
              {items.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantityOnHand} {i.unit})</option>)}
            </select>
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
          {['Issuance', 'Disposal'].includes(form.movementType) && (
            <div className="alert alert-warning">
              This movement will decrease the item's quantity on hand.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
