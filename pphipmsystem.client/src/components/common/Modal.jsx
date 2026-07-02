import { useEffect, useRef } from 'react';
import { MdClose } from 'react-icons/md';

export default function Modal({ title, onClose, children, footer, size = '' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKeyDown = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
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
