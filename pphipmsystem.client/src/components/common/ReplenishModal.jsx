import { useState } from 'react';
import { MdInventory2, MdWarning } from 'react-icons/md';
import { receiveBatches } from '../../api/batches';
import Modal from './Modal';
import { toast } from './Toast';

// Restock straight from the inventory list: one line per item, each recording
// its own lot number and expiration date. Every line becomes an ItemBatch, so
// the new stock is immediately visible to FEFO issuance and expiry tracking.
//
// The whole receipt goes to /itembatches/bulk in one request, which applies it
// atomically — a rejected line means nothing was written, so re-submitting
// after a fix can never double-count the lines that were already fine.
const blankLine = item => ({
  inventoryItemId: item.id,
  name: item.name,
  unit: item.unit,
  quantityOnHand: item.quantityOnHand,
  lotNumber: '',
  quantity: '',
  expirationDate: '',
  unitCost: '',
});

export default function ReplenishModal({ items, onClose, onDone }) {
  const [lines, setLines] = useState(() => items.map(blankLine));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setLine = (i, k) => e => setLines(p => {
    const next = [...p];
    next[i] = { ...next[i], [k]: e.target.value };
    return next;
  });

  const filled = lines.filter(l => l.quantity !== '' && +l.quantity > 0);

  const save = async () => {
    if (filled.length === 0) { toast.error('Enter a quantity for at least one item.'); return; }

    setSaving(true);
    setError(null);
    try {
      const { data } = await receiveBatches(filled.map(line => ({
        inventoryItemId: line.inventoryItemId,
        lotNumber: line.lotNumber || null,
        quantity: +line.quantity,
        expirationDate: line.expirationDate || null,
        unitCost: line.unitCost === '' ? null : +line.unitCost,
      })));
      toast.success(
        `Replenished ${data.batchesCreated} item${data.batchesCreated === 1 ? '' : 's'} ` +
        `(${data.totalQuantity} unit${data.totalQuantity === 1 ? '' : 's'}). Stock on hand updated.`
      );
      onDone();
      onClose();
    } catch (e) {
      // Nothing was written — keep the modal open with the entries intact so the
      // user can correct the offending line and submit the same receipt again.
      setError(e.response?.data?.message ?? 'Failed to receive these items. No stock was changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={items.length === 1 ? `Replenish: ${items[0].name}` : `Replenish ${items.length} Items`}
      onClose={onClose}
      size="modal-xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || filled.length === 0}>
            <MdInventory2 size={16} />
            {saving ? 'Receiving…' : `Receive ${filled.length} Item${filled.length === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <div className="alert alert-info" style={{ fontSize: 12 }}>
        Each line is received as a <strong>batch</strong> — recording the expiration date here is what
        drives expiry alerts and FEFO issuance. Leave a quantity blank to skip that item.
        Unit cost is optional and feeds inventory valuation. The receipt is applied all at once:
        if any line is rejected, nothing is saved.
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'block', fontSize: 12 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWarning size={14} /> Nothing was saved
          </strong>
          <div style={{ marginTop: 4 }}>{error}</div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ width: 110 }}>On Hand</th>
              <th style={{ width: 160 }}>Lot / Batch No.</th>
              <th style={{ width: 120 }}>Qty Received</th>
              <th style={{ width: 165 }}>Expiration Date</th>
              <th style={{ width: 130 }}>Unit Cost (₱)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.inventoryItemId}>
                <td style={{ fontWeight: 500 }}>
                  {l.name}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.unit}</div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{l.quantityOnHand} {l.unit}</td>
                <td>
                  <input
                    className="form-control"
                    value={l.lotNumber}
                    onChange={setLine(i, 'lotNumber')}
                    placeholder="e.g. LOT-2026-001"
                    maxLength={100}
                  />
                </td>
                <td>
                  <input
                    className="form-control"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={l.quantity}
                    onChange={setLine(i, 'quantity')}
                    placeholder="0"
                  />
                </td>
                <td>
                  <input
                    className="form-control"
                    type="date"
                    value={l.expirationDate}
                    onChange={setLine(i, 'expirationDate')}
                  />
                </td>
                <td>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.unitCost}
                    onChange={setLine(i, 'unitCost')}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
