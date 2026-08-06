import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';

// Pages loaded gate
import { useDashboard } from '../context/DashboardContext';
import Overview from '../pages/dashboard/Overview';
import ProductList from '../pages/marketplace/products/ProductList';
import Orders from '../pages/orders/Orders';
import Customers from '../pages/customers/Customers';
import BusinessList from '../pages/business/BusinessList';
import Profile from '../pages/settings/Profile';
import Membership from '../pages/settings/Membership';
import Wallet from '../pages/wallet/Wallet';
import ServiceList from '../pages/marketplace/services/ServiceList';
import DailyNeedList from '../pages/marketplace/dailyneed/DailyNeedList';
import Menu from '../pages/hospitality/food/Menu';
import Rooms from '../pages/hospitality/stay/Rooms';
import Packages from '../pages/hospitality/travel/Packages';
import JobList from '../pages/jobs/JobList';

const DashboardContentGate = () => {
  const { activeTab } = useDashboard();
  switch (activeTab) {
    case 'dashboard': return <Overview />;
    case 'catalog': return <ProductList />;
    case 'orders': return <Orders />;
    case 'customers': return <Customers />;
    case 'business': return <BusinessList />;
    case 'profile': return <Profile />;
    case 'card': return <Membership />;
    case 'payments': return <Wallet />;
    case 'Services': return <ServiceList />;
    case 'Products': return <ProductList />;
    case 'Daily Needs': return <DailyNeedList />;
    case 'Food': return <Menu />;
    case 'Stay': return <Rooms />;
    case 'Travel': return <Packages />;
    case 'Jobs': return <JobList />;
    case 'queries': return <Overview />;
    default: return <Overview />;
  }
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={['Vendor', 'Admin', 'Member']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/vendor/dashboard" replace />} />
        <Route path=":tab" element={<DashboardContentGate />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
