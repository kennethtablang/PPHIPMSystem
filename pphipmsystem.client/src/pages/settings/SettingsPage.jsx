import { useSearchParams } from 'react-router-dom';
import { MdPerson, MdSecurity, MdPalette, MdTune, MdInfoOutline, MdSettings, MdDns } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import ProfileTab from './tabs/ProfileTab';
import SecurityTab from './tabs/SecurityTab';
import DisplayTab from './tabs/DisplayTab';
import PreferencesTab from './tabs/PreferencesTab';
import SystemTab from './tabs/SystemTab';
import AboutTab from './tabs/AboutTab';

const ALL_TABS = [
  { id: 'profile', label: 'Profile', Icon: MdPerson, Component: ProfileTab },
  { id: 'security', label: 'Security', Icon: MdSecurity, Component: SecurityTab },
  { id: 'preferences', label: 'Preferences', Icon: MdTune, Component: PreferencesTab },
  { id: 'display', label: 'Display', Icon: MdPalette, Component: DisplayTab },
  { id: 'system', label: 'System', Icon: MdDns, Component: SystemTab, roles: ['SuperAdmin', 'HospitalAdministrator'] },
  { id: 'about', label: 'About', Icon: MdInfoOutline, Component: AboutTab },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const TABS = ALL_TABS.filter(t => !t.roles || t.roles.includes(user?.role));
  const [params, setParams] = useSearchParams();
  const active = TABS.find(t => t.id === params.get('tab')) ?? TABS[0];
  const ActiveComponent = active.Component;

  const selectTab = id => setParams(id === TABS[0].id ? {} : { tab: id }, { replace: true });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--green-100), var(--green-50))',
          color: 'var(--green-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MdSettings size={24} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.5px' }}>
            Settings
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Manage your profile, security, and app preferences.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`settings-tab ${t.id === active.id ? 'active' : ''}`}
              onClick={() => selectTab(t.id)}
              aria-current={t.id === active.id ? 'page' : undefined}
            >
              <t.Icon size={16} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
