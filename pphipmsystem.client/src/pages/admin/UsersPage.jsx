import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MdAdd, MdEdit, MdSearch } from 'react-icons/md';
import { getUsers, createUser, updateUser, resetPassword } from '../../api/users';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { validatePassword, passwordHint, usePasswordPolicy } from '../../utils/password';
import { fmtDateTime } from '../../utils/format';

const ROLES = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer', 'ProcurementStaff', 'DepartmentHead'];
const BLANK = { username: '', password: '', firstName: '', middleName: '', lastName: '', employeeId: '', role: 'InventoryOfficer', departmentId: '', email: '', isActive: true };

export default function UsersPage() {
  const pwPolicy = usePasswordPolicy();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => location.state?.search ?? ''); // pre-filled by global search
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');
  const pager = usePagination(users);

  const load = () => {
    setLoading(true);
    getUsers(search ? { search } : {}).then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getDepartments().then(r => setDepartments(r.data)); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(BLANK); setErrors({}); setModal('create'); };
  const openEdit = u => {
    setForm({ username: u.userName ?? '', password: '', firstName: u.firstName, middleName: u.middleName ?? '', lastName: u.lastName, employeeId: u.employeeId ?? '', role: u.role, departmentId: u.departmentId ?? '', email: u.email ?? '', isActive: u.isActive });
    setErrors({});
    setModal(u);
  };

  // Update a field and clear its validation error as the user types.
  const set = k => e => {
    const value = e.target.value;
    setForm(p => ({ ...p, [k]: value }));
    setErrors(er => (er[k] ? { ...er, [k]: undefined } : er));
  };

  const validate = () => {
    const e = {};
    const val = k => (form[k] ?? '').trim();
    if (!val('firstName')) e.firstName = 'First name is required.';
    if (!val('lastName')) e.lastName = 'Last name is required.';
    if (!val('username')) e.username = 'Username is required.';
    if (!val('employeeId')) e.employeeId = 'Employee ID is required.';
    if (!val('email')) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) e.email = 'Enter a valid email address.';
    if (modal === 'create') {
      if (!form.password) e.password = 'Password is required.';
      else { const pwErr = validatePassword(form.password, pwPolicy); if (pwErr) e.password = pwErr; }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) { toast.error('Please complete the required fields.'); return; }
    setSaving(true);
    // Empty department must be sent as null (not ""), otherwise binding to int? fails.
    const payload = {
      ...form,
      middleName: form.middleName.trim() || null,
      departmentId: form.departmentId === '' ? null : Number(form.departmentId),
    };
    try {
      if (modal === 'create') { await createUser(payload); toast.success('User created.'); }
      else { await updateUser(modal.id, payload); toast.success('User updated.'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const errText = k => errors[k] ? <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{errors[k]}</span> : null;
  const errStyle = k => errors[k] ? { borderColor: '#dc2626' } : undefined;

  const doResetPw = async () => {
    if (!newPw) return;
    const pwErr = validatePassword(newPw, pwPolicy);
    if (pwErr) { toast.error(pwErr); return; }
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
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Employee ID</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found.</td></tr>
              ) : pager.pageItems.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{u.userName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.employeeId ?? '—'}</td>
                  <td><span className={`badge ${roleColor(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td style={{ fontSize: 13 }}>{u.departmentName ?? '—'}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</td>
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
        <Pagination {...pager} />
        </>
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
              <input className="form-control" value={form.firstName} onChange={set('firstName')} style={errStyle('firstName')} />
              {errText('firstName')}
            </div>
            <div className="form-group">
              <label className="form-label">Middle Name</label>
              <input className="form-control" value={form.middleName} onChange={set('middleName')} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-control" value={form.lastName} onChange={set('lastName')} style={errStyle('lastName')} />
              {errText('lastName')}
            </div>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-control" value={form.username} onChange={set('username')} disabled={modal !== 'create'} style={errStyle('username')} />
              {modal !== 'create'
                ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Username cannot be changed.</span>
                : errText('username')}
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label className="form-label">Initial Password *</label>
                <input className="form-control" type="password" value={form.password} onChange={set('password')} placeholder="Strong password" style={errStyle('password')} />
                {errors.password
                  ? errText('password')
                  : <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{passwordHint(pwPolicy)}</span>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input className="form-control" value={form.employeeId} onChange={set('employeeId')} disabled={modal !== 'create'} style={errStyle('employeeId')} />
              {modal !== 'create'
                ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Employee ID cannot be changed.</span>
                : errText('employeeId')}
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
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} style={errStyle('email')} />
              {errText('email')}
            </div>
            {modal !== 'create' && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'active' }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
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
            <input className="form-control" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Strong password" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{passwordHint(pwPolicy)}</span>
          </div>
          <div className="alert alert-warning">The user will need to use this new password on their next login.</div>
        </Modal>
      )}
    </div>
  );
}
