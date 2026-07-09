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

const Customers = () => {
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
          <div className="animate-fadeIn">
            <div className="space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ecosystem {terms.customersName}</h2>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">{terms.customersSub}</p>
                </div>

            {/* Filter controls */}
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
              <input
                type="text"
                placeholder={`Search ${terms.customersName.toLowerCase()} by name, email, or phone...`}
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {loading ? <p className="text-slate-800 dark:text-slate-200">Loading {terms.customersName.toLowerCase()}...</p> : customers.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-3xl">
                <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.customersName.toLowerCase()} registered in transaction logs.</p>
              </div>
            ) : (
              (() => {
                const filteredCustomers = customers.filter(c => {
                  const matchesSearch = c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
                                        (c.email && c.email.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
                                        (c.phone && c.phone.includes(customerSearchQuery));
                  return matchesSearch;
                });

                if (filteredCustomers.length === 0) {
                  return (
                    <div className="glass-card p-12 text-center rounded-3xl">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.customersName.toLowerCase()} match your search query.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map(c => (
                      <div key={c._id} className="glass-card rounded-3xl p-6 flex flex-col justify-between hover-card relative overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm transition-all duration-300">
                        <div>
                          {/* Avatar & Header Info */}
                          <div className="flex items-center gap-3.5 mb-5">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shrink-0 relative group">
                              <img
                                src={getCustomerAvatarUrl(c)}
                                alt={c.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{c.name}</h3>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[170px]" title={c.email}>{c.email}</p>
                            </div>
                          </div>

                          {/* Stats Metrics Sub-grid */}
                          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Visits</span>
                              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{c.ordersCount} times</span>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">{terms.customerSpentLabel.replace('Total ', '').replace(' (₹)', '')}</span>
                              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{c.totalSpent}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
              </div>
          </div>
        )}

        {/* Delivery T
    </>
  );
};

export default Customers;
