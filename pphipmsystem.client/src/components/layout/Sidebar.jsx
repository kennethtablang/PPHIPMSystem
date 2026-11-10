import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDisplayPrefs } from '../../utils/displayPrefs';
import { getNotificationSummary, NOTIFICATIONS_CHANGED } from '../../api/notifications';
import { signalRService } from '../../api/signalrService';
import { SECTION_BY_REFERENCE } from '../../utils/notificationLinks';
import {
  MdDashboard, MdInventory, MdWarehouse, MdHistory,
  MdShoppingCart, MdLocalShipping, MdBarChart, MdAssignment,
  MdPeople, MdBusiness, MdCategory, MdManageSearch, MdAnalytics,
  MdChevronLeft, MdChevronRight, MdGridView, MdBackup, MdChecklist,
} from 'react-icons/md';

const W_OPEN   = 252;
const W_CLOSED = 64;

const roleLabel = r => ({
  SuperAdmin:            'Super Admin',
  HospitalAdministrator: 'Hospital Admin',
  InventoryOfficer:      'Inventory Officer',
  ProcurementStaff:      'Procurement Staff',
  DepartmentHead:        'Department Head',
  DepartmentStaff:       'Department (Shared PC)',
}[r] ?? r);

const ADMIN = ['SuperAdmin', 'HospitalAdministrator'];
const INV   = 'InventoryOfficer';
const PROC  = 'ProcurementStaff';
const HEAD  = 'DepartmentHead';
const STAFF = 'DepartmentStaff';

// Navigation is organised around the system's two jobs — Inventory
// Management and Procurement Management — and each role only sees the pages
// it actually works in. `section` ties an entry to the notification badge.
const NAV = [
  {
    label: 'Inventory Management',
    items: [
      { to: '/inventory',        Icon: MdInventory,  label: 'Stock Items',        roles: [...ADMIN, INV, PROC], section: 'items',
        hint: 'Check stock, adjust quantities, replenish' },
      { to: '/materials',        Icon: MdChecklist,  label: 'Available Supplies', roles: [HEAD], section: 'items',
        hint: 'What the storeroom has in stock' },
      { to: '/batches',          Icon: MdGridView,   label: 'Batches & Expiry',   roles: [...ADMIN, INV, PROC], section: 'batches',
        hint: 'Lots, expiry dates and disposal' },
      { to: '/department-stock', Icon: MdWarehouse,  label: 'Department Stock',   roles: [...ADMIN, INV, PROC, HEAD, STAFF],
        hint: 'Stock held by each ward' },
      { to: '/stock-movements',  Icon: MdHistory,    label: 'Stock History',      roles: [...ADMIN, INV], section: 'stock-history',
        match: ['/stock-movements', '/stock-adjustments'], hint: 'Every receipt, issue and adjustment' },
    ],
  },
  {
    label: 'Procurement Management',
    items: [
      { to: '/procurement',         Icon: MdShoppingCart,  label: 'Requests',        roles: [...ADMIN, INV, PROC], section: 'requests',
        hint: 'Review, approve and release requests' },
      { to: '/department-requests', Icon: MdAssignment,    label: 'My Requests',     roles: [HEAD, STAFF], section: 'requests',
        hint: 'Request supplies and confirm receipt' },
      { to: '/purchase-orders',     Icon: MdLocalShipping, label: 'Purchase Orders', roles: [...ADMIN, INV, PROC], section: 'purchase-orders',
        hint: 'Orders and supplier deliveries' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports',  Icon: MdBarChart,  label: 'Reports',         roles: [...ADMIN, INV, PROC] },
      { to: '/forecast', Icon: MdAnalytics, label: 'Demand Forecast', roles: [...ADMIN, INV, PROC] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users',       Icon: MdPeople,       label: 'Users',       roles: ADMIN },
      { to: '/departments', Icon: MdBusiness,     label: 'Departments', roles: ADMIN },
      { to: '/categories',  Icon: MdCategory,     label: 'Categories',  roles: ADMIN },
      { to: '/backups',     Icon: MdBackup,       label: 'Backups',     roles: ADMIN },
      { to: '/audit-logs',  Icon: MdManageSearch, label: 'Audit Logs',  roles: ADMIN },
    ],
  },
];

// Unread notifications per sidebar section, kept live from SignalR.
function useSectionBadges() {
  const [badges, setBadges] = useState({});
  useEffect(() => {
    const load = () => getNotificationSummary()
      .then(r => {
        const next = {};
        Object.entries(r.data.byReferenceType ?? {}).forEach(([type, n]) => {
          const key = SECTION_BY_REFERENCE[type];
          if (key) next[key] = (next[key] ?? 0) + n;
        });
        setBadges(next);
      })
      .catch(() => {});
    load();
    const onNew = n => {
      const key = SECTION_BY_REFERENCE[n?.referenceType];
      if (key) setBadges(b => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
    };
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    signalRService.onNotificationReceived(onNew);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
      signalRService.offNotificationReceived(onNew);
    };
  }, []);
  return badges;
}

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;
  // Start collapsed if the user prefers it, or auto-collapse on narrow viewports; users can still expand manually.
  const [collapsed, setCollapsed] = useState(() => getDisplayPrefs().sidebarCollapsed || window.matchMedia('(max-width: 900px)').matches);
  const badges = useSectionBadges();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = e => setCollapsed(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? `${W_CLOSED}px` : `${W_OPEN}px`
    );
  }, [collapsed]);

  const groups = NAV
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(role)) }))
    .filter(g => g.items.length > 0);

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
          <Item to="/dashboard" Icon={MdDashboard} label="Dashboard" collapsed={collapsed} />

          {groups.map(g => (
            <Group key={g.label} label={g.label} collapsed={collapsed}>
              {g.items.map(i => (
                <Item key={i.to} {...i} collapsed={collapsed} badge={i.section ? badges[i.section] : 0} />
              ))}
            </Group>
          ))}
        </nav>

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
            <span className="sb-group-text">{label}</span>
            <span className="sb-group-line" />
          </div>
        )
      }
      {children}
    </div>
  );
}

