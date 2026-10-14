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
  const isVendorUser = userRole.includes('vendor') || userRole.includes('merchant');

  // Onboarding stage statuses
  const onboardingStatuses = [
    'pending', 'submitted', 'pending_pincode_approval', 'pincode_approved',
    'kyc_pending', 'kyc_in_progress', 'payment_pending', 'pincode_rejected',
    'kyc_rejected', 'additional_information_required'
  ];

  const isApproved = ['active', 'approved'].includes(statusLower) && user?.isApproved !== false && user?.isLocked !== true;
  const isOnboarding = isVendorUser && !isApproved && (onboardingStatuses.includes(statusLower) || user?.isApproved === false);
  const isSuspended = isVendorUser && !isApproved && !isOnboarding && (statusLower === 'suspended' || statusLower === 'inactive' || user?.isLocked === true);

  useEffect(() => {
    if (isSuspended) {
      alert(statusLower === 'suspended'
        ? 'Your vendor account has been suspended. Please contact the administrator.'
        : 'Your vendor account has been deactivated. Please contact the administrator.'
      );
      dispatch(logout());
    }
  }, [isSuspended, statusLower, dispatch]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/" replace />;
  }

  // If vendor is still in onboarding / approval pipeline, show restricted onboarding status screen (Requirement 5)
  if (isOnboarding) {
    return <VendorOnboardingStatus />;
  }

  const normalizedAllowedRoles = allowedRoles?.map(r => String(r).toLowerCase().trim());

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
