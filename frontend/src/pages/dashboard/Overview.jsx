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

const Overview = () => {
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
    <>
      ' && (
          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-3 z-40">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setShowHeaderNotifications(!showHeaderNotifications)}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm relative focus:outline-none flex items-center justify-center active:scale-95"
                title="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none border border-white dark:border-slate-900 shadow-md">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showHeaderNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-100 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notifications</span>
                    {notifications.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setNotifications([])} 
                        className="text-[10px] text-[#0B3C7B] dark:text-[#faed26] hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4 font-medium">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="flex items-start justify-between gap-3 text-[11px] leading-relaxed border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                          <span className="flex-1 text-left">{n.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNotification(n.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold px-1 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center active:scale-95"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        )}
        
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center gap-2.5 font-medium shadow-sm">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center gap-2.5 font-medium shadow-sm">
            <span className="text-lg">✓</span> {message}
          </div>
        )}

        {/* Subscription Expiry Alert */}
        {user?.role === 'Member' && card && (() => {
          const daysRemaining = getDaysRemaining(card.expiresAt);
          if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining >= 0) {
            return (
              <div className="bg-amber-50 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/40 text-amber-855 dark:text-amber-450 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center justify-between gap-4 font-semibold shadow-sm animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0">⏰</span>
                  <span>
                    Your <strong>{card.planName} Tier</strong> subscription is expiring in {daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}! Please renew your subscription to continue receiving your {card.discountPercent}% discount.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('renewal')}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-[0.98] shrink-0"
                >
                  Renew Now
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && user?.role === 'Member' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Member Card</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Verify active membership status and scan QR codes for discount deals</p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Card preview column */}
              <div className="lg:col-span-1 space-y-6">
                {card ? (
                  <div className={`relative rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[1.58/1] flex flex-col justify-between border border-white/10 ${
                    card.planName === 'Silver' ? 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500 text-slate-900 shadow-slate-500/10' :
                    card.planName === 'Gold' ? 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600 text-amber-955 shadow-yellow-600/10' :
                    'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500 text-indigo-950 shadow-cyan-600/10'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider">{card.planName} Tier</span>
                        <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">{card.status}</span>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs opacity-75 font-mono">Card ID</span>
                        <h4 className="text-sm font-bold tracking-wider">{card.membershipId}</h4>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs opacity-75 block">Discount</span>
                        <span className="text-2xl font-black">{card.discountPercent}% OFF</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono">Expires: {new Date(card.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">Loading card details...</p>
                )}
              </div>

              {/* QR Scan Column */}
              <div className="lg:col-span-1 glass-card p-6 rounded-3xl flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Personal Scan Code</h4>
                {card?.qrCode ? (
                  <img src={card.qrCode} alt="QR Code" className="w-40 h-40 bg-white p-2 rounded-2xl shadow-md border border-slate-100" />
                ) : (
                  <p className="text-xs text-slate-500">No QR Code generated</p>
                )}
                <p className="text-[10px] text-slate-400 text-center italic">Present this QR code to partner vendors during purchase to scan discounts</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user?.role === 'Admin' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Platform Insights</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Overall system analytics and accounts overview</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 text-purple-900 dark:text-purple-200 shadow-sm">
                <div className="p-3.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-355 rounded-2xl"><Users size={24} /></div>
                <div>
                  <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 uppercase font-bold tracking-wider">Total Members</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-purple-900 dark:text-purple-100">{analytics.customersCount}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 text-orange-900 dark:text-orange-200 shadow-sm">
                <div className="p-3.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-355 rounded-2xl"><Store size={24} /></div>
                <div>
                  <p className="text-[10px] text-orange-600/80 dark:text-orange-300/80 uppercase font-bold tracking-wider">Total Vendors</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-orange-900 dark:text-orange-100">{analytics.itemsCount}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 text-teal-900 dark:text-teal-200 shadow-sm">
                <div className="p-3.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl"><ShieldAlert size={24} /></div>
                <div>
                  <p className="text-[10px] text-teal-600/80 dark:text-teal-300/80 uppercase font-bold tracking-wider">Pending Signups</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-teal-900 dark:text-teal-100">{analytics.pendingVendors || 0}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-pink-50/60 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/30 text-pink-900 dark:text-pink-200 shadow-sm">
                <div className="p-3.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-2xl"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-[10px] text-pink-600/80 dark:text-pink-300/80 uppercase font-bold tracking-wider">Active Vendors</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-pink-900 dark:text-pink-100">{analytics.approvedVendors || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user?.role === 'Vendor' && (() => {
          // Client-side calculations for dashboard
          const completedOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'].includes(o.status));
          const pendingOrders = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved'].includes(o.status));
          const cancelledOrders = orders.filter(o => ['Cancelled', 'Rejected'].includes(o.status));

          // Orders Trend (last 7 calendar days)
          const getOrdersTrendData = () => {
            const map = {};
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              map[key] = 0;
            }
            orders.forEach(o => {
              const key = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              if (map[key] !== undefined) {
                map[key] += 1;
              }
            });
            return Object.keys(map).map(date => ({ date, count: map[date] }));
          };
          const ordersTrendData = getOrdersTrendData();

          // Top Selling Items (max 5)
          const getTopSellingData = () => {
            const itemMap = {};
            orders.forEach(o => {
              if (o.status !== 'Cancelled') {
                o.items?.forEach(item => {
                  const name = item.name || 'Unknown Item';
                  itemMap[name] = (itemMap[name] || 0) + (item.quantity || 1);
                });
              }
            });
            return Object.keys(itemMap)
              .map(name => ({ name, sales: itemMap[name] }))
              .sort((a, b) => b.sales - a.sales)
              .slice(0, 5);
          };
          const topSellingData = getTopSellingData();

          // Membership Growth (last 7 days cumulative)
          const getMembershipGrowthData = () => {
            const map = {};
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              map[key] = 0;
            }
            customers.forEach(c => {
              const key = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              if (map[key] !== undefined) {
                map[key] += 1;
              }
            });
            let cumulative = Math.max(0, customers.length - Object.values(map).reduce((sum, v) => sum + v, 0));
            return Object.keys(map).map(date => {
              cumulative += map[date];
              return { date, members: cumulative };
            });
          };
          const membershipGrowthData = getMembershipGrowthData();

          // Helper for deterministic card type for membership analytics
          const getCardTypeForMember = (memberId) => {
            if (!memberId) return 'Silver';
            let sum = 0;
            for (let i = 0; i < memberId.length; i++) {
              sum += memberId.charCodeAt(i);
            }
            const tiers = ['Silver', 'Gold', 'Diamond'];
            return tiers[sum % tiers.length];
          };

          // Revenue by Card Tier (Silver, Gold, Diamond)
          const getRevenueByCardTierData = () => {
            const map = { Silver: 0, Gold: 0, Diamond: 0 };
            orders.forEach(o => {
              if (o.status !== 'Cancelled') {
                const tier = getCardTypeForMember(o.memberId);
                map[tier] += o.finalAmount || 0;
              }
            });
            return Object.keys(map).map(tier => ({ name: tier, revenue: map[tier] }));
          };
          const revenueByCardTierData = getRevenueByCardTierData();

          const totalMembersCount = customers.length;
          const activeMemberships = analytics.activeMembershipsCount || 0;
          const expiredMemberships = Math.max(0, totalMembersCount - activeMemberships);
          const newMembersCount = customers.filter(c => new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

          const recentOrdersList = [...orders]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

          return (
            <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Overview</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time business insights, analytics, products, and customer activity</p>
                </div>
              </div>

              {/* Stats Cards Grid (8 Cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Total Revenue Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl shadow-inner"><IndianRupee size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total Revenue</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-indigo-600 dark:text-indigo-400">₹{(analytics.totalRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* 2. Total Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-355 rounded-2xl shadow-inner"><ClipboardList size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-orange-600 dark:text-orange-400">{analytics.ordersCount || 0}</p>
                  </div>
                </div>

                {/* 3. Total Diners Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl shadow-inner"><Users size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total {terms.customersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-teal-600 dark:text-teal-455">{analytics.customersCount || 0}</p>
                  </div>
                </div>

                {/* 4. Active Memberships Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-2xl shadow-inner"><CreditCard size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider font-semibold">Active Memberships</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-pink-600 dark:text-pink-400">{analytics.activeMembershipsCount || 0}</p>
                  </div>
                </div>

                {/* 5. Today's Revenue Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner"><TrendingUp size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Today's Revenue</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-emerald-600 dark:text-emerald-400">₹{(analytics.todayRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* 6. Available Dishes Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-2xl shadow-inner"><ShoppingBag size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                      {vendorType.startsWith('Hospital') ? 'Doctors Available' :
                       vendorType.startsWith('Hotel') ? 'Rooms Available' :
                       vendorType.startsWith('Restaurant') ? 'Dishes Available' :
                       vendorType.startsWith('Service Provider') ? 'Services Available' :
                       `Available ${terms.catalogName}`}
                    </p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-sky-600 dark:text-sky-455">
                      {analytics.availableItemsCount !== undefined ? `${analytics.availableItemsCount} / ${analytics.itemsCount}` : analytics.itemsCount}
                    </p>
                  </div>
                </div>

                {/* 7. Pending Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-2xl shadow-inner"><Clock size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Pending {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-yellow-600 dark:text-yellow-400">{analytics.pendingOrdersCount || 0}</p>
                  </div>
                </div>

                {/* 8. Completed Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-2xl shadow-inner"><CheckCircle2 size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Completed {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-green-600 dark:text-green-455">{completedOrders.length}</p>
                  </div>
                </div>
              </div>

              {/* Analytics Charts Grid */}
              <div className="space-y-6">
                {/* Charts Row 1: Revenue & Orders trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trend Line Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue Trend</h3>
                    {analytics.recentRevenue?.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No completed transactions to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.recentRevenue}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`₹${value}`, 'Amount']}
                            />
                            <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Orders Trend Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Orders Trend</h3>
                    {ordersTrendData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No orders recorded</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ordersTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Count']}
                            />
                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row 2: Top Selling & Membership Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Selling Dishes/Products */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Top Selling {terms.catalogName}</h3>
                    {topSellingData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No sales details to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topSellingData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Units Sold']}
                            />
                            <Bar dataKey="sales" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Membership Growth Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Membership Growth</h3>
                    {membershipGrowthData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No memberships to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={membershipGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Active Members']}
                            />
                            <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row 3: Revenue by Card Tier */}
                <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue by Card Tier</h3>
                  {revenueByCardTierData.every(d => d.revenue === 0) ? (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No membership tier revenue recorded yet</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByCardTierData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                          <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                            formatter={(value) => [`₹${value}`, 'Revenue']}
                          />
                          <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                            {revenueByCardTierData.map((entry, index) => {
                              const colors = ['#94a3b8', '#fbbf24', '#38bdf8']; // Silver, Gold, Diamond
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders, Members, and Products Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Orders Table (2/3 width) */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent {terms.ordersName}</h3>
                    <button 
                      onClick={() => setActiveTab('orders')} 
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {recentOrdersList.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-8">No bookings / orders made yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800/50 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Customer Name</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrdersList.map(order => (
                            <tr key={order._id} className="border-b border-slate-50 dark:border-slate-800/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-semibold text-slate-500">#{order._id.substring(18)}</td>
                              <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{order.memberName}</td>
                              <td className="px-6 py-4 text-xs font-extrabold text-indigo-600 dark:text-indigo-455">₹{order.finalAmount || order.totalAmount}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  ['Cancelled', 'Rejected'].includes(order.status)
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                                    : ['Delivered', 'Completed', 'Checked Out', 'Hired', 'Enrolled'].includes(order.status)
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-yellow-50 border-yellow-100 text-yellow-600 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sidebar Column (Members Section Only) */}
                <div className="space-y-6">
                  {/* Members Section */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                      <Users size={18} className="text-slate-400" />
                      Members Overview
                    </h3>

                    {/* Member Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/50">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Members</p>
                        <p className="text-xl font-extrabold mt-1 text-slate-800 dark:text-white">{totalMembersCount}</p>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20">
                        <p className="text-[10px] uppercase font-bold text-emerald-500">Active</p>
                        <p className="text-xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{activeMemberships}</p>
                      </div>
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100/30 dark:border-amber-900/20">
                        <p className="text-[10px] uppercase font-bold text-amber-500">New (7d)</p>
                        <p className="text-xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{newMembersCount}</p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100/30 dark:border-rose-900/20">
                        <p className="text-[10px] uppercase font-bold text-rose-500">Expired</p>
                        <p className="text-xl font-extrabold mt-1 text-rose-600 dark:text-rose-400">{expiredMemberships}</p>
                      </div>
                    </div>

                    {/* Mini Customers List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Recent Customers</h4>
                      {customers.slice(0, 3).map((customer, idx) => (
                        <div key={customer._id || idx} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <img 
                            src={getCustomerAvatarUrl(customer)} 
                            alt={customer.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{customer.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{customer.phone || customer.email || 'No Contact'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{customer.ordersCount} bookings</p>
                            <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">₹{customer.totalSpent}</p>
                          </div>
                        </div>
                      ))}
                      {customers.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No customers logged yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Catalog T
    </>
  );
};

export default Overview;
