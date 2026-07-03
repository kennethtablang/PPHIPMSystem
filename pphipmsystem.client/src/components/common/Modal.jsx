import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

export default function Modal({ title, onClose, children, footer, size = '' }) {
  const dialogRef = useRef(null);
  // Keep the latest onClose in a ref so the mount effect can run exactly once.
  // Callers pass a fresh inline `onClose` on every render; depending on it here
  // would re-run the effect each keystroke and steal focus back to the dialog,
  // making inputs accept only a single character.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const onKeyDown = e => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Portal to <body> so the fixed overlay is positioned relative to the viewport,
  // not to any transformed/filtered ancestor (e.g. the animated page wrapper).
  // Without this the overlay is clamped to the content area, leaving the topbar
  // uncovered and off-centering the modal on long, scrollable pages.
  return createPortal(
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
    </div>,
    document.body
  );
}
