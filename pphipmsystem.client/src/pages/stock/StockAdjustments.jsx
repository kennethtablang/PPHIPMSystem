import { useEffect, useState } from 'react';
import { MdAdd, MdChecklist, MdSearch } from 'react-icons/md';
import { getAdjustments, approveAdjustment, submitCycleCount } from '../../api/stockAdjustments';
import { getItems } from '../../api/inventory';
import AdjustQuantityModal from '../../components/common/AdjustQuantityModal';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { fmtDateTime } from '../../utils/format';
import StockHistoryTabs from './StockHistoryTabs';

// Adjustment history (Revision 4). Corrections are made directly — from the
// Adjust button on the Items list, here, or with a cycle count — and apply at
// once. Each row is the record: original quantity, adjusted quantity, the
// reason, who made it and when. Requests filed under the old approval flow
// can still be reviewed by an administrator.
export default function StockAdjustments() {
  const { user } = useAuth();
  const canCreate = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);
  const canApprove = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);

  const [list, setList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  // New adjustment: pick the item, then the shared Adjust Quantity dialog.
  const [pickModal, setPickModal] = useState(false);
  const [pickId, setPickId] = useState('');
  const [adjustItem, setAdjustItem] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({ approved: true, remarks: '' });
  const [saving, setSaving] = useState(false);
  // Cycle count worksheet: counted quantities keyed by item id; blank = not counted.
  const [countModal, setCountModal] = useState(false);
  const [counts, setCounts] = useState({});
  const [countSearch, setCountSearch] = useState('');
  const [countReason, setCountReason] = useState('Physical count / cycle count');

  const load = () => {
    setLoading(true);
    const p = statusFilter ? { status: statusFilter } : {};
    getAdjustments(p).then(r => setList(r.data)).finally(() => setLoading(false));
  };

  const loadItems = () => getItems().then(r => setItems(r.data));
  useEffect(() => { loadItems(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  useEffect(() => { load(); }, [statusFilter]);

  const startAdjust = () => {
    const it = items.find(x => x.id === +pickId);
    if (!it) { toast.error('Choose an item.'); return; }
    setPickModal(false);
    setAdjustItem(it);
  };

  const openCycleCount = () => {
    setCounts({});
    setCountSearch('');
    setCountReason('Physical count / cycle count');
    setCountModal(true);
  };

  // Lines actually counted (non-blank), with their variance against records.
  const countedLines = items
    .filter(i => counts[i.id] !== undefined && counts[i.id] !== '')
    .map(i => ({ item: i, counted: Number(counts[i.id]) }));
  const varianceLines = countedLines.filter(l => !Number.isNaN(l.counted) && l.counted !== l.item.quantityOnHand);

  const submitCount = async () => {
    if (!countReason.trim()) { toast.error('A reason is required.'); return; }
    if (countedLines.some(l => Number.isNaN(l.counted) || l.counted < 0)) {
      toast.error('Counted quantities must be valid non-negative numbers.');
      return;
    }
    if (countedLines.length === 0) { toast.error('Enter at least one counted quantity.'); return; }
    setSaving(true);
    try {
      const { data } = await submitCycleCount({
        reason: countReason.trim(),
        lines: countedLines.map(l => ({ inventoryItemId: l.item.id, physicalCount: l.counted })),
      });
      toast.success(`${data.adjustmentsCreated} item(s) corrected; ${data.unchangedItems} item(s) matched the records.`);
      setCountModal(false);
      load();
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to submit the count.');
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
          <h1 className="page-title">Stock History</h1>
          <p className="page-subtitle">Every quantity correction — original and adjusted quantity, reason, who made it and when</p>
        </div>
        {canCreate && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={openCycleCount} title="Count many items at once">
              <MdChecklist size={16} /> Cycle Count
            </button>
            <button className="btn btn-primary" onClick={() => { setPickId(''); setPickModal(true); }}>
              <MdAdd size={16} /> Adjust an Item
            </button>
          </div>
        )}
      </div>

      <StockHistoryTabs />

      {list.some(a => a.status === 'Pending') && (
        <div className="filter-bar">
          {['', 'Pending'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >{s ? 'Old requests awaiting review' : 'All'}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Original Qty</th>
                <th>Adjusted Qty</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Adjusted By</th>
                {canApprove && list.some(a => a.status === 'Pending') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No adjustments found.</td></tr>
              ) : list.map(a => (
                <tr key={a.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(a.requestedAt)}</td>
                  <td style={{ fontWeight: 500 }}>
                    {a.itemName}
                    {a.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{a.itemCode}</div>}
                  </td>
                  <td>{a.recordedQuantity}</td>
                  <td style={{ fontWeight: 600 }}>{a.physicalCount}</td>
                  <td style={{ fontWeight: 700, color: a.variance > 0 ? '#059669' : a.variance < 0 ? '#dc2626' : 'inherit' }}>
                    {a.variance > 0 ? '+' : ''}{a.variance}
                  </td>
                  <td style={{ maxWidth: 260, color: 'var(--text-secondary)', fontSize: 12 }}>{a.reason}</td>
                  <td>
                    {a.requestedByFullName}
                    {a.status !== 'Approved' && <div style={{ marginTop: 3 }}><StatusBadge status={a.status} /></div>}
                    {a.approvedByFullName && a.approvedByUserId !== a.requestedByUserId && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>approved by {a.approvedByFullName}</div>
                    )}
                  </td>
                  {canApprove && list.some(x => x.status === 'Pending') && (
                    <td>
                      {a.status === 'Pending' && (a.requestedByUserId === user?.userId ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title="You filed this correction — another approver must review it">
                          Awaiting another approver
                        </span>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => { setApproveModal(a); setApproveForm({ approved: true, remarks: '' }); }}>
                          Review
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {countModal && (
        <Modal
          title="Cycle Count Worksheet"
          onClose={() => setCountModal(false)}
          size="modal-xl"
          footer={
            <>
              <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                {countedLines.length} counted · {varianceLines.length} with variance
              </span>
              <button className="btn btn-secondary" onClick={() => setCountModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCount} disabled={saving || countedLines.length === 0}>
                {saving ? 'Saving…' : `Apply ${varianceLines.length} Correction(s)`}
              </button>
            </>
          }
        >
          <div className="alert alert-info" style={{ fontSize: 12 }}>
            Enter the physically counted quantity for each item you checked — leave the rest blank.
            Items matching the recorded quantity are left as they are; every difference is corrected
            immediately and recorded here with the reason below.
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <MdSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" placeholder="Filter items…" value={countSearch} onChange={e => setCountSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 260 }}>
              <input className="form-control" value={countReason} onChange={e => setCountReason(e.target.value)} maxLength={500} placeholder="Count reason (applies to all corrections) *" />
            </div>
          </div>

          <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>Item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Recorded</th><th style={{ width: 140 }}>Counted</th><th style={{ textAlign: 'right' }}>Variance</th></tr>
              </thead>
              <tbody>
                {items
                  .filter(i => i.isActive !== false)
                  .filter(i => !countSearch || i.name.toLowerCase().includes(countSearch.toLowerCase()) || (i.itemCode ?? '').toLowerCase().includes(countSearch.toLowerCase()))
                  .map(i => {
                    const raw = counts[i.id] ?? '';
                    const counted = raw === '' ? null : Number(raw);
                    const diff = counted === null || Number.isNaN(counted) ? null : counted - i.quantityOnHand;
                    return (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{i.name}</div>
                          {i.itemCode && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{i.itemCode}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.quantityOnHand}</td>
                        <td>
                          <input
                            className="form-control"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="—"
                            value={raw}
                            onChange={e => setCounts(p => ({ ...p, [i.id]: e.target.value }))}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: diff === null || diff === 0 ? 'var(--text-muted)' : diff > 0 ? '#059669' : '#dc2626' }}>
                          {diff === null ? '—' : diff === 0 ? 'Match' : `${diff > 0 ? '+' : ''}${diff}`}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {pickModal && (
        <Modal
          title="Adjust an Item"
          onClose={() => setPickModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPickModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={startAdjust} disabled={!pickId}>Next</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Inventory Item *</label>
            <SearchSelect
              value={pickId}
              onChange={e => setPickId(e.target.value)}
              placeholder="Search items…"
              options={items.filter(i => i.isActive !== false).map(i => ({ value: i.id, label: i.name, sublabel: `${i.itemCode ? `${i.itemCode} · ` : ''}Current: ${i.quantityOnHand} ${i.unit}` }))}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Tip: you can also adjust straight from the <strong>Adjust</strong> button on the Stock Items list.
          </div>
        </Modal>
      )}

      {adjustItem && (
        <AdjustQuantityModal item={adjustItem} onClose={() => setAdjustItem(null)} onDone={() => { load(); loadItems(); }} />
      )}

      {approveModal && (
        <Modal
          title={`Review Old Adjustment Request — ${approveModal.itemName}`}
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Filed by <strong>{approveModal.requestedByFullName}</strong> on {new Date(approveModal.requestedAt).toLocaleDateString('en-PH')}.
            Approving as Head of Property &amp; Supply applies the variance to stock; rejecting leaves stock unchanged.
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
