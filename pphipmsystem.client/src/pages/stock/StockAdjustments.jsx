import { useEffect, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { getAdjustments, createAdjustment, approveAdjustment } from '../../api/stockAdjustments';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const BLANK = { inventoryItemId: '', physicalCount: '', reason: '' };

export default function StockAdjustments() {
  const { user } = useAuth();
  const canCreate = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);
  const canApprove = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);

  const [list, setList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [approveForm, setApproveForm] = useState({ approved: true, remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const p = statusFilter ? { status: statusFilter } : {};
    getAdjustments(p).then(r => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Live variance preview
  const selectedItem = form.inventoryItemId ? items.find(i => i.id === +form.inventoryItemId) : null;
  const variance = selectedItem && form.physicalCount !== '' ? +form.physicalCount - selectedItem.quantityOnHand : null;

  const save = async () => {
    setSaving(true);
    try {
      await createAdjustment({ ...form, inventoryItemId: +form.inventoryItemId, physicalCount: +form.physicalCount });
      toast.success('Adjustment request submitted for approval.');
      setCreateModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit.');
    } finally { setSaving(false); }
  };

  const submitApproval = async () => {
    setSaving(true);
    try {
      await approveAdjustment(approveModal.id, { approved: approveForm.approved, remarks: approveForm.remarks });
      toast.success(approveForm.approved ? 'Adjustment approved and stock updated.' : 'Adjustment rejected.');
      setApproveModal(null);
      load();
    } catch { toast.error('Failed to process approval.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Adjustments</h1>
          <p className="page-subtitle">Reconcile physical count discrepancies with digital records</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setForm(BLANK); setCreateModal(true); }}>
            <MdAdd size={16} /> New Adjustment
          </button>
        )}
      </div>

      <div className="filter-bar">
        {['', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s)}
          >{s || 'All'}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Recorded Qty</th>
                <th>Physical Count</th>
                <th>Variance</th>
                <th>Reason</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Date</th>
                {canApprove && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No adjustments found.</td></tr>
              ) : list.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.itemName}</td>
                  <td>{a.recordedQuantity}</td>
                  <td style={{ fontWeight: 600 }}>{a.physicalCount}</td>
                  <td style={{ fontWeight: 700, color: a.variance > 0 ? '#059669' : a.variance < 0 ? '#dc2626' : 'inherit' }}>
                    {a.variance > 0 ? '+' : ''}{a.variance}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>{a.reason}</td>
                  <td>{a.requestedByFullName}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(a.requestedAt).toLocaleDateString('en-PH')}</td>
                  {canApprove && (
                    <td>
                      {a.status === 'Pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setApproveModal(a); setApproveForm({ approved: true, remarks: '' }); }}>
                          Review
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createModal && (
        <Modal
          title="Submit Stock Adjustment"
          onClose={() => setCreateModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Submitting…' : 'Submit for Approval'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Inventory Item *</label>
            <select className="form-control" value={form.inventoryItemId} onChange={set('inventoryItemId')} required>
              <option value="">Select item</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} (Current: {i.quantityOnHand} {i.unit})</option>)}
            </select>
            {selectedItem && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--green-50)', border: '1px solid var(--green-200)', fontSize: 13, display: 'flex', gap: 20 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Recorded Qty:</span> <strong>{selectedItem.quantityOnHand} {selectedItem.unit}</strong></div>
                {variance !== null && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Variance:</span>{' '}
                    <strong style={{ color: variance === 0 ? 'inherit' : variance > 0 ? '#059669' : '#dc2626' }}>
                      {variance > 0 ? '+' : ''}{variance} {selectedItem.unit}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Physical Count *</label>
            <input className="form-control" type="number" min="0" step="0.01" value={form.physicalCount} onChange={set('physicalCount')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Adjustment *</label>
            <textarea className="form-control" value={form.reason} onChange={set('reason')} rows={3} placeholder="Explain the reason for discrepancy…" required />
          </div>
          <div className="alert alert-warning">
            Adjustment requires supervisory approval before stock is updated.
          </div>
        </Modal>
      )}

      {approveModal && (
        <Modal
          title={`Review Adjustment — ${approveModal.itemName}`}
          onClose={() => setApproveModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
              <button
                className={`btn ${approveForm.approved ? 'btn-primary' : 'btn-danger'}`}
                onClick={submitApproval} disabled={saving}
              >
                {saving ? 'Processing…' : approveForm.approved ? 'Approve Adjustment' : 'Reject Adjustment'}
              </button>
            </>
          }
        >
          <div className="grid-2" style={{ marginBottom: 8 }}>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recorded Qty</span><br /><strong style={{ fontSize: 18 }}>{approveModal.recordedQuantity}</strong></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Physical Count</span><br /><strong style={{ fontSize: 18 }}>{approveModal.physicalCount}</strong></div>
          </div>
          <div className={`alert ${approveModal.variance > 0 ? 'alert-success' : 'alert-error'}`}>
            Variance: <strong>{approveModal.variance > 0 ? '+' : ''}{approveModal.variance}</strong> — {approveModal.reason}
          </div>
          <div className="form-group">
            <label className="form-label">Decision</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" checked={approveForm.approved} onChange={() => setApproveForm(p => ({ ...p, approved: true }))} /> Approve
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" checked={!approveForm.approved} onChange={() => setApproveForm(p => ({ ...p, approved: false }))} /> Reject
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks {!approveForm.approved && '*'}</label>
            <textarea className="form-control" value={approveForm.remarks} onChange={e => setApproveForm(p => ({ ...p, remarks: e.target.value }))} rows={2} placeholder="Optional remarks…" required={!approveForm.approved} />
          </div>
        </Modal>
      )}
    </div>
  );
}
