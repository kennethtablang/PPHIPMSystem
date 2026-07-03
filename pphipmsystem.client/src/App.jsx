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

import SupplierList from './pages/suppliers/SupplierList';
import ProcurementList from './pages/procurement/ProcurementList';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import DepartmentRequestsPage from './pages/procurement/DepartmentRequestsPage';
import MaterialsList from './pages/inventory/MaterialsList';

import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';

import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
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

          <Route path="stock-movements" element={<StockMovements />} />
          <Route path="stock-adjustments" element={<StockAdjustments />} />

          <Route path="suppliers" element={<SupplierList />} />
          <Route path="procurement" element={<ProcurementList />} />
          <Route path="department-requests" element={<PrivateRoute roles={['SuperAdmin', 'HospitalAdministrator', 'DepartmentHead']}><DepartmentRequestsPage /></PrivateRoute>} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />

          <Route path="forecast" element={<ForecastPage />} />
          <Route path="reports" element={<ReportsPage />} />
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
