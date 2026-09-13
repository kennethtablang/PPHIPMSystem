import { useEffect, useRef, useState } from 'react';
import { MdAttachFile, MdDownload, MdDelete } from 'react-icons/md';
import { getAttachments, uploadAttachment, downloadAttachment, deleteAttachment } from '../../api/procurement';
import { toast } from './Toast';
import { useAuth } from '../../context/AuthContext';

const fmtSize = b => b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

// Supporting documents on a procurement request: list, upload, download,
// delete (own files; admins can delete any). Used inside the view modals.
export default function AttachmentsPanel({ requestId }) {
  const { user } = useAuth();
  const isAdmin = ['SuperAdmin', 'HospitalAdministrator'].includes(user?.role);

  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    getAttachments(requestId).then(r => setFiles(r.data)).catch(() => {});
  }, [requestId]);

  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      const { data } = await uploadAttachment(requestId, file);
      setFiles(f => [...f, data]);
      toast.success(`${data.fileName} attached.`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload failed.');
    } finally { setBusy(false); }
  };

  const download = async f => {
    try {
      const res = await downloadAttachment(f.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = f.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed.'); }
  };

  const remove = async f => {
    try {
      await deleteAttachment(f.id);
      setFiles(list => list.filter(x => x.id !== f.id));
      toast.success('Attachment removed.');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to remove attachment.');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label className="form-label" style={{ margin: 0 }}>
          Attachments {files.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({files.length})</span>}
        </label>
        <button className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          <MdAttachFile size={14} /> {busy ? 'Uploading…' : 'Attach File'}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc" onChange={pick} style={{ display: 'none' }} />
      </div>

      {files.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 8, border: '1px dashed var(--border)' }}>
          No supporting documents yet — attach quotations or canvass sheets (PDF, images, Office files, max 10 MB).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-muted)', border: '1px solid var(--border)',
            }}>
              <MdAttachFile size={15} color="var(--green-600)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.fileName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmtSize(f.fileSizeBytes)} · {f.uploadedByFullName} · {new Date(f.uploadedAt).toLocaleDateString('en-PH')}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => download(f)} title="Download">
                <MdDownload size={15} />
              </button>
              {(isAdmin || f.uploadedByUserId === user?.userId) && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(f)} title="Remove" style={{ color: '#dc2626' }}>
                  <MdDelete size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
