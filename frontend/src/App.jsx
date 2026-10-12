import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/Register'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));

const RouteLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Custom Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  const userRole = (user?.role || '').toLowerCase().trim();
  const normalizedAllowedRoles = allowedRoles?.map(r => String(r).toLowerCase().trim());

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

import { useSearchParams } from 'react-router-dom';

const OrdersRedirect = () => {
  const [searchParams] = useSearchParams();
  const cat = searchParams.get('category');
  return <Navigate to={`/vendor?tab=orders${cat ? `&category=${encodeURIComponent(cat)}` : ''}`} replace />;
};

const BookingsRedirect = () => {
  const [searchParams] = useSearchParams();
  const cat = searchParams.get('category');
  return <Navigate to={`/vendor?tab=bookings${cat ? `&category=${encodeURIComponent(cat)}` : ''}`} replace />;
};

function App() {
  useEffect(() => {
    // Initialize theme preference from localStorage, default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      if (!savedTheme) localStorage.setItem('theme', 'dark');
    }

    // Disable mouse scroll wheel changing input[type=number] values globally
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Register />} />

              {/* Direct convenience routes for Orders and Bookings with category query params */}
              <Route path="/orders" element={<OrdersRedirect />} />
              <Route path="/bookings" element={<BookingsRedirect />} />

              {/* Protected Role-Based Dashboards */}
              <Route 
                path="/vendor/*" 
                element={
                  <ProtectedRoute allowedRoles={['Vendor', 'Admin', 'Member']}>
                    <VendorDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Redirect Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
