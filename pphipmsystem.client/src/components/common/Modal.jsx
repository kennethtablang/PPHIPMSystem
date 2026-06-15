import { MdClose } from 'react-icons/md';

export default function Modal({ title, onClose, children, footer, size = '' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button
            className="btn btn-icon"
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.1)', border: 'none' }}
          >
            <MdClose size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
