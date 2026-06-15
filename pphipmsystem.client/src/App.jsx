import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import InventoryList from './pages/inventory/InventoryList';
import ItemBatches from './pages/inventory/ItemBatches';

import StockMovements from './pages/stock/StockMovements';
import StockAdjustments from './pages/stock/StockAdjustments';

import SupplierList from './pages/suppliers/SupplierList';
import ProcurementList from './pages/procurement/ProcurementList';
import PurchaseOrders from './pages/procurement/PurchaseOrders';

import ForecastPage from './pages/forecast/ForecastPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';

import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import AuditLogPage from './pages/audit/AuditLogPage';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  return <PrivateRoute roles={['HospitalAdministrator']}>{children}</PrivateRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="inventory" element={<InventoryList />} />
          <Route path="inventory/batches" element={<ItemBatches />} />

          <Route path="stock/movements" element={<StockMovements />} />
          <Route path="stock/adjustments" element={<StockAdjustments />} />

          <Route path="suppliers" element={<SupplierList />} />
          <Route path="procurement/requests" element={<ProcurementList />} />
          <Route path="procurement/purchase-orders" element={<PurchaseOrders />} />

          <Route path="forecast" element={<ForecastPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          <Route path="admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="admin/departments" element={<AdminRoute><DepartmentsPage /></AdminRoute>} />
          <Route path="admin/categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="audit" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
