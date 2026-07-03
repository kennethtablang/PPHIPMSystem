import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch, MdInventory, MdStore, MdShoppingCart, MdLocalShipping, MdPerson } from 'react-icons/md';
import api from '../../api/axios';

const GROUPS = [
  { key: 'items', label: 'Inventory Items', Icon: MdInventory, to: r => ({ path: '/inventory', state: { search: r.title } }) },
  { key: 'suppliers', label: 'Suppliers', Icon: MdStore, to: r => ({ path: '/suppliers', state: { search: r.title } }) },
  { key: 'requests', label: 'Procurement Requests', Icon: MdShoppingCart, to: () => ({ path: '/procurement' }) },
  { key: 'purchaseOrders', label: 'Purchase Orders', Icon: MdLocalShipping, to: () => ({ path: '/purchase-orders' }) },
  { key: 'users', label: 'Users', Icon: MdPerson, to: r => ({ path: '/users', state: { search: r.title } }) },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onChange = e => {
    const value = e.target.value;
    setQ(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: value.trim() } });
        setResults(data);
        setOpen(true);
      } catch { /* transient search failure — just don't show results */ }
    }, 300);
  };

  const go = (group, r) => {
    const { path, state } = group.to(r);
    setOpen(false);
    setQ('');
    setResults(null);
    navigate(path, state ? { state } : undefined);
  };

  const total = results ? GROUPS.reduce((n, g) => n + (results[g.key]?.length ?? 0), 0) : 0;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <MdSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        className="form-control"
        value={q}
        onChange={onChange}
        onFocus={() => { if (results) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); } }}
        placeholder="Search items, suppliers, PR/PO…"
        style={{ width: 240, paddingLeft: 34, borderRadius: 99, fontSize: 12.5 }}
      />

      {open && results && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
          maxHeight: 420, overflowY: 'auto',
          background: 'var(--surface)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 200, padding: 6,
        }}>
          {total === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              No matches for “{q.trim()}”.
            </div>
          ) : GROUPS.map(g => {
            const rows = results[g.key] ?? [];
            if (rows.length === 0) return null;
            return (
              <div key={g.key}>
                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {g.label}
                </div>
                {rows.map(r => (
                  <button
                    key={`${g.key}-${r.id}`}
                    type="button"
                    onClick={() => go(g, r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 12px', borderRadius: 8, border: 'none', background: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <g.Icon size={15} color="var(--green-600)" style={{ flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      {r.subtitle && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{r.subtitle}</span>}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
