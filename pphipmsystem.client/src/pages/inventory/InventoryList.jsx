import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdWarning, MdFileDownload, MdShoppingCart, MdUploadFile } from 'react-icons/md';
import { getItems, createItem, updateItem, deleteItem, importPreview, importItems, downloadImportTemplate } from '../../api/inventory';
import { getCategories } from '../../api/categories';
import { getSystemSettings } from '../../api/systemSettings';
import { exportInventorySnapshot } from '../../api/reports';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';

const BLANK = { name: '', itemCode: '', description: '', unit: '', categoryId: '', reorderThreshold: 0, expirationWarningDays: 30, preferredForecastMethod: 'MovingAverage', movingAverageWindow: 3, smoothingConstant: 0.3 };

export default function InventoryList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);
  // Matches the ReportsController role guard.
  const canExport = ['SuperAdmin', 'HospitalAdministrator', 'ProcurementStaff', 'InventoryOfficer'].includes(user?.role);
  // Roles allowed to create procurement requests (matches ProcurementList.canCreate).
  const canRequest = ['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead'].includes(user?.role);

  // Restock to roughly twice the reorder threshold — editable in the request form.
  const suggestedQty = item => Math.max(Math.ceil(item.reorderThreshold * 2 - item.quantityOnHand), 1);
  const reorderPrefill = list => ({
    prefillItems: list.map(i => ({ id: i.id, name: i.name, suggestedQty: suggestedQty(i) })),
  });

  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => location.state?.search ?? ''); // pre-filled by global search
  const [catFilter, setCatFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | item
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  // Admin-configured defaults for new items (Settings → System); falls back to BLANK's values.
  const [itemDefaults, setItemDefaults] = useState(null);
  const pager = usePagination(items);
  // Bulk import: pick file → preview validation results → import valid rows.
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = () => {
    setLoading(true);
    const p = {};
    if (search) p.search = search;
    if (catFilter) p.categoryId = catFilter;
    if (lowStockOnly) p.lowStock = true;
    getItems(p).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getCategories().then(r => setCats(r.data)); }, []);
  useEffect(() => {
    if (!canEdit) return;
    getSystemSettings()
      .then(r => setItemDefaults({
        reorderThreshold: r.data.defaultReorderThreshold,
        expirationWarningDays: r.data.defaultExpirationWarningDays,
      }))
      .catch(() => {}); // non-fatal — BLANK's built-in defaults still apply
  }, [canEdit]);
  useEffect(() => { load(); }, [search, catFilter, lowStockOnly]);

  const openCreate = () => { setForm({ ...BLANK, ...itemDefaults }); setModal('create'); };

  const openImport = () => { setImportFile(null); setImportRows(null); setImportModal(true); };

  const pickFile = e => { setImportFile(e.target.files?.[0] ?? null); setImportRows(null); };

  const runPreview = async () => {
    if (!importFile) { toast.error('Choose an .xlsx file first.'); return; }
    setImporting(true);
    try {
      const { data } = await importPreview(importFile);
      setImportRows(data.rows);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to read the file.');
    } finally { setImporting(false); }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const { data } = await importItems(importFile);
      toast.success(`Imported ${data.imported} item(s)${data.skipped ? `, skipped ${data.skipped}` : ''}.`);
      setImportModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Import failed.');
    } finally { setImporting(false); }
  };
  const openEdit = item => {
    setForm({
      name: item.name, itemCode: item.itemCode ?? '', description: item.description ?? '',
      unit: item.unit, categoryId: item.categoryId,
      reorderThreshold: item.reorderThreshold, expirationWarningDays: item.expirationWarningDays,
      preferredForecastMethod: item.preferredForecastMethod, movingAverageWindow: item.movingAverageWindow,
      smoothingConstant: item.smoothingConstant, isActive: item.isActive,
      rowVersion: item.rowVersion ?? null, // concurrency token — echoed back on save
    });
    setModal(item);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await createItem({ ...form, categoryId: +form.categoryId, reorderThreshold: +form.reorderThreshold, expirationWarningDays: +form.expirationWarningDays, movingAverageWindow: +form.movingAverageWindow, smoothingConstant: +form.smoothingConstant });
        toast.success('Item created.');
      } else {
        await updateItem(modal.id, { ...form, categoryId: +form.categoryId, reorderThreshold: +form.reorderThreshold, expirationWarningDays: +form.expirationWarningDays, movingAverageWindow: +form.movingAverageWindow, smoothingConstant: +form.smoothingConstant, isActive: form.isActive ?? true });
        toast.success('Item updated.');
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async id => {
    if (!confirm('Delete this item?')) return;
    try { await deleteItem(id); toast.success('Item deleted.'); load(); }
    catch { toast.error('Cannot delete item with transactions.'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Items</h1>
          <p className="page-subtitle">Manage all hospital supply and pharmaceutical items</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canExport && (
            <button
              className="btn btn-secondary"
              onClick={() => exportInventorySnapshot().then(() => toast.success('Snapshot downloaded.')).catch(() => toast.error('Failed to export snapshot.'))}
            >
              <MdFileDownload size={16} /> Export Snapshot
            </button>
          )}
          {canEdit && (
            <>
              <button className="btn btn-secondary" onClick={openImport}>
                <MdUploadFile size={16} /> Import
              </button>
              <button className="btn btn-primary" onClick={openCreate}>
                <MdAdd size={16} /> Add Item
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          Low Stock Only
        </label>
        {canRequest && lowStockOnly && items.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/procurement', { state: reorderPrefill(items) })}
            title="Create one procurement request covering every low-stock item shown"
          >
            <MdShoppingCart size={14} /> Request Replenishment ({items.length})
          </button>
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
                <th>Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Supplies Available</th>
                <th>Reorder At</th>
                <th>Forecast Method</th>
                <th>Status</th>
                {(canEdit || canRequest) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : pager.pageItems.map(item => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.itemCode ?? '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>}
                  </td>
                  <td>{item.categoryName}</td>
                  <td>{item.unit}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: item.isBelowReorder ? '#dc2626' : 'var(--text-primary)' }}>
                      {item.quantityOnHand} {item.unit}
                    </span>
                    {item.isBelowReorder && <MdWarning size={14} color="#f59e0b" style={{ marginLeft: 4 }} />}
                  </td>
                  <td>{item.reorderThreshold}</td>
                  <td>
                    <span className={`badge ${item.preferredForecastMethod === 'MovingAverage' ? 'badge-blue' : 'badge-purple'}`}>
                      {item.preferredForecastMethod === 'MovingAverage' ? 'Moving Avg.' : 'Exp. Smooth.'}
                    </span>
                  </td>
                  <td>
                    {!item.isActive ? (
                      <span className="badge badge-gray">Inactive</span>
                    ) : item.isAvailable ? (
                      <span className="badge badge-green">Available</span>
                    ) : (
                      <span className="badge badge-red">Not Available</span>
                    )}
                  </td>
                  {(canEdit || canRequest) && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {canRequest && item.isBelowReorder && item.isActive && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate('/procurement', { state: reorderPrefill([item]) })}
                            title="Create a replenishment request for this item"
                            style={{ fontSize: 11 }}
                          >
                            <MdShoppingCart size={13} /> Reorder
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="Edit"><MdEdit size={15} /></button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(item.id)} title="Delete"><MdDelete size={15} /></button>
                          </>
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

      {importModal && (
        <Modal
          title="Import Items from Excel"
          onClose={() => setImportModal(false)}
          size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setImportModal(false)}>Cancel</button>
              {importRows === null ? (
                <button className="btn btn-primary" onClick={runPreview} disabled={importing || !importFile}>
                  {importing ? 'Checking…' : 'Preview'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={runImport}
                  disabled={importing || importRows.every(r => !r.isValid)}
                >
                  {importing ? 'Importing…' : `Import ${importRows.filter(r => r.isValid).length} Valid Item(s)`}
                </button>
              )}
            </>
          }
        >
          <div className="alert alert-info" style={{ fontSize: 12 }}>
            Upload an .xlsx file with columns <strong>Name, Item Code, Description, Unit, Category,
            Reorder Threshold, Expiration Warning Days</strong>. Categories must already exist.
            {' '}
            <button
              type="button"
              onClick={() => downloadImportTemplate().catch(() => toast.error('Failed to download template.'))}
              style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontSize: 12 }}
            >
              Download the template
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Spreadsheet (.xlsx) *</label>
            <input className="form-control" type="file" accept=".xlsx" onChange={pickFile} />
          </div>

          {importRows && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                {importRows.filter(r => r.isValid).length} of {importRows.length} row(s) ready to import.
                Rows with errors will be skipped.
              </div>
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Row</th><th>Name</th><th>Unit</th><th>Category</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {importRows.map(r => (
                      <tr key={r.row}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.row}</td>
                        <td style={{ fontWeight: 500 }}>{r.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td>{r.unit || '—'}</td>
                        <td>{r.category || '—'}</td>
                        <td>
                          {r.isValid
                            ? <span className="badge badge-green">Ready</span>
                            : <div>
                                <span className="badge badge-red">Error</span>
                                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3, lineHeight: 1.4 }}>
                                  {r.errors.join(' ')}
                                </div>
                              </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Inventory Item' : `Edit: ${modal.name}`}
          onClose={() => setModal(null)}
          size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create Item' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input className="form-control" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Item Code</label>
              <input className="form-control" value={form.itemCode} onChange={set('itemCode')} placeholder="e.g. MED-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" value={form.categoryId} onChange={set('categoryId')} required>
                <option value="">Select category</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure *</label>
              <input className="form-control" value={form.unit} onChange={set('unit')} placeholder="e.g. tablets, vials, pcs" required />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Threshold</label>
              <input className="form-control" type="number" min="0" value={form.reorderThreshold} onChange={set('reorderThreshold')} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Warning (days)</label>
              <input className="form-control" type="number" min="1" max="365" value={form.expirationWarningDays} onChange={set('expirationWarningDays')} />
            </div>
            <div className="form-group">
              <label className="form-label">Forecast Method</label>
              <select className="form-control" value={form.preferredForecastMethod} onChange={set('preferredForecastMethod')}>
                <option value="MovingAverage">Moving Average</option>
                <option value="ExponentialSmoothing">Exponential Smoothing</option>
              </select>
            </div>
            {form.preferredForecastMethod === 'MovingAverage' ? (
              <div className="form-group">
                <label className="form-label">MA Window (months)</label>
                <input className="form-control" type="number" min="1" max="24" value={form.movingAverageWindow} onChange={set('movingAverageWindow')} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Smoothing Constant (α)</label>
                <input className="form-control" type="number" min="0.01" max="0.99" step="0.01" value={form.smoothingConstant} onChange={set('smoothingConstant')} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={set('description')} rows={2} />
          </div>
        </Modal>
      )}
    </div>
  );
}
