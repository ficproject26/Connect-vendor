import React from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useDashboard } from '../../context/DashboardContext';
import { getVendorBackendUrl } from '../../services/apiSetup';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { updateUser, switchBusinessSuccess } from '../../store/authSlice';
import { vendorTaxonomy } from '../../data/servicesData';

const BusinessList = () => {
  const { user } = useSelector((state) => state.auth);
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
    setIsUserInfoOpen,
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
    setSearchParams,
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

  // Compute registered business types for current user
  const registeredTypes = React.useMemo(() => {
    const set = new Set();
    if (!user) return set;
    if (user.businesses && Array.isArray(user.businesses) && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        if (b.vendorType) set.add(b.vendorType);
        if (b.category) set.add(b.category);
      });
    } else {
      if (user.vendorType) set.add(user.vendorType);
      if (user.category) set.add(user.category);
    }
    return set;
  }, [user]);

  const handleDeleteBusiness = async (bizId) => {
    if (!window.confirm('Are you sure you want to delete this business profile?')) return;

    setError('');
    setMessage('');
    try {
      const res = await axios.delete(`${getVendorBackendUrl()}/api/vendor/business/${bizId}`, getAxiosConfig());
      if (res.data.success) {
        setMessage('Business profile deleted successfully!');
        dispatch(updateUser(res.data.user));

        // Add a notification
        if (typeof setNotifications === 'function') {
          const newNotification = {
            id: Date.now() + Math.random(),
            text: 'Business profile removed successfully.'
          };
          setNotifications(prev => [newNotification, ...(prev || [])]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete business profile');
    }
  };

  const handleAddBusinessSubmit = async (e) => {
    e.preventDefault();
    if (!addBizForm.vendorType) {
      setError('Please select Product or Service or etc');
      return;
    }

    if (registeredTypes.has(addBizForm.vendorType)) {
      setError(`You have already registered the ${addBizForm.vendorType} business profile.`);
      return;
    }

    setAddingBizLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/business`, {
        businessName: addBizForm.businessName,
        vendorType: addBizForm.vendorType,
        category: addBizForm.category || addBizForm.vendorType,
        subcategory: addBizForm.subcategory || addBizForm.vendorType
      }, getAxiosConfig());

      if (res.data && res.data.success) {
        setMessage('Business added successfully!');
        dispatch(updateUser(res.data.user));
        if (res.data.newBusinessId) {
          dispatch(switchBusinessSuccess(res.data.newBusinessId));
        }
        setIsAddBusinessModalOpen(false);
        setAddBizForm({ businessName: '', vendorType: '', category: '', subcategory: '' });

        if (typeof setNotifications === 'function') {
          const newNotification = {
            id: Date.now() + Math.random(),
            text: `Successfully added and switched to new business: ${addBizForm.vendorType}!`
          };
          setNotifications(prev => [newNotification, ...(prev || [])]);
        }
      } else {
        setError(res.data?.message || 'Failed to add business');
      }
    } catch (err) {
      console.error('Error adding business:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add business');
    } finally {
      setAddingBizLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Profiles</h2>
          <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Manage multiple business profiles under a single account or register a new store</p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsAddBusinessModalOpen(true);
          }}
          className="bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98]"
        >
          <Plus size={16} /> Add Business Profile
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-2xl">
          {message}
        </div>
      )}

      {error && !isAddBusinessModalOpen && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* Business Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(user?.businesses || [{ _id: user?._id || 'primary', vendorType: user?.vendorType || 'Store Vendor', subcategory: user?.subcategory || 'General', businessName: user?.businessName }]).map((biz) => {
          const isActive = biz._id === activeBusinessId;
          const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
          return (
            <div
              key={biz._id}
              onClick={() => {
                if (!isActive) {
                  dispatch(switchBusinessSuccess(biz._id));
                  setMessage(`Switched business profile to ${biz.vendorType}!`);
                }
              }}
              className={`glass-card p-6 rounded-3xl space-y-4 border transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'border-[#faed26] bg-[#faed26]/5 shadow-[0_0_12px_rgba(250,237,38,0.15)]'
                  : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 min-w-0">
                  <span className="bg-[#faed26]/20 text-[#0B3C7B] dark:bg-[#faed26]/10 dark:text-[#faed26] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {biz.vendorType}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-tight truncate">
                    {biz.businessName || user.businessName}
                  </h3>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Category: <span className="font-semibold text-slate-700 dark:text-slate-350">{biz.vendorType}</span></div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-2xl">{emoji}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-150/40 dark:border-slate-800/40 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Status</span>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBusiness(biz._id);
                      }}
                      className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 transition-colors"
                      title="Delete Business"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  {isActive ? (
                    <span className="bg-[#faed26] text-slate-950 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      Active
                    </span>
                  ) : (
                    <span className="text-[#faed26] hover:underline font-bold transition-all">
                      Switch Profile &rarr;
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Business Card */}
        <div
          onClick={() => {
            setError('');
            setIsAddBusinessModalOpen(true);
          }}
          className="glass-card p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 hover:border-[#faed26] transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 min-h-[160px] group"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center group-hover:border-[#faed26] transition-all">
            <Plus size={24} className="text-slate-400 group-hover:text-[#faed26] transition-colors" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 group-hover:text-[#faed26] transition-colors">Add Business</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Register another category or store</p>
          </div>
        </div>
      </div>

      {/* Add Business Modal */}
      <Modal isOpen={isAddBusinessModalOpen} onClose={() => setIsAddBusinessModalOpen(false)} title="+ Add Business">
        <form onSubmit={handleAddBusinessSubmit} className="space-y-4 text-left">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Business Name (Optional)</label>
            <input
              type="text"
              placeholder="Enter Business Name (defaults to main business)"
              value={addBizForm.businessName}
              onChange={(e) => setAddBizForm({ ...addBizForm, businessName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-650"
            />
          </div>

          {/* Product or Service or etc */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Product or Service or etc</label>
            <select
              required
              value={addBizForm.vendorType}
              onChange={(e) => setAddBizForm({ ...addBizForm, vendorType: e.target.value, category: e.target.value, subcategory: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white [&>option]:bg-slate-50 dark:[&>option]:bg-slate-950"
            >
              <option value="" disabled>Select Product or Service or etc</option>
              {Object.keys(vendorTaxonomy).map((type) => {
                const isAlreadyRegistered = registeredTypes.has(type);
                return (
                  <option key={type} value={type} disabled={isAlreadyRegistered}>
                    {type} {isAlreadyRegistered ? '(Already Registered)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="submit"
            disabled={addingBizLoading}
            className="w-full bg-[#faed26] hover:bg-[#faed26]/90 disabled:bg-slate-350 dark:disabled:bg-slate-800 text-[#0b3c7b] disabled:text-slate-500 font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/15 cursor-pointer disabled:cursor-not-allowed"
          >
            {addingBizLoading ? 'Saving Business...' : 'Save Business'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default BusinessList;
