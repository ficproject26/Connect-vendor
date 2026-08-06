import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const statusLower = (user?.status || '').toLowerCase().trim();
  const userRole = (user?.role || user?.userType || '').toLowerCase().trim();
  const isVendorUser = userRole.includes('vendor') || userRole.includes('merchant');
  const isSuspendedOrRevoked = isVendorUser && (['suspended', 'inactive', 'rejected'].includes(statusLower) || user?.isActive === false);

  useEffect(() => {
    if (isSuspendedOrRevoked) {
      alert(statusLower === 'suspended'
        ? 'Your account has been suspended by the administrator. Please contact administration.'
        : `Access denied. Your vendor account has been marked as ${user?.status || 'Inactive'} by the Administrator.`
      );
      dispatch(logout());
    }
  }, [isSuspendedOrRevoked, statusLower, user?.status, dispatch]);

  if (!isAuthenticated || !user || isSuspendedOrRevoked) {
    return <Navigate to="/" replace />;
  }

  const normalizedAllowedRoles = allowedRoles?.map(r => String(r).toLowerCase().trim());

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
