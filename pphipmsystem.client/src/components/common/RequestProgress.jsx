import { Fragment } from 'react';
import { MdCheck } from 'react-icons/md';
import { formUnit, groupPrLines, peso } from '../../utils/purchaseRequest';

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
