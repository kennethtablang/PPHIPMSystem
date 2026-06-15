import { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

const BLANK = { name: '', description: '', headOfDepartment: '' };

export default function DepartmentsPage() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getDepartments().then(r => setDepts(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = d => { setForm({ name: d.name, description: d.description ?? '', headOfDepartment: d.headOfDepartment ?? '' }); setModal(d); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'create') { await createDepartment(form); toast.success('Department created.'); }
      else { await updateDepartment(modal.id, form); toast.success('Department updated.'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!confirm('Delete this department?')) return;
    try { await deleteDepartment(id); toast.success('Department deleted.'); load(); }
    catch { toast.error('Cannot delete department with assigned users.'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Management</h1>
          <p className="page-subtitle">Manage hospital departments and their configurations</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><MdAdd size={16} /> Add Department</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="grid-2">
          {depts.map(d => (
            <div key={d.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{d.name}</div>
                    {d.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{d.description}</div>}
                    {d.headOfDepartment && (
                      <div style={{ fontSize: 12, color: 'var(--green-700)', marginTop: 6, fontWeight: 500 }}>Head: {d.headOfDepartment}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <span className="badge badge-blue">{d.userCount ?? 0} users</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)} title="Edit"><MdEdit size={15} /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(d.id)} title="Delete"><MdDelete size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Create Department' : `Edit: ${modal.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input className="form-control" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={set('description')} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Head of Department</label>
            <input className="form-control" value={form.headOfDepartment} onChange={set('headOfDepartment')} placeholder="Name of department head" />
          </div>
        </Modal>
      )}
    </div>
  );
}
