import { useEffect, useState } from 'react';
import { MdAccountBalanceWallet, MdEdit, MdDelete, MdWarningAmber, MdFileDownload } from 'react-icons/md';
import { getBudgets, saveBudget, deleteBudget } from '../../api/departmentBudgets';
import { exportDepartmentBudgets } from '../../api/reports';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { fmtDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const peso = n => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Fiscal year = calendar year, matching the LGU annual appropriation cycle.
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// Colour the utilisation bar by how close the department is to its ceiling.
const barColor = pct => (pct >= 100 ? '#dc2626' : pct >= 90 ? '#d97706' : 'var(--green-600)');

export default function DepartmentBudgetsPage() {
  const { user } = useAuth();
  const canEdit = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);
  const isDeptHead = user?.role === 'DepartmentHead';

  const [year, setYear] = useState(CURRENT_YEAR);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // the row being edited
  const [form, setForm] = useState({ amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = y => {
    setLoading(true);
    getBudgets(y)
      .then(r => setRows(r.data))
      .catch(() => toast.error('Failed to load budgets.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(year); }, [year]);

  const openEdit = row => {
    setModal(row);
    setForm({ amount: row.hasBudget ? String(row.amount) : '', notes: row.notes ?? '' });
  };

  const save = async () => {
    const amount = Number(form.amount);
    if (form.amount === '' || Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a budget amount of 0 or more.');
      return;
    }
    setSaving(true);
    try {
      await saveBudget({
        departmentId: modal.departmentId,
        fiscalYear: year,
        amount,
        notes: form.notes || null,
      });
      toast.success(`FY${year} budget saved for ${modal.departmentName}.`);
      setModal(null);
      load(year);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async row => {
    if (!confirm(`Remove ${row.departmentName}'s FY${year} budget? The department becomes unbudgeted — purchase orders for it stop being checked.`)) return;
    try {
      await deleteBudget(row.id);
      toast.success('Budget removed.');
      load(year);
    } catch {
      toast.error('Failed to remove budget.');
    }
  };

  const budgeted = rows.filter(r => r.hasBudget);
  const totals = budgeted.reduce(
    (a, r) => ({ amount: a.amount + r.amount, committed: a.committed + r.committed }),
    { amount: 0, committed: 0 });
  const overspent = budgeted.filter(r => r.committed > r.amount);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Budgets</h1>
          <p className="page-subtitle">
            {isDeptHead
              ? `Your department's appropriation and spend for FY${year}`
              : 'Annual appropriation per department, measured against purchase orders raised'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isDeptHead && (
            <button
              className="btn btn-secondary"
              onClick={async () => {
                setExporting(true);
                try {
                  await exportDepartmentBudgets(year);
                  toast.success('Budget utilisation exported.');
                } catch { toast.error('Failed to export budgets.'); }
                finally { setExporting(false); }
              }}
              disabled={exporting}
              title="Appropriation vs. committed spend for every department this fiscal year"
            >
              <MdFileDownload size={16} /> {exporting ? 'Exporting…' : 'Export'}
            </button>
          )}
          <select className="form-control" style={{ width: 130 }} value={year} onChange={e => setYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
          </select>
        </div>
      </div>

      {!isDeptHead && (
        <div className="grid-stat" style={{ marginBottom: 20 }}>
          <div className="stat-card green">
            <div className="stat-value" style={{ fontSize: 20 }}>{peso(totals.amount)}</div>
            <div className="stat-label">Total Appropriated ({budgeted.length} dept{budgeted.length === 1 ? '' : 's'})</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value" style={{ fontSize: 20 }}>{peso(totals.committed)}</div>
            <div className="stat-label">Committed via Purchase Orders</div>
          </div>
          <div className="stat-card teal">
            <div className="stat-value" style={{ fontSize: 20 }}>{peso(totals.amount - totals.committed)}</div>
            <div className="stat-label">Remaining</div>
          </div>
          <div className={`stat-card ${overspent.length ? 'red' : 'amber'}`}>
            <div className="stat-value">{overspent.length}</div>
            <div className="stat-label">Departments Over Budget</div>
          </div>
        </div>
      )}

      {overspent.length > 0 && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MdWarningAmber size={16} />
          {overspent.map(r => r.departmentName).join(', ')} {overspent.length > 1 ? 'have' : 'has'} committed
          more than the FY{year} appropriation.
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <MdAccountBalanceWallet size={32} style={{ opacity: .4 }} />
          <h3>No departments to budget</h3>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Budget</th>
                <th style={{ textAlign: 'right' }}>Committed</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th style={{ minWidth: 160 }}>Utilisation</th>
                <th style={{ textAlign: 'right' }}>Pending Requests</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const pct = r.utilizationPercent;
                return (
                  <tr key={r.departmentId}>
                    <td style={{ fontWeight: 500 }}>
                      {r.departmentName}
                      {r.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.notes}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {r.hasBudget ? peso(r.amount) : <span className="badge badge-gray">Not set</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {peso(r.committed)}
                      {r.purchaseOrderCount > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {r.purchaseOrderCount} PO{r.purchaseOrderCount === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: !r.hasBudget ? 'var(--text-muted)' : r.remaining < 0 ? '#dc2626' : 'var(--green-700)' }}>
                      {r.hasBudget ? peso(r.remaining) : '—'}
                    </td>
                    <td>
                      {r.hasBudget ? (
                        <>
                          <div style={{ height: 7, borderRadius: 50, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: barColor(pct), transition: 'width var(--dur-base) var(--ease)' }} />
                          </div>
                          <div style={{ fontSize: 11, color: barColor(pct), fontWeight: 600, marginTop: 3 }}>{pct}%</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unbudgeted — not checked</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                      {r.pending > 0 ? peso(r.pending) : '—'}
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(r)} title={r.hasBudget ? 'Edit budget' : 'Set budget'}>
                            <MdEdit size={15} />
                          </button>
                          {r.hasBudget && (
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(r)} title="Remove budget">
                              <MdDelete size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={`${modal.hasBudget ? 'Edit' : 'Set'} FY${year} Budget — ${modal.departmentName}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Budget'}</button>
            </>
          }
        >
          <div className="alert alert-info" style={{ display: 'block', fontSize: 12 }}>
            Committed so far in FY{year}: <strong>{peso(modal.committed)}</strong>
            {modal.purchaseOrderCount > 0 && ` across ${modal.purchaseOrderCount} purchase order${modal.purchaseOrderCount === 1 ? '' : 's'}`}.
            {modal.pending > 0 && <> A further <strong>{peso(modal.pending)}</strong> is estimated in requests that have no purchase order yet.</>}
            {modal.updatedAt && <div style={{ marginTop: 4 }}>Last changed {fmtDate(modal.updatedAt)}.</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Appropriation for FY{year} (₱) *</label>
            <input
              className="form-control"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Board resolution 2026-14, MOOE allocation…"
            />
          </div>

          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            Spend is counted from purchase orders raised against this department's requests during
            FY{year} — it is never stored, so amending or voiding an order keeps the figures honest.
            While "Enforce department budgets" is on in System settings, a purchase order that would
            take the department past this amount is rejected.
          </div>
        </Modal>
      )}
    </div>
  );
}
