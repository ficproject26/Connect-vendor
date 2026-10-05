import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Filter, Calendar, RefreshCw, Eye, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, 
  CreditCard, Building2, Store, FileText, X, DollarSign, ArrowRight, ShieldCheck,
  PauseCircle, Ban
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { getVendorBackendUrl } from '../../services/apiSetup';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

const formatDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours() % 12 || 12).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
  } catch (e) {
    return String(dateVal);
  }
};

const formatDateOnly = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateVal);
  }
};

const StatusBadge = ({ status }) => {
  const norm = String(status || '').toLowerCase();
  if (norm === 'successful' || norm === 'completed' || norm === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={12} />
        Successful
      </span>
    );
  }
  if (norm === 'failed' || norm === 'cancelled' || norm === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <XCircle size={12} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Clock size={12} />
      Hold
    </span>
  );
};

const AdminStatusBadge = ({ status }) => {
  const norm = String(status || '').toUpperCase();
  if (norm === 'PAID' || norm === 'COMPLETED' || norm === 'SUCCESSFUL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={12} />
        PAID
      </span>
    );
  }
  if (norm === 'PENDING' || norm === 'PROCESSING') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
        <Clock size={12} />
        PENDING
      </span>
    );
  }
  if (norm === 'HOLD' || norm === 'ON_HOLD') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <PauseCircle size={12} />
        HOLD
      </span>
    );
  }
  if (norm === 'CANCELLED' || norm === 'CANCELED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <Ban size={12} />
        CANCELLED
      </span>
    );
  }
  if (norm === 'FAILED' || norm === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <XCircle size={12} />
        FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
      <Clock size={12} />
      {norm || 'PENDING'}
    </span>
  );
};

