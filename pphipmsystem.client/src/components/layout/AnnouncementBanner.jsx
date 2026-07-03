import { useEffect, useState } from 'react';
import { MdCampaign, MdClose } from 'react-icons/md';
import { getSystemSettings } from '../../api/systemSettings';

// Dismissals are remembered per message text, so editing the announcement
// (or posting a new one) makes the banner reappear for everyone.
const DISMISSED_KEY = 'dismissedAnnouncement';

export default function AnnouncementBanner() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSystemSettings()
      .then(({ data }) => {
        const msg = (data.announcementMessage ?? '').trim();
        if (msg && localStorage.getItem(DISMISSED_KEY) !== msg) setMessage(msg);
      })
      .catch(() => {}); // no banner is a fine fallback
  }, []);

  if (!message) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, message);
    setMessage('');
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, var(--green-50), rgba(79,208,122,.12))',
        borderBottom: '1px solid rgba(79,208,122,.3)',
        color: 'var(--green-700)',
        fontSize: 13, fontWeight: 500,
      }}
    >
      <MdCampaign size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}
