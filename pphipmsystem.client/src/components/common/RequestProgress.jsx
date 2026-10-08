import { Fragment } from 'react';
import { MdCheck, MdPriorityHigh } from 'react-icons/md';
import { formUnit, groupPrLines, peso } from '../../utils/purchaseRequest';
import { fmtDateTime } from '../../utils/format';

// Where a department request is in the PPH cycle:
// Department request → Inventory review (stock check + allocation)
// → Administrator approval → Released to the department's stock.
const STEPS = ['Draft', 'Inventory Review', 'Admin Approval', 'Released'];

const STEP_OF = {
  SubmittedByDepartment: 0,
  ReturnedForRevision: 0,
  SubmittedToProcurement: 1,
  ApprovedByProcurement: 1,
  ApprovedByInventoryOfficer: 2,
  FullyApproved: 3,
  PurchaseOrderGenerated: 3,
  Delivered: 3,
  Released: 4,
};

const NOTE = {
  ReturnedForRevision: { tone: 'amber', text: 'Returned for revision — edit the request and submit it again.' },
  Rejected: { tone: 'red', text: 'This request was rejected.' },
  Cancelled: { tone: 'gray', text: 'This request was cancelled.' },
  FullyApproved: { tone: 'amber', text: 'Approved, but central stock is short — it will be released once Procurement replenishes it.' },
  PurchaseOrderGenerated: { tone: 'blue', text: 'A purchase order was raised for this request.' },
  Delivered: { tone: 'blue', text: 'Delivered against its purchase order.' },
};

// Replenishment Purchase Request: Supply Officer drafts → Chief of Hospital
// approves → Procurement raises the PO → delivery lands in central stock.
const PR_STEPS = ['Draft', 'Chief Approval', 'Purchase Order', 'Delivered'];
const PR_STEP_OF = {
  SubmittedByDepartment: 0,
  ReturnedForRevision: 0,
  SubmittedToProcurement: 1,
  ApprovedByProcurement: 1,
  FullyApproved: 2,
  PurchaseOrderGenerated: 3,
  Delivered: 4,
};
const PR_NOTE = {
  ...NOTE,
  FullyApproved: { tone: 'blue', text: 'Approved by the Chief — Procurement can now generate the purchase order.' },
  PurchaseOrderGenerated: { tone: 'blue', text: 'Purchase order raised; waiting on the supplier delivery.' },
  Delivered: { tone: 'blue', text: 'Delivered and added to central stock.' },
};

export function RequestProgress({ status, type }) {
  const isPr = type === 'Replenishment';
  const steps = isPr ? PR_STEPS : STEPS;
  const current = (isPr ? PR_STEP_OF : STEP_OF)[status];
  const note = (isPr ? PR_NOTE : NOTE)[status];
  return (
    <div style={{ margin: '12px 0' }}>
      <style>{CSS}</style>
      {current !== undefined && (
        <div className="rp">
          {steps.map((label, i) => {
            const state = i < current ? 'done' : i === current ? 'now' : '';
            return (
              <div key={label} className={`rp-step ${state}`}>
                <span className="rp-dot">{i < current ? <MdCheck size={13} /> : i + 1}</span>
                <span className="rp-label">{label}</span>
              </div>
            );
          })}
        </div>
      )}
      {note && <div className={`alert alert-${note.tone === 'red' ? 'danger' : note.tone === 'amber' ? 'warning' : 'info'}`} style={{ marginTop: 10, fontSize: 12 }}>{note.text}</div>}
    </div>
  );
}

