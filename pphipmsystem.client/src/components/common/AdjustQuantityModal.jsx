import { useState } from 'react';
import { MdTune, MdArrowForward } from 'react-icons/md';
import { createAdjustment } from '../../api/stockAdjustments';
import Modal from './Modal';
import { toast } from './Toast';

const QUICK_REASONS = [
  'Physical count correction',
  'Damaged / unusable stock',
  'Expired stock removed',
  'Found stock not yet recorded',
  'Data entry error',
];

const fmt = n => Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

// Direct stock correction from the Items list (Revision 4). The officer types
// the correct quantity and why; it applies immediately — no approval wait —
// and the system records the original quantity, the new quantity, the date
// and who made it (see Stock History → Adjustments).
export default function AdjustQuantityModal({ item, onClose, onDone }) {
  const [newQty, setNewQty] = useState(String(item.quantityOnHand));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = newQty === '' ? NaN : Number(newQty);
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const diff = valid ? parsed - item.quantityOnHand : 0;

  const save = async () => {
    if (!valid) { toast.error('Enter the correct quantity (0 or more).'); return; }
    if (diff === 0) { toast.error('The quantity is unchanged — nothing to adjust.'); return; }
    if (reason.trim().length < 3) { toast.error('Give a reason for the adjustment.'); return; }
    setSaving(true);
    try {
      await createAdjustment({ inventoryItemId: item.id, physicalCount: parsed, reason: reason.trim() });
      toast.success(`${item.name}: ${fmt(item.quantityOnHand)} → ${fmt(parsed)} ${item.unit}. Recorded in Stock History.`);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to adjust the quantity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MdTune /> Adjust Quantity</span>}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !valid || diff === 0}>
            {saving ? 'Saving…' : 'Save Adjustment'}
          </button>
        </>
      }
    >
      <style>{CSS}</style>
      <div className="aq-item">
        <strong>{item.name}</strong>
        <span>{item.itemCode ? `${item.itemCode} · ` : ''}{item.unit}{item.brand ? ` · ${item.brand}` : ''}</span>
      </div>

      <div className="aq-row">
        <div className="aq-box">
          <span className="aq-cap">Current (system)</span>
          <span className="aq-num">{fmt(item.quantityOnHand)}</span>
        </div>
        <MdArrowForward size={22} className="aq-arrow" />
        <div className="aq-box aq-new">
          <label className="aq-cap" htmlFor="aq-qty">Correct quantity *</label>
          <input
            id="aq-qty" className="form-control" type="number" min="0" step="1" autoFocus
            value={newQty} onChange={e => setNewQty(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}
          />
        </div>
      </div>
      {valid && diff !== 0 && (
        <div className={`aq-diff ${diff > 0 ? 'up' : 'down'}`}>
          {diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))} {item.unit} {diff > 0 ? 'will be added' : 'will be deducted'}
        </div>
      )}

      <div className="form-group" style={{ marginTop: 14 }}>
        <label className="form-label">Reason for adjustment *</label>
        <div className="aq-chips">
          {QUICK_REASONS.map(r => (
            <button key={r} type="button" className={`aq-chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <textarea
          className="form-control" rows={2} maxLength={500} value={reason}
          onChange={e => setReason(e.target.value)} placeholder="Pick one above or type the reason"
        />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
        Applied immediately. The original and adjusted quantities, the reason, the date and your name are recorded.
      </div>
    </Modal>
  );
}

const CSS = `
.aq-item { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
.aq-item strong { font-size: 15px; color: var(--text-primary); }
.aq-item span { font-size: 12px; color: var(--text-muted); }
.aq-row { display: flex; align-items: center; gap: 12px; }
.aq-box { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-muted); }
.aq-new { background: transparent; border-color: var(--green-500); }
.aq-cap { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-secondary); }
.aq-num { font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1.3; }
.aq-new .form-control { font-size: 18px; font-weight: 700; padding: 6px 10px; }
.aq-arrow { color: var(--text-muted); flex-shrink: 0; }
.aq-diff { margin-top: 10px; font-size: 13px; font-weight: 700; }
.aq-diff.up { color: var(--green-600); }
.aq-diff.down { color: #dc2626; }
.aq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
.aq-chip { border: 1px solid var(--border); background: transparent; color: var(--text-secondary); border-radius: 99px; padding: 4px 11px; font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.aq-chip.on { background: var(--green-600); border-color: var(--green-600); color: #fff; }
@media (max-width: 520px) { .aq-row { flex-direction: column; align-items: stretch; } .aq-arrow { transform: rotate(90deg); align-self: center; } }
`;
