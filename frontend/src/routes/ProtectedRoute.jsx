import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import VendorOnboardingStatus from '../pages/onboarding/VendorOnboardingStatus';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const statusLower = (user?.status || '').toLowerCase().trim();
  const userRole = (user?.role || user?.userType || '').toLowerCase().trim();
  const isVendorUser = userRole === 'vendor' || userRole.includes('vendor');

  // Onboarding stage statuses
  const onboardingStatuses = [
    'pending', 'submitted', 'pending_pincode_approval', 'pincode_approved',
    'kyc_pending', 'kyc_in_progress', 'payment_pending', 'pincode_rejected',
    'kyc_rejected', 'additional_information_required'
  ];

  const isApproved = (['active', 'approved', 'assigned'].includes(statusLower) || !statusLower || user?.isApproved === true) && user?.isApproved !== false && user?.isLocked !== true;
  const isOnboarding = isVendorUser && !isApproved && (onboardingStatuses.includes(statusLower) || user?.isApproved === false);
  const isSuspended = isVendorUser && (statusLower === 'suspended' || statusLower === 'inactive' || user?.isLocked === true);
  const isRejected = isVendorUser && (statusLower === 'rejected');

  useEffect(() => {
    if (isSuspended || isRejected) {
      alert(statusLower === 'suspended'
        ? 'Your vendor account has been suspended. Please contact the administrator.'
        : statusLower === 'inactive'
        ? 'Your vendor account has been deactivated. Please contact the administrator.'
        : 'Your vendor application was rejected. Please contact support.'
      );
      dispatch(logout());
    }
  }, [isSuspended, isRejected, statusLower, dispatch]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (isSuspended || isRejected) {
    return <Navigate to="/" replace />;
  }

  // If vendor is still in onboarding / approval pipeline, show restricted onboarding status screen
  if (isOnboarding) {
    return <VendorOnboardingStatus />;
  }

  // Fail closed: For vendor role, MUST be explicitly approved to access protected dashboard children
  if (isVendorUser && !isApproved) {
    return <Navigate to="/" replace />;
  }

  const normalizedAllowedRoles = allowedRoles?.map(r => String(r).toLowerCase().trim());
  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
