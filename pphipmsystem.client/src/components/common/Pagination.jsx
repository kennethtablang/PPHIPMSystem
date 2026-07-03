import { useState } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { getAppPrefs } from '../../utils/appPrefs';

// Client-side pagination for data tables. Page size comes from the user's
// "Rows per table page" preference (Settings → Preferences).
//
//   const pager = usePagination(rows);
//   ...render pager.pageItems...
//   <Pagination {...pager} />
export function usePagination(items) {
  const [pageSize] = useState(() => getAppPrefs().tablePageSize);
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages); // clamp when filters shrink the list
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { pageItems, page: safePage, setPage, totalPages, total, pageSize };
}

export default function Pagination({ page, setPage, totalPages, total, pageSize }) {
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const navBtn = disabled => ({
    width: 30, height: 30, borderRadius: '50%',
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '12px 4px 0', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Showing {start}–{end} of {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label="Previous page"
          style={navBtn(page <= 1)}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <MdChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80, textAlign: 'center' }}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          style={navBtn(page >= totalPages)}
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
