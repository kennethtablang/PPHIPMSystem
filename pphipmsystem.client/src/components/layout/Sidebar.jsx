import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdDashboard, MdInventory, MdWarehouse, MdSwapVert, MdTune,
  MdShoppingCart, MdLocalShipping, MdStore, MdBarChart,
  MdPeople, MdBusiness, MdCategory, MdHistory, MdAnalytics,
  MdNotifications, MdChevronLeft, MdChevronRight, MdLogout,
  MdGridView,
} from 'react-icons/md';

const W_OPEN   = 252;
const W_CLOSED = 64;

const ROLE = {
  SuperAdmin:  'SuperAdmin',
  Admin:       'HospitalAdministrator',
  Inventory:   'InventoryOfficer',
  Procurement: 'ProcurementStaff',
  DeptHead:    'DepartmentHead',
};

const roleLabel = r => ({
  SuperAdmin:            'Super Admin',
  HospitalAdministrator: 'Hospital Admin',
  InventoryOfficer:      'Inventory Officer',
  ProcurementStaff:      'Procurement Staff',
  DepartmentHead:        'Department Head',
}[r] ?? r);

export default function Sidebar({ onRequestLogout }) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const is = (...roles) => roles.includes(role);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? `${W_CLOSED}px` : `${W_OPEN}px`
    );
  }, [collapsed]);

  return (
    <>
      <style>{CSS}</style>
      <aside className={`sb ${collapsed ? 'sb--collapsed' : ''}`}>

        {/* ── Header ── */}
        <div className="sb-header">
          {!collapsed && (
            <div className="sb-logo">
              <div className="sb-logo-icon">
                <MdWarehouse size={20} color="#fff" />
              </div>
              <div>
                <div className="sb-logo-name">PPH IPMS</div>
                <div className="sb-logo-sub">Inventory &amp; Procurement</div>
              </div>
            </div>
          )}
          <button
            className="sb-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <MdChevronRight size={16} /> : <MdChevronLeft size={16} />}
          </button>
        </div>

        {/* ── User card ── */}
        <div className="sb-user" title={collapsed ? `${user?.fullName} · ${roleLabel(role)}` : undefined}>
          <div className="sb-avatar">
            {user?.fullName?.charAt(0) ?? 'U'}
            <span className="sb-online" />
          </div>
          {!collapsed && (
            <div className="sb-user-info">
              <div className="sb-user-name">{user?.fullName}</div>
              <div className="sb-user-role">{roleLabel(role)}</div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">

          <Group label="Main" collapsed={collapsed}>
            <Item to="/dashboard"     Icon={MdDashboard}    label="Dashboard"     collapsed={collapsed} />
            <Item to="/notifications" Icon={MdNotifications} label="Notifications" collapsed={collapsed} />
          </Group>

          {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Inventory, ROLE.Procurement, ROLE.DeptHead) && (
            <Group label="Inventory" collapsed={collapsed}>
              <Item to="/inventory"         Icon={MdInventory} label="Items"            collapsed={collapsed} />
              <Item to="/materials"         Icon={MdInventory} label="Materials List"   collapsed={collapsed} />
              <Item to="/batches"           Icon={MdGridView}  label="Batches & Expiry" collapsed={collapsed} />
              {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Inventory) && (
                <>
                  <Item to="/stock-movements"   Icon={MdSwapVert} label="Stock Movements"  collapsed={collapsed} />
                  <Item to="/stock-adjustments" Icon={MdTune}     label="Adjustments"      collapsed={collapsed} />
                </>
              )}
            </Group>
          )}

          {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Procurement, ROLE.Inventory, ROLE.DeptHead) && (
            <Group label="Procurement" collapsed={collapsed}>
              {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Procurement, ROLE.Inventory) && (
                <Item to="/procurement" Icon={MdShoppingCart} label="Requests" collapsed={collapsed} />
              )}
              {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.DeptHead) && (
                <Item to="/department-requests" Icon={MdShoppingCart} label="Dept. Requests" collapsed={collapsed} />
              )}
              {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Procurement) && (
                <>
                  <Item to="/purchase-orders" Icon={MdLocalShipping} label="Purchase Orders" collapsed={collapsed} />
                  <Item to="/suppliers"       Icon={MdStore}         label="Suppliers"       collapsed={collapsed} />
                </>
              )}
            </Group>
          )}

          {is(ROLE.SuperAdmin, ROLE.Admin, ROLE.Inventory, ROLE.Procurement) && (
            <Group label="Analytics" collapsed={collapsed}>
              <Item to="/forecast" Icon={MdAnalytics} label="Demand Forecast" collapsed={collapsed} />
              <Item to="/reports"  Icon={MdBarChart}  label="Reports"         collapsed={collapsed} />
            </Group>
          )}

          {is(ROLE.SuperAdmin, ROLE.Admin) && (
            <Group label="Administration" collapsed={collapsed}>
              <Item to="/users"       Icon={MdPeople}   label="Users"       collapsed={collapsed} />
              <Item to="/departments" Icon={MdBusiness} label="Departments" collapsed={collapsed} />
              <Item to="/categories"  Icon={MdCategory} label="Categories"  collapsed={collapsed} />
              <Item to="/audit-logs"  Icon={MdHistory}  label="Audit Logs"  collapsed={collapsed} />
            </Group>
          )}

        </nav>

        {/* ── Logout ── */}
        <div className="sb-footer">
          {confirmOpen && (
            <div style={{
              background: 'rgba(30,10,10,0.92)',
              border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 8,
            }}>
              {!collapsed && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, marginBottom: 10 }}>
                  Are you sure you want to log out? You will need to sign in again to access your account.
                </p>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setConfirmOpen(false)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 99,
                    background: 'rgba(255,255,255,.08)',
                    border: '1px solid rgba(255,255,255,.14)',
                    color: 'rgba(255,255,255,.7)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={logout}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 99,
                    background: 'rgba(239,68,68,.18)',
                    border: '1px solid rgba(239,68,68,.35)',
                    color: '#fca5a5',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
          <LogoutBtn collapsed={collapsed} active={confirmOpen} onClick={() => setConfirmOpen(v => !v)} />
        </div>

      </aside>
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Group({ label, collapsed, children }) {
  return (
    <div className="sb-group">
      {collapsed
        ? <div className="sb-group-dot" />
        : (
          <div className="sb-group-label">
            <span className="sb-group-line" />
            <span className="sb-group-text">{label}</span>
            <span className="sb-group-line" />
          </div>
        )
      }
      {children}
    </div>
  );
}

function Item({ to, Icon, label, collapsed }) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={({ isActive }) => `sb-item${isActive ? ' sb-item--active' : ''}${hov && !window.location.pathname.startsWith(to) ? ' sb-item--hov' : ''}`}
      style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
    >
      {({ isActive }) => (
        <>
          <span className={`sb-icon${isActive ? ' sb-icon--active' : hov ? ' sb-icon--hov' : ''}`}>
            <Icon size={15} />
          </span>
          {!collapsed && <span className="sb-label">{label}</span>}
          {!collapsed && isActive && <span className="sb-active-pip" />}
        </>
      )}
    </NavLink>
  );
}

