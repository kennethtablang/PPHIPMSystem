import { useEffect, useState } from 'react';
import { MdSearch, MdFilterList } from 'react-icons/md';
import { getAuditLogs } from '../../api/auditLogs';
import { toast } from '../../components/common/Toast';

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
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    endDate: now.toISOString().split('T')[0],
  });
  const [applied, setApplied] = useState(null);

  const load = async (f) => {
    setLoading(true);
    try {
      const params = {};
      if (f.search) params.search = f.search;
      if (f.action) params.action = f.action;
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      const { data } = await getAuditLogs(params);
      setLogs(data);
      setApplied(f);
    } catch { toast.error('Failed to load audit logs.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filters); }, []);

  const set = k => e => setFilters(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Read-only record of all system actions and changes</p>
        </div>
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
          {applied && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{logs.length} records found</div>}
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
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString('en-PH')}</td>
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
        </>
      )}
    </div>
  );
}
