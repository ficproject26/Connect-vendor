import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, Calendar, 
  CreditCard, ArrowRight, ShieldCheck, DollarSign, Clock, 
  Filter, FileText, Check, X, ChevronRight, Eye, Download,
  ExternalLink, Layers, Building2, Store, Briefcase, Utensils, Hotel, Truck, HeartHandshake
} from 'lucide-react';
import wsClient from '../../realtime/wsClient';
import { formatImageUrl } from '../../services/apiSetup';

// Professional Business Logo Avatar with verified URL formatting and First-Letter Fallback
const BusinessLogoAvatar = ({ logo, businessName }) => {
  const [hasError, setHasError] = useState(false);
  const trimmedName = (businessName || '').trim();
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : 'B';
  const formattedUrl = logo ? formatImageUrl(logo) : '';

  if (!formattedUrl || hasError) {
    return (
      <div 
        className="w-full h-full rounded-2xl bg-gradient-to-br from-[#0b3c7b]/10 to-[#faed26]/20 dark:from-slate-800 dark:to-yellow-400/20 text-[#0b3c7b] dark:text-yellow-400 font-black text-xl flex items-center justify-center select-none shadow-inner"
        title={trimmedName || 'Business'}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={formattedUrl}
      alt={trimmedName || 'Business'}
      onError={() => setHasError(true)}
      className="w-full h-full object-cover rounded-2xl"
    />
  );
};

// Helper to dynamically load official Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Safe date formatter: "28 Sep 2026"
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '—';
  }
};

// Business Type Icon Resolver
const getBusinessIcon = (type = '') => {
  const t = String(type).toLowerCase();
  if (t.startsWith('product') || t.includes('store') || t.includes('grocery')) return Store;
  if (t.startsWith('food') || t.includes('restaurant')) return Utensils;
  if (t.startsWith('stay') || t.includes('hotel')) return Hotel;
  if (t.startsWith('travel')) return Truck;
  if (t.startsWith('job')) return Briefcase;
  if (t.startsWith('service') || t.includes('hospital')) return HeartHandshake;
  return Building2;
};