// Where a request is right now in plain words, so nobody has to follow up by
// phone: the phase (Pending / Forwarded / Approved / Ongoing / Completed …),
// who is holding it, and what happens next.
const STAGE = {
  SubmittedByDepartment: { phase: 'Draft', holder: 'Requester', text: 'Saved as a draft — not yet submitted.' },
  ReturnedForRevision: { phase: 'Returned', holder: 'Requester', text: 'Returned to the requester for revision.' },
  SubmittedToProcurement: { phase: 'Pending', holder: 'Inventory Office', text: 'Pending — the Inventory Office is checking stock and allocating.' },
  ApprovedByProcurement: { phase: 'Pending', holder: 'Inventory Office', text: 'Pending — the Inventory Office is checking stock and allocating.' },
  ApprovedByInventoryOfficer: { phase: 'Forwarded', holder: 'Hospital Administrator', text: 'Passed inventory review — forwarded to the Hospital Administrator for final approval.' },
  FullyApproved: { phase: 'Ongoing', holder: 'Procurement / Inventory', text: 'Approved — waiting for stock; Procurement is replenishing and Inventory releases it once it arrives.' },
  PurchaseOrderGenerated: { phase: 'Ongoing', holder: 'Supplier', text: 'Ongoing — purchase order raised, waiting on the supplier delivery.' },
  Delivered: { phase: 'Completed', holder: null, text: 'Delivered against its purchase order.' },
  Released: { phase: 'Completed', holder: null, text: "Completed — released to the department's stock." },
  Rejected: { phase: 'Rejected', holder: null, text: 'Rejected — see the remarks in the timeline.' },
  Cancelled: { phase: 'Cancelled', holder: null, text: 'Cancelled by the requester.' },
};
const PR_STAGE = {
  ...STAGE,
  SubmittedToProcurement: { phase: 'Pending', holder: 'Chief of Hospital', text: "Pending — waiting for the Chief of Hospital's approval." },
  ApprovedByProcurement: { phase: 'Pending', holder: 'Chief of Hospital', text: "Pending — waiting for the Chief of Hospital's approval." },
  FullyApproved: { phase: 'Approved', holder: 'Procurement', text: 'Approved — forwarded to Procurement to raise the purchase order.' },
  Delivered: { phase: 'Completed', holder: null, text: 'Completed — delivered and added to central stock.' },
};
const PHASE_TONE = {
  Draft: 'gray', Returned: 'amber', Pending: 'amber', Forwarded: 'purple', Approved: 'green',
  Ongoing: 'blue', Completed: 'green', Rejected: 'red', Cancelled: 'gray',
};

function requestStage(r) {
  return (r.type === 'Replenishment' ? PR_STAGE : STAGE)[r.status] ?? { phase: r.status, holder: null, text: '' };
}

const daysSince = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// Compact line under the status badge in request lists: "Pending · with Inventory Office · 3d".
export function StageLine({ request }) {
  const st = requestStage(request);
  const days = daysSince(request.updatedAt ?? request.requestedAt);
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
      <strong style={{ color: 'var(--text-secondary)' }}>{st.phase}</strong>
      {st.holder && <> · with {st.holder} · {days === 0 ? 'today' : `${days}d`}</>}
    </div>
  );
}

export function UrgentBadge({ request }) {
  if (!request?.isUrgent) return null;
  return (
    <span className="badge badge-red" title={request.urgentReason ?? 'Urgent request'} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <MdPriorityHigh size={12} /> URGENT
    </span>
  );
}

const ROLE_LABEL = {
  InventoryOfficer: 'Inventory Office',
  HospitalAdministrator: 'Hospital Administrator',
  SuperAdmin: 'Super Admin',
  ProcurementStaff: 'Procurement',
  DepartmentHead: 'Department Head',
};
const ACTION_LABEL = { Approved: 'Approved', Rejected: 'Rejected', ReturnedForRevision: 'Returned for revision' };

