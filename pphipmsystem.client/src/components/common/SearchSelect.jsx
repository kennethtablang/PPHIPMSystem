import { useEffect, useMemo, useRef, useState } from 'react';
import { MdSearch, MdClose, MdCheck } from 'react-icons/md';

// Searchable replacement for <select> — type to filter instead of scrolling a
// long dropdown. Calls onChange with an event-shaped { target: { value } } so
// existing <select> handlers (e => e.target.value) work unchanged.
//
//   <SearchSelect
//     value={form.inventoryItemId}
//     onChange={set('inventoryItemId')}
//     options={items.map(i => ({ value: i.id, label: i.name, sublabel: `${i.quantityOnHand} ${i.unit} in stock` }))}
//     placeholder="Search items…"
//   />
export default function SearchSelect({ value, onChange, options, placeholder = 'Search…', style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [flipUp, setFlipUp] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value ?? '')) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const emit = v => onChange({ target: { value: String(v) } });

  const openList = () => {
    // Open upward when there isn't room for the list below the input.
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setFlipUp(spaceBelow < 280 && rect.top > spaceBelow);
    }
    setQuery(''); setActive(0); setOpen(true);
  };
  const closeList = () => { setOpen(false); setQuery(''); };

  const pick = o => { emit(o.value); closeList(); inputRef.current?.blur(); };
  const clear = e => { e.stopPropagation(); emit(''); closeList(); };

  // Close when clicking anywhere outside the component.
  useEffect(() => {
    const onDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) closeList(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Keep the active option visible while navigating with arrow keys.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = e => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { openList(); e.preventDefault(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { setActive(a => Math.min(a + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActive(a => Math.max(a - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') { if (filtered[active]) pick(filtered[active]); e.preventDefault(); }
    else if (e.key === 'Escape') { closeList(); inputRef.current?.blur(); }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <MdSearch
          size={15}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
        />
        <input
          ref={inputRef}
          className="form-control"
          role="combobox"
          aria-expanded={open}
          value={open ? query : (selected?.label ?? '')}
          placeholder={selected && !open ? selected.label : placeholder}
          onFocus={openList}
          onChange={e => { setQuery(e.target.value); setActive(0); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          style={{ paddingLeft: 34, paddingRight: selected ? 34 : undefined }}
        />
        {selected && (
          <button
            type="button"
            onMouseDown={clear}
            aria-label="Clear selection"
            tabIndex={-1}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--bg-muted)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MdClose size={13} />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute', zIndex: 50, left: 0, right: 0,
            ...(flipUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            maxHeight: 260, overflowY: 'auto',
            background: 'var(--surface, #fff)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: '0 12px 32px rgba(5,46,16,.14)',
            padding: 4,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No matching items.</div>
          ) : filtered.map((o, i) => {
            const isSelected = selected && String(o.value) === String(selected.value);
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={e => { e.preventDefault(); pick(o); }}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  background: i === active ? 'var(--green-50)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</div>
                  {o.sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.sublabel}</div>}
                </div>
                {isSelected && <MdCheck size={15} color="var(--green-600)" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