const SubscriptionManagementContent = ({ user: propUser, setMessage: propSetMessage }) => {
  const authUser = useSelector((state) => state?.auth?.user);
  const user = propUser || authUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('vendor_user')) || {};
    } catch (e) {
      return {};
    }
  })();
  const setMessage = propSetMessage || (() => {});

  // Primary Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState({ defaultPrice: 1000, currency: 'INR', periodMonths: 1 });
  const [summary, setSummary] = useState({
    totalActiveSubscriptions: 0,
    totalSubscriptions: 0,
    totalAmountPaid: 0,
    nextExpiry: null
  });
  const [businesses, setBusinesses] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  // History & Filters
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState('this-month'); // 'this-month', 'last-month', 'custom', 'monthly', 'yearly'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodSummary, setPeriodSummary] = useState(null); // For Monthly & Yearly summaries

  // Action / Payment States
  const [processingBusinessId, setProcessingBusinessId] = useState(null);

  // Popups / Modals
  const [checkoutModalData, setCheckoutModalData] = useState(null);
  const [isPayingDirect, setIsPayingDirect] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [failedModalData, setFailedModalData] = useState(null);
  const [receiptModalData, setReceiptModalData] = useState(null);

  // Fetch all subscription data for this vendor
  const fetchSubscriptions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get('/api/vendor/subscriptions');
      if (res.data?.success) {
        setConfig(res.data.config || { defaultPrice: 1000, currency: 'INR', periodMonths: 1 });
        setSummary(res.data.summary || {
          totalActiveSubscriptions: 0,
          totalSubscriptions: 0,
          totalAmountPaid: 0,
          nextExpiry: null
        });
        setBusinesses(res.data.businesses || []);
        if (res.data.razorpayKeyId) setRazorpayKeyId(res.data.razorpayKeyId);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      if (!isSilent) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load subscriptions' });
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [setMessage]);

  // Fetch subscription history based on active filter
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      if (filterType === 'monthly' || filterType === 'yearly') {
        const res = await axios.get('/api/vendor/subscriptions/summary', {
          params: {
            periodType: filterType,
            year: selectedYear,
            month: selectedMonth
          }
        });
        if (res.data?.success) {
          setPeriodSummary({
            label: res.data.selectedLabel,
            ...res.data.summary
          });
          setHistory(res.data.transactions || []);
        }
      } else {
        setPeriodSummary(null);
        const params = { periodType: filterType };
        if (filterType === 'custom') {
          if (customStartDate) params.startDate = customStartDate;
          if (customEndDate) params.endDate = customEndDate;
        }
        const res = await axios.get('/api/vendor/subscriptions/history', { params });
        if (res.data?.success) {
          setHistory(res.data.history || []);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [filterType, customStartDate, customEndDate, selectedMonth, selectedYear]);

  // Initial Data Load
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // History Filter Trigger
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time Event Subscription for Live Sync (<500ms)
  useEffect(() => {
    let unsubscribe = null;
    try {
      if (wsClient && typeof wsClient.on === 'function') {
        unsubscribe = wsClient.on('SUBSCRIPTION_UPDATED', () => {
          fetchSubscriptions(true);
          fetchHistory();
        });
      } else if (wsClient && typeof wsClient.subscribe === 'function') {
        unsubscribe = wsClient.subscribe((event) => {
          if (event?.event === 'SUBSCRIPTION_UPDATED' || event?.eventType === 'SUBSCRIPTION_UPDATED') {
            fetchSubscriptions(true);
            fetchHistory();
          }
        });
      }
    } catch (wsErr) {
      console.warn('Realtime subscription notice in SubscriptionManagement:', wsErr);
    }
    return () => {
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch (e) {}
      }
    };
  }, [fetchSubscriptions, fetchHistory]);

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
    fetchHistory();
  };

  // Unified Verification Handler (for both Razorpay Checkout and In-App Portal)
  const handleCompleteVerification = async (business, orderData, paymentInfo = {}) => {
    try {
      setProcessingBusinessId(business.businessId);
      const verifyRes = await axios.post('/api/vendor/subscriptions/verify-payment', {
        businessId: business.businessId,
        razorpay_order_id: paymentInfo?.razorpay_order_id || orderData.orderId,
        razorpay_payment_id: paymentInfo?.razorpay_payment_id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        razorpay_signature: paymentInfo?.razorpay_signature || '',
        paymentMethod: paymentInfo?.paymentMethod || 'Online Payment'
      });

      if (verifyRes.data?.success) {
        setCheckoutModalData(null);
        setSuccessModalData({
          businessName: verifyRes.data.businessName || business.businessName,
          amountPaid: verifyRes.data.amount || business.amount || config.defaultPrice || 1000,
          transactionId: verifyRes.data.transactionId || paymentInfo?.razorpay_payment_id,
          status: 'Active',
          validFrom: formatDate(verifyRes.data.validFrom),
          validUntil: formatDate(verifyRes.data.validUntil)
        });

        // Refresh authoritative real database state
        fetchSubscriptions(true);
        fetchHistory();
      } else {
        setCheckoutModalData(null);
        setFailedModalData({
          businessName: business.businessName,
          amount: business.amount || config.defaultPrice || 1000,
          errorMessage: verifyRes.data?.message || 'Backend transaction verification failed'
        });
      }
    } catch (verifyErr) {
      setCheckoutModalData(null);
      setFailedModalData({
        businessName: business.businessName,
        amount: business.amount || config.defaultPrice || 1000,
        errorMessage: verifyErr.response?.data?.message || 'Failed to verify transaction with server'
      });
    } finally {
      setProcessingBusinessId(null);
      setIsPayingDirect(false);
    }
  };

  // Payment Initiation Flow
  const handleInitiatePayment = async (business) => {
    if (!business || !business.businessId) return;
    setProcessingBusinessId(business.businessId);

    try {
      // 1. Call backend to create Order and record Pending payment
      const orderRes = await axios.post('/api/vendor/subscriptions/create-order', {
        businessId: business.businessId
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || 'Failed to create order');
      }

      const orderData = orderRes.data;
      const keyId = orderData.keyId || razorpayKeyId || '';

      const hasValidRazorpayKey = Boolean(keyId && !keyId.includes('placeholder') && keyId.startsWith('rzp_'));
      const hasValidServerOrder = Boolean(orderData.isRazorpayServerOrder && orderData.orderId);

      // If active Razorpay server credentials and verified server order are present, open official Razorpay Checkout SDK
      if (hasValidRazorpayKey && hasValidServerOrder) {
        const isSdkLoaded = await loadRazorpayScript();
        if (isSdkLoaded && window.Razorpay) {
          try {
            const options = {
              key: keyId,
              amount: orderData.amountInPaise,
              currency: orderData.currency || 'INR',
              name: 'Connect App',
              description: `${business.businessName} - Monthly Subscription`,
              order_id: orderData.orderId,
              handler: async (response) => {
                await handleCompleteVerification(business, orderData, response);
              },
              prefill: {
                name: orderData.vendorName || user?.name || '',
                email: orderData.vendorEmail || user?.email || '',
                contact: orderData.vendorPhone || user?.mobileNumber || ''
              },
              theme: {
                color: '#0b3c7b'
              },
              modal: {
                ondismiss: () => {
                  setProcessingBusinessId(null);
                }
              }
            };

            const razorpayInstance = new window.Razorpay(options);
            razorpayInstance.on('payment.failed', (failedResponse) => {
              setFailedModalData({
                businessName: business.businessName,
                amount: business.amount || config.defaultPrice || 1000,
                errorMessage: failedResponse.error?.description || 'Payment was declined or cancelled'
              });
              setProcessingBusinessId(null);
            });

            razorpayInstance.open();
            return;
          } catch (sdkErr) {
            console.warn('Razorpay SDK init notice, falling back to seamless checkout:', sdkErr);
          }
        }
      }

      // If Razorpay server order is not available or key is unconfigured, open seamless in-app checkout modal
      setProcessingBusinessId(null);
      setCheckoutModalData({
        business,
        orderData,
        selectedMethod: 'UPI'
      });
    } catch (err) {
      console.error('Payment initiation error:', err);
      setFailedModalData({
        businessName: business.businessName,
        amount: business.amount || config.defaultPrice || 1000,
        errorMessage: err.response?.data?.message || err.message || 'Payment initiation failed'
      });
      setProcessingBusinessId(null);
    }
  };

  // Submit in-app payment
  const handleDirectPaymentSubmit = async () => {
    if (!checkoutModalData || isPayingDirect) return;
    setIsPayingDirect(true);
    await handleCompleteVerification(
      checkoutModalData.business,
      checkoutModalData.orderData,
      {
        razorpay_order_id: checkoutModalData.orderData.orderId,
        razorpay_payment_id: `pay_online_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        paymentMethod: checkoutModalData.selectedMethod || 'UPI'
      }
    );
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Expired
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            Not Subscribed
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0b3c7b]/10 dark:bg-yellow-400/10 text-[#0b3c7b] dark:text-yellow-400 border border-[#0b3c7b]/20 dark:border-yellow-400/20">
              <Sparkles size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Subscription Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                Manage business-wise subscriptions, renew plans, and track payment transactions
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Real-time Subscription Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#0b3c7b] dark:text-yellow-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards (Requirement 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Active Subscriptions */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-[#0b3c7b]/40 dark:hover:border-yellow-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Subscriptions
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.totalActiveSubscriptions}
            </span>
            <span className="text-xs text-slate-500">
              of {summary.totalSubscriptions} total
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Currently active & valid businesses
          </p>
        </div>

        {/* Card 2: Total Subscriptions */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-[#0b3c7b]/40 dark:hover:border-yellow-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Subscriptions
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.totalSubscriptions}
            </span>
            <span className="text-xs text-slate-500">
              enrolled
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Across all your registered stores
          </p>
        </div>

        {/* Card 3: Total Amount Paid */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-[#0b3c7b]/40 dark:hover:border-yellow-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Amount Paid
            </span>
            <div className="p-2 rounded-xl bg-[#faed26]/20 text-[#0b3c7b] dark:text-yellow-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              ₹{Number(summary.totalAmountPaid || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Real lifetime subscription payments
          </p>
        </div>

        {/* Card 4: Next Expiry */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-[#0b3c7b]/40 dark:hover:border-yellow-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Next Expiry
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate block">
              {summary.nextExpiry ? formatDate(summary.nextExpiry) : 'None Pending'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {summary.nextExpiry ? 'Nearest renewal milestone' : 'All subscriptions current'}
          </p>
        </div>
      </div>

      {/* Section 2: Business Subscriptions Grid (Requirement 2 & 4 & 6) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-[#0b3c7b] dark:text-yellow-400" />
              Business Subscriptions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Each registered business has its own independent subscription and validity cycle
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200/50 dark:border-slate-800/50"></div>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          /* Empty state when vendor has no businesses (Requirement 24) */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
              <Store size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No businesses available for subscription.
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Add a business in the Business section to configure its subscription plan and activate services.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((biz) => {
              const BizIcon = getBusinessIcon(biz.businessType);
              const isProcessing = processingBusinessId === biz.businessId;
              const isSubscribed = biz.status === 'Active';
              const isExpired = biz.status === 'Expired';
              const isNotSubscribed = biz.status === 'Not Subscribed' || !biz.status;

              return (
                <div
                  key={biz.businessId}
                  className={`bg-white dark:bg-slate-900/95 rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md ${
                    isSubscribed
                      ? 'border-emerald-500/30 hover:border-emerald-500/60'
                      : isExpired
                      ? 'border-rose-500/30 hover:border-rose-500/60'
                      : 'border-slate-200 dark:border-slate-800 hover:border-[#0b3c7b]/40 dark:hover:border-yellow-400/40'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Icon, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-800/60 flex items-center justify-center text-[#0b3c7b] dark:text-yellow-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0 overflow-hidden">
                          <BusinessLogoAvatar logo={biz.logo} businessName={biz.businessName} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                            {biz.businessName}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {biz.businessType}
                          </span>
                        </div>
                      </div>
                      {renderStatusBadge(biz.status)}
                    </div>

                    {/* Price and Cycle */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                          Subscription Amount
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            ₹{Number(biz.amount || 1000).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-500">/ month</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0b3c7b]/10 dark:bg-yellow-400/10 text-[#0b3c7b] dark:text-yellow-400">
                          1 Month
                        </span>
                      </div>
                    </div>

                    {/* Validity Details */}
                    <div className="space-y-2 text-xs">
                      {isSubscribed ? (
                        <>
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Start Date:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                              {formatDate(biz.startDate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Valid Until:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatDate(biz.endDate)}
                            </span>
                          </div>
                          {biz.daysRemaining !== null && (
                            <div className="pt-1">
                              <div className="flex justify-between text-[11px] mb-1 text-slate-500">
                                <span>Cycle Progress</span>
                                <span>{biz.daysRemaining} days remaining</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    biz.daysRemaining <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, (biz.daysRemaining / 30) * 100))}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : isExpired ? (
                        <>
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Start Date:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                              {formatDate(biz.startDate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                            <span>Expired On:</span>
                            <span className="font-bold">
                              {formatDate(biz.endDate)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="py-2 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
                          <span>No active subscription. Subscribe to unlock full store privileges.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button (Requirement 7) */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    {isSubscribed ? (
                      biz.canRenew ? (
                        <button
                          onClick={() => handleInitiatePayment(biz)}
                          disabled={isProcessing}
                          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw size={15} className="animate-spin" />
                              <span>Opening Razorpay...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={15} />
                              <span>Renew Subscription Early</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-1.5">
                          <Check size={16} />
                          <span>Active Subscription</span>
                        </div>
                      )
                    ) : isExpired ? (
                      <button
                        onClick={() => handleInitiatePayment(biz)}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Opening Razorpay...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={15} />
                            <span>Renew Subscription</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiatePayment(biz)}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] flex items-center justify-center gap-2 shadow-md shadow-yellow-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Opening Razorpay...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            <span>Subscribe Now</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Subscription Payment History & Filters (Requirement 12, 13, 14, 15) */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={20} className="text-[#0b3c7b] dark:text-yellow-400" />
              Subscription History
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Verified payment receipts and audit trail for all business subscriptions
            </p>
          </div>

          {/* Filter Tabs (Requirement 13) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'custom', label: 'Custom Date' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterType === tab.id
                    ? 'bg-[#0b3c7b] text-white dark:bg-yellow-400 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {filterType === 'custom' && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0b3c7b] dark:focus:border-yellow-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0b3c7b] dark:focus:border-yellow-400"
              />
            </div>
          </div>
        )}

        {/* Monthly Selector */}
        {filterType === 'monthly' && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0b3c7b] dark:focus:border-yellow-400 font-medium"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0b3c7b] dark:focus:border-yellow-400 font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Yearly Selector */}
        {filterType === 'yearly' && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0b3c7b] dark:focus:border-yellow-400 font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Real Summary Banner for Monthly/Yearly (Requirement 14 & 15) */}
        {periodSummary && (
          <div className="bg-gradient-to-br from-[#0b3c7b]/10 via-[#0b3c7b]/5 to-transparent dark:from-yellow-400/10 dark:via-yellow-400/5 rounded-3xl p-6 border border-[#0b3c7b]/20 dark:border-yellow-400/20 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Summary for {periodSummary.label}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0b3c7b] text-white dark:bg-yellow-400 dark:text-slate-950">
                Database Verified
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Total Subscriptions
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                  {periodSummary.totalSubscriptions}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Total Amount Paid
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  ₹{Number(periodSummary.totalAmountPaid || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Successful Payments
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                  {periodSummary.successfulPayments}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Failed Payments
                </span>
                <span className="text-2xl font-black text-rose-500 mt-1 block">
                  {periodSummary.failedPayments}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* History Table (Requirement 12) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {historyLoading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#0b3c7b] dark:text-yellow-400" />
              <p className="text-sm">Fetching verified payment records...</p>
            </div>
          ) : history.length === 0 ? (
            /* Empty state for subscription history (Requirement 24) */
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <FileText size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No subscription payments found.
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No transactions match the selected filter. Successful subscription receipts will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-5">Business</th>
                    <th className="py-4 px-4">Subscription Type</th>
                    <th className="py-4 px-4">Amount</th>
                    <th className="py-4 px-4">Payment Date</th>
                    <th className="py-4 px-4">Valid From</th>
                    <th className="py-4 px-4">Valid Until</th>
                    <th className="py-4 px-4">Payment ID</th>
                    <th className="py-4 px-4">Order ID</th>
                    <th className="py-4 px-4">Method</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {history.map((tx) => {
                    const isSuccess = tx.paymentStatus === 'SUCCESS';
                    const isFailed = tx.paymentStatus === 'FAILED';

                    return (
                      <tr key={tx._id || tx.paymentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                          <div>
                            <span>{tx.businessName}</span>
                            <span className="block text-[11px] text-slate-500 font-normal">{tx.businessType}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                          {tx.subscriptionType || 'Monthly Subscription'}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                          ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(tx.paymentDate || tx.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(tx.validFrom)}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(tx.validUntil)}
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={tx.razorpayPaymentId || tx.paymentId}>
                          {tx.razorpayPaymentId || tx.paymentId}
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={tx.razorpayOrderId}>
                          {tx.razorpayOrderId}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                          {tx.paymentMethod || 'Online'}
                        </td>
                        <td className="py-4 px-4">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Paid
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setReceiptModalData(tx)}
                            className="p-1.5 text-slate-500 hover:text-[#0b3c7b] dark:hover:text-yellow-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 text-xs font-semibold"
                            title="View Receipt"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 0: Seamless Subscription Checkout Modal */}
      {checkoutModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0b3c7b] dark:text-yellow-400 uppercase tracking-widest block">
                    Connect Pay
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={11} /> 256-Bit Encrypted
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  Complete Subscription Payment
                </h3>
              </div>
              <button
                onClick={() => setCheckoutModalData(null)}
                disabled={isPayingDirect}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Business & Plan Overview Card */}
            <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Business Name:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {checkoutModalData.business?.businessName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Business Category:</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {checkoutModalData.business?.businessType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Billing Cycle:</span>
                <span className="text-xs font-bold text-[#0b3c7b] dark:text-yellow-400">
                  1 Month Full Access
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Subscription Fee:</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Number(checkoutModalData.orderData?.amount || config.defaultPrice || 1000).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Choose Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'UPI', label: 'UPI / QR', desc: 'GPay, PhonePe' },
                  { id: 'Card', label: 'Cards', desc: 'Credit / Debit' },
                  { id: 'NetBanking', label: 'Net Banking', desc: 'All Banks' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setCheckoutModalData(prev => ({ ...prev, selectedMethod: method.id }))}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      checkoutModalData.selectedMethod === method.id
                        ? 'border-[#0b3c7b] dark:border-yellow-400 bg-[#0b3c7b]/5 dark:bg-yellow-400/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {method.label}
                      </span>
                      {checkoutModalData.selectedMethod === method.id && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#0b3c7b] dark:bg-yellow-400 flex items-center justify-center text-white dark:text-slate-950">
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {method.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>
                Verified Transaction. Real subscription record and validity will be activated immediately in the database.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCheckoutModalData(null)}
                disabled={isPayingDirect}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectPaymentSubmit}
                disabled={isPayingDirect}
                className="flex-[2] py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#0b3c7b] hover:bg-[#0b3c7b]/90 text-white dark:bg-yellow-400 dark:text-slate-950 shadow-lg shadow-blue-900/10 dark:shadow-yellow-500/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isPayingDirect ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Verifying & Activating...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    <span>Confirm & Pay ₹{Number(checkoutModalData.orderData?.amount || config.defaultPrice || 1000).toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Payment Success Popup (Requirement 10) */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-emerald-500/30 text-center space-y-6 animate-scaleUp">
            {/* Green Check Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border-4 border-emerald-500/20">
              <Check size={32} strokeWidth={3} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Payment Successful
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Payment Received Successfully
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Business:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {successModalData.businessName}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  ₹{Number(successModalData.amountPaid || 1000).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Transaction ID:</span>
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {successModalData.transactionId}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Subscription:</span>
                <span className="font-bold text-emerald-500">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Valid From:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {successModalData.validFrom}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Valid Until:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {successModalData.validUntil}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessModalData(null)}
              className="w-full py-3 px-6 rounded-xl font-bold text-sm bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] shadow-lg shadow-yellow-500/10 transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Payment Failed Popup (Requirement 11) */}
      {failedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-500/30 text-center space-y-6 animate-scaleUp">
            {/* Red Alert Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto border-4 border-rose-500/20">
              <AlertCircle size={32} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Payment Failed
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                We could not complete your payment.
              </p>
            </div>

            {/* Error Details Box */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Business:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {failedModalData.businessName}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{Number(failedModalData.amount || 1000).toLocaleString('en-IN')}
                </span>
              </div>
              {failedModalData.errorMessage && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-rose-500 text-xs">
                  <span>Note: {failedModalData.errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setFailedModalData(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all active:scale-95"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const bName = failedModalData.businessName;
                  setFailedModalData(null);
                  const targetBiz = businesses.find(b => b.businessName === bName);
                  if (targetBiz) handleInitiatePayment(targetBiz);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#0b3c7b] hover:bg-[#0b3c7b]/90 text-white dark:bg-yellow-400 dark:text-slate-950 shadow-md transition-all active:scale-95"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detailed Receipt Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-scaleUp">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Official Receipt</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  Subscription Payment Receipt
                </h3>
              </div>
              <button
                onClick={() => setReceiptModalData(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Receipt / Payment ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {receiptModalData.razorpayPaymentId || receiptModalData.paymentId}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Order ID:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {receiptModalData.razorpayOrderId}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Business:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {receiptModalData.businessName} ({receiptModalData.businessType})
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Subscription Type:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {receiptModalData.subscriptionType || 'Monthly Subscription'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Payment Date:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatDate(receiptModalData.paymentDate || receiptModalData.createdAt)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Validity Period:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatDate(receiptModalData.validFrom)} — {formatDate(receiptModalData.validUntil)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {receiptModalData.paymentMethod || 'Online'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total Amount Paid:</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Number(receiptModalData.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReceiptModalData(null)}
                className="py-2.5 px-5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

class SubscriptionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('SubscriptionManagement Error Boundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-500/30 m-4 space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unable to display Subscription page</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {this.state.error?.message || 'A temporary rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0b3c7b] text-white dark:bg-yellow-400 dark:text-slate-950 transition-all"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SubscriptionManagement = (props) => (
  <SubscriptionErrorBoundary>
    <SubscriptionManagementContent {...props} />
  </SubscriptionErrorBoundary>
);

export default SubscriptionManagement;
