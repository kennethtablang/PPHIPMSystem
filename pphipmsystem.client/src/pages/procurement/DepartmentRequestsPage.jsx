import { useEffect, useState } from 'react';
import { MdAdd, MdVisibility, MdSend, MdSchedule, MdEdit, MdCancel } from 'react-icons/md';
import { getRequests, submitRequest, cancelRequest } from '../../api/procurement';
import { getItems } from '../../api/inventory';
import { getDepartments } from '../../api/departments';
import AttachmentsPanel from '../../components/common/AttachmentsPanel';
import Modal from '../../components/common/Modal';
import Pagination, { usePagination } from '../../components/common/Pagination';
import RequestFormModal from '../../components/common/RequestFormModal';
import { RequestProgress, RequestLinesTable } from '../../components/common/RequestProgress';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { fmtDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

// Aging indicator for requests waiting on someone to act (mirrors ProcurementList).
const PENDING_STATUSES = ['SubmittedByDepartment', 'SubmittedToProcurement', 'ApprovedByProcurement', 'ApprovedByInventoryOfficer', 'ReturnedForRevision', 'FullyApproved'];
const AGING_WARN_DAYS = 7;
const daysWaiting = r => Math.floor((Date.now() - new Date(r.updatedAt ?? r.requestedAt).getTime()) / 86400000);
const isStalled = r => PENDING_STATUSES.includes(r.status) && daysWaiting(r) >= AGING_WARN_DAYS;

// The department can still change its mind until Inventory signs the request off.
const EDITABLE = ['SubmittedByDepartment', 'SubmittedToProcurement', 'ReturnedForRevision'];
const SUBMITTABLE = ['SubmittedByDepartment', 'ReturnedForRevision'];

const STATUSES = [
  { value: '', label: 'All Requests' },
  { value: 'SubmittedByDepartment', label: 'Draft' },
  { value: 'SubmittedToProcurement', label: 'Inventory Review' },
  { value: 'ApprovedByInventoryOfficer', label: 'Admin Approval' },
  { value: 'FullyApproved', label: 'Awaiting Stock' },
  { value: 'Released', label: 'Released' },
  { value: 'ReturnedForRevision', label: 'Returned' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function DepartmentRequestsPage() {
  const { user } = useAuth();
  const isAdmin = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  // Admins can look at any department's requests; department accounts are
  // always pinned to their own by the server.
  const [deptFilter, setDeptFilter] = useState(String(user?.departmentId ?? ''));
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [formModal, setFormModal] = useState(null); // { request?: r } — null = closed
  const [viewModal, setViewModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);
  const pager = usePagination(requests);

  const load = () => {
    if (!isAdmin && !user?.departmentId) { setLoading(false); return; }
    setLoading(true);
    getRequests({
      ...(deptFilter ? { departmentId: deptFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .then(r => setRequests(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getItems().then(r => setItems(r.data.filter(i => i.isActive)));
    if (isAdmin) getDepartments().then(r => setDepartments(r.data.filter(d => d.isActive)));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  useEffect(() => {
    load();
    pager.setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  }, [statusFilter, deptFilter, user]);

  const itemMap = Object.fromEntries(items.map(i => [String(i.id), i]));

  const afterChange = updated => {
    load();
    if (viewModal && updated?.id === viewModal.id) setViewModal(updated);
  };

  const handleSubmit = async r => {
    setSaving(true);
    try {
      const res = await submitRequest(r.id);
      toast.success('Submitted for inventory review.');
      afterChange(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    setSaving(true);
    try {
      const res = await cancelRequest(cancelModal.id, cancelReason.trim() || null);
      toast.success(`Request ${cancelModal.requestNumber} cancelled.`);
      setCancelModal(null);
      afterChange(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to cancel request.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = r => { setViewModal(null); setFormModal({ request: r }); };
  const openCancel = r => { setCancelReason(''); setCancelModal(r); };

  if (!isAdmin && !user?.departmentId) {
    return (
      <div className="alert alert-danger" style={{ margin: 20 }}>
        You do not have a department assigned. Please contact an administrator.
      </div>
    );
  }

  const deptLabel = isAdmin
    ? departments.find(d => String(d.id) === deptFilter)?.name ?? 'all departments'
    : user.departmentName || 'your department';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Requests</h1>
          <p className="page-subtitle">Supply requests for {deptLabel} — request, track, and edit until Inventory approves</p>
        </div>
        <button className="btn btn-primary" onClick={() => setFormModal({})}>
          <MdAdd size={16} /> New Request
        </button>
      </div>

      <div className="filter-bar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {isAdmin && (
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: 220, flexShrink: 0 }}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {STATUSES.map(s => (
          <button key={s.value} className={`btn btn-sm ${statusFilter === s.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s.value)} style={{ whiteSpace: 'nowrap' }}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request #</th>
                {isAdmin && <th>Department</th>}
                <th>Requested By</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No requests found.</td></tr>
              ) : pager.pageItems.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.requestNumber}</td>
                  {isAdmin && <td>{r.departmentName}</td>}
                  <td>
                    {r.requestedByName || r.requestedByFullName}
                    {r.requestedByName && r.requestedByName !== r.requestedByFullName && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {r.requestedByFullName}</div>
                    )}
                  </td>
                  <td><span className="badge badge-blue">{r.items?.length ?? 0} items</span></td>
                  <td>
                    <StatusBadge status={r.status} />
                    {isStalled(r) && (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: daysWaiting(r) >= 14 ? '#dc2626' : '#d97706' }}>
                        <MdSchedule size={12} /> waiting {daysWaiting(r)}d
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewModal(r)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {EDITABLE.includes(r.status) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} title="Change quantities, add or remove items">
                          <MdEdit size={14} /> Edit
                        </button>
                      )}
                      {SUBMITTABLE.includes(r.status) && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSubmit(r)} disabled={saving}>
                          <MdSend size={14} style={{ marginRight: 4 }} /> Submit
                        </button>
                      )}
                      {EDITABLE.includes(r.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => openCancel(r)}>
                          <MdCancel size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pager} />
        </>
      )}

      {formModal && (
        <RequestFormModal
          request={formModal.request ?? null}
          onClose={() => setFormModal(null)}
          onSaved={saved => { setFormModal(null); afterChange(saved); }}
        />
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title={`Request Details: ${viewModal.requestNumber}`} onClose={() => setViewModal(null)} size="modal-lg"
          footer={
            <>
              {EDITABLE.includes(viewModal.status) && (
                <>
                  <button className="btn btn-danger" onClick={() => openCancel(viewModal)}><MdCancel size={15} /> Cancel Request</button>
                  <button className="btn btn-secondary" onClick={() => openEdit(viewModal)}><MdEdit size={15} /> Edit</button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setViewModal(null)} style={{ marginLeft: 'auto' }}>Close</button>
            </>
          }
        >
          <div className="grid-2">
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department</span><br /><strong>{viewModal.departmentName}</strong></div>
            <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</span><br /><StatusBadge status={viewModal.status} /></div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Requested By</span><br />
              <strong>{viewModal.requestedByName || viewModal.requestedByFullName}</strong>
              {viewModal.requestedByName && viewModal.requestedByName !== viewModal.requestedByFullName && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> (account: {viewModal.requestedByFullName})</span>
              )}
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date</span><br />
              <strong>{new Date(viewModal.requestedAt).toLocaleDateString('en-PH')}</strong>
              {viewModal.releasedAt && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · released {fmtDateTime(viewModal.releasedAt)}</span>}
            </div>
          </div>
          <RequestProgress status={viewModal.status} />
          <div className="alert alert-info"><strong>Purpose:</strong>&nbsp;{viewModal.justification}</div>
          <div>
            <label className="form-label">Items Requested</label>
            <RequestLinesTable request={viewModal} itemMap={itemMap} />
          </div>
          <AttachmentsPanel requestId={viewModal.id} />
          {(viewModal.approvals ?? []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label">Approval History</label>
              {viewModal.approvals.map(a => (
                <div key={a.id} style={{ padding: '8px 12px', background: 'var(--green-50)', borderRadius: 'var(--radius-sm)', marginTop: 6, fontSize: 13 }}>
                  <strong>{a.approverFullName}</strong> ({a.approverRole}) — <span className={`badge badge-${a.actionName === 'Approved' ? 'green' : a.actionName === 'Rejected' ? 'red' : 'amber'}`}>{a.actionName}</span>
                  {a.remarks && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{a.remarks}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateTime(a.actedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Cancel confirmation */}
      {cancelModal && (
        <Modal title={`Cancel ${cancelModal.requestNumber}?`} onClose={() => setCancelModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Keep Request</button>
              <button className="btn btn-danger" onClick={confirmCancel} disabled={saving}>{saving ? 'Cancelling…' : 'Cancel Request'}</button>
            </>
          }
        >
          <p style={{ fontSize: 13, marginTop: 0 }}>
            The request will be withdrawn and Inventory will no longer act on it. This can't be undone — file a new request if the supplies are needed again.
          </p>
          <div className="form-group">
            <label className="form-label">Reason (optional)</label>
            <textarea className="form-control" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. No longer needed" maxLength={1000} />
          </div>
        </Modal>
      )}
    </div>
  );
}
