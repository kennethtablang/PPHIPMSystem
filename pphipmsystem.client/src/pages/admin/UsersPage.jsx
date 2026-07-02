import { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdSearch } from 'react-icons/md';
import { getUsers, createUser, updateUser, resetPassword } from '../../api/users';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

const ROLES = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer', 'ProcurementStaff', 'DepartmentHead'];
const BLANK = { username: '', password: '', firstName: '', lastName: '', employeeId: '', role: 'InventoryOfficer', departmentId: '', email: '', phoneNumber: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');

  const load = () => {
    setLoading(true);
    getUsers(search ? { search } : {}).then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getDepartments().then(r => setDepartments(r.data)); }, []);
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = u => {
    setForm({ username: u.username, password: '', firstName: u.firstName, lastName: u.lastName, employeeId: u.employeeId ?? '', role: u.role, departmentId: u.departmentId ?? '', email: u.email ?? '', phoneNumber: u.phoneNumber ?? '' });
    setModal(u);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'create') { await createUser(form); toast.success('User created.'); }
      else { await updateUser(modal.id, form); toast.success('User updated.'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const doResetPw = async () => {
    if (!newPw) return;
    setSaving(true);
    try { await resetPassword(pwModal.id, newPw); toast.success('Password reset.'); setPwModal(null); setNewPw(''); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Failed to reset password.'); }
    finally { setSaving(false); }
  };

  const roleColor = r => ({ SuperAdmin: 'badge-red', HospitalAdministrator: 'badge-purple', InventoryOfficer: 'badge-green', ProcurementStaff: 'badge-blue', DepartmentHead: 'badge-teal' }[r] ?? 'badge-gray');
  const roleLabel = r => ({ SuperAdmin: 'Super Admin', HospitalAdministrator: 'Admin', InventoryOfficer: 'Inv. Officer', ProcurementStaff: 'Procurement', DepartmentHead: 'Dept Head' }[r] ?? r);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system accounts, roles, and department assignments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><MdAdd size={16} /> Add User</button>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search by name or username…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Employee ID</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{u.username}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.employeeId ?? '—'}</td>
                  <td><span className={`badge ${roleColor(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td style={{ fontSize: 13 }}>{u.departmentName ?? '—'}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-PH') : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)} title="Edit"><MdEdit size={15} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setPwModal(u); setNewPw(''); }} style={{ fontSize: 11 }}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Create User' : `Edit: ${modal.firstName} ${modal.lastName}`}
          onClose={() => setModal(null)} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save'}</button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-control" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-control" value={form.lastName} onChange={set('lastName')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-control" value={form.username} onChange={set('username')} required />
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label className="form-label">Initial Password *</label>
                <input className="form-control" type="password" value={form.password} onChange={set('password')} required placeholder="Min 6 chars" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-control" value={form.employeeId} onChange={set('employeeId')} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">No Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phoneNumber} onChange={set('phoneNumber')} />
            </div>
          </div>
        </Modal>
      )}

      {pwModal && (
        <Modal title={`Reset Password — ${pwModal.firstName} ${pwModal.lastName}`} onClose={() => setPwModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPwModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doResetPw} disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input className="form-control" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="alert alert-warning">The user will need to use this new password on their next login.</div>
        </Modal>
      )}
    </div>
  );
}