function LogoutBtn({ collapsed, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={collapsed ? 'Sign Out' : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`sb-logout${active ? ' sb-logout--hov' : hov ? ' sb-logout--hov' : ''}`}
      style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
    >
      <MdLogout size={15} style={{ flexShrink: 0 }} />
      {!collapsed && <span>Sign Out</span>}
    </button>
  );
}

/* ── CSS ──────────────────────────────────────────────────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

  .sb {
    width: ${W_OPEN}px;
    height: 100vh;
    position: fixed; left: 0; top: 0;
    z-index: 100;
    display: flex; flex-direction: column;
    overflow-x: hidden; overflow-y: auto;
    transition: width .22s cubic-bezier(.4,0,.2,1);
    background: rgba(8,18,11,0.92);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    border-right: 1px solid rgba(255,255,255,.07);
    font-family: 'Montserrat', sans-serif;
  }
  .sb--collapsed { width: ${W_CLOSED}px; }

  /* scrollbar */
  .sb::-webkit-scrollbar { width: 3px; }
  .sb::-webkit-scrollbar-track { background: transparent; }
  .sb::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

  /* ── Header ── */
  .sb-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 12px 14px; flex-shrink: 0; gap: 8;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .sb--collapsed .sb-header { justify-content: center; }

  .sb-logo { display: flex; align-items: center; gap: 10; min-width: 0; }
  .sb-logo-icon {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #1a6a36, #4fd07a);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(79,208,122,.35), inset 0 1px 0 rgba(255,255,255,.2);
    border: 1.5px solid rgba(79,208,122,.35);
  }
  .sb-logo-name {
    color: #fff; font-size: 14px; font-weight: 800;
    letter-spacing: -.3px; white-space: nowrap;
  }
  .sb-logo-sub {
    color: rgba(255,255,255,.32); font-size: 9.5px; white-space: nowrap; margin-top: 1px; font-weight: 500;
  }

  .sb-toggle {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    color: rgba(255,255,255,.5);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s;
  }
  .sb-toggle:hover {
    background: rgba(79,208,122,.18);
    color: #4fd07a;
    border-color: rgba(79,208,122,.35);
    box-shadow: 0 0 12px rgba(79,208,122,.2);
  }

  /* ── User card ── */
  .sb-user {
    margin: 12px 10px 4px;
    padding: 10px 12px;
    background: rgba(79,208,122,.07);
    border: 1px solid rgba(79,208,122,.14);
    border-radius: 20px;
    display: flex; align-items: center; gap: 10;
    flex-shrink: 0; overflow: hidden;
    position: relative;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .sb--collapsed .sb-user { justify-content: center; padding: 8px; margin: 10px 8px 4px; }

  .sb-avatar {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #4fd07a, #1a6a36);
    border: 2px solid rgba(79,208,122,.5);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 14px; font-weight: 800;
    position: relative;
    box-shadow: 0 0 18px rgba(79,208,122,.28);
  }
  .sb-online {
    position: absolute; bottom: 0; right: 0;
    width: 9px; height: 9px; border-radius: 50%;
    background: #4fd07a;
    border: 2px solid #080e0a;
    box-shadow: 0 0 8px rgba(79,208,122,.9);
  }
  .sb-user-info { min-width: 0; }
  .sb-user-name {
    color: #fff; font-size: 12px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sb-user-role {
    color: rgba(255,255,255,.36); font-size: 10px;
    white-space: nowrap; margin-top: 1px; font-weight: 500;
  }

  /* ── Nav ── */
  .sb-nav {
    flex: 1; padding: 4px 8px 8px;
    display: flex; flex-direction: column;
    gap: 0; overflow-y: auto; overflow-x: hidden;
  }
  .sb-nav::-webkit-scrollbar { width: 0; }

  /* ── Group ── */
  .sb-group { margin-bottom: 4px; }

  .sb-group-label {
    display: flex; align-items: center; gap: 8;
    padding: 10px 6px 5px;
  }
  .sb-group-line {
    flex: 1; height: 1px;
    background: rgba(255,255,255,.07);
    display: block;
  }
  .sb-group-text {
    color: rgba(255,255,255,.24); font-size: 9px;
    font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; white-space: nowrap;
    flex-shrink: 0;
  }
  .sb-group-dot {
    height: 1px; background: rgba(255,255,255,.06);
    margin: 8px 6px 5px;
  }

  /* ── Nav item ── */
  .sb-item {
    display: flex; align-items: center; gap: 10;
    padding: 7px 10px; border-radius: 50px; margin-bottom: 2px;
    text-decoration: none;
    color: rgba(255,255,255,.48);
    font-size: 12.5px; font-weight: 500;
    transition: background .15s, color .15s, box-shadow .15s;
    position: relative; overflow: hidden;
    white-space: nowrap;
    border: 1px solid transparent;
    font-family: 'Montserrat', sans-serif;
  }
  .sb-item--hov {
    background: rgba(255,255,255,.06);
    color: rgba(255,255,255,.82);
    border-color: rgba(255,255,255,.07);
  }
  .sb-item--active {
    background: linear-gradient(135deg, rgba(26,106,54,.6) 0%, rgba(79,208,122,.18) 100%);
    color: #fff;
    border-color: rgba(79,208,122,.28);
    box-shadow: 0 2px 18px rgba(79,208,122,.14), inset 0 1px 0 rgba(255,255,255,.08);
    font-weight: 700;
  }

  /* ── Icon circle ── */
  .sb-icon {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.09);
    color: rgba(255,255,255,.48);
    transition: all .15s;
  }
  .sb-icon--hov {
    background: rgba(255,255,255,.12);
    color: rgba(255,255,255,.82);
    border-color: rgba(255,255,255,.14);
  }
  .sb-icon--active {
    background: linear-gradient(135deg, rgba(37,152,78,.5), rgba(79,208,122,.25));
    border-color: rgba(79,208,122,.45);
    color: #4fd07a;
    box-shadow: 0 0 12px rgba(79,208,122,.22);
  }

  .sb-label { overflow: hidden; text-overflow: ellipsis; flex: 1; }

  /* Active right pip */
  .sb-active-pip {
    width: 6px; height: 6px; border-radius: 50%;
    background: #4fd07a; flex-shrink: 0; margin-left: auto;
    box-shadow: 0 0 8px rgba(79,208,122,.8);
  }

  /* ── Footer ── */
  .sb-footer {
    padding: 8px 8px 16px; flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,.06);
  }

  .sb-logout {
    display: flex; align-items: center; gap: 10;
    padding: 8px 12px; width: 100%; border-radius: 50px;
    background: transparent;
    border: 1px solid rgba(255,255,255,.08);
    color: rgba(255,255,255,.42);
    font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all .15s;
    white-space: nowrap; overflow: hidden;
    font-family: 'Montserrat', sans-serif;
  }
  .sb-logout--hov {
    background: rgba(239,68,68,.14);
    border-color: rgba(239,68,68,.3);
    color: #fca5a5;
  }
`;
