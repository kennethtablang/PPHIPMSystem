import { useEffect, useState } from 'react';
import { MdBackup, MdDownload, MdDelete, MdSchedule, MdPlayArrow, MdVerified, MdHelpOutline, MdStorage } from 'react-icons/md';
import { getBackups, runBackup, deleteBackup, downloadBackup, verifyBackup, getBackupSchedule, updateBackupSchedule } from '../../api/backups';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { fmtDateTime } from '../../utils/format';

const fmtBytes = b => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
const fmtDate = d => fmtDateTime(d);

export default function BackupManagementPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [schedule, setSchedule] = useState('00:00');
  const [savedSchedule, setSavedSchedule] = useState('00:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getBackups().then(r => setBackups(r.data)).catch(() => toast.error('Failed to load backups.')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getBackupSchedule().then(r => { setSchedule(r.data.time); setSavedSchedule(r.data.time); }).catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runBackup();
      toast.success('Backup created successfully.');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Backup failed.');
      load();
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await updateBackupSchedule(schedule);
      setSavedSchedule(schedule);
      toast.success(`Daily backup scheduled for ${schedule}.`);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to update schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDownload = async (b, format = 'xlsx') => {
    try {
      const res = await downloadBackup(b.id, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'bak' ? b.fileName.replace(/\.xlsx$/i, '.bak') : b.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed.');
    }
  };

  // RESTORE VERIFYONLY on the server — confirms the .bak is actually restorable.
  const handleVerify = async b => {
    setVerifyingId(b.id);
    try {
      const { data } = await verifyBackup(b.id);
      toast.success(data.message);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Verification failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBackup(deleteTarget.id);
      toast.success('Backup deleted.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete backup.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Backup Management</h1>
          <p className="page-subtitle">Daily Excel snapshots of the system for disaster recovery. Backups older than 30 days are removed automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setGuideOpen(true)}>
            <MdHelpOutline size={16} /> Restore Guide
          </button>
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            <MdPlayArrow size={16} /> {running ? 'Backing up…' : 'Run Backup Now'}
          </button>
        </div>
      </div>

      {/* Schedule */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'var(--green-50)', color: 'var(--green-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MdSchedule size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Daily backup time</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Runs automatically every day at this time (server time). Currently set to <strong>{savedSchedule}</strong>.
            </div>
          </div>
          <input
            type="time"
            className="form-control"
            value={schedule}
            onChange={e => setSchedule(e.target.value)}
            style={{ width: 140 }}
          />
          <button className="btn btn-primary" onClick={handleSaveSchedule} disabled={savingSchedule || schedule === savedSchedule}>
            {savingSchedule ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>File</th><th>Type</th><th>Status</th><th>Records</th><th>Size</th><th>Triggered By</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <MdBackup size={28} style={{ opacity: .4 }} /><div style={{ marginTop: 8 }}>No backups yet.</div>
                </td></tr>
              ) : backups.map(b => (
                <tr key={b.id}>
                  <td style={{ fontSize: 12 }}>{fmtDate(b.createdAt)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{b.fileName || '—'}</td>
                  <td><span className={`badge ${b.type === 'Scheduled' ? 'badge-blue' : 'badge-gray'}`}>{b.type}</span></td>
                  <td>
                    <span className={`badge ${b.status === 'Success' ? 'badge-green' : 'badge-red'}`} title={b.errorMessage ?? undefined}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{b.status === 'Success' ? b.recordCount.toLocaleString() : '—'}</td>
                  <td style={{ fontSize: 13 }}>{b.status === 'Success' ? fmtBytes(b.fileSizeBytes) : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.triggeredByName ?? 'System'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDownload(b)}
                        disabled={b.status !== 'Success'}
                        title="Download Excel data export"
                      >
                        <MdDownload size={15} />
                      </button>
                      {b.hasDatabaseFile && (
                        <>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleDownload(b, 'bak')}
                            title="Download SQL database backup (.bak)"
                          >
                            <MdStorage size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleVerify(b)}
                            disabled={verifyingId === b.id}
                            title="Verify the .bak is restorable"
                            style={{ color: 'var(--green-600)' }}
                          >
                            <MdVerified size={15} />
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDeleteTarget(b)}
                        title="Delete"
                        style={{ color: '#dc2626' }}
                      >
                        <MdDelete size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {guideOpen && (
        <Modal
          title="Restoring from a Backup"
          onClose={() => setGuideOpen(false)}
          size="modal-lg"
          footer={<button className="btn btn-secondary" onClick={() => setGuideOpen(false)}>Close</button>}
        >
          <div className="alert alert-info" style={{ fontSize: 12 }}>
            Each successful backup produces two files: an <strong>Excel data export</strong> (human-readable,
            for audits and spot-checks — it deliberately excludes password hashes) and a
            <strong> SQL database backup (.bak)</strong>, which is the file that restores the system.
            Use <em>Verify</em> regularly to confirm .bak files are restorable — a backup is only as good as its last test.
          </div>

          <ol style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Stop the IPMS application</strong> — a database cannot be restored while the app is connected to it.</li>
            <li><strong>Download the .bak</strong> for the backup you want (the disk icon), or locate it in the server's <code>Backups</code> folder.</li>
            <li>
              <strong>Restore with sqlcmd</strong> (run as an administrator on the database server):
              <pre style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 11, overflowX: 'auto', marginTop: 6 }}>
{`sqlcmd -S "(localdb)\\MSSQLLocalDB" -Q "RESTORE DATABASE [PPHIPMSystem]
  FROM DISK = 'C:\\path\\to\\IPMS_Backup_....bak'
  WITH REPLACE"`}
              </pre>
              Adjust the server name and database name to your environment.
            </li>
            <li><strong>Restart the application.</strong> Pending EF migrations newer than the backup apply automatically on startup.</li>
            <li><strong>Have everyone sign in again</strong> — restoring rolls back refresh tokens and any changes made after the backup was taken.</li>
          </ol>

          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            Restoring overwrites the current database. Anything entered after the backup timestamp is lost —
            take a fresh backup first if the current state may still be needed.
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Backup"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Delete the backup from <strong>{fmtDate(deleteTarget.createdAt)}</strong>? The Excel file will be permanently removed and cannot be recovered.
          </p>
        </Modal>
      )}
    </div>
  );
}
