import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Deep link from a notification: `/page?open=<id>` opens that record. The
// handler gets the id once, then the param is dropped so a refresh or the
// back button doesn't reopen it.
export default function useOpenParam(onOpen) {
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  // StrictMode runs effects twice in development; without this guard the
  // record opened twice and the second copy landed on top of whatever the
  // user clicked next.
  const handled = useRef(null);
  useEffect(() => {
    if (!open) { handled.current = null; return; }
    if (handled.current === open) return;
    handled.current = open;
    const id = Number(open);
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
    if (Number.isFinite(id)) onOpen(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the param only
  }, [open]);
}
