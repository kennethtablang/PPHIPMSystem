import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdDashboard, MdInventory, MdWarehouse, MdSwapVert, MdTune,
  MdShoppingCart, MdLocalShipping, MdStore, MdBarChart,
  MdPeople, MdBusiness, MdCategory, MdHistory, MdAnalytics,
  MdNotifications
} from 'react-icons/md';

const ROLE = {
  Admin: 'HospitalAdministrator',
  Inventory: 'InventoryOfficer',
  Procurement: 'ProcurementStaff',
  DeptHead: 'DepartmentHead',
};

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? 'active' : ''}`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="nav-section">
      <div className="nav-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const role = user?.role;

  const is = (...roles) => roles.includes(role);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <MdWarehouse size={22} />
        </div>
        <div className="logo-text">
          <div className="logo-name">PPH IPMS</div>
          <div className="logo-sub">Inventory & Procurement</div>
        </div>
      </div>

      {/* User chip */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.fullName?.charAt(0) ?? 'U'}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.fullName}</div>
          <div className="user-role">{role?.replace(/([A-Z])/g, ' $1').trim()}</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavSection title="Overview">
          <NavItem to="/" icon={MdDashboard} label="Dashboard" />
          <NavItem to="/notifications" icon={MdNotifications} label="Notifications" />
        </NavSection>

        {is(ROLE.Admin, ROLE.Inventory, ROLE.Procurement, ROLE.DeptHead) && (
          <NavSection title="Inventory">
            <NavItem to="/inventory" icon={MdInventory} label="Items" />
            <NavItem to="/batches" icon={MdCategory} label="Batches & Expiry" />
            {is(ROLE.Admin, ROLE.Inventory) && (
              <>
                <NavItem to="/stock-movements" icon={MdSwapVert} label="Stock Movements" />
                <NavItem to="/stock-adjustments" icon={MdTune} label="Adjustments" />
              </>
            )}
          </NavSection>
        )}

        {is(ROLE.Admin, ROLE.Procurement, ROLE.DeptHead) && (
          <NavSection title="Procurement">
            <NavItem to="/procurement" icon={MdShoppingCart} label="Requests" />
            {is(ROLE.Admin, ROLE.Procurement) && (
              <>
                <NavItem to="/purchase-orders" icon={MdLocalShipping} label="Purchase Orders" />
                <NavItem to="/suppliers" icon={MdStore} label="Suppliers" />
              </>
            )}
          </NavSection>
        )}

        {is(ROLE.Admin, ROLE.Inventory, ROLE.Procurement) && (
          <NavSection title="Analytics">
            <NavItem to="/forecast" icon={MdAnalytics} label="Demand Forecast" />
            <NavItem to="/reports" icon={MdBarChart} label="Reports" />
          </NavSection>
        )}

        {is(ROLE.Admin) && (
          <NavSection title="Administration">
            <NavItem to="/users" icon={MdPeople} label="Users" />
            <NavItem to="/departments" icon={MdBusiness} label="Departments" />
            <NavItem to="/categories" icon={MdCategory} label="Categories" />
            <NavItem to="/audit-logs" icon={MdHistory} label="Audit Logs" />
          </NavSection>
        )}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--sidebar-bg);
          display: flex; flex-direction: column;
          position: fixed; left: 0; top: 0;
          z-index: 100; overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 18px 16px;
        }
        .logo-icon {
          width: 38px; height: 38px;
          background: rgba(255,255,255,.15);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,.2);
        }
        .logo-name { color: #fff; font-size: 15px; font-weight: 700; letter-spacing: -.2px; }
        .logo-sub { color: rgba(255,255,255,.5); font-size: 10px; font-weight: 400; margin-top: 1px; }
        .sidebar-user {
          margin: 0 12px 4px;
          padding: 10px 12px;
          background: rgba(255,255,255,.08);
          border-radius: var(--radius-md);
          display: flex; align-items: center; gap: 10px;
          border: 1px solid rgba(255,255,255,.1);
        }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--green-400), var(--green-600));
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 14px; font-weight: 700; flex-shrink: 0;
        }
        .user-name { color: #fff; font-size: 13px; font-weight: 600; }
        .user-role { color: rgba(255,255,255,.5); font-size: 10px; }
        .sidebar-divider { height: 1px; background: rgba(255,255,255,.1); margin: 8px 16px; }
        .sidebar-nav { flex: 1; padding: 4px 12px; display: flex; flex-direction: column; gap: 2px; }
        .nav-section { margin-bottom: 4px; }
        .nav-section-title {
          color: rgba(255,255,255,.35); font-size: 10px;
          font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          padding: 10px 8px 4px;
        }
        .sidebar-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: var(--radius-sm);
          color: rgba(255,255,255,.65); font-size: 13px; font-weight: 500;
          transition: all .15s ease; cursor: pointer;
        }
        .sidebar-item:hover { background: rgba(255,255,255,.1); color: #fff; }
        .sidebar-item.active {
          background: rgba(255,255,255,.15);
          color: #fff; font-weight: 600;
          box-shadow: inset 2px 0 0 var(--green-300);
        }
        .sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,.1); margin-top: auto; }
        .sidebar-logout {
          width: 100%; padding: 9px 12px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
          border-radius: var(--radius-sm); color: rgba(255,255,255,.6);
          font-size: 13px; cursor: pointer; text-align: left;
          transition: all .15s;
        }
        .sidebar-logout:hover { background: rgba(239,68,68,.2); color: #fca5a5; border-color: rgba(239,68,68,.3); }
      `}</style>
    </aside>
  );
}