// Status tracker: where the request is now, then every step it has been
// through with who acted and when — filed, submitted, each review, PO,
// delivery and release.
export function RequestTimeline({ request: r }) {
  const st = requestStage(r);
  const events = [
    { at: r.requestedAt, title: 'Request filed', who: r.requestedByName || r.requestedByFullName, tone: 'gray' },
    r.submittedAt && { at: r.submittedAt, title: r.type === 'Replenishment' ? 'Submitted for Chief approval' : 'Submitted for inventory review', tone: 'blue' },
    ...(r.approvals ?? []).map(a => ({
      at: a.actedAt,
      title: `${ACTION_LABEL[a.actionName] ?? a.actionName} by ${ROLE_LABEL[a.approverRole] ?? a.approverRole}`,
      who: a.approverFullName,
      note: a.remarks,
      tone: a.actionName === 'Approved' ? 'green' : a.actionName === 'Rejected' ? 'red' : 'amber',
    })),
    r.poGeneratedAt && { at: r.poGeneratedAt, title: `Purchase order ${r.poNumber} raised`, tone: 'blue' },
    r.poDeliveredAt && { at: r.poDeliveredAt, title: 'Fully delivered by the supplier', tone: 'green' },
    r.releasedAt && { at: r.releasedAt, title: `Released to ${r.departmentName}`, tone: 'green' },
    r.status === 'Cancelled' && { at: r.updatedAt, title: 'Cancelled', tone: 'gray' },
  ].filter(Boolean).sort((a, b) => new Date(a.at) - new Date(b.at));
  const days = daysSince(r.updatedAt ?? r.requestedAt);
  const tone = PHASE_TONE[st.phase] ?? 'gray';

  return (
    <div className="rt">
      <style>{TIMELINE_CSS}</style>
      <label className="form-label">Status Tracking</label>
      <div className="rt-now">
        <span className={`badge badge-${tone}`}>{st.phase}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{st.text}</div>
          {st.holder && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Currently with <strong>{st.holder}</strong> · since {fmtDateTime(r.updatedAt ?? r.requestedAt)}
              {days > 0 && ` (${days} day${days > 1 ? 's' : ''})`}
            </div>
          )}
        </div>
      </div>
      <ol className="rt-list">
        {events.map((e, i) => (
          <li key={i} className={`rt-ev rt-${e.tone}`}>
            <div className="rt-title">{e.title}{e.who && <span className="rt-who"> — {e.who}</span>}</div>
            {e.note && <div className="rt-note">{e.note}</div>}
            <div className="rt-at">{fmtDateTime(e.at)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TIMELINE_CSS = `
.rt { margin: 14px 0; }
.rt-now { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-muted); }
.rt-list { list-style: none; margin: 12px 0 0 6px; padding: 0 0 0 14px; border-left: 2px solid var(--border); }
.rt-ev { position: relative; padding: 0 0 10px 6px; }
.rt-ev::before { content: ''; position: absolute; left: -21px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: var(--card-bg); border: 2px solid var(--text-muted); }
.rt-ev.rt-green::before { border-color: var(--green-600); background: var(--green-600); }
.rt-ev.rt-blue::before { border-color: var(--green-500); }
.rt-ev.rt-amber::before { border-color: var(--amber-500); background: var(--amber-500); }
.rt-ev.rt-red::before { border-color: var(--red-500); background: var(--red-500); }
.rt-title { font-size: 13px; font-weight: 600; }
.rt-who { font-weight: 400; color: var(--text-secondary); }
.rt-note { font-size: 12px; color: var(--text-muted); margin-top: 2px; white-space: pre-wrap; }
.rt-at { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
`;

// Request lines with the quantities each stage settled on. Approved/Released
// columns only appear once inventory has acted, so a fresh request stays simple.
export function RequestLinesTable({ request, itemMap, showCost = false }) {
  const items = request.items ?? [];
  if (request.type === 'Replenishment') return <PurchaseRequestLines items={items} showCost={showCost} />;
  const hasApproved = items.some(i => i.quantityApproved != null);
  const hasReleased = items.some(i => i.quantityReleased != null);
  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table>
        <thead>
          <tr>
            <th>Stock No.</th>
            <th>Item</th>
            <th>Requested</th>
            {hasApproved && <th>Allocated</th>}
            {hasReleased && <th>Released</th>}
            {itemMap && <th>In Stock</th>}
            {showCost && <th>Est. Cost</th>}
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => {
            const live = itemMap?.[String(it.inventoryItemId)];
            const cut = it.quantityApproved != null && it.quantityApproved < it.quantityRequested;
            return (
              <tr key={it.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{it.itemCode ?? '—'}</td>
                <td>
                  <strong>{it.itemName}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({it.unit})</span>
                  {it.categoryName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.categoryName}</div>}
                </td>
                <td style={{ fontWeight: 600 }}>{it.quantityRequested}</td>
                {hasApproved && (
                  <td style={{ fontWeight: 600, color: cut ? 'var(--amber-600)' : undefined }} title={cut ? 'Reduced by Inventory to share limited stock' : undefined}>
                    {it.quantityApproved ?? '—'}
                  </td>
                )}
                {hasReleased && <td style={{ fontWeight: 600, color: 'var(--green-600)' }}>{it.quantityReleased ?? '—'}</td>}
                {itemMap && (
                  <td>
                    {live ? (
                      <span className={`badge ${live.quantityOnHand >= it.quantityRequested ? 'badge-green' : live.quantityOnHand > 0 ? 'badge-amber' : 'badge-red'}`}>
                        {live.quantityOnHand} {it.unit}
                      </span>
                    ) : '—'}
                  </td>
                )}
                {showCost && <td>{it.estimatedUnitCost ? `₱${it.estimatedUnitCost.toLocaleString()}` : '—'}</td>}
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{it.remarks ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const CSS = `
.rp { display: flex; align-items: flex-start; }
.rp-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; color: var(--text-muted); }
.rp-step:not(:last-child)::after { content: ''; position: absolute; top: 13px; left: calc(50% + 16px); right: calc(-50% + 16px); height: 2px; background: var(--border); }
.rp-step.done:not(:last-child)::after { background: var(--green-500); }
.rp-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid var(--border); background: var(--bg-muted); }
.rp-step.done .rp-dot { background: var(--green-600); border-color: var(--green-600); color: #fff; }
.rp-step.now .rp-dot { border-color: var(--green-500); color: var(--green-600); box-shadow: 0 0 0 4px rgba(37,152,78,.15); }
.rp-step.now, .rp-step.done { color: var(--text-primary); }
.rp-label { font-size: 11px; font-weight: 600; text-align: center; }
`;

// A Purchase Request's lines as they appear on the printed Appendix 47 form:
// grouped by category, numbered straight through, with unit and total cost.
function PurchaseRequestLines({ items, showCost }) {
  const groups = groupPrLines(items, i => i.categoryName, i => i.itemName);
  const lineTotal = i => (i.estimatedUnitCost != null ? i.quantityRequested * i.estimatedUnitCost : null);
  const hasCost = items.some(i => i.estimatedUnitCost != null);
  const total = items.reduce((t, i) => t + (lineTotal(i) ?? 0), 0);
  const cols = showCost ? 6 : 4;
  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table>
        <thead>
          <tr>
            <th>Item No.</th>
            <th>Unit</th>
            <th>Item Description</th>
            <th>Quantity</th>
            {showCost && <th>Unit Cost</th>}
            {showCost && <th>Total Cost</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <Fragment key={g.category}>
              <tr>
                <td colSpan={cols} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-accent)', background: 'var(--bg-muted)' }}>
                  {g.category}
                </td>
              </tr>
              {g.lines.map(({ line: it, itemNo }) => (
                <tr key={it.id}>
                  <td style={{ textAlign: 'center' }}>{itemNo}</td>
                  <td>{formUnit(it.unit)}</td>
                  <td>
                    <strong>{it.itemName?.toUpperCase()}</strong>
                    {it.remarks && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.remarks}</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{it.quantityRequested}</td>
                  {showCost && <td>{it.estimatedUnitCost != null ? peso(it.estimatedUnitCost) : '—'}</td>}
                  {showCost && <td>{lineTotal(it) != null ? peso(lineTotal(it)) : '—'}</td>}
                </tr>
              ))}
            </Fragment>
          ))}
          {showCost && hasCost && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
              <td style={{ fontWeight: 700 }}>₱{peso(total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
