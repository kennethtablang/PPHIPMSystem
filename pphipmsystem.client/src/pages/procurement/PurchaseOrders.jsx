import { useEffect, useState } from 'react';
import { MdAdd, MdVisibility, MdLocalShipping, MdPrint, MdCheckCircle, MdAssignment, MdPendingActions } from 'react-icons/md';
import { getPurchaseOrders, getPurchaseOrder, generatePO, confirmDelivery, getRequests } from '../../api/procurement';
import { getSuppliers } from '../../api/suppliers';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div className={`stat-card ${color}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function PurchaseOrders() {
  const { user } = useAuth();
  const canGenerate = ['HospitalAdministrator', 'ProcurementStaff'].includes(user?.role);
  const canDeliver = ['HospitalAdministrator', 'InventoryOfficer'].includes(user?.role);

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [approvedReqs, setApprovedReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState(null);
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ requestId: '', supplierId: '', itemCosts: [] });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getPurchaseOrders().then(r => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getSuppliers().then(r => setSuppliers(r.data));
    getRequests({ status: 'FullyApproved' }).then(r => setApprovedReqs(r.data));
  }, []);

  const openView = async id => {
    const { data } = await getPurchaseOrder(id);
    setViewModal(data);
  };

  const onRequestSelect = e => {
    const reqId = e.target.value;
    const req = approvedReqs.find(r => r.id == reqId);
    setGenForm(p => ({
      ...p, requestId: reqId,
      itemCosts: (req?.items ?? []).map(i => ({ procurementRequestItemId: i.id, itemName: i.itemName, unit: i.unit, quantityRequested: i.quantityRequested, unitCost: '' }))
    }));
  };

  const generate = async () => {
    setSaving(true);
    try {
      await generatePO(genForm.requestId, {
        supplierId: +genForm.supplierId,
        itemCosts: genForm.itemCosts.map(c => ({ procurementRequestItemId: c.procurementRequestItemId, unitCost: +c.unitCost }))
      });
      toast.success('Purchase order generated.');
      setGenModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const deliver = async id => {
    if (!confirm('Confirm delivery? Stock quantities will be updated.')) return;
    try { await confirmDelivery(id); toast.success('Delivery confirmed and stock updated.'); load(); }
    catch { toast.error('Failed to confirm delivery.'); }
  };

  const printPO = () => {
    const p = document.getElementById('po-print-area');
    if (!p) return;
    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

    const doc = win.document;
    doc.title = `PO ${viewModal.poNumber}`;

    const style = doc.createElement('style');
    style.textContent = `
      body { font-family: 'Montserrat', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111c15; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #1a6a36; color: #fff; text-align: left; padding: 8px 12px; font-size: 12px; }
      td { padding: 8px 12px; border-bottom: 1px solid #d1e8d8; font-size: 13px; }
      .badge { padding: 2px 8px; border: 1px solid #999; border-radius: 99px; font-size: 11px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .print-head { display: flex; justify-content: space-between; border-bottom: 2px solid #1a6a36; padding-bottom: 20px; margin-bottom: 30px; }
      .print-head h1 { color: #1a6a36; margin: 0; font-size: 24px; }
    `;
    doc.head.appendChild(style);

    const el = (tag, text, styleText) => {
      const node = doc.createElement(tag);
      if (text) node.textContent = text;
      if (styleText) node.style.cssText = styleText;
      return node;
    };
    const head = el('div');
    head.className = 'print-head';
    const brand = el('div');
    brand.append(
      el('h1', 'PURCHASE ORDER'),
      el('div', 'PPH Inventory & Procurement System', 'font-size:14px;margin-top:5px;color:#555'),
    );
    const meta = el('div', null, 'text-align:right');
    meta.append(
      el('div', `PO #${viewModal.poNumber}`, 'font-size:18px;font-weight:bold'),
      el('div', `Generated: ${new Date(viewModal.generatedAt).toLocaleDateString('en-PH')}`, 'font-size:12px;color:#666;margin-top:5px'),
    );
    head.append(brand, meta);

    doc.body.append(head, doc.importNode(p, true));
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Generate and track purchase orders from approved requests</p>
        </div>
        {canGenerate && approvedReqs.length > 0 && (
          <button className="btn btn-primary" onClick={() => setGenModal(true)}>
            <MdAdd size={16} /> Generate PO
          </button>
        )}
      </div>

      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <StatCard label="Total POs" value={orders.length} icon={MdAssignment} color="blue" />
        <StatCard label="Pending Delivery" value={orders.filter(o => !o.isDelivered).length} icon={MdPendingActions} color="amber" />
        <StatCard label="Delivered" value={orders.filter(o => o.isDelivered).length} icon={MdCheckCircle} color="green" />
      </div>


      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Request #</th>
                <th>Supplier</th>
                <th>Total Amount</th>
                <th>Generated By</th>
                <th>Date</th>
                <th>Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No purchase orders yet.</td></tr>
              ) : orders.map(po => (
                <tr key={po.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{po.poNumber}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{po.requestNumber}</td>
                  <td>{po.supplierName}</td>
                  <td style={{ fontWeight: 600 }}>₱{po.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td>{po.generatedByFullName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(po.generatedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <span className={`badge ${po.isDelivered ? 'badge-green' : 'badge-amber'}`}>
                      {po.isDelivered ? 'Delivered' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(po.id)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {canDeliver && !po.isDelivered && (
                        <button className="btn btn-primary btn-sm" onClick={() => deliver(po.id)}>
                          <MdLocalShipping size={14} /> Deliver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate PO Modal */}
      {genModal && (
        <Modal title="Generate Purchase Order" onClose={() => setGenModal(false)} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setGenModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={generate} disabled={saving}>{saving ? 'Generating…' : 'Generate PO'}</button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Approved Request *</label>
              <select className="form-control" value={genForm.requestId} onChange={onRequestSelect} required>
                <option value="">Select request</option>
                {approvedReqs.map(r => <option key={r.id} value={r.id}>{r.requestNumber} — {r.departmentName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="form-control" value={genForm.supplierId} onChange={e => setGenForm(p => ({ ...p, supplierId: e.target.value }))} required>
                <option value="">Select supplier</option>
                {suppliers.filter(s => s.isAccredited).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {genForm.itemCosts.length > 0 && (
            <div>
              <label className="form-label">Unit Costs per Item</label>
              {genForm.itemCosts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{c.itemName} <span style={{ color: 'var(--text-muted)' }}>× {c.quantityRequested} {c.unit}</span></div>
                  <div style={{ width: 140 }}>
                    <input className="form-control" type="number" min="0" step="0.01" placeholder="Unit Cost (₱)" value={c.unitCost}
                      onChange={e => setGenForm(p => {
                        const ic = [...p.itemCosts];
                        ic[i] = { ...ic[i], unitCost: e.target.value };
                        return { ...p, itemCosts: ic };
                      })} />
                  </div>
                  <div style={{ minWidth: 80, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {c.unitCost ? `₱${(c.quantityRequested * c.unitCost).toLocaleString()}` : '—'}
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: 10, fontWeight: 700, color: 'var(--green-700)' }}>
                Total: ₱{genForm.itemCosts.reduce((s, c) => s + (c.quantityRequested * (c.unitCost || 0)), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title={`PO: ${viewModal.poNumber}`} onClose={() => setViewModal(null)} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={printPO}><MdPrint size={16} /> Print PO</button>
            </>
          }
        >
          <div id="po-print-area">
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supplier</span><br /><strong>{viewModal.supplierName}</strong></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Amount</span><br /><strong style={{ color: 'var(--green-700)', fontSize: 18 }}>₱{viewModal.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generated By</span><br /><strong>{viewModal.generatedByFullName}</strong></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery Status</span><br /><span className={`badge ${viewModal.isDelivered ? 'badge-green' : 'badge-amber'}`}>{viewModal.isDelivered ? `Delivered ${new Date(viewModal.deliveredAt).toLocaleDateString('en-PH')}` : 'Pending Delivery'}</span></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Qty Ordered</th><th>Unit Cost</th><th>Total</th></tr></thead>
                <tbody>
                  {(viewModal.items ?? []).map(it => (
                    <tr key={it.id}>
                      <td>{it.itemName} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({it.unit})</span></td>
                      <td>{it.quantityOrdered}</td>
                      <td>₱{it.unitCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td style={{ fontWeight: 600 }}>₱{it.totalCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
