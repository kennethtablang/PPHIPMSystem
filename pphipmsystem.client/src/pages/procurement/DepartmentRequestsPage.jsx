import { useEffect, useState } from 'react';
import { MdAdd, MdVisibility, MdSend, MdCheckCircle, MdCancel, MdWarning } from 'react-icons/md';
import { getRequests, createRequest, submitRequest } from '../../api/procurement';
import { getItems } from '../../api/inventory';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const BLANK_FORM = { justification: '', items: [{ inventoryItemId: '', quantityRequested: '', remarks: '' }] };

export default function DepartmentRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getRequests({
      departmentId: user.departmentId,
      ...(statusFilter ? { status: statusFilter } : {})
    })
      .then(r => setRequests(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getItems().then(r => setItems(r.data.filter(i => i.isActive)));
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter, user]);

  // Build an item lookup map for availability display
  const itemMap = Object.fromEntries(items.map(i => [String(i.id), i]));

  const addLine = () => setForm(p => ({ ...p, items: [...p.items, { inventoryItemId: '', quantityRequested: '', remarks: '' }] }));
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
        items: form.items.map(i => ({
          inventoryItemId: +i.inventoryItemId,
          quantityRequested: +i.quantityRequested,
          remarks: i.remarks || null
        }))
      });
      toast.success('Department request created.');
      setCreateModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToProcurement = async id => {
    setSaving(true);
    try {
      await submitRequest(id);
      toast.success('Submitted to procurement workflow.');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  const STATUSES = [
    { value: '', label: 'All Requests' },
    { value: 'SubmittedByDepartment', label: 'Draft' },
    { value: 'SubmittedToProcurement', label: 'Pending Review' },
    { value: 'ApprovedByProcurement', label: 'Procurement Approved' },
    { value: 'ApprovedByInventoryOfficer', label: 'Inventory Approved' },
    { value: 'FullyApproved', label: 'Fully Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'ReturnedForRevision', label: 'Returned for Revision' }
  ];

  if (!user?.departmentId) {
    return (
      <div className="alert alert-danger" style={{ margin: 20 }}>
        You do not have a department assigned. Please contact an administrator.
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Requests</h1>
          <p className="page-subtitle">Manage and submit internal supply requests for {user.departmentName || 'your department'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(BLANK_FORM); setCreateModal(true); }}>
          <MdAdd size={16} /> New Request
        </button>
      </div>

      <div className="filter-bar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} className={`btn btn-sm ${statusFilter === s.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s.value)} style={{ whiteSpace: 'nowrap' }}>
            {s.label}
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
                <th>Requested By</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No requests found.</td></tr>
              ) : requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.requestNumber}</td>
                  <td>{r.requestedByFullName}</td>
                  <td><span className="badge badge-blue">{r.items?.length ?? 0} items</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewModal(r)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {(r.status === 'SubmittedByDepartment' || r.status === 'ReturnedForRevision') && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSubmitToProcurement(r.id)} disabled={saving}>
                          <MdSend size={14} style={{ marginRight: 4 }} /> Submit
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
        <Modal title="Create Department Request" onClose={() => setCreateModal(false)} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Justification *</label>
            <textarea className="form-control" value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} rows={3} placeholder="Why is this supply request needed?" required />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Items Requested *</label>
              <button className="btn btn-secondary btn-sm" onClick={addLine}><MdAdd size={14} /> Add Item</button>
            </div>
            {form.items.map((line, i) => {
              const selectedItem = line.inventoryItemId ? itemMap[String(line.inventoryItemId)] : null;
              const isAvailable = selectedItem && selectedItem.quantityOnHand > 0;
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 2fr auto', gap: 8, alignItems: 'end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      {i === 0 && <label className="form-label">Item</label>}
                      <select className="form-control" value={line.inventoryItemId} onChange={setLine(i, 'inventoryItemId')} required>
                        <option value="">Select item</option>
                        {items.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.unit}) — {it.quantityOnHand > 0 ? 'Available' : 'Not Available'} ({it.quantityOnHand} in stock)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      {i === 0 && <label className="form-label">Qty</label>}
                      <input className="form-control" type="number" min="0.01" step="0.01" value={line.quantityRequested} onChange={setLine(i, 'quantityRequested')} required placeholder="0" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      {i === 0 && <label className="form-label">Remarks</label>}
                      <input className="form-control" value={line.remarks} onChange={setLine(i, 'remarks')} placeholder="Remarks (optional)" />
                    </div>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeLine(i)} style={{ marginTop: i === 0 ? 20 : 0 }} disabled={form.items.length === 1}>×</button>
                  </div>
                  {/* Availability indicator */}
                  {selectedItem && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      {isAvailable ? (
                        <><MdCheckCircle size={13} color="#16a34a" /><span style={{ color: '#16a34a', fontWeight: 600 }}>Available</span></>
                      ) : (
                        <><MdCancel size={13} color="#dc2626" /><span style={{ color: '#dc2626', fontWeight: 600 }}>Not Available</span></>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>— {selectedItem.quantityOnHand} {selectedItem.unit} in stock</span>
                      {selectedItem.isBelowReorder && <><MdWarning size={13} color="#f59e0b" /><span style={{ color: '#d97706' }}>Below reorder threshold</span></>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title={`Request Details: ${viewModal.requestNumber}`} onClose={() => setViewModal(null)} size="modal-lg"
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>}
        >
          <div className="grid-2">
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</span><br /><StatusBadge status={viewModal.status} /></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Requested By</span><br /><strong>{viewModal.requestedByFullName}</strong></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date</span><br /><strong>{new Date(viewModal.requestedAt).toLocaleDateString('en-PH')}</strong></div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 12 }}>{viewModal.justification}</div>
          <div>
            <label className="form-label">Items Requested</label>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty Requested</th>
                    <th>Availability</th>
                    <th>Qty in Stock</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewModal.items ?? []).map(it => {
                    const liveItem = itemMap[String(it.inventoryItemId)] ?? null;
                    const isAvail = liveItem ? liveItem.quantityOnHand > 0 : null;
                    return (
                      <tr key={it.id}>
                        <td><strong>{it.itemName}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({it.unit})</span></td>
                        <td style={{ fontWeight: 600 }}>{it.quantityRequested}</td>
                        <td>
                          {isAvail === null ? (
                            <span className="badge badge-gray">—</span>
                          ) : isAvail ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MdCheckCircle size={12} /> Available
                            </span>
                          ) : (
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MdCancel size={12} /> Not Available
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {liveItem ? `${liveItem.quantityOnHand} ${it.unit}` : '—'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{it.remarks ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {(viewModal.approvals ?? []).length > 0 && (
            <div style={{ marginTop: 16 }}>
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
    </div>
  );
}
