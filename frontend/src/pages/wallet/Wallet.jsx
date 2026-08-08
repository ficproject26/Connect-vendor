import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const Wallet = () => {
  const {
    activeBusinessId,
    activeTab,
    addBizForm,
    addingBizLoading,
    adminMembers,
    adminVendors,
    analytics,
    appointmentForm,
    appointmentsSubView,
    bookedSlots,
    bookingForm,
    calendarMonth,
    calendarSelectedDate,
    calendarYear,
    card,
    catalog,
    commissionConfig,
    customSlotInput,
    customers,
    dispatch,
    editingDoctorSlotsId,
    error,
    getAvailableVendorTypes,
    getOrderVendorType,
    imageUploading,
    isAddAppointmentModalOpen,
    isAddBookingModalOpen,
    isAddBusinessModalOpen,
    isBillModalOpen,
    isDiamondBlurred,
    isEditItem,
    isEditPartner,
    isHelpOpen,
    isItemModalOpen,
    isPartnerModalOpen,
    isProfileModalOpen,
    isSoldDetailsModalOpen,
    isTabAllowed,
    isUserInfoOpen,
    itemForm,
    language,
    loading,
    loadingAddAppointment,
    loadingAddBooking,
    memberDiscounts,
    memberRedeemProducts,
    membershipHistory,
    membershipPlans,
    message,
    notificationDropdownRef,
    notifications,
    orders,
    otp,
    partnerForm,
    partners,
    passwordForm,
    prevOrdersRef,
    profileForm,
    redeemForm,
    searchParams,
    selectedBillOrder,
    selectedItemId,
    selectedMainCat,
    selectedPartnerId,
    selectedRedeemProductId,
    selectedRedeemVendorId,
    selectedSettlementStatus,
    selectedSoldItem,
    selectedSubcat,
    setActiveTab,
    setActiveTabInternal,
    setAddBizForm,
    setAddingBizLoading,
    setAdminMembers,
    setAdminVendors,
    setAnalytics,
    setAppointmentForm,
    setAppointmentsSubView,
    setBookedSlots,
    setBookingForm,
    setCalendarMonth,
    setCalendarSelectedDate,
    setCalendarYear,
    setCatalog,
    setCommissionConfig,
    setCustomSlotInput,
    setCustomers,
    setEditingDoctorSlotsId,
    setError,
    setImageUploading,
    setIsAddAppointmentModalOpen,
    setIsAddBookingModalOpen,
    setIsAddBusinessModalOpen,
    setIsBillModalOpen,
    setIsDiamondBlurred,
    setIsEditItem,
    setIsEditPartner,
    setIsHelpOpen,
    setIsItemModalOpen,
    setIsPartnerModalOpen,
    setIsProfileModalOpen,
    setIsSoldDetailsModalOpen,
    setItemForm,
    setLanguage,
    setLoading,
    setLoadingAddAppointment,
    setLoadingAddBooking,
    setMemberDiscounts,
    setMemberRedeemProducts,
    setMembershipHistory,
    setMembershipPlans,
    setMessage,
    setNotifications,
    setOrders,
    setOtp,
    setPartnerForm,
    setPartners,
    setPasswordForm,
    setProfileForm,
    setRedeemForm,
    setSelectedBillOrder,
    setSelectedItemId,
    setSelectedMainCat,
    setSelectedPartnerId,
    setSelectedRedeemProductId,
    setSelectedRedeemVendorId,
    setSelectedSettlementStatus,
    setSelectedSoldItem,
    setSelectedSubcat,
    setShowHeaderNotifications,
    setShowUserDropdown,
    setTempSlots,
    setTxCurrentPage,
    setTxDateRange,
    setTxFilterPeriod,
    setTxSearchQuery,
    setTxSortConfig,
    setValidationErrors,
    shouldShowStock,
    showHeaderNotifications,
    showUserDropdown,
    sidebarCollapsed,
    tempSlots,
    terms,
    token,
    txCurrentPage,
    txDateRange,
    txFilterPeriod,
    txItemsPerPage,
    txSearchQuery,
    txSortConfig,
    user,
    validationErrors,
    vendorType,
    handleSaveItem,
    handleDeleteItem,
    handleImageUpload,
    handleStatusChange,
    handlePartnerImageUpload,
    fetchDashboardData,
    getAxiosConfig
  } = useDashboard();

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {user?.role === 'Admin' ? 'Platform Financial Control' :
           user?.role === 'Member' ? 'My Payments & Savings' :
           'Business Financial Center'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">
          {user?.role === 'Admin' ? 'Manage global transaction logs and platform payouts' :
           user?.role === 'Member' ? 'Monitor subscription billing and check cashbacks/savings' :
           'Track gross revenue, payout configurations, settlements, and bank details'}
        </p>
      </div>

      {(() => {
        // Filters & calculations
        const compOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out'].includes(o.status));
        const pendingOrdersList = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery'].includes(o.status));
        const failedOrdersList = orders.filter(o => ['Cancelled', 'Rejected'].includes(o.status));
              
              const totalSales = compOrders.reduce((sum, o) => sum + o.finalAmount, 0);
              const totalDiscount = compOrders.reduce((sum, o) => sum + (o.discountApplied || 0), 0);
              
              // Calculate Commission & Net Payouts based on roles (commission hidden from vendor)
              const rate = commissionConfig.commissionRate;
              const totalCommission = Math.round(totalSales * (rate / 100));
              const netEarnings = totalSales - totalCommission;
              
              // Calculate settlements
              const completedSettledAmount = settlements
                .filter(s => s.status === 'Completed')
                .reduce((sum, s) => sum + s.netAmount, 0);
              
              const pendingSettlements = settlements
                .filter(s => s.status !== 'Completed')
                .reduce((sum, s) => sum + s.netAmount, 0);

              // Date ranges for earnings metrics
              const now = new Date();
              const todayStr = now.toDateString();
              const oneDay = 24 * 60 * 60 * 1000;
              const sevenDaysAgo = now.getTime() - (7 * oneDay);
              const thirtyDaysAgo = now.getTime() - (30 * oneDay);

              const todaySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).toDateString() === todayStr)
                .reduce((sum, o) => sum + o.finalAmount, 0);
                
              const weeklySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).getTime() >= sevenDaysAgo)
                .reduce((sum, o) => sum + o.finalAmount, 0);
                
              const monthlySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).getTime() >= thirtyDaysAgo)
                .reduce((sum, o) => sum + o.finalAmount, 0);

              const totalEarnings = totalSales;

              // SVG Chart calculations
              const getChartData = () => {
                const data = [];
                let days = 7;
                if (txFilterPeriod === 'Today') days = 1;
                else if (txFilterPeriod === 'Last 7 Days') days = 7;
                else if (txFilterPeriod === 'Last 30 Days') days = 30;
                else if (txFilterPeriod === 'Custom' && txDateRange.start && txDateRange.end) {
                  const start = new Date(txDateRange.start);
                  const end = new Date(txDateRange.end);
                  days = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
                }

                for (let i = days - 1; i >= 0; i--) {
                  const d = new Date(now);
                  if (txFilterPeriod === 'Custom' && txDateRange.end) {
                    const end = new Date(txDateRange.end);
                    d.setDate(end.getDate() - i);
                  } else {
                    d.setDate(now.getDate() - i);
                  }
                  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const daySales = compOrders
                    .filter(o => o.createdAt && new Date(o.createdAt).toDateString() === d.toDateString())
                    .reduce((sum, o) => sum + o.finalAmount, 0);
                  data.push({ label, value: daySales });
                }
                return data;
              };

              const chartData = getChartData();
              const maxChartValue = Math.max(...chartData.map(d => d.value), 100);

              // CSV / Report generation
              const downloadTransactionsCSV = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Transaction ID,Customer Name,Date,Gross Amount,Status\n";
                compOrders.forEach(t => {
                  csvContent += `${t._id},${t.memberName},${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'},${t.finalAmount},${t.status}\n`;
                });
                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `Transactions_Report_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              };

              const downloadSettlementsCSV = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                const isAdm = user?.role === 'Admin';
                csvContent += isAdm 
                  ? "Settlement ID,Vendor,Date,Gross Amount,Net Amount,Status\n" 
                  : "Settlement ID,Date,Gross Amount,Net Amount,Status\n";
                
                settlements.forEach(s => {
                  if (isAdm) {
                    csvContent += `${s._id},${s.vendorBusinessName},${new Date(s.settlementDate).toLocaleDateString()},${s.grossAmount},${s.netAmount},${s.status}\n`;
                  } else {
                    csvContent += `${s._id},${new Date(s.settlementDate).toLocaleDateString()},${s.grossAmount},${s.netAmount},${s.status}\n`;
                  }
                });
                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `Settlements_Report_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              };

              // Mask bank details
              const rawAccount = user?.accountNo || '';
              const maskedAccount = rawAccount.length > 4 
                ? `${'*'.repeat(rawAccount.length - 4)}${rawAccount.slice(-4)}`
                : (rawAccount || 'Not Provided');

              // Filter & paginate transactions
              const filteredTxs = compOrders.filter(t => {
                const matchesSearch = t.memberName.toLowerCase().includes(txSearchQuery.toLowerCase()) || 
                                      t._id.toLowerCase().includes(txSearchQuery.toLowerCase());
                
                let matchesDate = true;
                if (txFilterPeriod === 'Today') {
                  matchesDate = new Date(t.createdAt).toDateString() === todayStr;
                } else if (txFilterPeriod === 'Last 7 Days') {
                  matchesDate = new Date(t.createdAt).getTime() >= sevenDaysAgo;
                } else if (txFilterPeriod === 'Last 30 Days') {
                  matchesDate = new Date(t.createdAt).getTime() >= thirtyDaysAgo;
                } else if (txFilterPeriod === 'Custom' && txDateRange.start && txDateRange.end) {
                  const s = new Date(txDateRange.start);
                  const e = new Date(txDateRange.end);
                  s.setHours(0,0,0,0);
                  e.setHours(23,59,59,999);
                  const tTime = new Date(t.createdAt).getTime();
                  matchesDate = tTime >= s.getTime() && tTime <= e.getTime();
                }
                return matchesSearch && matchesDate;
              });

              // Sorting
              const sortedTxs = [...filteredTxs].sort((a, b) => {
                let aVal = a[txSortConfig.key];
                let bVal = b[txSortConfig.key];
                if (txSortConfig.key === 'createdAt') {
                  aVal = new Date(a.createdAt).getTime();
                  bVal = new Date(b.createdAt).getTime();
                }
                if (aVal < bVal) return txSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return txSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
              });

              // Pagination
              const totalPages = Math.ceil(sortedTxs.length / txItemsPerPage);
              const paginatedTxs = sortedTxs.slice((txCurrentPage - 1) * txItemsPerPage, txCurrentPage * txItemsPerPage);

              return (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Row 1: Primary Financial Stats (Dashboard Summary Cards) */}
                  <div className={`grid grid-cols-2 lg:grid-cols-3 gap-5`}>
                    {user?.role === 'Member' ? (
                      <>
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-indigo-650 dark:text-indigo-300 uppercase font-bold tracking-wider">Total Spent</p>
                            <p className="text-2xl font-black mt-0.5">₹{totalSales}</p>
                          </div>
                        </div>
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-355 rounded-2xl"><TrendingUp size={24} /></div>
                          <div>
                            <p className="text-[10px] text-emerald-650 dark:text-emerald-300 uppercase font-bold tracking-wider">Cashback Saved</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{totalDiscount}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Gross Sales */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role === 'Admin' ? 'Platform Sales' : 'Gross Sales'}</p>
                            <p className="text-2xl font-black mt-0.5">₹{totalSales}</p>
                          </div>
                        </div>

                        {/* Net Payouts */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role === 'Admin' ? 'Net Vendor Pay' : 'Net Payouts'}</p>
                            <p className="text-2xl font-black mt-0.5 text-emerald-600 dark:text-emerald-450">₹{netEarnings}</p>
                          </div>
                        </div>

                        {/* Pending Settlements */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-355 rounded-2xl"><ClipboardList size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pending Settlements</p>
                            <p className="text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-450">₹{pendingSettlements}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment Status Overview KPI Cards */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        💳 Payment Status Overview
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-emerald-600 dark:text-emerald-300 font-extrabold uppercase text-[10px]">Successful Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{compOrders.length}</span>
                        </div>
                        <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-amber-600 dark:text-amber-300 font-extrabold uppercase text-[10px]">Pending Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingOrdersList.length}</span>
                        </div>
                        <div className="bg-red-50/40 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-red-600 dark:text-red-300 font-extrabold uppercase text-[10px]">Failed Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{failedOrdersList.length}</span>
                        </div>
                        <div className="bg-purple-50/40 dark:bg-purple-950/15 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-purple-600 dark:text-purple-300 font-extrabold uppercase text-[10px]">Refunded Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 2: Earnings Analytics (Today's, Weekly, Monthly, Total) */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        📊 Earning Timeframe Analytics
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Today's Sales</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{todaySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Weekly Sales (7D)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{weeklySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Sales (30D)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{monthlySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Sales (All Time)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{totalEarnings}</h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 3: Revenue Trend Chart */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            📈 Revenue Trends
                          </h3>
                          <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Visualizing sales performance across periods</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {['Today', 'Last 7 Days', 'Last 30 Days', 'Custom'].map(period => (
                            <button
                              key={period}
                              onClick={() => {
                                setTxFilterPeriod(period);
                                setTxCurrentPage(1);
                              }}
                              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                                txFilterPeriod === period
                                  ? 'bg-[#faed26] text-[#0b3c7b] shadow-md font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                              }`}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Date Range selector */}
                      {txFilterPeriod === 'Custom' && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md animate-fadeIn">
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Start Date</label>
                            <input 
                              type="date"
                              value={txDateRange.start}
                              onChange={(e) => setTxDateRange(prev => ({ ...prev, start: e.target.value }))}
                              className="bg-transparent text-xs outline-none border-b border-slate-200 dark:border-slate-800 pb-0.5"
                            />
                          </div>
                          <span className="text-xs text-slate-450 mt-4">to</span>
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">End Date</label>
                            <input 
                              type="date"
                              value={txDateRange.end}
                              onChange={(e) => setTxDateRange(prev => ({ ...prev, end: e.target.value }))}
                              className="bg-transparent text-xs outline-none border-b border-slate-200 dark:border-slate-800 pb-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Responsive Interactive SVG Chart */}
                      <div className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/60 rounded-3xl p-5">
                        {chartData.length === 0 ? (
                          <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">No revenue data for selected period</div>
                        ) : (
                          <div className="relative w-full">
                            {/* SVG chart bar/line representation */}
                            <svg className="w-full h-48 sm:h-64" viewBox="0 0 600 240" preserveAspectRatio="none">
                              {/* Horizontal Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                                <line 
                                  key={idx}
                                  x1="40" 
                                  y1={40 + ratio * 160} 
                                  x2="580" 
                                  y2={40 + ratio * 160} 
                                  className="stroke-slate-200 dark:stroke-slate-800"
                                  strokeDasharray="4 4"
                                />
                              ))}

                              {/* Y-axis labels */}
                              {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
                                <text 
                                  key={idx}
                                  x="32" 
                                  y={45 + (1 - ratio) * 160} 
                                  textAnchor="end" 
                                  className="fill-slate-400 text-[10px] font-mono"
                                >
                                  ₹{Math.round(maxChartValue * ratio)}
                                </text>
                              ))}

                              {/* Bars */}
                              {chartData.map((d, idx) => {
                                const barWidth = Math.max(2, Math.min(40, (380 / chartData.length)));
                                const spacing = (530 / chartData.length);
                                const x = 50 + idx * spacing;
                                const barHeight = maxChartValue > 0 ? (d.value / maxChartValue) * 160 : 0;
                                const y = 200 - barHeight;
                                const labelStep = Math.max(1, Math.ceil(chartData.length / 8));
                                const shouldShowLabel = idx % labelStep === 0 || idx === chartData.length - 1;

                                return (
                                  <g key={idx} className="group">
                                    {/* Highlight Bar Background */}
                                    <rect 
                                      x={x - 2}
                                      y="40"
                                      width={barWidth + 4}
                                      height="165"
                                      className="fill-transparent group-hover:fill-slate-100/30 dark:group-hover:fill-slate-800/10 transition-colors duration-200"
                                    />
                                    {/* Actual Data Bar */}
                                    <rect 
                                      x={x} 
                                      y={y} 
                                      width={barWidth} 
                                      height={barHeight} 
                                      rx={chartData.length > 25 ? "1" : "6"}
                                      className="fill-indigo-600 dark:fill-indigo-500 transition-all duration-300 group-hover:fill-indigo-400"
                                    />
                                    {/* Top marker label */}
                                    {d.value > 0 && (
                                      <text 
                                        x={x + barWidth / 2} 
                                        y={y - 8} 
                                        textAnchor="middle" 
                                        className="fill-slate-700 dark:fill-slate-200 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ₹{d.value}
                                      </text>
                                    )}
                                    {/* X-axis labels */}
                                    {shouldShowLabel && (
                                      <text 
                                        x={x + barWidth / 2} 
                                        y="218" 
                                        textAnchor="middle" 
                                        className="fill-slate-400 text-[9px] font-semibold"
                                      >
                                        {d.label}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 4: Transaction Management */}
                  <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          📝 Transaction Logs
                        </h3>
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Detailed logs of all completed storefront transactions</p>
                      </div>

                      {/* Export buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={downloadTransactionsCSV}
                          className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                        >
                          📥 Export CSV
                        </button>
                        <button
                          onClick={downloadTransactionsCSV}
                          className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                        >
                          📈 Export Excel
                        </button>
                      </div>
                    </div>

                    {/* Filter, Search & Table */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                        <input 
                          type="text"
                          placeholder="Search transactions by ID or customer name..."
                          value={txSearchQuery}
                          onChange={(e) => {
                            setTxSearchQuery(e.target.value);
                            setTxCurrentPage(1);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary-500 font-semibold"
                        />
                      </div>
                      <div className="w-full sm:w-56 flex gap-2">
                        <select
                          value={txFilterPeriod}
                          onChange={(e) => {
                            setTxFilterPeriod(e.target.value);
                            setTxCurrentPage(1);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary-500 font-bold text-slate-700 dark:text-slate-300"
                        >
                          <option value="Last 7 Days">Last 7 Days</option>
                          <option value="Today">Today</option>
                          <option value="Last 30 Days">Last 30 Days</option>
                          <option value="All Time">All Time</option>
                          <option value="Custom">Custom Date Range</option>
                        </select>
                      </div>
                    </div>
                    {txFilterPeriod === 'Custom' && (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span>From:</span>
                          <input
                            type="date"
                            value={txDateRange.start}
                            onChange={(e) => setTxDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span>To:</span>
                          <input
                            type="date"
                            value={txDateRange.end}
                            onChange={(e) => setTxDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Table */}
                    {sortedTxs.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 italic text-sm">No settled transactions found.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                                <th 
                                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                                  onClick={() => setTxSortConfig({ key: 'createdAt', direction: txSortConfig.key === 'createdAt' && txSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                                >
                                  Date & Time {txSortConfig.key === 'createdAt' && (txSortConfig.direction === 'desc' ? '▼' : '▲')}
                                </th>
                                <th className="py-3.5 px-4">Transaction ID</th>
                                {user?.role === 'Admin' && <th className="py-3.5 px-4">Vendor Details</th>}
                                {user?.role !== 'Member' && <th className="py-3.5 px-4">Customer Name</th>}
                                <th className="py-3.5 px-4">Payment Method</th>
                                <th 
                                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                                  onClick={() => setTxSortConfig({ key: 'finalAmount', direction: txSortConfig.key === 'finalAmount' && txSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                                >
                                  Amount {txSortConfig.key === 'finalAmount' && (txSortConfig.direction === 'desc' ? '▼' : '▲')}
                                </th>
                                {user?.role !== 'Member' && (
                                  <th className="py-3.5 px-4 text-right">Net Payout</th>
                                )}
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedTxs.map(tx => (
                                <tr key={tx._id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/30 text-slate-700 dark:text-slate-200">
                                  <td className="py-4 px-4 font-semibold">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}</td>
                                  <td className="py-4 px-4 font-mono text-slate-400">{tx._id.slice(-8).toUpperCase()}</td>
                                  {user?.role === 'Admin' && <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{tx.vendorBusinessName || 'Vendor Payout'}</td>}
                                  {user?.role !== 'Member' && <td className="py-4 px-4 font-semibold">{tx.memberName}</td>}
                                  <td className="py-4 px-4 font-bold text-indigo-500">QR Code Scan</td>
                                  <td className="py-4 px-4 text-right font-extrabold text-slate-900 dark:text-white">₹{tx.finalAmount}</td>
                                  {user?.role !== 'Member' && (
                                    <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{tx.finalAmount - Math.round(tx.finalAmount * (rate / 100))}</td>
                                  )}
                                  <td className="py-4 px-4 text-center">
                                    <span className="bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-900/30">
                                      Success
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedBillOrder(tx);
                                        setIsBillModalOpen(true);
                                      }}
                                      className="text-xs bg-[#faed26]/80 text-[#0b3c7b] hover:bg-[#faed26] font-bold px-3 py-1 rounded-xl transition-all shadow-sm active:scale-95"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-850">
                            <span className="text-[11px] text-slate-400 font-medium">Page {txCurrentPage} of {totalPages}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setTxCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={txCurrentPage === 1}
                                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold transition-all"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setTxCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={txCurrentPage === totalPages}
                                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold transition-all"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 5: Settlement Management */}
                  {user?.role !== 'Member' && (
                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Left: Settlement History Table */}
                      <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              🔄 Settlement History
                            </h3>
                            <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Payout log history and disbursement status</p>
                          </div>
                          <button
                            onClick={downloadSettlementsCSV}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all hover:bg-slate-200 dark:hover:bg-slate-750"
                          >
                            📥 Export Settlements
                          </button>
                        </div>

                        {settlements.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 italic text-sm">No settlements found.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                                  <th className="py-3 px-3">Settlement ID</th>
                                  {user?.role === 'Admin' && <th className="py-3 px-3">Vendor</th>}
                                  <th className="py-3 px-3">Date</th>
                                  <th className="py-3 px-3 text-right">Gross Amt</th>
                                  <th className="py-3 px-3 text-right">Net Amount</th>
                                  <th className="py-3 px-3 text-center">Status</th>
                                  {user?.role === 'Admin' && <th className="py-3 px-3 text-center">Change Status</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {settlements.map(s => (
                                  <tr key={s._id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-200">
                                    <td className="py-3.5 px-3 font-mono text-slate-400">{s._id.slice(-8).toUpperCase()}</td>
                                    {user?.role === 'Admin' && <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{s.vendorBusinessName}</td>}
                                    <td className="py-3.5 px-3 font-semibold">{new Date(s.settlementDate).toLocaleDateString()}</td>
                                    <td className="py-3.5 px-3 text-right font-semibold">₹{s.grossAmount}</td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{s.netAmount}</td>
                                    <td className="py-3.5 px-3 text-center">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        s.status === 'Completed' ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-250' :
                                        s.status === 'Processing' ? 'bg-blue-100/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-250' :
                                        'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-250'
                                      }`}>
                                        {s.status}
                                      </span>
                                    </td>
                                    {user?.role === 'Admin' && (
                                      <td className="py-3.5 px-3 text-center">
                                        <select
                                          value={s.status}
                                          onChange={(e) => handleUpdateSettlementStatus(s._id, e.target.value)}
                                          className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none"
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Processing">Processing</option>
                                          <option value="Completed">Completed</option>
                                        </select>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Right: Admin Create Settlement or Vendor Payout Details */}
                      <div className="lg:col-span-1 space-y-6">
                        {user?.role === 'Admin' ? (
                          <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              ➕ Dispatch Payout Settlement
                            </h3>
                            <form onSubmit={handleCreateSettlement} className="space-y-4 text-xs font-semibold">
                              <div className="space-y-1">
                                <label className="text-slate-500">Select Vendor</label>
                                <select 
                                  name="vendorId" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none font-bold"
                                  required
                                >
                                  <option value="">Choose Vendor...</option>
                                  {adminVendors.map(v => (
                                    <option key={v._id} value={v._id}>{v.businessName || v.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-slate-500">Gross Settlement Amount (₹)</label>
                                <input 
                                  type="number" 
                                  name="grossAmount" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                                  placeholder="e.g. 5000"
                                  required
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-500">Initial Status</label>
                                <select 
                                  name="status" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none font-bold"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-black py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
                              >
                                Trigger Settlement
                              </button>
                            </form>
                          </div>
                        ) : (
                          // Bank Account details (Vendor view)
                          <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              🏦 Payout Bank Account
                            </h3>
                            <div className="space-y-3 text-xs leading-relaxed">
                              <p className="text-slate-500 font-semibold">Verification logs and direct deposit coordinates:</p>
                              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 space-y-2.5 text-[11px] font-bold">
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Holder:</span>
                                  <span>{user?.accountHolderName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Bank:</span>
                                  <span>{user?.bankName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Account Number:</span>
                                  <span className="font-mono text-slate-900 dark:text-white">{maskedAccount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">IFSC Code:</span>
                                  <span>{user?.ifscCode || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-2 items-center">
                                  <span className="text-slate-450 font-normal">Verification:</span>
                                  <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] border border-emerald-250">
                                    Verified
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 6: Payment Status Overview */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        💳 Payment Status Overview
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-emerald-600 dark:text-emerald-300 font-extrabold uppercase text-[10px]">Successful Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{compOrders.length}</span>
                        </div>
                        <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-amber-600 dark:text-amber-300 font-extrabold uppercase text-[10px]">Pending Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingOrdersList.length}</span>
                        </div>
                        <div className="bg-red-50/40 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-red-600 dark:text-red-300 font-extrabold uppercase text-[10px]">Failed Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{failedOrdersList.length}</span>
                        </div>
                        <div className="bg-purple-50/40 dark:bg-purple-950/15 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-purple-600 dark:text-purple-300 font-extrabold uppercase text-[10px]">Refunded Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 7: Policy & Notifications Row */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Financial Notifications */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        🔔 Financial Alerts & Notifications
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">💰</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">New Storefront Transaction Logged</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">A new QR code cashback check transaction was processed successfully.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">🏦</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Weekly Payout Settlement Completed</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">Completed settlements have been disbursed to your linked direct deposit coordinates.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">📄</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Platform Commission Policy Updated</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">Commission structures and automated settlement cycle parameters are active.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Policy details or Admin configuration */}
                    <div className="lg:col-span-1">
                      {user?.role === 'Admin' || user?.role === 'Vendor' ? (
                        <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">Platform Payout Policy</h3>
                          <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                            <p>All storefront redemptions and purchases via Connect App are subject to the active platform payout policy.</p>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] font-bold">
                              <div>📥 <span className="font-normal text-slate-400">Collection:</span> {commissionConfig.collectionMethod}</div>
                              <div>🔄 <span className="font-normal text-slate-400">Deduction:</span> No Commission Deducted</div>
                              <div>💵 <span className="font-normal text-slate-400">Payout:</span> {commissionConfig.vendorPayout}</div>
                              <div>📅 <span className="font-normal text-slate-400">Settlement Cycle:</span> {commissionConfig.settlementCycle}</div>
                            </div>
                            <p className="text-[10px] text-slate-450 italic">
                              Platform fee and payout configurations are strictly managed by system administrators.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">
                            Membership Tier Benefits
                          </h3>
                          <div className="space-y-3 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                            <p>Get exclusive discounts at all participating stores, hospitals, restaurants, and service providers.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
    </div>
  );
};

export default Wallet;
