import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch, MdInventory, MdShoppingCart, MdLocalShipping, MdPerson } from 'react-icons/md';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const GROUPS = [
  { key: 'items', label: 'Inventory Items', Icon: MdInventory, to: r => ({ path: '/inventory', state: { search: r.title } }) },
  // Department heads work from their own requests page (the server already limits their results).
  { key: 'requests', label: 'Procurement Requests', Icon: MdShoppingCart, to: (r, role) => ({ path: role === 'DepartmentHead' ? '/department-requests' : '/procurement' }) },
  { key: 'purchaseOrders', label: 'Purchase Orders', Icon: MdLocalShipping, to: () => ({ path: '/purchase-orders' }) },
  { key: 'users', label: 'Users', Icon: MdPerson, to: r => ({ path: '/users', state: { search: r.title } }) },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K (or Cmd+K) focuses the search from anywhere in the app.
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Ignore responses that arrive after a newer query was typed.
  const latestQuery = useRef('');

  const onChange = e => {
    const value = e.target.value;
    setQ(value);
    latestQuery.current = value.trim();
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: value.trim() } });
        if (latestQuery.current !== value.trim()) return;
        setResults(data);
        setActiveIdx(-1);
        setOpen(true);
      } catch { /* transient search failure — just don't show results */ }
    }, 300);
  };

  const go = (group, r) => {
    const { path, state } = group.to(r, user?.role);
    setOpen(false);
    setQ('');
    setResults(null);
    navigate(path, state ? { state } : undefined);
  };

  // Flat list of visible rows in render order, for arrow-key navigation.
  const flat = results ? GROUPS.flatMap(g => (results[g.key] ?? []).map(r => ({ group: g, r }))) : [];
  const total = flat.length;

  const onKeyDown = e => {
    if (!open || total === 0) {
      if (e.key === 'Escape') e.currentTarget.blur();
      return;
    }
    if (e.key === 'ArrowDown') { setActiveIdx(i => Math.min(i + 1, total - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActiveIdx(i => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && activeIdx >= 0) { const { group, r } = flat[activeIdx]; go(group, r); e.preventDefault(); }
    else if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <MdSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        className="form-control"
        value={q}
        onChange={onChange}
        onFocus={() => { if (results) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder="Search…  (Ctrl+K)"
        title="Search items, PR/PO — Ctrl+K"
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
                {rows.map(r => {
                  const flatIdx = flat.findIndex(f => f.group.key === g.key && f.r.id === r.id);
                  return (
                  <button
                    key={`${g.key}-${r.id}`}
                    type="button"
                    onClick={() => go(g, r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: flatIdx === activeIdx ? 'var(--green-50)' : 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                    onMouseEnter={() => setActiveIdx(flatIdx)}
                  >
                    <g.Icon size={15} color="var(--green-600)" style={{ flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      {r.subtitle && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{r.subtitle}</span>}
                    </span>
                  </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
