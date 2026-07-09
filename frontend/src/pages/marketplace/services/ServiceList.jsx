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

const ServiceList = () => {
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
      activeTab === 'discounts' || ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(activeTab)) && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Participating Partners</h2>
              <p className="text-slate-805 dark:text-slate-200 text-sm mt-1.5 font-medium">Browse verified stores, hospitals, and restaurants offering member benefits</p>
            </div>

            {/* Search and Quick Chips */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search partners by name, type, category or subcategory..."
                  value={memberCategorySearch}
                  onChange={(e) => setMemberCategorySearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-5 pr-5 py-3.5 text-sm focus:outline-none focus:border-primary-500 shadow-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Horizontal Category Quickchips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'All', label: 'All Partners', icon: '🏪' },
                  { id: 'Services', label: 'Services', icon: '🛠️' },
                  { id: 'Products', label: 'Products', icon: '📦' },
                  { id: 'Daily Needs', label: 'Daily Needs', icon: '🛒' },
                  { id: 'Food', label: 'Food', icon: '🍔' },
                  { id: 'Stay', label: 'Stay', icon: '🏨' },
                  { id: 'Travel', label: 'Travel', icon: '✈️' },
                  { id: 'Membership', label: 'Membership', icon: '🛡️' },
                  { id: 'Jobs', label: 'Jobs', icon: '💼' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(chip.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                      selectedCategoryFilter === chip.id
                        ? 'bg-[#faed26]/20 text-[#0B3C7B] border-[#faed26]/40 dark:bg-[#faed26]/10 dark:text-[#faed26] dark:border-[#faed26]/25 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {memberDiscounts.length === 0 ? (
              <p className="text-slate-400 text-center py-6 font-medium text-sm">No registered partners found</p>
            ) : (
              (() => {
                const filteredDiscounts = memberDiscounts.filter(vendor => {
                  const matchesChip = selectedCategoryFilter === 'All' || vendor.vendorType === selectedCategoryFilter;
                  const query = memberCategorySearch.trim().toLowerCase();
                  if (!query) return matchesChip;
                  
                  const matchesText = 
                    (vendor.businessName || '').toLowerCase().includes(query) ||
                    (vendor.vendorType || '').toLowerCase().includes(query) ||
                    (vendor.category || '').toLowerCase().includes(query) ||
                    (vendor.subcategory || '').toLowerCase().includes(query) ||
                    (vendor.address || '').toLowerCase().includes(query);
                    
                  return matchesChip && matchesText;
                });

                if (filteredDiscounts.length === 0) {
                  return (
                    <div className="glass-card p-12 text-center rounded-3xl">
                      <p className="text-slate-500 font-medium">No participating partners match your search criteria.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscounts.map(vendor => (
                      <div 
                        key={vendor.id} 
                        onClick={() => handleOpenStorefront(vendor)}
                        style={{ cursor: 'pointer' }}
                        className="glass-card p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800/80 hover-card transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-[#faed26]/20 text-[#0B3C7B] dark:bg-[#faed26]/10 dark:text-[#faed26] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{vendor.vendorType}</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-tight">{vendor.businessName}</h3>
                            <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                              {vendor.category && (
                                <div>Category: <span className="font-semibold text-slate-700 dark:text-slate-350">{vendor.category}</span></div>
                              )}
                              {vendor.subcategory && (
                                <div>Subcategory: <span className="font-semibold text-slate-700 dark:text-slate-350">{vendor.subcategory}</span></div>
                              )}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shrink-0">
                            <span className="text-lg">
                              {vendor.vendorType === 'Food' ? '🍔' :
                               vendor.vendorType === 'Stay' ? '🏨' :
                               vendor.vendorType === 'Travel' ? '✈️' :
                               vendor.vendorType === 'Jobs' ? '💼' : '🛍️'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-150/40 dark:border-slate-800/40 text-xs text-slate-650 dark:text-slate-350 space-y-1.5">
                          <div>📍 {vendor.address || 'No address provided'}</div>
                          <div>📞 {vendor.mobileNumber || 'No phone provided'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Redeem Offer Tab (Membe
    </>
  );
};

export default ServiceList;
