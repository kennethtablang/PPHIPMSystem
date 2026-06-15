import { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdCategory } from 'react-icons/md';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

const BLANK = { name: '', description: '' };

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getCategories().then(r => setCats(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = c => { setForm({ name: c.name, description: c.description ?? '' }); setModal(c); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'create') { await createCategory(form); toast.success('Category created.'); }
      else { await updateCategory(modal.id, form); toast.success('Category updated.'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!confirm('Delete this category?')) return;
    try { await deleteCategory(id); toast.success('Category deleted.'); load(); }
    catch { toast.error('Cannot delete category with existing items.'); }
  };

  const palette = ['#1a6a36', '#2d9b5a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Category Management</h1>
          <p className="page-subtitle">Manage inventory item categories for classification and reporting</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><MdAdd size={16} /> Add Category</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="grid-3">
          {cats.map((c, i) => (
            <div key={c.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: palette[i % palette.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MdCategory size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{c.description}</div>}
                    <div style={{ marginTop: 8 }}>
                      <span className="badge badge-blue">{c.itemCount ?? 0} items</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)} title="Edit"><MdEdit size={14} /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(c.id)} title="Delete"><MdDelete size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Create Category' : `Edit: ${modal.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input className="form-control" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={set('description')} rows={3} placeholder="Optional description…" />
          </div>
        </Modal>
      )}
    </div>
  );
}
