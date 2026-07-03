import { MdInfoOutline } from 'react-icons/md';
import { useAuth } from '../../../context/AuthContext';

const APP_VERSION = '1.0.0';

export default function AboutTab() {
  const { user } = useAuth();

  const rows = [
    ['Application', 'Integrated Procurement & Inventory Management System (IPMS)'],
    ['Organization', 'Pangasinan Provincial Hospital'],
    ['Version', APP_VERSION],
    ['Signed in as', user?.fullName ?? '—'],
    ['Username', user?.username ?? '—'],
    ['Role', user?.role?.replace(/([A-Z])/g, ' $1').trim() ?? '—'],
  ];

  return (
    <div className="card" style={{ padding: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MdInfoOutline size={18} color="var(--green-600)" /> About
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map(([label, value], i) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', gap: 16,
            padding: '12px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
