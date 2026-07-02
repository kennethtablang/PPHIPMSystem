import { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdWarning } from 'react-icons/md';
import { getItems, createItem, updateItem, deleteItem } from '../../api/inventory';
import { getCategories } from '../../api/categories';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const BLANK = { name: '', itemCode: '', description: '', unit: '', categoryId: '', reorderThreshold: 0, expirationWarningDays: 30, preferredForecastMethod: 'MovingAverage', movingAverageWindow: 3, smoothingConstant: 0.3 };

export default function InventoryList() {
  const { user } = useAuth();
  const canEdit = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | item
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const p = {};
    if (search) p.search = search;
    if (catFilter) p.categoryId = catFilter;
    if (lowStockOnly) p.lowStock = true;
    getItems(p).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getCategories().then(r => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [search, catFilter, lowStockOnly]);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = item => {
    setForm({
      name: item.name, itemCode: item.itemCode ?? '', description: item.description ?? '',
      unit: item.unit, categoryId: item.categoryId,
      reorderThreshold: item.reorderThreshold, expirationWarningDays: item.expirationWarningDays,
      preferredForecastMethod: item.preferredForecastMethod, movingAverageWindow: item.movingAverageWindow,
      smoothingConstant: item.smoothingConstant, isActive: item.isActive,
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
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <MdAdd size={16} /> Add Item
          </button>
        )}
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
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
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
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : items.map(item => (
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
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="Edit"><MdEdit size={15} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(item.id)} title="Delete"><MdDelete size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
