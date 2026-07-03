import { useEffect, useState } from 'react';
import { MdAdd, MdWarning, MdDeleteForever, MdEdit } from 'react-icons/md';
import { getAllBatches, getExpiringBatches, createBatch, disposeBatch, updateBatchDetails } from '../../api/batches';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const BLANK = { inventoryItemId: '', lotNumber: '', quantity: '', expirationDate: '' };
const DISPOSE_REASONS = [
  'Expired — past expiration date',
  'Damaged / contaminated',
  'Quality failure',
  'Recall by manufacturer',
  'Other',
];

export default function ItemBatches() {
  const { user } = useAuth();
  const canEdit = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('expiring');
  const [warningDays, setWarningDays] = useState(90);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [disposeModal, setDisposeModal] = useState(null); // batch to dispose
  const [disposeReason, setDisposeReason] = useState(DISPOSE_REASONS[0]);
  const [disposeCustom, setDisposeCustom] = useState('');
  // Correction of lot/expiry typos made at receiving (audit-logged server-side).
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ lotNumber: '', expirationDate: '' });

  const load = () => {
    setLoading(true);
    const req = view === 'all' ? getAllBatches() : getExpiringBatches(warningDays);
    req.then(r => setBatches(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [view, warningDays]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await createBatch({ ...form, inventoryItemId: +form.inventoryItemId, quantity: +form.quantity, expirationDate: form.expirationDate || null });
      toast.success('Batch received and stock updated.');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to add batch.');
    } finally { setSaving(false); }
  };

  const openDispose = batch => {
    setDisposeModal(batch);
    setDisposeReason(DISPOSE_REASONS[0]);
    setDisposeCustom('');
  };

  const openEdit = batch => {
    setEditForm({
      lotNumber: batch.lotNumber ?? '',
      expirationDate: batch.expirationDate ? batch.expirationDate.split('T')[0] : '',
    });
    setEditModal(batch);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateBatchDetails(editModal.id, {
        lotNumber: editForm.lotNumber || null,
        expirationDate: editForm.expirationDate || null,
      });
      toast.success('Batch details corrected.');
      setEditModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to update batch.');
    } finally { setSaving(false); }
  };

  const confirmDispose = async () => {
    const reason = disposeReason === 'Other' ? disposeCustom.trim() : disposeReason;
    if (!reason) { toast.error('Please enter a disposal reason.'); return; }
    setSaving(true);
    try {
      await disposeBatch(disposeModal.id, reason);
      toast.success('Batch marked for disposal. Stock reduced and audit logged.');
      setDisposeModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to dispose batch.');
    } finally { setSaving(false); }
  };

  const daysColor = d => d < 0 ? '#b91c1c' : d <= 30 ? '#dc2626' : d <= 60 ? '#d97706' : '#059669';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches & Expiry Tracking</h1>
          <p className="page-subtitle">Monitor pharmaceutical and supply batches nearing expiration</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setForm(BLANK); setModal(true); }}>
            <MdAdd size={16} /> Receive Batch
          </button>
        )}
      </div>

      <div className="filter-bar">
        <button className={`btn btn-sm ${view === 'expiring' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('expiring')}>Expiring Soon</button>
        <button className={`btn btn-sm ${view === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('all')}>All Batches</button>
        {view === 'expiring' && (
          <>
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Within:</label>
            {[30, 60, 90, 180].map(d => (
              <button key={d} className={`btn ${warningDays === d ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setWarningDays(d)}>{d}d</button>
            ))}
          </>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Lot Number</th>
                <th>Quantity</th>
                <th>Remaining</th>
                <th>Expiration Date</th>
                <th>Days Until Expiry</th>
                <th>Status</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  {view === 'all' ? 'No active batches found.' : `No batches expiring within ${warningDays} days.`}
                </td></tr>
              ) : batches.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.itemName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.lotNumber ?? '—'}</td>
                  <td>{b.quantity}</td>
                  <td style={{ fontWeight: 600 }}>{b.remainingQuantity}</td>
                  <td>{b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('en-PH') : '—'}</td>
                  <td>
                    {b.daysUntilExpiry != null ? (
                      <span style={{ fontWeight: 700, color: daysColor(b.daysUntilExpiry) }}>
                        {b.daysUntilExpiry < 0 ? `${Math.abs(b.daysUntilExpiry)}d overdue` : `${b.daysUntilExpiry}d`}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {b.isExpired
                      ? <span className="badge badge-red"><MdWarning size={10} /> Expired</span>
                      : b.daysUntilExpiry <= 30
                        ? <span className="badge badge-red">Critical</span>
                        : <span className="badge badge-amber">Expiring Soon</span>
                    }
                  </td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Correct lot / expiry">
                          <MdEdit size={15} />
                        </button>
                        {b.remainingQuantity > 0 && (
                          <button className="btn btn-danger btn-sm" onClick={() => openDispose(b)} title="Mark for disposal / write-off">
                            <MdDeleteForever size={14} /> Dispose
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <Modal
          title={`Correct Batch: ${editModal.itemName}`}
          onClose={() => setEditModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Correction'}
              </button>
            </>
          }
        >
          <div className="alert alert-info" style={{ fontSize: 12 }}>
            Use this to fix a lot number or expiration date typed incorrectly at receiving.
            The change is recorded in the audit log.
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Lot / Batch Number</label>
              <input className="form-control" value={editForm.lotNumber} onChange={e => setEditForm(p => ({ ...p, lotNumber: e.target.value }))} maxLength={100} placeholder="e.g. LOT-2026-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Date</label>
              <input className="form-control" type="date" value={editForm.expirationDate} onChange={e => setEditForm(p => ({ ...p, expirationDate: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {disposeModal && (
        <Modal
          title="Mark Batch for Disposal / Write-Off"
          onClose={() => setDisposeModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDisposeModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDispose} disabled={saving}>
                {saving ? 'Processing…' : 'Confirm Disposal'}
              </button>
            </>
          }
        >
          <div className="alert alert-danger" style={{ marginBottom: 4, display: 'block' }}>
            <strong>Item:</strong> {disposeModal.itemName}<br />
            <strong>Lot:</strong> {disposeModal.lotNumber ?? 'N/A'} &nbsp;·&nbsp;
            <strong>Quantity to dispose:</strong> {disposeModal.remainingQuantity} units<br />
            <strong>Expires:</strong> {disposeModal.expirationDate ? new Date(disposeModal.expirationDate).toLocaleDateString('en-PH') : 'N/A'}
          </div>
          <div className="form-group">
            <label className="form-label">Disposal Reason *</label>
            <select
              className="form-control"
              value={disposeReason}
              onChange={e => setDisposeReason(e.target.value)}
            >
              {DISPOSE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {disposeReason === 'Other' && (
            <div className="form-group">
              <label className="form-label">Specify Reason *</label>
              <textarea
                className="form-control"
                value={disposeCustom}
                onChange={e => setDisposeCustom(e.target.value)}
                placeholder="Describe the reason for disposal…"
                rows={3}
              />
            </div>
          )}
          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            This action will reduce stock on hand by {disposeModal.remainingQuantity} units, create a Disposal stock movement, and record an audit log entry. This cannot be undone.
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title="Receive New Batch"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Receive Batch'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Inventory Item *</label>
            <SearchSelect
              value={form.inventoryItemId}
              onChange={set('inventoryItemId')}
              placeholder="Search items…"
              options={items.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Lot / Batch Number</label>
              <input className="form-control" value={form.lotNumber} onChange={set('lotNumber')} placeholder="e.g. LOT-2025-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity Received *</label>
              <input className="form-control" type="number" min="0.01" step="0.01" value={form.quantity} onChange={set('quantity')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Expiration Date</label>
            <input className="form-control" type="date" value={form.expirationDate} onChange={set('expirationDate')} />
          </div>
          <div className="alert alert-info">
            Receiving a batch will automatically increase the item's quantity on hand.
          </div>
        </Modal>
      )}
    </div>
  );
}
