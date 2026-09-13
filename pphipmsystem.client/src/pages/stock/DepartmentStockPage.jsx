import { useEffect, useState } from 'react';
import { MdWarehouse, MdSearch, MdRemoveCircleOutline, MdSwapHoriz } from 'react-icons/md';
import { getDepartmentStock, recordConsumption, transferStock } from '../../api/departmentStock';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import SearchSelect from '../../components/common/SearchSelect';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { toast } from '../../components/common/Toast';
import { fmtDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

// Department-held stock balances: what has been issued to each ward/unit and
// not yet returned. Department heads see their own department; everyone else
// can browse any (or all) departments.
export default function DepartmentStockPage() {
  const { user } = useAuth();
  const isDeptHead = user?.role === 'DepartmentHead';
  // Matches the DepartmentStockController.Consume role list. Department heads
  // are scoped to their own ward by the server regardless of what is sent.
  const canConsume = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer', 'DepartmentHead']
    .includes(user?.role);
  // Same role list for transfers; a department head may only send stock out of
  // their own ward, which the server enforces from the departmentId claim.
  const canTransfer = canConsume;

  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  // Ward-usage entry: the ledger row being drawn down; null = modal closed.
  const [consumeRow, setConsumeRow] = useState(null);
  const [consumeForm, setConsumeForm] = useState({ quantity: '', remarks: '' });
  // Ward-to-ward handover: the row being sent, and where it is going.
  const [transferRow, setTransferRow] = useState(null);
  const [transferForm, setTransferForm] = useState({ toDepartmentId: '', quantity: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = deptId => {
    setLoading(true);
    getDepartmentStock(deptId || null)
      .then(r => setRows(r.data))
      .catch(() => toast.error('Failed to load department stock.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Department heads need the list too — not to filter (they are locked to
    // their own ward) but to pick a destination when transferring stock out.
    getDepartments().then(r => setDepartments(r.data)).catch(() => {});
    load(null); // server scopes department heads automatically
  }, []);

  const filtered = rows.filter(r =>
    !search ||
    r.itemName.toLowerCase().includes(search.toLowerCase()) ||
    (r.itemCode ?? '').toLowerCase().includes(search.toLowerCase()));
  const pager = usePagination(filtered);

  const showDeptColumn = !isDeptHead && !deptFilter;

  const openConsume = row => {
    setConsumeRow(row);
    setConsumeForm({ quantity: '', remarks: '' });
  };

  const openTransfer = row => {
    setTransferRow(row);
    setTransferForm({ toDepartmentId: '', quantity: '', remarks: '' });
  };

  const submitTransfer = async () => {
    const qty = Number(transferForm.quantity);
    if (!transferForm.toDepartmentId) { toast.error('Choose a receiving department.'); return; }
    if (!qty || qty <= 0) { toast.error('Enter a quantity greater than 0.'); return; }
    if (qty > transferRow.quantity) {
      toast.error(`${transferRow.departmentName} only holds ${transferRow.quantity} ${transferRow.unit}.`);
      return;
    }

    setSaving(true);
    try {
      await transferStock({
        fromDepartmentId: transferRow.departmentId,
        toDepartmentId: +transferForm.toDepartmentId,
        inventoryItemId: transferRow.inventoryItemId,
        quantity: qty,
        remarks: transferForm.remarks || null,
      });
      const toName = departments.find(d => d.id === +transferForm.toDepartmentId)?.name ?? 'the receiving department';
      toast.success(`Transferred ${qty} ${transferRow.unit} of ${transferRow.itemName} to ${toName}.`);
      setTransferRow(null);
      load(deptFilter || null);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to transfer stock.');
    } finally {
      setSaving(false);
    }
  };

  const submitConsume = async () => {
    const qty = Number(consumeForm.quantity);
    if (!qty || qty <= 0) { toast.error('Enter a quantity greater than 0.'); return; }
    if (qty > consumeRow.quantity) {
      toast.error(`${consumeRow.departmentName} only holds ${consumeRow.quantity} ${consumeRow.unit}.`);
      return;
    }

    setSaving(true);
    try {
      await recordConsumption({
        departmentId: consumeRow.departmentId,
        inventoryItemId: consumeRow.inventoryItemId,
        quantity: qty,
        remarks: consumeForm.remarks || null,
      });
      toast.success(`Recorded ${qty} ${consumeRow.unit} of ${consumeRow.itemName} used.`);
      setConsumeRow(null);
      load(deptFilter || null);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to record consumption.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Stock</h1>
          <p className="page-subtitle">
            {isDeptHead
              ? `Items currently held by ${user?.departmentName ?? 'your department'}`
              : 'Stock issued to wards and units that has not been returned'}
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search by item name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        {!isDeptHead && (
          <SearchSelect
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); load(e.target.value); }}
            placeholder="All departments"
            style={{ minWidth: 240 }}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
          />
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {showDeptColumn && <th>Department</th>}
                <th>Item</th>
                <th>Code</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Quantity Held</th>
                <th>Last Movement</th>
                {canConsume && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={(showDeptColumn ? 6 : 5) + (canConsume ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <MdWarehouse size={28} style={{ opacity: .4 }} />
                    <div style={{ marginTop: 8 }}>
                      No department-held stock yet. Issue a movement with a destination department to start tracking.
                    </div>
                  </td>
                </tr>
              ) : pager.pageItems.map(r => (
                <tr key={r.id}>
                  {showDeptColumn && <td style={{ fontWeight: 500 }}>{r.departmentName}</td>}
                  <td style={{ fontWeight: showDeptColumn ? 400 : 500 }}>{r.itemName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.itemCode ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.unit}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.quantity}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(r.updatedAt)}</td>
                  {canConsume && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openConsume(r)}
                          title="Record stock this ward has used up"
                          style={{ fontSize: 11 }}
                        >
                          <MdRemoveCircleOutline size={13} /> Record Usage
                        </button>
                        {canTransfer && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openTransfer(r)}
                            title="Hand this stock over to another department"
                            style={{ fontSize: 11 }}
                          >
                            <MdSwapHoriz size={13} /> Transfer
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
        <Pagination {...pager} />
        </>
      )}

      {consumeRow && (
        <Modal
          title={`Record Usage — ${consumeRow.itemName}`}
          onClose={() => setConsumeRow(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConsumeRow(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitConsume} disabled={saving}>
                {saving ? 'Recording…' : 'Record Usage'}
              </button>
            </>
          }
        >
          <div className="alert alert-info" style={{ display: 'block', fontSize: 12 }}>
            <strong>{consumeRow.departmentName}</strong> currently holds{' '}
            <strong>{consumeRow.quantity} {consumeRow.unit}</strong> of {consumeRow.itemName}.
          </div>

          <div className="form-group">
            <label className="form-label">Quantity Used ({consumeRow.unit}) *</label>
            <input
              className="form-control"
              type="number"
              min="0.01"
              max={consumeRow.quantity}
              step="0.01"
              value={consumeForm.quantity}
              onChange={e => setConsumeForm(p => ({ ...p, quantity: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              className="form-control"
              rows={2}
              maxLength={500}
              value={consumeForm.remarks}
              onChange={e => setConsumeForm(p => ({ ...p, remarks: e.target.value }))}
              placeholder="e.g. Used during the morning shift…"
            />
          </div>

          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            This reduces <strong>{consumeRow.departmentName}'s balance only</strong>. Central stock on
            hand does not change — the item already left the storeroom when it was issued, and it was
            counted for demand forecasting at that point. Recording usage here keeps the ward's figures
            honest without double-counting.
          </div>
        </Modal>
      )}

      {transferRow && (
        <Modal
          title={`Transfer — ${transferRow.itemName}`}
          onClose={() => setTransferRow(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setTransferRow(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitTransfer} disabled={saving}>
                {saving ? 'Transferring…' : 'Transfer Stock'}
              </button>
            </>
          }
        >
          <div className="alert alert-info" style={{ display: 'block', fontSize: 12 }}>
            <strong>{transferRow.departmentName}</strong> currently holds{' '}
            <strong>{transferRow.quantity} {transferRow.unit}</strong> of {transferRow.itemName}.
          </div>

          <div className="form-group">
            <label className="form-label">Receiving Department *</label>
            <SearchSelect
              value={transferForm.toDepartmentId}
              onChange={e => setTransferForm(p => ({ ...p, toDepartmentId: e.target.value }))}
              placeholder="Search departments…"
              options={departments
                .filter(d => d.id !== transferRow.departmentId && d.isActive !== false)
                .map(d => ({ value: d.id, label: d.name }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Transfer ({transferRow.unit}) *</label>
            <input
              className="form-control"
              type="number"
              min="0.01"
              max={transferRow.quantity}
              step="0.01"
              value={transferForm.quantity}
              onChange={e => setTransferForm(p => ({ ...p, quantity: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              className="form-control"
              rows={2}
              maxLength={500}
              value={transferForm.remarks}
              onChange={e => setTransferForm(p => ({ ...p, remarks: e.target.value }))}
              placeholder="e.g. Lent to cover a shortage on the night shift…"
            />
          </div>

          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            The units move <strong>straight from one ward to the other</strong> — they never come back
            through the storeroom, so central stock on hand, batches, and the consumption figures
            behind forecasting are all unchanged. The handover is recorded as a single movement you
            can void later, which walks the stock back to {transferRow.departmentName}.
          </div>
        </Modal>
      )}
    </div>
  );
}
