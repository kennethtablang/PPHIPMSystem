import { useEffect, useState } from 'react';
import { MdSearch, MdFilterList, MdDownload } from 'react-icons/md';
import { getAuditLogs } from '../../api/auditLogs';
import { toast } from '../../components/common/Toast';
import Pagination from '../../components/common/Pagination';
import { getAppPrefs } from '../../utils/appPrefs';
import { fmtDateTime } from '../../utils/format';

function exportCSV(logs) {
  const headers = ['Timestamp', 'User', 'Username', 'Action', 'Table', 'Record ID', 'Details', 'IP Address'];
  const rows = logs.map(l => [
    fmtDateTime(l.timestamp),
    l.userFullName ?? '',
    l.username ?? '',
    l.action ?? '',
    l.tableName ?? '',
    l.recordId ?? '',
    (l.details ?? '').replace(/"/g, '""'),
    l.ipAddress ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ACTIONS = ['', 'Login', 'Create', 'Update', 'Delete', 'Approve', 'Reject', 'Generate'];

const ACTION_COLOR = {
  Login: 'badge-blue',
  Create: 'badge-green',
  Update: 'badge-teal',
  Delete: 'badge-red',
  Approve: 'badge-green',
  Reject: 'badge-red',
  Generate: 'badge-purple',
  Return: 'badge-amber',
};

export default function AuditLogPage() {
  const now = new Date();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(() => getAppPrefs().tablePageSize);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    endDate: now.toISOString().split('T')[0],
  });
  const [applied, setApplied] = useState(null);

  const buildParams = f => {
    const params = {};
    if (f.search) params.search = f.search;
    if (f.action) params.action = f.action;
    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    return params;
  };

  // Server-side paging: only the requested page travels over the wire.
  const load = async (f, p = 1) => {
    setLoading(true);
    try {
      const { data } = await getAuditLogs({ ...buildParams(f), page: p, pageSize });
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
      setApplied(f);
    } catch { toast.error('Failed to load audit logs.'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when these inputs change
  useEffect(() => { load(filters); }, []);

  const set = k => e => setFilters(p => ({ ...p, [k]: e.target.value }));

  // CSV export covers the whole filtered set (up to the server's 1000-row cap).
  const exportAll = async () => {
    try {
      const { data } = await getAuditLogs({ ...buildParams(applied ?? filters), page: 1, pageSize: 1000 });
      exportCSV(data.items);
    } catch { toast.error('Failed to export audit logs.'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Read-only record of all system actions and changes</p>
        </div>
        {total > 0 && (
          <button className="btn btn-secondary" onClick={exportAll}>
            <MdDownload size={16} /> Export CSV
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">Search</label>
              <div style={{ position: 'relative' }}>
                <MdSearch size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" placeholder="User, table, record…" value={filters.search} onChange={set('search')} style={{ paddingLeft: 28 }} onKeyDown={e => e.key === 'Enter' && load(filters)} />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Action</label>
              <select className="form-control" value={filters.action} onChange={set('action')}>
                {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From</label>
              <input className="form-control" type="date" value={filters.startDate} onChange={set('startDate')} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To</label>
              <input className="form-control" type="date" value={filters.endDate} onChange={set('endDate')} />
            </div>
            <button className="btn btn-primary" onClick={() => load(filters)} disabled={loading} style={{ alignSelf: 'flex-end' }}>
              <MdFilterList size={14} /> {loading ? 'Searching…' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {applied && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{total} records found</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Table</th><th>Record ID</th><th>Details</th><th>IP Address</th></tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit records found for the selected filters.</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.timestamp)}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{l.userFullName ?? '—'}</div>
                      {l.username && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.username}</div>}
                    </td>
                    <td>
                      <span className={`badge ${ACTION_COLOR[l.action] ?? 'badge-gray'}`}>{l.action}</span>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{l.tableName}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{l.recordId ?? '—'}</td>
                    <td style={{ maxWidth: 280, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.details}>{l.details ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            setPage={p => load(applied ?? filters, p)}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}
