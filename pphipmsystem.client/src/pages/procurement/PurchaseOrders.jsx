import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { MdAdd, MdVisibility, MdLocalShipping, MdPrint, MdCheckCircle, MdAssignment, MdPendingActions, MdQrCode2 } from 'react-icons/md';
import { getPurchaseOrders, getPurchaseOrder, generatePO, confirmDelivery, getRequests } from '../../api/procurement';
import { checkRequestBudget } from '../../api/departmentBudgets';
import LabelPrintModal from '../../components/common/LabelPrintModal';
import Modal from '../../components/common/Modal';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { toast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

const peso = n => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const location = useLocation();
  const navigate = useNavigate();
  const canGenerate = ['SuperAdmin', 'HospitalAdministrator', 'ProcurementStaff'].includes(user?.role);
  // Procurement receives deliveries: actual quantity, lot/batch no., expiry.
  const canDeliver = ['SuperAdmin', 'ProcurementStaff'].includes(user?.role);

  const [orders, setOrders] = useState([]);
  const [approvedReqs, setApprovedReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState(null);
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ requestId: '', itemCosts: [] });
  // Requesting department's remaining appropriation, fetched when a request is
  // picked. Null = no request selected yet or the lookup failed.
  const [budget, setBudget] = useState(null);
  const [saving, setSaving] = useState(false);
  // Delivery confirmation modal: PO detail + per-line lot/expiry inputs.
  const [deliverModal, setDeliverModal] = useState(null);
  const [deliverLines, setDeliverLines] = useState([]);
  const [delivering, setDelivering] = useState(false);
  // QR label sheet for the listed POs; the QR encodes the PO number, which
  // global search (Ctrl+K) resolves back to the order.
  const [labelModal, setLabelModal] = useState(false);
  const pager = usePagination(orders);

  const load = () => {
    setLoading(true);
    getPurchaseOrders().then(r => setOrders(r.data)).finally(() => setLoading(false));
  };

  const onRequestSelect = e => selectRequest(e.target.value, approvedReqs);
  const selectRequest = (reqId, list) => {
    const req = list.find(r => r.id == reqId);
    setGenForm(p => ({
      ...p, requestId: reqId,
      // The PR's estimated unit costs are the starting point for the PO.
      itemCosts: (req?.items ?? []).map(i => ({ procurementRequestItemId: i.id, itemName: i.itemName, unit: i.unit, quantityRequested: i.quantityRequested, unitCost: i.estimatedUnitCost ?? '' }))
    }));
    // Show what the department has left before any costs are typed in, so an
    // over-budget order is obvious here rather than at submit time.
    setBudget(null);
    if (reqId) checkRequestBudget(reqId).then(r => setBudget(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    getRequests({ status: 'FullyApproved' }).then(r => {
      setApprovedReqs(r.data);
      // "Create PO" from an approved Purchase Request lands here with the
      // request picked and its estimated costs filled in.
      const target = location.state?.generateFor;
      if (target && canGenerate && r.data.some(x => x.id === target)) {
        selectRequest(String(target), r.data);
        setGenModal(true);
      }
      if (target) navigate(location.pathname, { replace: true, state: null });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const openView = async id => {
    const { data } = await getPurchaseOrder(id);
    setViewModal(data);
  };

  // Live PO total from the entered unit costs, weighed against the department's
  // remaining appropriation.
  const genTotal = genForm.itemCosts.reduce((s, c) => s + (c.quantityRequested * (c.unitCost || 0)), 0);
  const overBudget = budget?.hasBudget && genTotal > budget.remaining;

  const generate = async () => {
    setSaving(true);
    try {
      await generatePO(genForm.requestId, {
        itemCosts: genForm.itemCosts.map(c => ({ procurementRequestItemId: c.procurementRequestItemId, unitCost: +c.unitCost }))
      });
      toast.success('Purchase order generated.');
      setGenModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };

  const openDeliver = async id => {
    try {
      const { data } = await getPurchaseOrder(id);
      setDeliverLines(data.items
        .map(i => ({
          purchaseOrderItemId: i.id, itemName: i.itemName, unit: i.unit,
          quantityOrdered: i.quantityOrdered,
          outstanding: i.quantityOrdered - (i.quantityDelivered ?? 0),
          quantityReceived: String(i.quantityOrdered - (i.quantityDelivered ?? 0)),
          lotNumber: '', expirationDate: '',
        }))
        .filter(l => l.outstanding > 0));
      setDeliverModal(data);
    } catch { toast.error('Failed to load purchase order.'); }
  };

  const setDeliverLine = (i, k) => e => setDeliverLines(lines => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: e.target.value };
    return next;
  });

  const deliver = async () => {
    for (const l of deliverLines) {
      const qty = Number(l.quantityReceived || 0);
      if (Number.isNaN(qty) || qty < 0) { toast.error(`${l.itemName}: enter a valid quantity.`); return; }
      if (qty > l.outstanding) { toast.error(`${l.itemName}: received quantity exceeds the outstanding ${l.outstanding}.`); return; }
    }
    if (!deliverLines.some(l => Number(l.quantityReceived || 0) > 0)) {
      toast.error('Enter the quantity received for at least one line.');
      return;
    }

    setDelivering(true);
    try {
      await confirmDelivery(deliverModal.id, {
        lines: deliverLines.map(l => ({
          purchaseOrderItemId: l.purchaseOrderItemId,
          quantityReceived: Number(l.quantityReceived || 0),
          lotNumber: l.lotNumber || null,
          expirationDate: l.expirationDate || null,
        })),
      });
      toast.success('Delivery recorded — stock updated and batches created.');
      setDeliverModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to confirm delivery.');
    } finally {
      setDelivering(false);
    }
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setLabelModal(true)}
            disabled={orders.length === 0}
            title="Print QR labels for the purchase orders shown — stick one on each delivery"
          >
            <MdQrCode2 size={16} /> QR Labels
          </button>
          {canGenerate && approvedReqs.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => { setGenForm({ requestId: '', itemCosts: [] }); setBudget(null); setGenModal(true); }}
            >
              <MdAdd size={16} /> Generate PO
            </button>
          )}
        </div>
      </div>

      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <StatCard label="Total POs" value={orders.length} icon={MdAssignment} color="blue" />
        <StatCard label="Pending Delivery" value={orders.filter(o => !o.isDelivered).length} icon={MdPendingActions} color="amber" />
        <StatCard label="Delivered" value={orders.filter(o => o.isDelivered).length} icon={MdCheckCircle} color="green" />
      </div>


      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Request #</th>
                <th>Total Amount</th>
                <th>Generated By</th>
                <th>Date</th>
                <th>Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No purchase orders yet.</td></tr>
              ) : pager.pageItems.map(po => (
                <tr key={po.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{po.poNumber}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{po.requestNumber}</td>
                  <td style={{ fontWeight: 600 }}>₱{po.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td>{po.generatedByFullName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(po.generatedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    {po.isDelivered ? (
                      <span className="badge badge-green">Delivered</span>
                    ) : (po.items ?? []).some(i => (i.quantityDelivered ?? 0) > 0) ? (
                      <span className="badge badge-blue">Partial</span>
                    ) : (
                      <span className="badge badge-amber">Pending</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(po.id)}>
                        <MdVisibility size={14} /> View
                      </button>
                      {canDeliver && !po.isDelivered && (
                        <button className="btn btn-primary btn-sm" onClick={() => openDeliver(po.id)}>
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
        <Pagination {...pager} />
        </>
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
          <div className="form-group">
            <label className="form-label">Approved Request *</label>
            <select className="form-control" value={genForm.requestId} onChange={onRequestSelect} required>
              <option value="">Select request</option>
              {approvedReqs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.requestNumber} — {r.type === 'Replenishment' ? 'Replenishment PR' : `${r.departmentName} (short stock)`}
                </option>
              ))}
            </select>
          </div>
          {budget && (
            <div
              className={`alert ${overBudget ? 'alert-warning' : 'alert-info'}`}
              style={{ display: 'block', fontSize: 12 }}
            >
              {budget.hasBudget ? (
                <>
                  <strong>{budget.departmentName}</strong> — FY{budget.fiscalYear} budget{' '}
                  <strong>{peso(budget.amount)}</strong>, committed {peso(budget.committed)},{' '}
                  <strong>{peso(budget.remaining)} remaining</strong>.
                  {genTotal > 0 && (
                    <div style={{ marginTop: 4 }}>
                      This order of <strong>{peso(genTotal)}</strong>{' '}
                      {overBudget
                        ? <>exceeds what is left by <strong>{peso(genTotal - budget.remaining)}</strong>
                            {budget.enforced
                              ? ' — it will be rejected until the budget is raised or the order reduced.'
                              : ' — enforcement is off, so it will go through and administrators will be notified.'}</>
                        : <>leaves <strong>{peso(budget.remaining - genTotal)}</strong> for the rest of the year.</>}
                    </div>
                  )}
                </>
              ) : (
                <>No FY{budget.fiscalYear} budget is set for <strong>{budget.departmentName}</strong>, so this
                order is not checked against one.</>
              )}
            </div>
          )}
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
              <div style={{ textAlign: 'right', marginTop: 10, fontWeight: 700, color: overBudget ? '#dc2626' : 'var(--green-700)' }}>
                Total: {peso(genTotal)}
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div className="grid-2" style={{ flex: 1 }}>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Request #</span><br /><strong style={{ fontFamily: 'monospace' }}>{viewModal.requestNumber}</strong></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Amount</span><br /><strong style={{ color: 'var(--green-700)', fontSize: 18 }}>₱{viewModal.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generated By</span><br /><strong>{viewModal.generatedByFullName}</strong></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery Status</span><br /><span className={`badge ${viewModal.isDelivered ? 'badge-green' : 'badge-amber'}`}>{viewModal.isDelivered ? `Delivered ${new Date(viewModal.deliveredAt).toLocaleDateString('en-PH')}` : 'Pending Delivery'}</span></div>
              </div>
              {/* Inside the print area on purpose — the printed PO carries a
                  scannable code the receiving clerk can shoot into global search. */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ padding: 8, background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <QRCodeSVG value={viewModal.poNumber} size={84} />
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 4 }}>
                  {viewModal.poNumber}
                </div>
              </div>
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

      {/* Confirm Delivery Modal — capture lot/expiry so batches are recorded */}
      {deliverModal && (
        <Modal title={`Confirm Delivery: ${deliverModal.poNumber}`} onClose={() => setDeliverModal(null)} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeliverModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={deliver} disabled={delivering}>
                <MdLocalShipping size={16} /> {delivering ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            </>
          }
        >
          <div className="alert alert-info">
            Enter what actually arrived — partial quantities are fine and the PO stays open
            until every line is fully delivered. Each received line adds stock and records a
            batch (enter lot / expiry from the physical delivery, or leave blank).
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Outstanding</th><th>Qty Received *</th><th>Lot / Batch No.</th><th>Expiration Date</th></tr></thead>
              <tbody>
                {deliverLines.map((l, i) => (
                  <tr key={l.purchaseOrderItemId}>
                    <td>{l.itemName} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({l.unit})</span></td>
                    <td style={{ fontWeight: 600 }}>
                      {l.outstanding}
                      {l.outstanding < l.quantityOrdered && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>of {l.quantityOrdered} ordered</div>
                      )}
                    </td>
                    <td>
                      <input className="form-control" type="number" min="0" max={l.outstanding} step="0.01" style={{ width: 110 }} value={l.quantityReceived} onChange={setDeliverLine(i, 'quantityReceived')} />
                    </td>
                    <td>
                      <input className="form-control" value={l.lotNumber} onChange={setDeliverLine(i, 'lotNumber')} placeholder="e.g. LOT-2026-001" maxLength={100} />
                    </td>
                    <td>
                      <input className="form-control" type="date" value={l.expirationDate} onChange={setDeliverLine(i, 'expirationDate')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {labelModal && (
        <LabelPrintModal
          title="Purchase Order QR Labels"
          onClose={() => setLabelModal(false)}
          labels={orders.map(po => ({
            qr: po.poNumber,
            title: po.poNumber,
            subtitle: `Request ${po.requestNumber}`,
            meta: po.isDelivered ? 'Delivered' : 'Pending delivery',
          }))}
        />
      )}
    </div>
  );
}