function Item({ to, Icon, label, hint, collapsed, badge = 0, match }) {
  const { pathname } = useLocation();
  const extraActive = match && match.some(m => pathname.startsWith(m));
  return (
    <NavLink
      to={to}
      title={collapsed ? (badge ? `${label} — ${badge} new` : label) : hint}
      className={({ isActive }) => `sb-item${isActive || extraActive ? ' sb-item--active' : ''}`}
      style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
    >
      <span className="sb-icon">
        <Icon size={15} />
        {collapsed && badge > 0 && <span className="sb-dot-badge" />}
      </span>
      {!collapsed && <span className="sb-label">{label}</span>}
      {!collapsed && badge > 0 && <span className="sb-badge">{badge > 99 ? '99+' : badge} New</span>}
    </NavLink>
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
    padding: 16px 12px 14px; flex-shrink: 0; gap: 8px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .sb--collapsed .sb-header { justify-content: center; }

  .sb-logo { display: flex; align-items: center; gap: 10px; min-width: 0; }
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
    display: flex; align-items: center; gap: 10px;
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
    gap: 0px; overflow-y: auto; overflow-x: hidden;
  }
  .sb-nav::-webkit-scrollbar { width: 0; }

  /* ── Group ── */
  .sb-group { margin-bottom: 4px; margin-top: 4px; }

  .sb-group-label {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 6px 5px;
  }
  .sb-group-line {
    flex: 1; height: 1px;
    background: rgba(255,255,255,.07);
    display: block;
  }
  .sb-group-text {
    color: rgba(255,255,255,.42); font-size: 9px;
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
    display: flex; align-items: center; gap: 10px;
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
  .sb-item:hover:not(.sb-item--active) {
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
  .sb-item:hover:not(.sb-item--active) .sb-icon {
    background: rgba(255,255,255,.12);
    color: rgba(255,255,255,.82);
    border-color: rgba(255,255,255,.14);
  }
  .sb-item--active .sb-icon {
    background: linear-gradient(135deg, rgba(37,152,78,.5), rgba(79,208,122,.25));
    border-color: rgba(79,208,122,.45);
    color: #4fd07a;
    box-shadow: 0 0 12px rgba(79,208,122,.22);
  }

  .sb-label { overflow: hidden; text-overflow: ellipsis; flex: 1; }

  .sb-icon { position: relative; }

  /* "N New" badge — unread notifications about records on that page */
  .sb-badge {
    margin-left: auto; flex-shrink: 0;
    background: #ef4444; color: #fff;
    font-size: 10px; font-weight: 700; letter-spacing: .02em;
    padding: 3px 9px; border-radius: 99px;
    box-shadow: 0 0 12px rgba(239,68,68,.55);
  }
  .sb-dot-badge {
    position: absolute; top: -2px; right: -2px;
    width: 10px; height: 10px; border-radius: 50%;
    background: #ef4444; border: 2px solid #080e0a;
  }

`;
