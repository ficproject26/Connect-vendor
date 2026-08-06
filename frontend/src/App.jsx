import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Login from './pages/auth/Login';
import Register from './pages/Register';
import VendorDashboard from './pages/VendorDashboard';

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
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Register />} />

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
        </main>
      </div>
    </Router>
  );
}

export default App;
