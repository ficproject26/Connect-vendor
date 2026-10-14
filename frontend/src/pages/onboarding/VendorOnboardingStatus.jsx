import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateUser } from '../../store/authSlice';
import { getVendorBackendUrl } from '../../services/apiSetup';
import axios from 'axios';
import {
  Store,
  ShieldCheck,
  UserCheck,
  UserCog,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Building2,
  Layers,
  Sparkles
} from 'lucide-react';

export default function VendorOnboardingStatus() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [onboardingData, setOnboardingData] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const backendUrl = getVendorBackendUrl();
      const res = await axios.get(`${backendUrl}/api/vendor/onboarding-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data && res.data.success) {
        const info = res.data.onboarding;
        setOnboardingData(info);
        setLastRefreshed(new Date());

        // Sync with Redux user state
        if (info.status) {
          dispatch(updateUser({
            status: info.status,
            kycStatus: info.kycStatus,
            isApproved: info.isApproved
          }));
        }

        // If approved, refresh window to let ProtectedRoute show DashboardLayout
        if (info.isApproved || info.status === 'ACTIVE' || info.status === 'APPROVED') {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch real-time onboarding status:', err);
      setFetchError(err.response?.data?.message || 'Could not refresh real-time status. Displaying cached credentials.');
    } finally {
      setLoading(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = '/';
  };

  // Derive display values from live API or fallback to user Redux state
  const currentStatus = (onboardingData?.status || user?.status || 'PENDING_PINCODE_APPROVAL').toUpperCase().trim();
  const businessName = onboardingData?.businessName || user?.businessName || user?.name || 'Your Business';
  const vendorId = onboardingData?.vendorId || user?.vendorId || user?.registrationId || 'VEN-PENDING';
  const pincode = onboardingData?.pincode || user?.postalCode || user?.pincode || '635126';
  const rejectionReason = onboardingData?.rejectionReason || null;

  // Onboarding Agent
  const agent = onboardingData?.onboardingAgent || {
    name: user?.agentName || 'Assigned Field Agent',
    id: user?.agentId || '-',
    phone: user?.agentPhone || '9876543210',
    role: 'Pincode Agent',
    submittedAt: user?.createdAt
  };

  // Responsible Admin
  const admin = onboardingData?.responsibleAdmin || {
    name: 'Ragul',
    id: 'ADM-PIN-557374',
    phone: '6789876543',
    role: 'Pincode Admin',
    state: user?.state || 'Tamil Nadu',
    district: user?.district || 'Krishnagiri',
    division: 'Hosur',
    pincode: pincode
  };

  // Determine stage flags
  const isRejected = currentStatus === 'PINCODE_REJECTED' || currentStatus === 'KYC_REJECTED';
  const isPincodeApproved = [
    'PINCODE_APPROVED', 'KYC_PENDING', 'KYC_IN_PROGRESS', 
    'KYC_APPROVED', 'PAYMENT_PENDING', 'ACTIVE', 'APPROVED'
  ].includes(currentStatus);
  const isKYCApproved = ['KYC_APPROVED', 'PAYMENT_PENDING', 'ACTIVE', 'APPROVED'].includes(currentStatus);
  const isPaymentPending = currentStatus === 'PAYMENT_PENDING';
  const isActive = currentStatus === 'ACTIVE' || currentStatus === 'APPROVED';

  // Requirement 5 suggested messages mapping
  const getStatusMessage = () => {
    if (isRejected) {
      return "Your onboarding request has been rejected. Please contact the responsible admin for further details.";
    }
    if (currentStatus === 'SUBMITTED') {
      return "Your vendor onboarding request has been submitted successfully. Please contact your onboarding agent or the responsible admin for updates.";
    }
    if (currentStatus === 'PENDING_PINCODE_APPROVAL' || currentStatus === 'PENDING') {
      return "Your request is awaiting approval from the admin responsible for your PIN code.";
    }
    if (currentStatus === 'PINCODE_APPROVED') {
      return "Your request has been approved by the PIN code admin and is awaiting KYC verification.";
    }
    if (currentStatus === 'KYC_PENDING' || currentStatus === 'KYC_IN_PROGRESS') {
      return "Your documents are being verified by our KYC team.";
    }
    if (isPaymentPending) {
      return "Your KYC verification is complete. Please complete the required payment to activate your vendor account.";
    }
    if (isActive) {
      return "Your vendor onboarding and KYC verification are complete! Your account is active.";
    }
    return "Your vendor onboarding request has been submitted successfully. Please contact your onboarding agent or the responsible admin for updates.";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-900 font-black shadow-lg shadow-amber-500/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              FORGE INDIA <span className="text-amber-400">CONNECT</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Merchant Partner Onboarding Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition cursor-pointer disabled:opacity-50"
            title="Refresh current verification status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh Status</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto my-6 space-y-6">
        {fetchError && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Hero Card with Vendor Identity & Dynamic Status Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/50">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Onboarding Dossier
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">
                  ID: <strong className="text-white">{vendorId}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700/60">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  PIN: <strong className="text-blue-300 font-mono">{pincode}</strong>
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {businessName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Territory: {admin.district ? `${admin.district}, ${admin.division || ''} (${admin.state || 'India'})` : `Postal Code ${pincode}`}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Current Approval Stage
              </span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                isActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80'
                  : isRejected
                  ? 'bg-rose-950/80 text-rose-300 border-rose-600/80 animate-pulse'
                  : isPincodeApproved
                  ? 'bg-blue-950/80 text-blue-300 border-blue-600/80'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/80'
              }`}>
                {currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Prompt 5 Canonical Message Banner */}
          <div className={`mt-6 p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 ${
            isRejected
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              : isActive
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
              : isPincodeApproved
              ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
              : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
          }`}>
            {isRejected ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : isActive ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-spin-slow" />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-bold tracking-tight text-white">
                {getStatusMessage()}
              </h3>
              <p className="text-xs opacity-90 leading-relaxed">
                Full vendor dashboard access, product listings, order processing, and settlement payouts will be unlocked automatically upon completion of the mandatory role verification stages.
              </p>
            </div>
          </div>

          {/* Rejection Details if applicable */}
          {rejectionReason && (
            <div className="mt-4 p-4 rounded-xl bg-rose-900/30 border border-rose-700/60 text-rose-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-rose-300 mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Rejection Reason Recorded:</span>
              </div>
              <p className="font-mono bg-black/30 p-2.5 rounded-lg border border-rose-800/50 mt-1 text-rose-100">
                "{rejectionReason}"
              </p>
            </div>
          )}
        </section>

        {/* 4-Step Approval Progress Tracker */}
        <section className="rounded-3xl bg-slate-800/60 border border-slate-700/80 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Role-Based Verification Stepper
            </h3>
            <span className="text-[11px] text-slate-400">
              Last synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stage 1: Submitted */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-emerald-500/40 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Step 1
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white">
                Agent Onboarded
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Dossier submitted by agent <strong className="text-slate-300">{agent.name}</strong>
              </p>
            </div>

            {/* Stage 2: Pincode Admin Clearance */}
            <div className={`p-4 rounded-2xl bg-slate-900/70 border relative ${
              isRejected && currentStatus === 'PINCODE_REJECTED'
                ? 'border-rose-500/60'
                : isPincodeApproved
                ? 'border-emerald-500/40'
                : 'border-amber-500/60 shadow-lg shadow-amber-500/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isPincodeApproved ? 'text-emerald-400' : isRejected ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  Step 2
                </span>
                {isPincodeApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isRejected && currentStatus === 'PINCODE_REJECTED' ? (
                  <XCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="text-xs font-bold text-white">
                Pincode Admin Approval
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Assigned to <strong className="text-slate-300">{admin.name}</strong> (PIN {pincode})
              </p>
            </div>

            {/* Stage 3: KYC Team Review */}
            <div className={`p-4 rounded-2xl bg-slate-900/70 border relative ${
              isRejected && currentStatus === 'KYC_REJECTED'
                ? 'border-rose-500/60'
                : isKYCApproved
                ? 'border-emerald-500/40'
                : isPincodeApproved
                ? 'border-blue-500/60 shadow-lg shadow-blue-500/10'
                : 'border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isKYCApproved ? 'text-emerald-400' : isPincodeApproved ? 'text-blue-400' : 'text-slate-500'
                }`}>
                  Step 3
                </span>
                {isKYCApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isRejected && currentStatus === 'KYC_REJECTED' ? (
                  <XCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <h4 className="text-xs font-bold text-white">
                KYC Verification
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Central Compliance & KYC Team
              </p>
            </div>

            {/* Stage 4: Activation & Dashboard Unlock */}
            <div className={`p-4 rounded-2xl bg-slate-900/70 border relative ${
              isActive
                ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                : isPaymentPending
                ? 'border-amber-500/60'
                : 'border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  Step 4
                </span>
                {isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <h4 className="text-xs font-bold text-white">
                Dashboard Unlocked
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Full product catalog & orders
              </p>
            </div>
          </div>
        </section>

        {/* Traceability & Contacts Grid (Requirement 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Onboarding Agent Details */}
          <section className="p-5 rounded-3xl bg-slate-800/70 border border-slate-700/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2 text-emerald-400">
                <UserCheck className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Onboarding Agent Details
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                {agent.role || agent.tier || 'Pincode Agent'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Agent Name:</span>
                <span className="font-bold text-white">{agent.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Agent ID:</span>
                <span className="font-mono text-slate-300">{agent.id}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                <span className="text-slate-400">Mobile Contact:</span>
                <a
                  href={`tel:${agent.phone}`}
                  className="font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{agent.phone}</span>
                </a>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Submitted On:</span>
                <span>{agent.submittedAt ? new Date(agent.submittedAt).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>
          </section>

          {/* Responsible Admin Details */}
          <section className="p-5 rounded-3xl bg-slate-800/70 border border-slate-700/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2 text-indigo-400">
                <UserCog className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Responsible Admin Details
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                {admin.role || 'Pincode Admin'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Admin Name:</span>
                <span className="font-bold text-white">{admin.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Admin ID:</span>
                <span className="font-mono text-slate-300">{admin.id}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                <span className="text-slate-400">Admin Contact:</span>
                <a
                  href={`tel:${admin.phone}`}
                  className="font-bold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{admin.phone}</span>
                </a>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Jurisdiction:</span>
                <span className="font-semibold text-slate-300">
                  {admin.division ? `${admin.division}, PIN ${admin.pincode}` : `PIN ${admin.pincode}`}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} Forge India Connect App. All rights reserved. Access is governed by role-based compliance policies.
        </p>
      </footer>
    </div>
  );
}
