import { useEffect, useState } from 'react';
import { MdAdd, MdVisibility, MdCheckCircle, MdArrowForward } from 'react-icons/md';
import { getRequests, createRequest, approveRequest } from '../../api/procurement';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

export default function ProcurementList() {
  const { user } = useAuth();
  const canCreate = ['HospitalAdministrator', 'DepartmentHead'].includes(user?.role);
  const canApprove = ['HospitalAdministrator', 'ProcurementStaff', 'InventoryOfficer'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [form, setForm] = useState({ justification: '', items: [{ inventoryItemId: '', quantityRequested: '', estimatedUnitCost: '', remarks: '' }] });
  const [approveForm, setApproveForm] = useState({ action: 'Approve', remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getRequests(statusFilter ? { status: statusFilter } : {}).then(r => setRequests(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getItems().then(r => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const addLine = () => setForm(p => ({ ...p, items: [...p.items, { inventoryItemId: '', quantityRequested: '', estimatedUnitCost: '', remarks: '' }] }));
  const removeLine = i => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
  const setLine = (i, k) => e => setForm(p => {
    const items = [...p.items];
    items[i] = { ...items[i], [k]: e.target.value };
    return { ...p, items };
  });

  const save = async () => {
    setSaving(true);
    try {
      await createRequest({
        justification: form.justification,
        items: form.items.map(i => ({ inventoryItemId: +i.inventoryItemId, quantityRequested: +i.quantityRequested, estimatedUnitCost: i.estimatedUnitCost ? +i.estimatedUnitCost : null, remarks: i.remarks || null }))
      });
      toast.success('Procurement request submitted.');
      setCreateModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to submit.'); }
    finally { setSaving(false); }
  };

  const submitApproval = async () => {
    setSaving(true);
    try {
      await approveRequest(approveModal.id, { action: approveForm.action, remarks: approveForm.remarks });
      toast.success(`Request ${approveForm.action}d.`);
      setApproveModal(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const STATUSES = ['', 'SubmittedToProcurement', 'ApprovedByProcurement', 'FullyApproved', 'Rejected', 'PurchaseOrderGenerated', 'Delivered'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Procurement Requests</h1>
          <p className="page-subtitle">Department purchase requests and approval workflow</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setForm({ justification: '', items: [{ inventoryItemId: '', quantityRequested: '', estimatedUnitCost: '', remarks: '' }] }); setCreateModal(true); }}>
            <MdAdd size={16} /> New Request
          </button>
        )}
      </div>

      <div className="filter-bar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {STATUSES.map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)} style={{ whiteSpace: 'nowrap' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request #</th>
                <th>Department</th>
                <th>Requested By</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No requests found.</td></tr>
              ) : requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.requestNumber}</td>
                  <td>{r.departmentName}</td>
                  <td>{r.requestedByFullName}</td>
                  <td><span className="badge badge-blue">{r.items?.length ?? 0} items</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewModal(r)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {canApprove && r.status === 'SubmittedToProcurement' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setApproveModal(r); setApproveForm({ action: 'Approve', remarks: '' }); }}>
                          Review
                        </button>
                      )}
                      {canApprove && r.status === 'ApprovedByProcurement' && user?.role === 'HospitalAdministrator' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setApproveModal(r); setApproveForm({ action: 'Approve', remarks: '' }); }}>
                          Final Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <Modal title="New Procurement Request" onClose={() => setCreateModal(false)} size="modal-xl"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Justification *</label>
            <textarea className="form-control" value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} rows={3} placeholder="Provide justification for this procurement request…" required />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Items Requested *</label>
              <button className="btn btn-secondary btn-sm" onClick={addLine}><MdAdd size={14} /> Add Item</button>
            </div>
            {form.items.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  {i === 0 && <label className="form-label">Item</label>}
                  <select className="form-control" value={line.inventoryItemId} onChange={setLine(i, 'inventoryItemId')} required>
                    <option value="">Select item</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {i === 0 && <label className="form-label">Qty</label>}
                  <input className="form-control" type="number" min="0.01" step="0.01" value={line.quantityRequested} onChange={setLine(i, 'quantityRequested')} required placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {i === 0 && <label className="form-label">Est. Unit Cost</label>}
                  <input className="form-control" type="number" min="0" step="0.01" value={line.estimatedUnitCost} onChange={setLine(i, 'estimatedUnitCost')} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {i === 0 && <label className="form-label">Remarks</label>}
                  <input className="form-control" value={line.remarks} onChange={setLine(i, 'remarks')} placeholder="Optional…" />
                </div>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeLine(i)} style={{ marginTop: i === 0 ? 20 : 0 }} disabled={form.items.length === 1}>×</button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title={`Request: ${viewModal.requestNumber}`} onClose={() => setViewModal(null)} size="modal-lg"
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>}
        >
          <div className="grid-2">
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department</span><br /><strong>{viewModal.departmentName}</strong></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</span><br /><StatusBadge status={viewModal.status} /></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Requested By</span><br /><strong>{viewModal.requestedByFullName}</strong></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date</span><br /><strong>{new Date(viewModal.requestedAt).toLocaleDateString('en-PH')}</strong></div>
          </div>
          <div className="alert alert-info">{viewModal.justification}</div>
          <div>
            <label className="form-label">Items Requested</label>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Est. Cost</th><th>Remarks</th></tr></thead>
                <tbody>
                  {(viewModal.items ?? []).map(it => (
                    <tr key={it.id}>
                      <td>{it.itemName} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({it.unit})</span></td>
                      <td>{it.quantityRequested}</td>
                      <td>{it.estimatedUnitCost ? `₱${it.estimatedUnitCost.toLocaleString()}` : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{it.remarks ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {(viewModal.approvals ?? []).length > 0 && (
            <div>
              <label className="form-label">Approval History</label>
              {viewModal.approvals.map(a => (
                <div key={a.id} style={{ padding: '8px 12px', background: 'var(--green-50)', borderRadius: 'var(--radius-sm)', marginTop: 6, fontSize: 13 }}>
                  <strong>{a.approverFullName}</strong> ({a.approverRole}) — <span className={`badge badge-${a.actionName === 'Approved' ? 'green' : a.actionName === 'Rejected' ? 'red' : 'amber'}`}>{a.actionName}</span>
                  {a.remarks && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{a.remarks}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(a.actedAt).toLocaleString('en-PH')}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <Modal title={`Review: ${approveModal.requestNumber}`} onClose={() => setApproveModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
              <button
                className={`btn ${approveForm.action === 'Approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={submitApproval} disabled={saving}
              >{saving ? 'Processing…' : approveForm.action}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Action</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Approve', 'Reject', 'Return'].map(a => (
                <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" checked={approveForm.action === a} onChange={() => setApproveForm(p => ({ ...p, action: a }))} /> {a}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks {approveForm.action !== 'Approve' && '*'}</label>
            <textarea className="form-control" value={approveForm.remarks} onChange={e => setApproveForm(p => ({ ...p, remarks: e.target.value }))} rows={3} placeholder="Provide remarks…" />
          </div>
        </Modal>
      )}
    </div>
  );
}
