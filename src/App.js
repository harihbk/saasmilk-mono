import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import SaasAdminLayout from './components/SaasAdminLayout/SaasAdminLayout';
import Login from './pages/Auth/Login';
import TenantLogin from './pages/Auth/TenantLogin';
import Register from './pages/Auth/Register';
import CompanyManagement from './pages/SaasAdmin/CompanyManagement';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Orders from './pages/Orders/Orders';
import SalesInvoices from './pages/Invoices/SalesInvoices';
import Receipts from './pages/Receipts/Receipts';
import Customers from './pages/Customers/Customers';
import Suppliers from './pages/Suppliers/Suppliers';
import Inventory from './pages/Inventory/Inventory';
import InventoryManagement from './pages/Inventorystock/InventoryManagement';

import Users from './pages/Users/Users';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';
import HistoryReport from './pages/Reports/HistoryReport';
import DealerReports from './pages/Reports/DealerReports';
import DealerBalanceSheet from './pages/Reports/DealerBalanceSheet';
import SimpleBalanceSheet from './pages/Reports/SimpleBalanceSheet';
import PaymentHistory from './pages/Reports/PaymentHistory';
import RouteReports from './components/RouteReports/RouteReports';
import TenantManagement from './pages/SaasAdmin/TenantManagement';
import Companies from './pages/Companies/Companies';
import SaasAdminDashboard from './pages/SaasAdmin/SaasAdminDashboard';
import SaasAdminLogin from './pages/SaasAdmin/SaasAdminLogin';
import Fleet from './pages/Fleet/Fleet';
import Assets from './pages/Assets/Assets';
import GatePass from './pages/GatePass/GatePass';
import FleetMaintenance from './pages/FleetMaintenance/FleetMaintenance';
import Procurement from './pages/Procurement/Procurement';
import TallyStyleProcurement from './pages/Procurement/TallyStyleProcurement';
import './App.css';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Navigate to="/dashboard" /> : children;
};

const SaasProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('saas_admin_token');

  if (!token) {
    return <Navigate to="/saas-admin/login" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/tenant" element={
        <PublicRoute>
          <TenantLogin />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />


        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="invoices" element={<SalesInvoices />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventorystock" element={<InventoryManagement />} />

        <Route path="procurement" element={<Procurement />} />
        <Route path="procurement/create" element={<TallyStyleProcurement />} />
        <Route path="procurement/analytics" element={<Procurement />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="fleet-maintenance" element={<FleetMaintenance />} />
        <Route path="assets" element={<Assets />} />
        <Route path="gate-passes" element={<GatePass />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports/history" element={<HistoryReport />} />
        <Route path="reports/dealers" element={<DealerReports />} />
        <Route path="reports/balance-sheet" element={<DealerBalanceSheet />} />
        <Route path="reports/simple-balance" element={<SimpleBalanceSheet />} />
        <Route path="reports/payment-history" element={<PaymentHistory />} />
        <Route path="reports/routes" element={<RouteReports />} />
        <Route path="tenant-management" element={<TenantManagement />} />
        <Route path="companies" element={<CompanyManagement />} />
      </Route>

      {/* SaaS Admin Routes - Separate Layout */}
      <Route path="/saas-admin/login" element={<SaasAdminLogin />} />
      <Route path="/saas-admin/*" element={
        <SaasProtectedRoute>
          <SaasAdminLayout />
        </SaasProtectedRoute>
      }>
        <Route path="dashboard" element={<SaasAdminDashboard />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="companies" element={<CompanyManagement />} />
        <Route path="billing" element={<div>Billing Management</div>} />
        <Route path="users" element={<Users />} />
        <Route path="analytics/revenue" element={<div>Revenue Analytics</div>} />
        <Route path="analytics/usage" element={<div>Usage Analytics</div>} />
        <Route path="analytics/reports" element={<div>Reports</div>} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Router basename='/milk'>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
