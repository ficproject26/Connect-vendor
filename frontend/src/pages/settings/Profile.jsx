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
import { updateUser } from '../../store/authSlice';

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
        if (res.data.data) {
          dispatch(updateUser(res.data.data));
        }
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
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Vendor Name per Bank Details</label>
                  <input
                    type="text"
                    value={profileForm.alternateVendorName}
                    onChange={e => setProfileForm({ ...profileForm, alternateVendorName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Co-Partner Name</label>
                  <input
                    type="text"
                    value={profileForm.coPartnerName}
                    onChange={e => setProfileForm({ ...profileForm, coPartnerName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Agent Name</label>
                  <input
                    type="text"
                    value={profileForm.agentName || ''}
                    onChange={e => setProfileForm({ ...profileForm, agentName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">E-mail Address</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Mobile Contact</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={profileForm.mobileNumber}
                    onChange={e => setProfileForm({ ...profileForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Telephone</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileForm.telephone}
                    onChange={e => setProfileForm({ ...profileForm, telephone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit telephone"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Fax</label>
                  <input
                    type="text"
                    value={profileForm.fax}
                    onChange={e => setProfileForm({ ...profileForm, fax: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Alternate Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileForm.alternateNumber}
                    onChange={e => setProfileForm({ ...profileForm, alternateNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit alternate number"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">Address Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                    {vendorType.startsWith('Education') ? 'Institute Address' :
                     vendorType.startsWith('Job') ? 'Office Address' : 'Business Address'}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.address}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Street</label>
                  <input
                    type="text"
                    required
                    value={profileForm.street}
                    onChange={e => setProfileForm({ ...profileForm, street: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">City</label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">State</label>
                  <input
                    type="text"
                    required
                    value={profileForm.state}
                    onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Country</label>
                  <input
                    type="text"
                    required
                    value={profileForm.country}
                    onChange={e => setProfileForm({ ...profileForm, country: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={profileForm.postalCode}
                    onChange={e => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">PAN Number</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={profileForm.panNo || ''}
                    onChange={e => setProfileForm({ ...profileForm, panNo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Aadhaar Number</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit Aadhaar Number"
                    value={profileForm.aadhaarNo || ''}
                    onChange={e => setProfileForm({ ...profileForm, aadhaarNo: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Company Registration No</label>
                  <input
                    type="text"
                    required
                    value={profileForm.companyRegNo}
                    onChange={e => setProfileForm({ ...profileForm, companyRegNo: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Business License Link/Path</label>
                  <input
                    type="text"
                    value={profileForm.businessLicense}
                    onChange={e => setProfileForm({ ...profileForm, businessLicense: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bank Information Section */}
            <div>
              <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">Bank Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.accountHolderName}
                    onChange={e => setProfileForm({ ...profileForm, accountHolderName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.bankName}
                    onChange={e => setProfileForm({ ...profileForm, bankName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.bankBranch}
                    onChange={e => setProfileForm({ ...profileForm, bankBranch: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Branch Street</label>
                  <input
                    type="text"
                    required
                    value={profileForm.bankStreet}
                    onChange={e => setProfileForm({ ...profileForm, bankStreet: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Branch City</label>
                  <input
                    type="text"
                    required
                    value={profileForm.bankCity}
                    onChange={e => setProfileForm({ ...profileForm, bankCity: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={profileForm.accountNo}
                    onChange={e => setProfileForm({ ...profileForm, accountNo: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={profileForm.ifscCode}
                    onChange={e => setProfileForm({ ...profileForm, ifscCode: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">SWIFT Code</label>
                  <input
                    type="text"
                    value={profileForm.swiftCode}
                    onChange={e => setProfileForm({ ...profileForm, swiftCode: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary-600/15"
            >
              Save Business Profile Info
            </button>
          </form>
        </div>

        {/* Column 2 */}
        <div className="space-y-8 h-fit">
          {/* Switch Business */}
          {user?.role === 'Vendor' && (
            <div className="glass-card p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch Business</h3>
                <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Manage multiple business profiles under a single account</p>
              </div>

              <div className="space-y-3">
                {user?.businesses && user.businesses.map((biz) => {
                  const isActive = biz._id === activeBusinessId;
                  const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
                  return (
                    <div
                      key={biz._id}
                      onClick={() => {
                        if (!isActive) {
                          dispatch(switchBusinessSuccess(biz._id));
                          setMessage(`Switched business to ${biz.subcategory}!`);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#faed26]/10 border-[#faed26] shadow-[0_0_12px_rgba(250,237,38,0.15)]'
                          : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {biz.businessName || user.businessName}
                          </h4>
                          <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium truncate">
                            Product or Service or etc: {biz.vendorType}
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <span className="bg-[#faed26] text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold hover:text-slate-950 dark:hover:text-white">
                          Switch &rarr;
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Change Password */}
          <div className="glass-card p-6 rounded-3xl space-y-6 h-fit">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Account Password</h3>
            <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Change current log credentials</p>
          </div>

          <form onSubmit={showForgotFlow ? handleResetPasswordWithOTP : handleChangePassword} className="space-y-4">
            {!showForgotFlow ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Current Password</label>
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
