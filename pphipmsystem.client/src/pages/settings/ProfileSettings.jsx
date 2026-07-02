import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../api/users';
import { toast } from '../../components/common/Toast';
import { MdPerson, MdSave, MdSecurity, MdEmail } from 'react-icons/md';

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    twoFactorEnabled: false,
    role: '',
    departmentName: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getProfile();
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          twoFactorEnabled: data.twoFactorEnabled || false,
          role: data.role || '',
          departmentName: data.departmentName || 'N/A',
        });
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setProfile(p => ({ ...p, [k]: val }));
  };

  const handleToggle2FA = () => {
    if (!profile.twoFactorEnabled && !profile.email.trim()) {
      toast.error('You must provide a valid email address before enabling Two-Factor Authentication.');
      return;
    }
    setProfile(p => ({ ...p, twoFactorEnabled: !p.twoFactorEnabled }));
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (profile.twoFactorEnabled && !profile.email.trim()) {
        toast.error('Email is required for Two-Factor Authentication.');
        setSaving(false);
        return;
      }
      await updateProfile(profile);
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading profile...</div>;

  return (
    <div className="fade-in slide-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--green-100), var(--green-50))',
          color: 'var(--green-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <MdPerson size={24} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.5px' }}>
            Profile Settings
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Manage your personal information and security preferences.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={submit}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            Personal Information
          </h3>
          
          <div className="grid-2" style={{ gap: 24, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>First Name</label>
              <input
                type="text"
                className="form-control"
                value={profile.firstName}
                onChange={set('firstName')}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Last Name</label>
              <input
                type="text"
                className="form-control"
                value={profile.lastName}
                onChange={set('lastName')}
                required
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <MdEmail size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-control"
                  value={profile.email}
                  onChange={set('email')}
                  placeholder="Enter your email"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Role</label>
              <input type="text" className="form-control" value={profile.role} disabled style={{ background: 'var(--bg-muted)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Department</label>
              <input type="text" className="form-control" value={profile.departmentName} disabled style={{ background: 'var(--bg-muted)' }} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdSecurity size={18} color="var(--green-600)" /> Security
          </h3>

          <div style={{
            background: profile.twoFactorEnabled ? 'rgba(79,208,122,.08)' : 'var(--bg-muted)',
            border: `1px solid ${profile.twoFactorEnabled ? 'rgba(79,208,122,.3)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32,
            transition: 'all .2s ease'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
                Two-Factor Authentication (2FA)
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Add an extra layer of security to your account. When enabled, you'll need to enter a verification code sent to your email each time you log in.
              </p>
            </div>
            <button
              type="button"
              className={`btn ${profile.twoFactorEnabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggle2FA}
            >
              {profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : <><MdSave size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
