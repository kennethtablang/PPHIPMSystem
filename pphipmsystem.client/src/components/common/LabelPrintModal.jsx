import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MdPrint } from 'react-icons/md';
import Modal from './Modal';
import { toast } from './Toast';

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 10mm; }
  .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .label {
    border: 1px dashed #bbb; border-radius: 6px; padding: 4mm;
    display: flex; gap: 4mm; align-items: center;
    break-inside: avoid; page-break-inside: avoid;
  }
  .label svg { flex-shrink: 0; }
  .label-title { font-size: 11px; font-weight: 700; color: #111; word-break: break-word; }
  .label-subtitle { font-size: 10px; font-family: monospace; color: #333; margin-top: 2px; }
  .label-meta { font-size: 9px; color: #666; margin-top: 2px; }
  @media print { @page { margin: 8mm; } }
`;

// Preview + print a sheet of QR labels. Each label: { qr, title, subtitle, meta }.
// The QR encodes the scannable text (item code / lot number) — a handheld
// scanner "types" that text into the focused search picker.
export default function LabelPrintModal({ title, labels, onClose }) {
  const sheetRef = useRef(null);

  const print = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast.error('Pop-up blocked — allow pop-ups to print labels.'); return; }

    const doc = win.document;
    doc.title = title;
    const style = doc.createElement('style');
    style.textContent = PRINT_CSS;
    doc.head.appendChild(style);
    doc.body.appendChild(sheet.cloneNode(true)); // QR SVGs clone as plain markup
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="modal-lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={print}>
            <MdPrint size={16} /> Print {labels.length} Label(s)
          </button>
        </>
      }
    >
      <div className="alert alert-info" style={{ fontSize: 12 }}>
        Scanning a label types its code into whichever search box is focused — press Enter to pick
        the match. Print on plain paper or 3-column label sheets.
      </div>

      <div ref={sheetRef} className="label-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        maxHeight: 420, overflowY: 'auto', padding: 2,
      }}>
        {labels.map((l, i) => (
          <div key={i} className="label" style={{
            border: '1px dashed var(--border)', borderRadius: 8, padding: 10,
            display: 'flex', gap: 10, alignItems: 'center', background: '#fff',
          }}>
            <QRCodeSVG value={l.qr} size={56} />
            <div style={{ minWidth: 0 }}>
              <div className="label-title" style={{ fontSize: 11, fontWeight: 700, color: '#111', wordBreak: 'break-word' }}>{l.title}</div>
              {l.subtitle && <div className="label-subtitle" style={{ fontSize: 10, fontFamily: 'monospace', color: '#333', marginTop: 2 }}>{l.subtitle}</div>}
              {l.meta && <div className="label-meta" style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{l.meta}</div>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
