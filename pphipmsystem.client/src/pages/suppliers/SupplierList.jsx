import { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdVerified, MdCancel } from 'react-icons/md';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, updateAccreditation } from '../../api/suppliers';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const BLANK = { name: '', contactPerson: '', email: '', phone: '', address: '', accreditationNumber: '', isAccredited: true, accreditationExpiry: '' };

export default function SupplierList() {
  const { user } = useAuth();
  const canEdit = ['HospitalAdministrator', 'ProcurementStaff'].includes(user?.role);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getSuppliers(search ? { search } : {}).then(r => setSuppliers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = s => {
    setForm({ name: s.name, contactPerson: s.contactPerson ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', accreditationNumber: s.accreditationNumber ?? '', isAccredited: s.isAccredited, accreditationExpiry: s.accreditationExpiry ? s.accreditationExpiry.split('T')[0] : '' });
    setModal(s);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, accreditationExpiry: form.accreditationExpiry || null };
      if (modal === 'create') { await createSupplier(payload); toast.success('Supplier registered.'); }
      else { await updateSupplier(modal.id, payload); toast.success('Supplier updated.'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!confirm('Remove this supplier?')) return;
    try { await deleteSupplier(id); toast.success('Supplier removed.'); load(); }
    catch { toast.error('Failed to remove supplier.'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Management</h1>
          <p className="page-subtitle">Manage accredited suppliers and their transaction history</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}><MdAdd size={16} /> Add Supplier</button>
        )}
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Email / Phone</th>
                <th>Accreditation #</th>
                <th>Accreditation</th>
                <th>Expiry</th>
                <th>Total Orders</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No suppliers found.</td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.address}</div>}
                  </td>
                  <td>{s.contactPerson ?? '—'}</td>
                  <td>
                    <div style={{ fontSize: 12 }}>{s.email ?? '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.phone ?? ''}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.accreditationNumber ?? '—'}</td>
                  <td>
                    <span className={`badge ${s.isAccredited ? 'badge-green' : 'badge-red'}`}>
                      {s.isAccredited ? <><MdVerified size={10} /> Accredited</> : <><MdCancel size={10} /> Not Accredited</>}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{s.accreditationExpiry ? new Date(s.accreditationExpiry).toLocaleDateString('en-PH') : '—'}</td>
                  <td><span className="badge badge-blue">{s.totalOrders}</span></td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(s)} title="Edit"><MdEdit size={15} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(s.id)} title="Remove"><MdDelete size={15} /></button>
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
          title={modal === 'create' ? 'Register Supplier' : `Edit: ${modal.name}`}
          onClose={() => setModal(null)}
          size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Register' : 'Save'}</button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Supplier Name *</label>
              <input className="form-control" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input className="form-control" value={form.contactPerson} onChange={set('contactPerson')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Accreditation No.</label>
              <input className="form-control" value={form.accreditationNumber} onChange={set('accreditationNumber')} />
            </div>
            <div className="form-group">
              <label className="form-label">Accreditation Expiry</label>
              <input className="form-control" type="date" value={form.accreditationExpiry} onChange={set('accreditationExpiry')} />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 24 }}>
                <input type="checkbox" checked={form.isAccredited} onChange={set('isAccredited')} />
                Currently Accredited
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" value={form.address} onChange={set('address')} rows={2} />
          </div>
        </Modal>
      )}
    </div>
  );
}
