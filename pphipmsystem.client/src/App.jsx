import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { getResolvedLandingPage } from './utils/appPrefs';
import Layout from './components/layout/Layout';

import Login from './pages/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ForcePasswordChange from './pages/auth/ForcePasswordChange';

// Chart-heavy pages are lazy-loaded so recharts lands in its own chunk
// instead of the initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ForecastPage = lazy(() => import('./pages/forecast/ForecastPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));

import InventoryList from './pages/inventory/InventoryList';
import ItemBatches from './pages/inventory/ItemBatches';

import StockMovements from './pages/stock/StockMovements';
import StockAdjustments from './pages/stock/StockAdjustments';
import DepartmentStockPage from './pages/stock/DepartmentStockPage';

import ProcurementList from './pages/procurement/ProcurementList';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import DepartmentRequestsPage from './pages/procurement/DepartmentRequestsPage';
import MaterialsList from './pages/inventory/MaterialsList';

import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';

import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import DepartmentBudgetsPage from './pages/admin/DepartmentBudgetsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import BackupManagementPage from './pages/admin/BackupManagementPage';
import AuditLogPage from './pages/audit/AuditLogPage';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Accounts with an assigned password must set their own before entering the app.
  if (user.mustChangePassword) return <Navigate to="/force-password" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

// Route guards mirror the sidebar and the server's [Authorize] role lists, so a
// typed URL can't open a page whose API calls would all come back 403.
const INVENTORY_ROLES = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer'];
const STAFF_ROLES = ['SuperAdmin', 'HospitalAdministrator', 'InventoryOfficer', 'ProcurementStaff'];

function AdminRoute({ children }) {
  return <PrivateRoute roles={['SuperAdmin', 'HospitalAdministrator']}>{children}</PrivateRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/force-password" element={<ForcePasswordChange />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to={getResolvedLandingPage()} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<SettingsPage />} />

          <Route path="inventory" element={<InventoryList />} />
          <Route path="materials" element={<MaterialsList />} />
          <Route path="batches" element={<ItemBatches />} />

          <Route path="stock-movements" element={<PrivateRoute roles={INVENTORY_ROLES}><StockMovements /></PrivateRoute>} />
          <Route path="stock-adjustments" element={<PrivateRoute roles={INVENTORY_ROLES}><StockAdjustments /></PrivateRoute>} />
          <Route path="department-stock" element={<DepartmentStockPage />} />

          {/* Department heads land here from "reorder" shortcuts; the server scopes them to their own department. */}
          <Route path="procurement" element={<PrivateRoute roles={[...STAFF_ROLES, 'DepartmentHead']}><ProcurementList /></PrivateRoute>} />
          <Route path="department-requests" element={<PrivateRoute roles={['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead', 'DepartmentStaff']}><DepartmentRequestsPage /></PrivateRoute>} />
          <Route path="purchase-orders" element={<PrivateRoute roles={STAFF_ROLES}><PurchaseOrders /></PrivateRoute>} />
          {/* Admins set the figures; procurement staff and department heads read
              them (the server scopes heads to their own department). */}
          <Route
            path="budgets"
            element={
              <PrivateRoute roles={['SuperAdmin', 'HospitalAdministrator', 'ProcurementStaff', 'DepartmentHead']}>
                <DepartmentBudgetsPage />
              </PrivateRoute>
            }
          />

          <Route path="forecast" element={<PrivateRoute roles={STAFF_ROLES}><ForecastPage /></PrivateRoute>} />
          <Route path="reports" element={<PrivateRoute roles={STAFF_ROLES}><ReportsPage /></PrivateRoute>} />
          <Route path="notifications" element={<NotificationsPage />} />

          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="departments" element={<AdminRoute><DepartmentsPage /></AdminRoute>} />
          <Route path="categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="backups" element={<AdminRoute><BackupManagementPage /></AdminRoute>} />
          <Route path="audit-logs" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
