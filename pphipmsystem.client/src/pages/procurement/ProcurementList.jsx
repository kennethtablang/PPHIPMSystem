import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { MdAdd, MdVisibility, MdSchedule, MdFileDownload, MdQrCode2, MdBalance, MdOutbox, MdWarning, MdEdit, MdCancel, MdSend, MdLocalShipping } from 'react-icons/md';
import { exportRisForm, exportPurchaseRequestForm } from '../../api/reports';
import { getRequests, getRequest, approveRequest, submitRequest, releaseRequest, getAllocation, cancelRequest } from '../../api/procurement';
import { markSeen } from '../../api/notifications';
import useOpenParam from '../../utils/useOpenParam';
import { getItems } from '../../api/inventory';
import AttachmentsPanel from '../../components/common/AttachmentsPanel';
import LabelPrintModal from '../../components/common/LabelPrintModal';
import Modal from '../../components/common/Modal';
import Pagination, { usePagination } from '../../components/common/Pagination';
import RequestFormModal from '../../components/common/RequestFormModal';
import { RequestProgress, RequestLinesTable, RequestTimeline, StageLine, UrgentBadge } from '../../components/common/RequestProgress';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import AllocationBoard from './AllocationBoard';

// Statuses where a request is waiting on someone to act; used for aging badges.
const PENDING_STATUSES = ['SubmittedByDepartment', 'SubmittedToProcurement', 'ApprovedByProcurement', 'ApprovedByInventoryOfficer', 'ReturnedForRevision', 'FullyApproved'];
// Awaiting the Inventory Officer's stock check and allocation.
const INVENTORY_STAGE = ['SubmittedToProcurement', 'ApprovedByProcurement'];
const AGING_WARN_DAYS = 7;

const daysWaiting = r => Math.floor((Date.now() - new Date(r.updatedAt ?? r.requestedAt).getTime()) / 86400000);
const isStalled = r => PENDING_STATUSES.includes(r.status) && daysWaiting(r) >= AGING_WARN_DAYS;

const qty = n => Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