const CategoryBadge = ({ category }) => {
  const cat = String(category || 'General').toUpperCase();
  const colorMap = {
    PRODUCT: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    FOOD: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    'DAILY NEEDS': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    SERVICES: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    STAY: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    TRAVEL: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    JOBS: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
  };
  const colorClass = colorMap[cat] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${colorClass}`}>
      {category}
    </span>
  );
};

export default function VendorPayments() {
  const [mainTab, setMainTab] = useState('sales'); // 'sales' | 'admin'

  // Sales Payments state
  const [salesRecords, setSalesRecords] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatus, setSalesStatus] = useState('All'); // 'All' | 'Successful' | 'Failed' | 'Hold'
  const [salesDuration, setSalesDuration] = useState('Today'); // 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom'
  const [salesFromDate, setSalesFromDate] = useState('');
  const [salesToDate, setSalesToDate] = useState('');
  const [salesDateError, setSalesDateError] = useState('');
  const [salesCategory, setSalesCategory] = useState('All');
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(20);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesCategoryTotals, setSalesCategoryTotals] = useState([]);
  const [salesPeriodInfo, setSalesPeriodInfo] = useState(null);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);

  // Admin Payments state
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState('All'); // 'All' | 'PAID' | 'PENDING' | 'HOLD' | 'CANCELLED' | 'FAILED'
  const [adminDuration, setAdminDuration] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom'
  const [adminFromDate, setAdminFromDate] = useState('');
  const [adminToDate, setAdminToDate] = useState('');
  const [adminDateError, setAdminDateError] = useState('');
  const [adminCategory, setAdminCategory] = useState('All');
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(20);
  const [adminTotalCount, setAdminTotalCount] = useState(0);
  const [adminTotalPages, setAdminTotalPages] = useState(1);
  const [adminCategoryTotals, setAdminCategoryTotals] = useState([]);
  const [adminPeriodInfo, setAdminPeriodInfo] = useState(null);
  const [selectedAdminDetail, setSelectedAdminDetail] = useState(null);

  // ---------------------------------------------------------
  // Fetch Sales Payments
  // ---------------------------------------------------------
  const fetchSalesPayments = useCallback(async () => {
    // Validate custom dates if selected
    if (salesDuration === 'Custom') {
      if (salesFromDate && salesToDate && salesFromDate > salesToDate) {
        setSalesDateError('From Date cannot be later than To Date');
        return;
      }
    }
    setSalesDateError('');
    setSalesLoading(true);
    setSalesError('');

    try {
      const params = {
        status: salesStatus,
        duration: salesDuration,
        search: salesSearch.trim(),
        category: salesCategory,
        page: salesPage,
        limit: salesLimit
      };
      if (salesDuration === 'Custom') {
        if (salesFromDate) params.startDate = salesFromDate;
        if (salesToDate) params.endDate = salesToDate;
      }

      const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/payments/sales`, { params });
      if (res.data && res.data.success) {
        setSalesRecords(res.data.data || []);
        setSalesTotalCount(res.data.totalCount || 0);
        setSalesTotalPages(res.data.totalPages || 1);
        setSalesCategoryTotals(res.data.categoryTotals || []);
        setSalesPeriodInfo(res.data.period || null);
      } else {
        setSalesRecords([]);
        setSalesTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch sales payments:', err);
      setSalesError(err.response?.data?.message || err.message || 'Failed to load sales payments');
      setSalesRecords([]);
    } finally {
      setSalesLoading(false);
    }
  }, [salesStatus, salesDuration, salesFromDate, salesToDate, salesSearch, salesCategory, salesPage, salesLimit]);

  useEffect(() => {
    if (mainTab === 'sales') {
      fetchSalesPayments();
    }
  }, [fetchSalesPayments, mainTab]);

  // ---------------------------------------------------------
  // Fetch Admin Payments
  // ---------------------------------------------------------
  const adminInFlightRef = useRef(false);

  // ---------------------------------------------------------
  // Fetch Admin Payments (with silent background polling support)
  // ---------------------------------------------------------
  const fetchAdminPayments = useCallback(async (isSilent = false) => {
    // Validate custom dates if selected
    if (adminDuration === 'Custom') {
      if (adminFromDate && adminToDate && adminFromDate > adminToDate) {
        setAdminDateError('From Date cannot be later than To Date');
        return;
      }
    }
    setAdminDateError('');
    if (adminInFlightRef.current) return;
    adminInFlightRef.current = true;

    if (!isSilent) {
      setAdminLoading(true);
      setAdminError('');
    }

    try {
      const params = {
        status: adminStatus,
        duration: adminDuration,
        category: adminCategory,
        search: adminSearch.trim(),
        page: adminPage,
        limit: adminLimit
      };
      if (adminDuration === 'Custom') {
        if (adminFromDate) params.startDate = adminFromDate;
        if (adminToDate) params.endDate = adminToDate;
      }

      const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/settlements`, { params });
      if (res.data && res.data.success) {
        const rawList = res.data.data || [];
        // Apply frontend search filtering if entered
        let filtered = rawList;
        if (adminSearch.trim()) {
          const s = adminSearch.trim().toLowerCase();
          filtered = rawList.filter(item => 
            (item.paymentId && String(item.paymentId).toLowerCase().includes(s)) ||
            (item.transactionId && String(item.transactionId).toLowerCase().includes(s)) ||
            (item.referenceId && String(item.referenceId).toLowerCase().includes(s)) ||
            (item.vendorName && String(item.vendorName).toLowerCase().includes(s)) ||
            (item.vendorId && String(item.vendorId).toLowerCase().includes(s)) ||
            (item.businessName && String(item.businessName).toLowerCase().includes(s)) ||
            (item.category && String(item.category).toLowerCase().includes(s)) ||
            (item.purpose && String(item.purpose).toLowerCase().includes(s))
          );
        }

        setAdminRecords(filtered);
        setAdminTotalCount(res.data.totalCount || filtered.length);
        setAdminTotalPages(res.data.totalPages || 1);
        setAdminCategoryTotals(res.data.categoryTotals || []);
        setAdminPeriodInfo(res.data.period || null);

        // Reconcile open modal item in-place without closing
        setSelectedAdminDetail(prev => {
          if (!prev) return null;
          const found = filtered.find(item => (item.paymentId && item.paymentId === prev.paymentId) || String(item._id) === String(prev._id));
          return found || prev;
        });
      } else {
        if (!isSilent) {
          setAdminRecords([]);
          setAdminTotalCount(0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin settlements:', err);
      if (!isSilent) {
        setAdminError(err.response?.data?.message || err.message || 'Failed to load admin payments');
        setAdminRecords([]);
      }
    } finally {
      adminInFlightRef.current = false;
      if (!isSilent) setAdminLoading(false);
    }
  }, [adminStatus, adminDuration, adminFromDate, adminToDate, adminCategory, adminPage, adminLimit, adminSearch]);

  useEffect(() => {
    if (mainTab === 'admin') {
      fetchAdminPayments();
    }
  }, [fetchAdminPayments, mainTab]);

  // Background Auto-Refresh Engine for Vendor Admin Payments (Every 6s, silent, tab-visibility aware)
  useEffect(() => {
    if (mainTab !== 'admin') return;

    let lastFetch = Date.now();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && (typeof navigator === 'undefined' || navigator.onLine)) {
        lastFetch = Date.now();
        fetchAdminPayments(true);
      }
    }, 6000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (typeof navigator === 'undefined' || navigator.onLine)) {
        if (Date.now() - lastFetch >= 5000) {
          lastFetch = Date.now();
          fetchAdminPayments(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [mainTab, fetchAdminPayments]);

  // Clear filters
  const handleClearSalesFilters = () => {
    setSalesSearch('');
    setSalesStatus('All');
    setSalesDuration('Today');
    setSalesFromDate('');
    setSalesToDate('');
    setSalesDateError('');
    setSalesCategory('All');
    setSalesPage(1);
  };

  const handleClearAdminFilters = () => {
    setAdminSearch('');
    setAdminStatus('All');
    setAdminDuration('All');
    setAdminFromDate('');
    setAdminToDate('');
    setAdminDateError('');
    setAdminCategory('All');
    setAdminPage(1);
  };

  // Period label formatter
  const renderPeriodLabel = (duration, fromDate, toDate, periodInfo) => {
    if (duration === 'All') {
      return 'Payment Period: All Historical Records';
    }
    if (duration === 'Custom') {
      const from = fromDate ? formatDateOnly(fromDate) : 'Start';
      const to = toDate ? formatDateOnly(toDate) : 'End';
      return `Payment Period: ${from} – ${to}`;
    }
    if (periodInfo?.startDate && periodInfo?.endDate) {
      return `Payment Period: ${formatDateOnly(periodInfo.startDate)} – ${formatDateOnly(periodInfo.endDate)}`;
    }
    return `Payment Period: ${duration}`;
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Payments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            Review sales transactions and admin settlements received
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => setMainTab('sales')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              mainTab === 'sales'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-md border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            SALES PAYMENTS
          </button>
          <button
            type="button"
            onClick={() => setMainTab('admin')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              mainTab === 'admin'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-md border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ADMIN PAYMENTS
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SALES PAYMENTS */}
      {/* ========================================================= */}
      {mainTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Filter Bar */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Transaction ID, Order #, Item..."
                  value={salesSearch}
                  onChange={(e) => {
                    setSalesSearch(e.target.value);
                    setSalesPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={salesStatus}
                  onChange={(e) => {
                    setSalesStatus(e.target.value);
                    setSalesPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                >
                  <option value="All">Status: All</option>
                  <option value="Successful">Successful</option>
                  <option value="Failed">Failed</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>

              {/* Duration Filter */}
              <div>
                <select
                  value={salesDuration}
                  onChange={(e) => {
                    setSalesDuration(e.target.value);
                    setSalesPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <button
                  type="button"
                  onClick={handleClearSalesFilters}
                  className="w-full h-full py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {salesDuration === 'Custom' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Calendar size={14} className="text-[#faed26]" />
                    Date Range:
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">From:</label>
                    <input
                      type="date"
                      value={salesFromDate}
                      onChange={(e) => {
                        setSalesFromDate(e.target.value);
                        setSalesPage(1);
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">To:</label>
                    <input
                      type="date"
                      value={salesToDate}
                      onChange={(e) => {
                        setSalesToDate(e.target.value);
                        setSalesPage(1);
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  {salesDateError && (
                    <div className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {salesDateError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Period Details Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Calendar size={16} className="text-amber-600 dark:text-amber-400" />
              <span>{renderPeriodLabel(salesDuration, salesFromDate, salesToDate, salesPeriodInfo)}</span>
            </div>
            <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Showing filtered sales across all your registered business categories
            </div>
          </div>

          {/* Category-Wise Sales Summary Cards (Based ONLY on Real Vendor Data) */}
          {salesCategoryTotals && salesCategoryTotals.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                Category-Wise Sales Breakdown
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {salesCategoryTotals.map((catItem) => (
                  <div 
                    key={catItem.category}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={catItem.category} />
                      <span className="text-xs text-slate-400 font-medium">{catItem.count} order{catItem.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Total Sales:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(catItem.totalSales)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Commission:</span>
                        <span className="font-semibold text-rose-500">-{formatCurrency(catItem.totalCommission)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Vendor Received:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(catItem.totalVendorReceived)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Payments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {salesLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">Loading sales payment records...</p>
              </div>
            ) : salesError ? (
              <div className="p-8 text-center text-rose-500 space-y-2">
                <AlertCircle size={28} className="mx-auto" />
                <p className="font-bold">{salesError}</p>
              </div>
            ) : salesRecords.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <FileText size={36} className="text-slate-400 mx-auto opacity-40" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  No sales payments found for the selected filters.
                </p>
                <p className="text-xs text-slate-400">
                  Try adjusting the payment status, duration, or search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">S.No</th>
                      <th className="py-3.5 px-4">Transaction ID</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Item / Description</th>
                      <th className="py-3.5 px-4 text-right">Sale Amount</th>
                      <th className="py-3.5 px-4 text-right">Commission</th>
                      <th className="py-3.5 px-4 text-right">Vendor Received</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {salesRecords.map((item, index) => {
                      const serial = (salesPage - 1) * salesLimit + index + 1;
                      return (
                        <tr 
                          key={item._id || item.transactionId || index}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs text-slate-400 font-medium">
                            {serial}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.transactionId}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(item.saleDate)}
                          </td>
                          <td className="py-3 px-4">
                            <CategoryBadge category={item.category} />
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800 dark:text-slate-200" title={item.itemName}>
                            {item.itemName}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(item.saleAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-rose-500">
                            -{formatCurrency(item.commission)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.vendorReceivedAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={item.paymentStatus} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedSaleDetail(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-yellow-400 dark:bg-slate-800 dark:hover:bg-[#faed26] text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-slate-950 transition-colors cursor-pointer"
                            >
                              <Eye size={13} />
                              VIEW
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {salesTotalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs text-slate-500">
                <div>
                  Showing {Math.min(salesTotalCount, (salesPage - 1) * salesLimit + 1)} to {Math.min(salesTotalCount, salesPage * salesLimit)} of {salesTotalCount} sales transactions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={salesPage <= 1}
                    onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Page {salesPage} of {salesTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={salesPage >= salesTotalPages}
                    onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ADMIN PAYMENTS */}
      {/* ========================================================= */}
      {mainTab === 'admin' && (
        <div className="space-y-6">
          {/* Admin Filter Bar */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Payment ID, Reference ID, Vendor, Business..."
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setAdminPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={adminStatus}
                  onChange={(e) => {
                    setAdminStatus(e.target.value);
                    setAdminPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                >
                  <option value="All">Status: All</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="HOLD">Hold</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Duration Filter */}
              <div>
                <select
                  value={adminDuration}
                  onChange={(e) => {
                    setAdminDuration(e.target.value);
                    setAdminPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                >
                  <option value="All">All Duration</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <button
                  type="button"
                  onClick={handleClearAdminFilters}
                  className="w-full h-full py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            {adminDuration === 'Custom' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Calendar size={14} className="text-[#faed26]" />
                    Date Range:
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">From:</label>
                    <input
                      type="date"
                      value={adminFromDate}
                      onChange={(e) => {
                        setAdminFromDate(e.target.value);
                        setAdminPage(1);
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">To:</label>
                    <input
                      type="date"
                      value={adminToDate}
                      onChange={(e) => {
                        setAdminToDate(e.target.value);
                        setAdminPage(1);
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  {adminDateError && (
                    <div className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {adminDateError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Period Details Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
              <span>{renderPeriodLabel(adminDuration, adminFromDate, adminToDate, adminPeriodInfo)}</span>
            </div>
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Showing settlements & direct disbursements from Admin side
            </div>
          </div>

          {/* Category Breakdown (Real Admin Payment Data) */}
          {adminCategoryTotals && adminCategoryTotals.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                Admin Payments Received by Business Category
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {adminCategoryTotals.map((catItem) => (
                  <div 
                    key={catItem.category}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={catItem.category} />
                      <span className="text-xs text-slate-400 font-medium">{catItem.count} payment{catItem.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Total Received from Admin:</div>
                      <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                        {formatCurrency(catItem.totalReceived || catItem.totalNetAmount || catItem.totalGross)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Payments Table (13 Required Columns) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {adminLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">Loading admin payment records...</p>
              </div>
            ) : adminError ? (
              <div className="p-8 text-center text-rose-500 space-y-2">
                <AlertCircle size={28} className="mx-auto" />
                <p className="font-bold">{adminError}</p>
              </div>
            ) : adminRecords.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <Building2 size={36} className="text-slate-400 mx-auto opacity-40" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  {(adminStatus !== 'All' || adminDuration !== 'All' || adminSearch.trim() || adminFromDate || adminToDate)
                    ? 'No admin payments found for the selected filters.'
                    : 'No admin payments found.'}
                </p>
                <p className="text-xs text-slate-400">
                  {(adminStatus !== 'All' || adminDuration !== 'All' || adminSearch.trim() || adminFromDate || adminToDate)
                    ? 'Try adjusting the payment status or duration filters.'
                    : 'Admin disbursements and settlements will appear here once processed.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-3 text-center">S.No</th>
                      <th className="py-3.5 px-3">Payment ID</th>
                      <th className="py-3.5 px-3">Transaction / Reference ID</th>
                      <th className="py-3.5 px-3">Vendor / Recipient</th>
                      <th className="py-3.5 px-3">Business / Category</th>
                      <th className="py-3.5 px-3">Payment Purpose</th>
                      <th className="py-3.5 px-3">Payment Period</th>
                      <th className="py-3.5 px-3">Payment Date</th>
                      <th className="py-3.5 px-3 text-right">Gross Amount</th>
                      <th className="py-3.5 px-3">Breakdown</th>
                      <th className="py-3.5 px-3 text-right">Net Amount</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {adminRecords.map((item, index) => {
                      const serial = (adminPage - 1) * adminLimit + index + 1;
                      return (
                        <tr 
                          key={item._id || item.paymentId || index}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs"
                        >
                          {/* 1. S.No */}
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-medium">
                            {serial}
                          </td>

                          {/* 2. PAYMENT ID */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.paymentId || '-'}
                          </td>

                          {/* 3. TRANSACTION / REFERENCE ID */}
                          <td className="py-3.5 px-3 font-mono">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.transactionId || item.referenceId || '-'}
                            </div>
                            {item.transactionId && item.referenceId && item.transactionId !== item.referenceId && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                Ref: {item.referenceId}
                              </div>
                            )}
                          </td>

                          {/* 4. VENDOR / RECIPIENT */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {item.vendorName || '-'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {item.vendorId || '-'}
                            </div>
                          </td>

                          {/* 5. BUSINESS / BUSINESS CATEGORY */}
                          <td className="py-3.5 px-3 space-y-1">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.businessName || '-'}
                            </div>
                            <CategoryBadge category={item.category} />
                          </td>

                          {/* 6. PAYMENT PURPOSE */}
                          <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={item.purpose}>
                            {item.purpose || 'Vendor Settlement'}
                          </td>

                          {/* 7. PAYMENT PERIOD / DURATION */}
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {item.paymentPeriod || formatDateOnly(item.paymentDate)}
                          </td>

                          {/* 8. PAYMENT DATE */}
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDateOnly(item.paymentDate)}
                          </td>

                          {/* 9. GROSS / TOTAL AMOUNT */}
                          <td className="py-3.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(item.grossAmount)}
                          </td>

                          {/* 10. BREAKDOWN */}
                          <td className="py-3.5 px-3">
                            <div className="text-[11px] space-y-0.5">
                              <div className="text-slate-500">Gross: {formatCurrency(item.grossAmount)}</div>
                              <div className="text-rose-500">Fee: -{formatCurrency(item.commissionDeducted || 0)}</div>
                              {item.otherDeductions > 0 && (
                                <div className="text-amber-500">Ded: -{formatCurrency(item.otherDeductions)}</div>
                              )}
                            </div>
                          </td>

                          {/* 11. NET AMOUNT RECEIVED */}
                          <td className="py-3.5 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400">
                            {formatCurrency(item.netAmount)}
                          </td>

                          {/* 12. PAYMENT STATUS */}
                          <td className="py-3.5 px-3 text-center">
                            <AdminStatusBadge status={item.status} />
                            {item.status === 'HOLD' && item.holdReason && (
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium max-w-[140px] truncate mx-auto mt-1" title={item.holdReason}>
                                {item.holdReason}
                              </div>
                            )}
                            {item.status === 'CANCELLED' && item.cancellationReason && (
                              <div className="text-[11px] text-rose-500 font-medium max-w-[140px] truncate mx-auto mt-1" title={item.cancellationReason}>
                                {item.cancellationReason}
                              </div>
                            )}
                          </td>

                          {/* 13. ACTIONS */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedAdminDetail(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-yellow-400 dark:bg-slate-800 dark:hover:bg-[#faed26] text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-slate-950 transition-colors cursor-pointer"
                            >
                              <Eye size={13} />
                              VIEW
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {adminTotalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs text-slate-500">
                <div>
                  Showing {Math.min(adminTotalCount, (adminPage - 1) * adminLimit + 1)} to {Math.min(adminTotalCount, adminPage * adminLimit)} of {adminTotalCount} admin payment records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={adminPage <= 1}
                    onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Page {adminPage} of {adminTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={adminPage >= adminTotalPages}
                    onClick={() => setAdminPage(p => Math.min(adminTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: VIEW SALES PAYMENT DETAILS (READ-ONLY) */}
      {/* ========================================================= */}
      {selectedSaleDetail && (
        <Modal
          isOpen={!!selectedSaleDetail}
          onClose={() => setSelectedSaleDetail(null)}
          title="Sales Payment Details"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-left text-slate-800 dark:text-slate-100">
            {/* Top Bar with Status and Category */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-400 font-medium">Transaction ID</div>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedSaleDetail.transactionId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CategoryBadge category={selectedSaleDetail.category} />
                <StatusBadge status={selectedSaleDetail.paymentStatus} />
              </div>
            </div>

            {/* Transaction Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                <div className="text-slate-400 font-medium mb-1">Sale Date</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(selectedSaleDetail.saleDate)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                <div className="text-slate-400 font-medium mb-1">Payment Method</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSaleDetail.paymentMethod}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                <div className="text-slate-400 font-medium mb-1">Order / Reference ID</div>
                <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSaleDetail.orderId}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                <div className="text-slate-400 font-medium mb-1">Customer Reference</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSaleDetail.customerReference || selectedSaleDetail.customerName || 'Customer'}
                </div>
              </div>
            </div>

            {/* Item / Service Purchased */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Item / Product / Service Description</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedSaleDetail.itemName}
              </div>
            </div>

            {/* Waterfall Financial Calculation (View Only) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Calculation Breakdown
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>How much the item was sold for (Sale Amount):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(selectedSaleDetail.saleAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-500">
                  <span>(-) Commission & Platform Fees:</span>
                  <span className="font-bold">
                    -{formatCurrency(selectedSaleDetail.commission)}
                  </span>
                </div>
                {Number(selectedSaleDetail.deductions) > 0 && (
                  <div className="flex justify-between items-center text-amber-500">
                    <span>(-) Other Deductions / Discounts:</span>
                    <span className="font-bold">
                      -{formatCurrency(selectedSaleDetail.deductions)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-base font-extrabold">
                  <span className="text-slate-900 dark:text-white">Final Amount Received by Vendor:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedSaleDetail.vendorReceivedAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="px-5 py-2.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: VIEW ADMIN PAYMENT DETAILS (READ-ONLY) */}
      {/* ========================================================= */}
      {selectedAdminDetail && (
        <Modal
          isOpen={!!selectedAdminDetail}
          onClose={() => setSelectedAdminDetail(null)}
          title="Admin Payment Details"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6 text-left text-slate-800 dark:text-slate-100">
            {/* Top Bar Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-950 border border-blue-100 dark:border-slate-800">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment ID</div>
                <div className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedAdminDetail.paymentId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CategoryBadge category={selectedAdminDetail.category} />
                <AdminStatusBadge status={selectedAdminDetail.status} />
              </div>
            </div>

            {/* Hold Reason Banner */}
            {selectedAdminDetail.status === 'HOLD' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <PauseCircle size={15} />
                  PAYMENT ON HOLD
                </div>
                <div className="text-xs font-semibold">
                  Reason: {selectedAdminDetail.holdReason || 'Administrative verification pending'}
                </div>
                {selectedAdminDetail.heldBy && (
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    Placed by: {selectedAdminDetail.heldBy} {selectedAdminDetail.heldAt ? `on ${formatDate(selectedAdminDetail.heldAt)}` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Cancellation Reason Banner */}
            {selectedAdminDetail.status === 'CANCELLED' && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <Ban size={15} />
                  PAYMENT CANCELLED
                </div>
                <div className="text-xs font-semibold">
                  Reason: {selectedAdminDetail.cancellationReason || 'Administrative cancellation'}
                </div>
                {selectedAdminDetail.cancelledBy && (
                  <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                    Cancelled by: {selectedAdminDetail.cancelledBy} {selectedAdminDetail.cancelledAt ? `on ${formatDate(selectedAdminDetail.cancelledAt)}` : ''}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 1: PAYMENT INFORMATION */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                Payment Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment ID</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.paymentId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Transaction ID</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.transactionId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Reference ID</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.referenceId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment Status</div>
                  <div>
                    <AdminStatusBadge status={selectedAdminDetail.status} />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment Date</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedAdminDetail.paymentDate)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment Period / Duration</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.paymentPeriod || formatDateOnly(selectedAdminDetail.paymentDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: RECIPIENT INFORMATION */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Store size={14} className="text-purple-500" />
                Recipient Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Vendor Name</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.vendorName || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Vendor ID</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.vendorId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Business Name</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.businessName || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Business ID</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedAdminDetail.businessId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Business Category</div>
                  <div>
                    <CategoryBadge category={selectedAdminDetail.category} />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment Purpose</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.purpose || 'Vendor Settlement'}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT BREAKDOWN (WATERFALL) */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-500" />
                Payment Breakdown Details
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Payment Purpose:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAdminDetail.purpose || 'Vendor Settlement'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Gross Settlement Amount:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedAdminDetail.grossAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-rose-600 dark:text-rose-400">
                    Platform Commission / Fee {selectedAdminDetail.commissionRate > 0 ? `(${selectedAdminDetail.commissionRate}%)` : ''}:
                  </span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -{formatCurrency(selectedAdminDetail.commissionDeducted || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Other Deductions:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    -{formatCurrency(selectedAdminDetail.otherDeductions || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                  <span className="text-slate-900 dark:text-white">Net Vendor Payment Received:</span>
                  <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                    {formatCurrency(selectedAdminDetail.netAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: SOURCE & DESTINATION ACCOUNT DETAILS */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard size={14} className="text-sky-500" />
                Payment Account & Source / Destination Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Source (Initiated By)</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Building2 size={13} className="text-blue-500" />
                    Admin Settlement System (Super Admin)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Recipient Vendor</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.vendorName} ({selectedAdminDetail.vendorId})
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Account Holder Name</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.bankDetails?.accountHolderName || selectedAdminDetail.vendorName || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Bank Name</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.bankDetails?.bankName || 'Registered Settlement Bank'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Masked Account Number</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedAdminDetail.bankDetails?.maskedAccount || 'XXXXXX on file'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-slate-400 font-medium mb-1">Payment Method / Channel</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAdminDetail.paymentType || 'Direct Bank Settlement (Admin)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only Security Notice & Close Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <ShieldCheck size={15} className="text-emerald-500" />
                <span>Verified Admin Payment Record (Read-Only)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdminDetail(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
