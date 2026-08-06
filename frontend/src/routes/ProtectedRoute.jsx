import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const statusLower = (user?.status || '').toLowerCase().trim();
  const isSuspendedOrRevoked = user?.role === 'Vendor' && ['suspended', 'inactive', 'rejected'].includes(statusLower);

  useEffect(() => {
    if (isSuspendedOrRevoked) {
      alert(`Access denied. Your vendor account has been marked as ${user?.status || 'Suspended'} by the Administrator.`);
      dispatch(logout());
    }
  }, [isSuspendedOrRevoked, user?.status, dispatch]);

  if (!isAuthenticated || isSuspendedOrRevoked) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/vendor" replace />;
  }

  return children;
};

export default ProtectedRoute;
