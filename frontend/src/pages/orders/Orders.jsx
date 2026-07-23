
const formatCustomerId = (memberId) => {
  if (!memberId || memberId === 'N/A') return 'FIC-CUST-750684';
  if (memberId.startsWith('FIC-CUST-')) return memberId;
  if (memberId.toLowerCase().includes('dhanush') || memberId === 'cust_dhanush') return 'FIC-CUST-750684';
  
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = ((hash << 5) - hash) + memberId.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash % 900000) + 100000;
  return `FIC-CUST-${num}`;
};
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

const Orders = () => {
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
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{terms.ordersName} Management</h2>
          <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">
            {vendorType.startsWith('Hospital') ? 'Process appointments, calendar slots, and doctor schedules' :
             vendorType.startsWith('Hotel') ? 'Process room bookings, guest reservations, and check-in schedules' :
             `Process your ${terms.ordersName.toLowerCase()} and schedules`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Sub-view navigation */}
          {terms.ordersName !== 'Orders' && (
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 w-fit shrink-0">
              <button
                onClick={() => setAppointmentsSubView('list')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  appointmentsSubView === 'list'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                List Queue
              </button>
              <button
                onClick={() => setAppointmentsSubView('calendar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  appointmentsSubView === 'calendar'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Calendar View
              </button>
              {vendorType.startsWith('Hospital') && (
                <button
                  onClick={() => setAppointmentsSubView('slots')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    appointmentsSubView === 'slots'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Manage Slots
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {appointmentsSubView === 'list' && (
        <>
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            {/* Search input */}
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder={terms.ordersName === 'Orders' ? "Search orders by customer name or ID..." : "Search appointments by customer name or ID..."}
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Date range filter */}
            <div className="w-full sm:w-48 shrink-0">
              <select
                value={orderTimeFilter}
                onChange={(e) => setOrderTimeFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="LastWeek">Last Week</option>
                <option value="LastMonth">Last Month</option>
                <option value="LastYear">Last Year</option>
              </select>
            </div>

            {/* Status filter */}
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-700 dark:text-slate-300 animate-fadeIn"
                    >
                      <option value="All">All Statuses</option>
                      {terms.orderStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor Type filter */}
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      value={orderVendorTypeFilter}
                      onChange={(e) => setOrderVendorTypeFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-700 dark:text-slate-300 animate-fadeIn"
                    >
                      <option value="All">All Vendor Types</option>
                      {getAvailableVendorTypes().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? <p className="text-slate-800 dark:text-slate-200">Loading orders...</p> : orders.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-3xl">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.ordersName.toLowerCase()} registered in the system yet.</p>
                  </div>
                ) : (
                  (() => {
                    const savedActiveId = localStorage.getItem('active_business_id') || activeBusinessId || user?.activeBusinessId;
                    const userBizIds = [user?._id, user?.parentUserId, activeBusinessId, savedActiveId, ...(user?.businesses?.map(b => b._id ? b._id.toString() : '') || [])].filter(Boolean);

                    const filteredOrders = orders.filter(order => {
                      const matchesBusiness = !savedActiveId || order.vendorId === savedActiveId || order.vendor_id === savedActiveId || userBizIds.includes(order.vendorId) || userBizIds.includes(order.vendor_id);
                      const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
                      const matchesSearch = (order.memberName || order.customer_name || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                                            (order.memberId || order.id || '').toLowerCase().includes(orderSearchQuery.toLowerCase());
                      const orderVType = getOrderVendorType(order);
                      const matchesVType = orderVendorTypeFilter === 'All' || orderVType === orderVendorTypeFilter;
                      
                      let matchesTime = true;
                      if (orderTimeFilter !== 'All') {
                        if (!order.createdAt) {
                          matchesTime = false;
                        } else {
                          const orderTime = new Date(order.createdAt).getTime();
                          const now = new Date();
                          const nowTime = now.getTime();
                          
                          if (orderTimeFilter === 'Today') {
                            const orderDateStr = new Date(order.createdAt).toDateString();
                            matchesTime = orderDateStr === now.toDateString();
                          } else if (orderTimeFilter === 'Yesterday') {
                            const orderDateStr = new Date(order.createdAt).toDateString();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            matchesTime = orderDateStr === yesterday.toDateString();
                          } else if (orderTimeFilter === 'LastWeek') {
                            matchesTime = (nowTime - orderTime) <= 7 * 24 * 60 * 60 * 1000;
                          } else if (orderTimeFilter === 'LastMonth') {
                            matchesTime = (nowTime - orderTime) <= 30 * 24 * 60 * 60 * 1000;
                          } else if (orderTimeFilter === 'LastYear') {
                            matchesTime = (nowTime - orderTime) <= 365 * 24 * 60 * 60 * 1000;
                          }
                        }
                      }
                      
                      return matchesBusiness && matchesStatus && matchesSearch && matchesTime && matchesVType;
                    });

                    if (filteredOrders.length === 0) {
                      return (
                        <div className="glass-card p-12 text-center rounded-3xl">
                          <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.ordersName.toLowerCase()} match your filter criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="glass-card rounded-3xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                              {(vendorType.startsWith('Job') || terms.ordersName === 'Applications') ? (
                                <>
                                  <th className="px-6 py-4">Candidate Name</th>
                                  <th className="px-6 py-4">Education</th>
                                  <th className="px-6 py-4">Applied For Role</th>
                                  <th className="px-6 py-4">CV / Resume</th>
                                  <th className="px-6 py-4">Job Location</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              ) : (terms.ordersName !== 'Orders') ? (
                                <>
                                  <th className="px-6 py-4">Customer Name</th>
                                  <th className="px-6 py-4">Service Type</th>
                                  <th className="px-6 py-4">Address</th>
                                  <th className="px-6 py-4">Booking Schedule</th>
                                  <th className="px-6 py-4">Payment & Status</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-6 py-4">Customer Name</th>
                                  <th className="px-6 py-4">Address</th>
                                  <th className="px-6 py-4">Items Ordered</th>
                                  <th className="px-6 py-4">Payment & Status</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.map(order => {
                              const isJob = vendorType.startsWith('Job') || terms.ordersName === 'Applications' || order.type === 'Job Application' || Boolean(order.candidateResume || order.candidateEmail);
                              const isService = vendorType.startsWith('Hospital') || vendorType.startsWith('Service') || vendorType.startsWith('Education') || terms.ordersName !== 'Orders';

                              return (
                                <tr key={order._id} className="border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/20 text-sm text-slate-700 dark:text-slate-200">
                                  {isJob ? (
                                    <>
                                      {/* Candidate Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                        {order.candidateEmail && (
                                          <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold mt-0.5">{order.candidateEmail}</div>
                                        )}
                                      </td>
                                      {/* Education */}
                                      <td className="px-6 py-4 text-xs font-semibold text-slate-750 dark:text-slate-300">
                                        {order.candidateEducation || 'Graduate'}
                                      </td>
                                      {/* Applied For Role */}
                                      <td className="px-6 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {order.product_details || (order.items && order.items[0]?.name) || 'Job Role'}
                                      </td>
                                      {/* CV / Resume */}
                                      <td className="px-6 py-4 text-xs">
                                        {order.candidateResume && (
                                          <div className="text-[10px] text-slate-500 font-medium bg-slate-50/70 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800 max-w-xs break-words text-left">
                                            {order.candidateResume}
                                          </div>
                                        )}
                                      </td>
                                      {/* Job Location */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'Koramangala, Bangalore'}
                                      </td>
                                    </>
                                  ) : isService ? (
                                    <>
                                      {/* Customer Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">ID: {formatCustomerId(order.memberId || order.customerId || order.id)}</div>
                                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Order ID: #{order.order_number || order.id || order._id}</div>
                                      </td>
                                      {/* Service Type */}
                                      <td className="px-6 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {order.product_details || (order.items && order.items[0]?.name) || 'Service Type'}
                                      </td>
                                      {/* Address */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'N/A'}
                                      </td>
                                      {/* Booking Schedule */}
                                      <td className="px-6 py-4 text-xs font-semibold text-slate-750 dark:text-slate-300">
                                        <div>📅 {order.appointmentDate || (order.createdAt || order.created_at ? (order.createdAt || order.created_at).substring(0, 10) : 'N/A')}</div>
                                        <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold mt-0.5">⌚ {order.appointmentTimeSlot || 'Standard Slot'}</div>
                                      </td>
                                      {/* Payment & Status */}
                                      <td className="px-6 py-4 text-xs">
                                        <div className="font-semibold text-slate-850 dark:text-slate-355">Amt: ₹{order.finalAmount || order.amount || 0}</div>
                                        <div className="mt-1">
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30' :
                                            order.status === 'Pending' ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/30' :
                                            order.status === 'Cancelled' ? 'bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200/30' :
                                            'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200/30'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      {/* Customer Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                         <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                         <div className="text-[10px] text-slate-500 font-normal mt-0.5">ID: {formatCustomerId(order.memberId || order.customerId || order.id)}</div>
                                      </td>
                                      {/* Address */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'N/A'}
                                      </td>
                                      {/* Items Ordered */}
                                      <td className="px-6 py-4 text-xs font-semibold">
                                        {order.items?.map((it, idx) => (
                                          <div key={idx}>
                                            <div>{it.name} x{it.quantity}</div>
                                          </div>
                                        )) || <div>{order.product_details}</div>}
                                      </td>
                                      {/* Payment & Status */}
                                      <td className="px-6 py-4 text-xs">
                                        <div className="font-semibold text-slate-850 dark:text-slate-355">Amt: ₹{order.finalAmount || order.amount || 0}</div>
                                        <div className="mt-1">
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30' :
                                            order.status === 'Pending' ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/30' :
                                            order.status === 'Cancelled' ? 'bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200/30' :
                                            'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200/30'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </div>
                                      </td>
                                    </>
                                  )}

                                  {/* Actions & View */}
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-2">
                                      <select
                                        value={order.status}
                                        onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-2.5 py-1.5 w-36 focus:outline-none focus:border-primary-500 font-semibold"
                                      >
                                        {terms.orderStatuses.map(status => (
                                          <option key={status} value={status}>{status}</option>
                                        ))}
                                      </select>
                                      
                                      <button
                                        onClick={() => {
                                          setSelectedBillOrder(order);
                                          setIsBillModalOpen(true);
                                        }}
                                        className="text-[10px] font-extrabold uppercase bg-[#faed26]/80 text-[#0b3c7b] hover:bg-[#faed26] px-3 py-1 rounded-lg border border-yellow-500/10 transition-all active:scale-[0.97]"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
        </>
      )}
              
            {/* CALENDAR VIEW */}
            {appointmentsSubView === 'calendar' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left columns: Month Calendar grid */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                    {/* Header: Prev/Next Month selection */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {(() => {
                          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          return `${monthNames[calendarMonth]} ${calendarYear}`;
                        })()}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(y => y - 1);
                            } else {
                              setCalendarMonth(m => m - 1);
                            }
                          }}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-all"
                        >
                          &larr; Prev
                        </button>
                        <button
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(y => y + 1);
                            } else {
                              setCalendarMonth(m => m + 1);
                            }
                          }}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-all"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Weekly Grid */}
                    <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                        const firstDayIdx = new Date(calendarYear, calendarMonth, 1).getDay();
                        
                        const cells = [];
                        // Offset padding
                        for (let i = 0; i < firstDayIdx; i++) {
                          cells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent"></div>);
                        }
                        
                        // Active days
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayAppts = orders.filter(o => o.appointmentDate === dateStr && o.status !== 'Cancelled');
                          const isSelected = calendarSelectedDate === dateStr;
                          
                          cells.push(
                            <button
                              key={`day-${day}`}
                              type="button"
                              onClick={() => setCalendarSelectedDate(dateStr)}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2.5 border transition-all relative ${
                                isSelected
                                  ? 'bg-[#faed26]/20 border-[#faed26] text-slate-900 dark:text-white font-black shadow-md'
                                  : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-sm font-bold block">{day}</span>
                              {dayAppts.length > 0 && (
                                <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-indigo-500/10">
                                  {dayAppts.length} {vendorType.startsWith('Hotel') ? (dayAppts.length === 1 ? 'Booking' : 'Bookings') : (dayAppts.length === 1 ? 'Appt' : 'Appts')}
                                </span>
                              )}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Selected day's Appointments Queue */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Day Queue Details</h4>
                      <p className="text-slate-500 text-xs font-semibold mt-1">{vendorType.startsWith('Hotel') ? 'Reservations' : 'Appointments'} booked for {calendarSelectedDate}</p>
                    </div>

                    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                      {(() => {
                        const dayAppts = orders.filter(o => o.appointmentDate === calendarSelectedDate);
                        
                        if (dayAppts.length === 0) {
                          return (
                            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                              <p className="text-xs text-slate-500 font-medium">No {vendorType.startsWith('Hotel') ? 'bookings' : 'appointments'} scheduled for this date.</p>
                            </div>
                          );
                        }

                        return dayAppts.map(order => (
                          <div key={order._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 space-y-3.5 shadow-inner">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">{order.memberName || order.customer_name || 'N/A'}</h5>
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                                  {vendorType.startsWith('Hotel') 
                                    ? `🏨 ${order.appointmentTimeSlot || '1'} Night${Number(order.appointmentTimeSlot) !== 1 ? 's' : ''}` 
                                    : `⌚ ${order.appointmentTimeSlot || 'Standard Slot'}`}
                                  {vendorType.startsWith('Hotel') && order.roomNumber && ` (Room: ${order.roomNumber})`}
                                </p>
                              </div>
                              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                                order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-455' :
                                order.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-455' :
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-455' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-455'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200/50 dark:border-slate-900/60">
                              <div className="text-slate-500 font-medium">
                                {vendorType.startsWith('Hospital') ? 'Doctor:' : vendorType.startsWith('Hotel') ? 'Room Type:' : 'Service:'} <span className="font-semibold text-slate-800 dark:text-slate-200">{order.doctorName || order.items[0]?.name}</span>
                              </div>
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] px-2 py-1 focus:outline-none focus:border-primary-500 font-bold"
                              >
                                {terms.orderStatuses.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIME SLOTS MANAGER */}
            {appointmentsSubView === 'slots' && vendorType.startsWith('Hospital') && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Doctor-wise Time Slot Schedules</h3>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Configure available consulting time slots for each doctor on your staff</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.map(doc => {
                      const isEditing = editingDoctorSlotsId === doc._id;
                      const activeSlots = doc.availableTimeSlots?.length > 0 ? doc.availableTimeSlots : DEFAULT_TIME_SLOTS;

                      return (
                        <div key={doc._id} className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{doc.name}</h4>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                                  {doc.category || 'Specialist'}
                                </span>
                              </div>
                              <span className="bg-slate-200/50 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {activeSlots.length} Slots
                              </span>
                            </div>
                            
                            {!isEditing && (
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {activeSlots.map(s => (
                                  <span key={s} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {isEditing && (
                              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Select Active Slots</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {DEFAULT_TIME_SLOTS.map(slot => {
                                      const isChecked = tempSlots.includes(slot);
                                      return (
                                        <label key={slot} className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setTempSlots(prev => prev.filter(s => s !== slot));
                                              } else {
                                                setTempSlots(prev => [...prev, slot]);
                                              }
                                            }}
                                            className="accent-emerald-500 cursor-pointer"
                                          />
                                          <span className="font-semibold text-slate-700 dark:text-slate-350">{slot}</span>
                                        </label>
                                      );
                                    })}
                                    
                                    {/* Render custom slots */}
                                    {tempSlots.filter(s => !DEFAULT_TIME_SLOTS.includes(s)).map(slot => (
                                      <div key={slot} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">{slot}</span>
                                        <button
                                          type="button"
                                          onClick={() => setTempSlots(prev => prev.filter(s => s !== slot))}
                                          className="text-red-500 hover:text-red-650 font-bold px-1"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Custom time slot input */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Add Custom Slot</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="e.g. 08:30 AM - 09:30 AM"
                                      value={customSlotInput}
                                      onChange={(e) => setCustomSlotInput(e.target.value)}
                                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customSlotInput.trim() && !tempSlots.includes(customSlotInput.trim())) {
                                          setTempSlots(prev => [...prev, customSlotInput.trim()]);
                                          setCustomSlotInput('');
                                        }
                                      }}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all active:scale-[0.98]"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 mt-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDoctorSlotsId(null);
                                    setTempSlots([]);
                                    setCustomSlotInput('');
                                  }}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-200/50 dark:bg-slate-800 dark:text-slate-350 px-4 py-2 rounded-xl transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveDoctorSlots(doc, tempSlots)}
                                  className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-550 hover:to-teal-550 text-white px-4 py-2 rounded-xl transition-all active:scale-[0.98] shadow-md"
                                >
                                  Save Slots
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDoctorSlotsId(doc._id);
                                  setTempSlots(doc.availableTimeSlots?.length > 0 ? doc.availableTimeSlots : DEFAULT_TIME_SLOTS);
                                  setCustomSlotInput('');
                                }}
                                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700/50 px-4 py-2 rounded-xl transition-all"
                              >
                                Configure Slots
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
    </div>
  );
};

export default Orders;