export default function ProcurementList() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canCreate = ['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead'].includes(user?.role);
  const isAdmin = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);
  // Replenishment Purchase Requests: the Supply Officer (Procurement) drafts
  // them, the Administrator approves as Chief of Hospital.
  const canManagePr = isAdmin || user?.role === 'ProcurementStaff';
  // Inventory review (stock check + allocation) and release: Inventory Officer,
  // or an administrator standing in. Final approval: administrators only.
  const canInventory = isAdmin || user?.role === 'InventoryOfficer';

  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  // Which queue is shown: ward supply requests, or the storeroom's own
  // replenishment Purchase Requests. Procurement starts on its own queue.
  const [tab, setTab] = useState(() =>
    location.state?.prefillItem || location.state?.prefillItems || user?.role === 'ProcurementStaff' ? 'Replenishment' : 'DepartmentSupply');
  const isPrTab = tab === 'Replenishment';
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  // null = closed; { prefill } opens the shared request form.
  const [createModal, setCreateModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({ action: 'Approve', remarks: '' });
  // Inventory review: item allocation context (from the allocation board
  // endpoint) and the officer's per-line allocation for this request.
  const [allocInfo, setAllocInfo] = useState({});
  const [lineAlloc, setLineAlloc] = useState({});
  // True while the stock check for the open review is loading — the amounts
  // must not be shown (or approved) before they exist.
  const [allocLoading, setAllocLoading] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [shortCount, setShortCount] = useState(0);
  const [saving, setSaving] = useState(false);
  // QR label sheet for the requests currently listed — the QR encodes the
  // request number, which global search (Ctrl+K) resolves back to the request.
  const [labelModal, setLabelModal] = useState(false);
  const pager = usePagination(requests);

  const load = () => {
    setLoading(true);
    getRequests({ type: tab, ...(statusFilter ? { status: statusFilter } : {}) }).then(r => setRequests(r.data)).finally(() => setLoading(false));
  };

  const loadItems = () => getItems().then(r => setItems(r.data));
  const loadShortages = () => {
    if (canInventory) getAllocation().then(r => setShortCount(r.data.filter(i => i.isShort).length)).catch(() => {});
  };
  const refresh = () => { load(); loadItems(); loadShortages(); };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  useEffect(() => { loadItems(); loadShortages(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  useEffect(() => { load(); pager.setPage(1); }, [statusFilter, tab]);
  const itemMap = Object.fromEntries(items.map(i => [String(i.id), i]));

  // FR-3.4: pre-fill from Dashboard / Inventory "reorder" navigation.
  // Accepts a single item (prefillItem) or a batch (prefillItems with suggested quantities).
  useEffect(() => {
    const single = location.state?.prefillItem;
    const many = location.state?.prefillItems;
    if (!canManagePr || (!single && !many?.length)) return;

    const lines = (many ?? [single]).map(p => ({
      inventoryItemId: p.id,
      quantityRequested: p.suggestedQty ?? '',
      remarks: `Low stock alert — ${p.name}`,
    }));
    setTab('Replenishment');
    setCreateModal({
      replenishment: true,
      prefill: {
        justification: many?.length > 1
          ? `Replenishment request for ${many.length} low-stock items.`
          : `Reorder request for low-stock item: ${(many?.[0] ?? single).name}`,
        items: lines,
      },
    });
    navigate(location.pathname, { replace: true, state: null }); // clear state so refresh doesn't re-open
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  }, [location.state]);

  // Opening a request counts as seeing its notifications (clears the badge).
  const openView = r => { setViewModal(r); markSeen('ProcurementRequest', r.id); };

  // Notification deep link: /procurement?open=<id> switches to the right tab
  // and opens the request.
  useOpenParam(id => {
    getRequest(id)
      .then(res => {
        if (res.data.type !== tab) { setTab(res.data.type); setStatusFilter(''); }
        openView(res.data);
      })
      .catch(() => toast.error('That request could not be opened — it may have been removed.'));
  });

  const openApprove = r => {
    setViewModal(null);
    markSeen('ProcurementRequest', r.id);
    setApproveModal(r);
    setApproveForm({ action: 'Approve', remarks: '' });
    setAllocInfo({});
    setLineAlloc({});
    if (r.type !== 'Replenishment' && INVENTORY_STAGE.includes(r.status)) {
      setAllocLoading(true);
      getAllocation().then(res => {
        const byItem = Object.fromEntries(res.data.map(i => [i.inventoryItemId, i]));
        setAllocInfo(byItem);
        // Default each line to a saved allocation, else its fair share (the
        // full request whenever stock covers every department).
        const init = {};
        r.items.forEach(line => {
          const share = byItem[line.inventoryItemId]?.lines.find(l => l.procurementRequestItemId === line.id);
          init[line.id] = String(line.quantityApproved ?? share?.fairShare ?? line.quantityRequested);
        });
        setLineAlloc(init);
      }).catch(() => {
        setLineAlloc(Object.fromEntries(r.items.map(l => [l.id, String(l.quantityApproved ?? l.quantityRequested)])));
        toast.warning("Could not load other departments' requests — amounts default to the full request.");
      }).finally(() => setAllocLoading(false));
    }
  };

  const isPrReview = approveModal?.type === 'Replenishment';
  const isInventoryReview = approveModal && !isPrReview && INVENTORY_STAGE.includes(approveModal.status);
  const lineContext = line => {
    const info = allocInfo[line.inventoryItemId];
    const mine = info?.lines.find(l => l.procurementRequestItemId === line.id);
    const others = info ? info.totalRequested - line.quantityRequested : 0;
    return { info, mine, others };
  };
  // Back to the system's suggestion: the full request when stock covers
  // everyone, otherwise each department's fair share of what is available.
  const resetToSuggested = () => setLineAlloc(Object.fromEntries(approveModal.items.map(l => [l.id, String(lineContext(l).mine?.fairShare ?? l.quantityRequested)])));

  const handleRelease = async r => {
    setSaving(true);
    try {
      const res = await releaseRequest(r.id);
      toast.success(`${r.requestNumber} released to ${r.departmentName}.`);
      if (viewModal?.id === r.id) setViewModal(res.data);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to release.');
    } finally {
      setSaving(false);
    }
  };

  const submitApproval = async action => {
    if (action !== 'Approve' && !approveForm.remarks.trim()) {
      toast.error(`Add remarks so the department knows why you ${action === 'Reject' ? 'rejected' : 'returned'} it.`);
      return;
    }
    setApproveForm(p => ({ ...p, action }));
    let allocations;
    if (isInventoryReview && action === 'Approve') {
      allocations = approveModal.items.map(l => ({ procurementRequestItemId: l.id, quantityApproved: +lineAlloc[l.id] }));
      const bad = approveModal.items.find(l => !(+lineAlloc[l.id] >= 0) || +lineAlloc[l.id] > l.quantityRequested);
      if (bad) { toast.error(`${bad.itemName}: allocation must be between 0 and ${bad.quantityRequested}.`); return; }
      if (allocations.every(a => a.quantityApproved <= 0)) { toast.error('Nothing is allocated — reject or return the request instead.'); return; }
    }
    setSaving(true);
    try {
      const res = await approveRequest(approveModal.id, { action, remarks: approveForm.remarks, allocations });
      const pastTense = { Approve: 'Approved', Reject: 'Rejected', Return: 'Returned' };
      if (res.data.status === 'Released') toast.success(`Approved and released — stock moved to ${res.data.departmentName}.`);
      else if (isPrReview && res.data.status === 'FullyApproved') toast.success('Purchase Request approved — Procurement can now generate the purchase order.');
      else if (res.data.status === 'FullyApproved') toast.warning('Approved, but stock is short — Procurement has been notified to replenish.');
      else toast.success(`Request ${pastTense[action] ?? action + 'd'}.`);
      setApproveModal(null);
      refresh();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleSubmitToProcurement = async r => {
    setSaving(true);
    try {
      await submitRequest(r.id);
      toast.success(r.type === 'Replenishment' ? 'Purchase Request sent to the Chief for approval.' : 'Request submitted for inventory review.');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    setSaving(true);
    try {
      await cancelRequest(cancelModal.id, cancelReason.trim() || null);
      toast.success(`${cancelModal.requestNumber} cancelled.`);
      setCancelModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to cancel.');
    } finally {
      setSaving(false);
    }
  };

  const EDITABLE = ['SubmittedByDepartment', 'SubmittedToProcurement', 'ReturnedForRevision'];
  const SUBMITTABLE = ['SubmittedByDepartment', 'ReturnedForRevision'];

  const PR_STATUSES = [
    { value: '', label: 'All' },
    { value: 'SubmittedByDepartment', label: 'Draft' },
    { value: 'SubmittedToProcurement', label: 'For Chief Approval' },
    { value: 'FullyApproved', label: 'Approved – for PO' },
    { value: 'PurchaseOrderGenerated', label: 'PO Generated' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'ReturnedForRevision', label: 'Returned' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const DEPT_STATUSES = [
    { value: '', label: 'All' },
    { value: 'SubmittedByDepartment', label: 'Draft' },
    { value: 'SubmittedToProcurement', label: 'Inventory Review' },
    { value: 'ApprovedByInventoryOfficer', label: 'Admin Approval' },
    { value: 'FullyApproved', label: 'Awaiting Stock' },
    { value: 'Released', label: 'Released' },
    { value: 'Received', label: 'Received' },
    { value: 'ReturnedForRevision', label: 'Returned' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'PurchaseOrderGenerated', label: 'PO Generated' },
    { value: 'Delivered', label: 'Delivered' },
  ];
  const STATUSES = isPrTab ? PR_STATUSES : DEPT_STATUSES;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isPrTab ? 'Purchase Requests' : 'Department Supply Requests'}</h1>
          <p className="page-subtitle">
            {isPrTab
              ? 'Storeroom replenishment: Supply Officer drafts → Chief of Hospital approves → purchase order → delivery to central stock'
              : 'Inventory review & allocation → Administrator approval → automatic release to department stock'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canInventory && !isPrTab && (
            <button className="btn btn-secondary" onClick={() => setBoardOpen(true)} title="Split limited stock fairly across competing department requests">
              <MdBalance size={16} /> Stock Allocation
              {shortCount > 0 && <span className="badge badge-amber" style={{ marginLeft: 6 }}>{shortCount} short</span>}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setLabelModal(true)}
            disabled={requests.length === 0}
            title="Print QR labels for the requests shown — scan to pull one up instantly"
          >
            <MdQrCode2 size={16} /> QR Labels
          </button>
          {isPrTab ? canManagePr && (
            <button className="btn btn-primary" onClick={() => setCreateModal({ replenishment: true })}>
              <MdAdd size={16} /> New Purchase Request
            </button>
          ) : canCreate && (
            <button className="btn btn-primary" onClick={() => setCreateModal({})}>
              <MdAdd size={16} /> New Request
            </button>
          )}
        </div>
      </div>

      <div className="pl-tabs">
        <style>{TABS_CSS}</style>
        {[['DepartmentSupply', 'Department Requests'], ['Replenishment', 'Purchase Requests (Replenishment)']].map(([key, label]) => (
          <button key={key} className={`pl-tab ${tab === key ? 'on' : ''}`} onClick={() => { setTab(key); setStatusFilter(''); }}>
            {label}
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} className={`btn btn-sm ${statusFilter === s.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s.value)} style={{ whiteSpace: 'nowrap' }}>
            {s.label}
          </button>
        ))}
      </div>

      {!loading && requests.some(isStalled) && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MdSchedule size={16} />
          {requests.filter(isStalled).length} request{requests.filter(isStalled).length > 1 ? 's have' : ' has'} been
          waiting more than {AGING_WARN_DAYS} days without action.
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
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
              ) : pager.pageItems.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>
                    {r.requestNumber}
                    {r.isUrgent && <div style={{ marginTop: 3 }}><UrgentBadge request={r} /></div>}
                  </td>
                  <td>{r.departmentName}</td>
                  <td>{r.requestedByName || r.requestedByFullName}</td>
                  <td><span className="badge badge-blue">{r.items?.length ?? 0} items</span></td>
                  <td>
                    <StatusBadge status={r.status} type={r.type} />
                    <StageLine request={r} />
                    {isStalled(r) && (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: daysWaiting(r) >= 14 ? '#dc2626' : '#d97706' }}>
                        <MdSchedule size={12} /> waiting {daysWaiting(r)}d
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(r)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {r.type === 'Replenishment' ? (
                        <>
                          {canManagePr && EDITABLE.includes(r.status) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setCreateModal({ request: r })}><MdEdit size={14} /> Edit</button>
                          )}
                          {canManagePr && SUBMITTABLE.includes(r.status) && (
                            <button className="btn btn-success btn-sm" onClick={() => handleSubmitToProcurement(r)} disabled={saving}><MdSend size={14} /> Submit</button>
                          )}
                          {isAdmin && INVENTORY_STAGE.includes(r.status) && (
                            <button className="btn btn-primary btn-sm" onClick={() => openApprove(r)}>Chief Approval</button>
                          )}
                          {r.status === 'FullyApproved' && ['SuperAdmin', 'HospitalAdministrator', 'ProcurementStaff'].includes(user?.role) && (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/purchase-orders', { state: { generateFor: r.id } })}>
                              <MdLocalShipping size={14} /> Create PO
                            </button>
                          )}
                          {canManagePr && EDITABLE.includes(r.status) && (
                            <button className="btn btn-danger btn-sm" onClick={() => { setCancelReason(''); setCancelModal(r); }}><MdCancel size={14} /> Cancel</button>
                          )}
                        </>
                      ) : (
                        <>
                          {canInventory && INVENTORY_STAGE.includes(r.status) && (
                            <button className="btn btn-success btn-sm" onClick={() => openApprove(r)}>
                              Review &amp; Allocate
                            </button>
                          )}
                          {isAdmin && r.status === 'ApprovedByInventoryOfficer' && (
                            <button className="btn btn-primary btn-sm" onClick={() => openApprove(r)}>
                              Final Approve
                            </button>
                          )}
                          {canInventory && r.status === 'FullyApproved' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleRelease(r)} disabled={saving} title="Release now that stock is available">
                              <MdOutbox size={14} /> Release
                            </button>
                          )}
                          {SUBMITTABLE.includes(r.status) && ['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead'].includes(user?.role) && (
                            <button className="btn btn-success btn-sm" onClick={() => handleSubmitToProcurement(r)} disabled={saving}>
                              Submit
                            </button>
                          )}
                        </>
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

      {labelModal && (
        <LabelPrintModal
          title="Procurement Request QR Labels"
          onClose={() => setLabelModal(false)}
          labels={requests.map(r => ({
            qr: r.requestNumber,
            title: r.departmentName,
            subtitle: r.requestNumber,
            meta: `${r.items?.length ?? 0} item(s) · ${new Date(r.requestedAt).toLocaleDateString('en-PH')}`,
          }))}
        />
      )}

      {createModal && (
        <RequestFormModal
          request={createModal.request ?? null}
          prefill={createModal.prefill}
          replenishment={!!createModal.replenishment}
          onClose={() => setCreateModal(null)}
          onSaved={() => { setCreateModal(null); refresh(); }}
        />
      )}

      {boardOpen && (
        <AllocationBoard
          onClose={() => setBoardOpen(false)}
          onSaved={() => { setBoardOpen(false); refresh(); }}
        />
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title={`Request: ${viewModal.requestNumber}`} onClose={() => setViewModal(null)} size="modal-lg"
          footer={
            <>
              {viewModal.type !== 'Replenishment' && <button
                className="btn btn-secondary"
                onClick={() => exportRisForm(viewModal.id).then(() => toast.success('RIS downloaded.')).catch(() => toast.error('Failed to export RIS.'))}
                title="Requisition and Issue Slip (Excel)"
              >
                <MdFileDownload size={15} /> RIS
              </button>}
              <button
                className="btn btn-secondary"
                onClick={() => exportPurchaseRequestForm(viewModal.id).then(() => toast.success('Purchase Request downloaded.')).catch(() => toast.error('Failed to export PR.'))}
                title="Purchase Request form (Excel)"
              >
                <MdFileDownload size={15} /> PR Form
              </button>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)} style={{ marginLeft: 'auto' }}>Close</button>
              {/* The one next step for this user, so a notification is one click from acting. */}
              {viewModal.type === 'Replenishment' ? (
                <>
                  {isAdmin && INVENTORY_STAGE.includes(viewModal.status) && (
                    <button className="btn btn-primary" onClick={() => openApprove(viewModal)}>Chief Approval</button>
                  )}
                  {viewModal.status === 'FullyApproved' && ['SuperAdmin', 'HospitalAdministrator', 'ProcurementStaff'].includes(user?.role) && (
                    <button className="btn btn-primary" onClick={() => navigate('/purchase-orders', { state: { generateFor: viewModal.id } })}>
                      <MdLocalShipping size={15} /> Create PO
                    </button>
                  )}
                </>
              ) : (
                <>
                  {canInventory && INVENTORY_STAGE.includes(viewModal.status) && (
                    <button className="btn btn-primary" onClick={() => openApprove(viewModal)}>Review &amp; Allocate</button>
                  )}
                  {isAdmin && viewModal.status === 'ApprovedByInventoryOfficer' && (
                    <button className="btn btn-primary" onClick={() => openApprove(viewModal)}>Final Approve</button>
                  )}
                  {canInventory && viewModal.status === 'FullyApproved' && (
                    <button className="btn btn-primary" onClick={() => handleRelease(viewModal)} disabled={saving}>
                      <MdOutbox size={15} /> Release
                    </button>
                  )}
                </>
              )}
            </>
          }
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className="grid-2" style={{ flex: 1 }}>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department</span><br /><strong>{viewModal.departmentName}</strong></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</span><br /><StatusBadge status={viewModal.status} type={viewModal.type} /></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Requested By</span><br /><strong>{viewModal.requestedByName || viewModal.requestedByFullName}</strong></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date</span><br /><strong>{new Date(viewModal.requestedAt).toLocaleDateString('en-PH')}</strong></div>
              {viewModal.type === 'Replenishment' && (viewModal.fund || viewModal.section || viewModal.fpp) && (
                <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {[['Fund', viewModal.fund], ['Section', viewModal.section], ['FPP', viewModal.fpp]]
                    .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </div>
              )}
            </div>
            {/* Scannable request number — staple to the printed PR/RIS so the
                paper copy can be scanned straight back into global search. */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ padding: 8, background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <QRCodeSVG value={viewModal.requestNumber} size={84} />
              </div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 4 }}>
                {viewModal.requestNumber}
              </div>
            </div>
          </div>
          <RequestProgress status={viewModal.status} type={viewModal.type} />
          {viewModal.isUrgent && (
            <div className="alert alert-danger" style={{ fontSize: 13 }}>
              <strong>URGENT / EMERGENCY:</strong>&nbsp;{viewModal.urgentReason}
            </div>
          )}
          <div className="alert alert-info"><strong>Purpose:</strong>&nbsp;{viewModal.justification}</div>
          <div>
            <label className="form-label">Items Requested</label>
            <RequestLinesTable request={viewModal} itemMap={itemMap} showCost />
          </div>
          <AttachmentsPanel requestId={viewModal.id} />
          <RequestTimeline request={viewModal} />
        </Modal>
      )}

      {cancelModal && (
        <Modal title={`Cancel ${cancelModal.requestNumber}?`} onClose={() => setCancelModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Keep</button>
              <button className="btn btn-danger" onClick={confirmCancel} disabled={saving}>{saving ? 'Cancelling…' : 'Cancel Purchase Request'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Reason (optional)</label>
            <textarea className="form-control" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} maxLength={1000} />
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <Modal
          title={`${isPrReview ? 'Chief Approval' : isInventoryReview ? 'Review Request' : 'Final Approval'}: ${approveModal.requestNumber} — ${approveModal.departmentName}`}
          onClose={() => setApproveModal(null)}
          size={isPrReview || approveModal.status === 'ApprovedByInventoryOfficer' ? 'modal-xl' : isInventoryReview ? 'modal-lg' : ''}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setApproveModal(null)} disabled={saving}>Cancel</button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={() => submitApproval('Return')} disabled={saving} title="Send back to the requester to revise">
                {saving && approveForm.action === 'Return' ? 'Returning…' : 'Return for Revision'}
              </button>
              <button className="btn btn-danger" onClick={() => submitApproval('Reject')} disabled={saving}>
                {saving && approveForm.action === 'Reject' ? 'Rejecting…' : 'Reject'}
              </button>
              <button className="btn btn-primary" onClick={() => submitApproval('Approve')} disabled={saving || (isInventoryReview && allocLoading)}>
                {saving && approveForm.action === 'Approve' ? 'Approving…' : 'Approve'}
              </button>
            </>
          }
        >
          {approveModal.isUrgent && (
            <div className="alert alert-danger" style={{ fontSize: 13 }}>
              <strong>URGENT / EMERGENCY request:</strong>&nbsp;{approveModal.urgentReason}
              <div style={{ fontSize: 11, marginTop: 4 }}>If the urgency is not justified, return the request with your remarks.</div>
            </div>
          )}
          {isInventoryReview && allocLoading && (
            <div className="loading-center" style={{ padding: '28px 0' }}>
              <div className="spinner" />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Checking stock and other departments' requests…</span>
            </div>
          )}

          {isInventoryReview && !allocLoading && (() => {
            // Per line: how much to give and a plain-language note on why.
            const rows = approveModal.items.map(l => {
              const { info, mine, others } = lineContext(l);
              const live = itemMap[String(l.inventoryItemId)];
              const available = info?.available ?? live?.quantityOnHand ?? 0;
              const give = +lineAlloc[l.id] || 0;
              const suggested = mine?.fairShare ?? l.quantityRequested;
              return { l, info, others, available, give, suggested, toBuy: Math.max(0, give - available) };
            });
            const shared = rows.some(r => r.info?.isShort && r.others > 0);
            const changed = rows.some(r => r.give !== r.suggested);
            const full = rows.filter(r => r.give >= r.l.quantityRequested).length;
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0, flex: 1 }}>How much to give</label>
                  {changed && <button className="btn btn-ghost btn-sm" onClick={resetToSuggested}>Reset to suggested</button>}
                </div>
                {shared && (
                  <div className="alert alert-warning" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                    <MdWarning size={16} style={{ flexShrink: 0 }} />
                    <span>Not enough stock for every department, so the amounts below are split fairly. You can change them.</span>
                  </div>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Requested</th>
                        <th title="On hand, minus stock already promised to approved requests that haven't been released">Available</th>
                        <th style={{ width: 230 }}>Give</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ l, info, others, available, give, suggested, toBuy }) => (
                        <tr key={l.id}>
                          <td>
                            <strong>{l.itemName}</strong> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({l.unit})</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{qty(l.quantityRequested)}</td>
                          <td>{qty(available)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                className="form-control" type="number" min="0" max={l.quantityRequested} step="1"
                                value={lineAlloc[l.id] ?? ''}
                                onChange={e => setLineAlloc(p => ({ ...p, [l.id]: e.target.value }))}
                                style={{ padding: '6px 8px', width: 90 }}
                              />
                              <span className={`badge ${give >= l.quantityRequested ? 'badge-green' : give > 0 ? 'badge-amber' : 'badge-red'}`}>
                                {give >= l.quantityRequested ? 'Full' : give > 0 ? 'Partial' : 'None'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, marginTop: 4, color: toBuy > 0 ? 'var(--red-500)' : 'var(--text-muted)' }}>
                              {toBuy > 0
                                ? `${qty(toBuy)} more must be bought — release waits for stock`
                                : info?.isShort && others > 0
                                  ? `Shared with ${info.lines.length - 1} other dept · fair share ${qty(suggested)}`
                                  : give < l.quantityRequested && available < l.quantityRequested
                                    ? `Only ${qty(available)} available`
                                    : 'Enough stock'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  {full === rows.length
                    ? 'Every item will be given in full.'
                    : `${full} of ${rows.length} item(s) in full — the department is told which quantities were reduced.`}
                </div>
              </div>
            );
          })()}

          {isPrReview && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Items to Purchase</label>
              <RequestLinesTable request={approveModal} itemMap={itemMap} showCost />
              <div className="alert alert-info" style={{ marginTop: 10, fontSize: 12 }}>
                <strong>Purpose:</strong>&nbsp;{approveModal.justification}. Approving hands the PR to Procurement to raise the purchase order; the delivery restocks central inventory.
              </div>
            </div>
          )}

          {approveModal.status === 'ApprovedByInventoryOfficer' && (() => {
            const short = approveModal.items.filter(l => (itemMap[String(l.inventoryItemId)]?.quantityOnHand ?? 0) < (l.quantityApproved ?? l.quantityRequested));
            return (
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Allocated by Inventory</label>
                <RequestLinesTable request={approveModal} itemMap={itemMap} />
                <div className={`alert ${short.length ? 'alert-warning' : 'alert-info'}`} style={{ marginTop: 10, fontSize: 12 }}>
                  {short.length
                    ? <>Stock is currently short for {short.map(l => l.itemName).join(', ')}. Approving will notify Procurement to replenish; Inventory releases it once stock arrives.</>
                    : <>Stock is sufficient. Approving will <strong>automatically</strong> deduct these quantities from central inventory and add them to {approveModal.departmentName}'s stock — no separate issuance needed.</>}
                </div>
              </div>
            );
          })()}

          <div className="form-group">
            <label className="form-label">Remarks <span style={{ textTransform: 'none', fontWeight: 500, color: 'var(--text-muted)' }}>(required to reject or return)</span></label>
            <textarea className="form-control" value={approveForm.remarks} onChange={e => setApproveForm(p => ({ ...p, remarks: e.target.value }))} rows={2} placeholder="Optional when approving" />
          </div>
        </Modal>
      )}
    </div>
  );
}

const TABS_CSS = `
.pl-tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid var(--border); }
.pl-tab { border: 0; background: none; font: inherit; font-size: 13px; font-weight: 600; color: var(--text-muted); padding: 10px 16px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.pl-tab:hover { color: var(--text-primary); }
.pl-tab.on { color: var(--text-accent); border-bottom-color: var(--green-500); }
`;
