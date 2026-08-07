import React from 'react';
import axios from 'axios';
import { useDashboard } from '../../context/DashboardContext';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getVendorBackendUrl } from '../../services/apiSetup';

const Profile = () => {
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/profile`, {
        ...profileForm,
        activeBusinessId
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Business profile updated successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
    }
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 animate-fadeIn">
        {/* Edit Business Profile */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business Settings & Registration Details</h3>
            <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Update all your business profile and bank account information</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* General Info Section */}
            <div>
              <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">General Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                        {vendorType.startsWith('Education') ? 'Institute / School Name' :
                         vendorType.startsWith('Job') ? 'Company Name' : 'Business Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.businessName}
                        onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                        {vendorType.startsWith('Education') ? 'Principal / Director Name' :
                         vendorType.startsWith('Job') ? 'Contact Person Name' : 'Owner Name'}
                      </label>
                      <input
                        type="text"
                        required
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">One-Time Password (OTP)</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotFlow(false)}
                        className="text-xs text-slate-500 hover:underline font-semibold"
                      >
                        Use Current Password
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold py-3 rounded-xl transition-all"
                >
                  {showForgotFlow ? 'Verify OTP & Reset Password' : 'Update Password'}
                </button>
                {showForgotFlow && (
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                    >
                      Resend OTP
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </>
  );
};

export default Profile;
