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

const Membership = () => {
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
          <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Membership Card & Plans</h2>
              <p className="text-slate-800 dark:text-slate-205 text-sm mt-1.5 font-medium">Manage your vendor subscription status, explore active benefit tiers, and upgrade platform memberships</p>
            </div>

            {/* Expiry Alert */}
            {card && card.status === 'Active' && (() => {
              const daysRemaining = getDaysRemaining(card.expiresAt);
              if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining >= 0) {
                return (
                  <div className="bg-amber-50 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-450 p-5 rounded-3xl flex items-center justify-between gap-4 font-semibold text-xs shadow-sm animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">⏰</span>
                      <span>
                        Renewal Reminder: Your <strong>{card.planName} Tier</strong> subscription is expiring in {daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}! Renew now to retain your exclusive membership benefits.
                      </span>
                    </div>
                    <button
                      onClick={() => handleRenewMembership(card.planName)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 rounded-xl transition-all shadow-md active:scale-[0.98] shrink-0"
                    >
                      Renew Now
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column: Digital Card display */}
              <div className="lg:col-span-1 space-y-6">
                {card ? (
                  <div className="space-y-6">
                    {/* The Premium Digital Card */}
                    <div className={`relative rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[1.58/1] flex flex-col justify-between transform hover:scale-[1.02] transition-all duration-300 border border-white/10 ${
                      card.planName === 'Silver' ? 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500 text-slate-900 shadow-slate-500/10' :
                      card.planName === 'Gold' ? 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600 text-amber-955 shadow-yellow-600/10' :
                      'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500 text-indigo-950 shadow-cyan-600/10'
                    }`}>
                      {/* Decorative Glossy Bubble */}
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

                      {/* Top Row: Brand & Tier */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Connect Card</span>
                          <h4 className="text-2xl font-black tracking-tight">{card.planName} Tier</h4>
                        </div>
                        <div className={`text-xs font-black px-3 py-1 rounded-full border border-white/20 uppercase shadow-sm ${
                          card.status === 'Active' ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100' : 'bg-red-500/20 text-red-900 dark:text-red-100'
                        }`}>
                          {card.status}
                        </div>
                      </div>

                      {/* Middle Row: Membership ID & Info */}
                      <div className="my-4 space-y-1">
                        <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Membership ID</p>
                        <p className="font-mono text-base font-extrabold tracking-wider">{card.membershipId}</p>
                      </div>

                      {/* Bottom Row: Name, Discount, Expiry */}
                      <div className="flex justify-between items-end border-t border-white/10 pt-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-bold opacity-70">Business Account</p>
                          <p className="text-sm font-bold truncate max-w-[150px]">{user?.businessName || user?.name}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <p className="text-[9px] uppercase font-bold opacity-70">Discount</p>
                          <p className="text-lg font-black">{card.discountPercent}% Off</p>
                        </div>
                      </div>

                      {/* Diamond Card Blur Overlay */}
                      {isDiamondBlurred && (
                        <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                          <div className="bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2 animate-bounce">
                            <span className="text-xl">🔒</span>
                          </div>
                          <h5 className="text-xs font-black text-indigo-950 dark:text-white uppercase tracking-wider">Diamond Plan Preview</h5>
                          <p className="text-[10px] text-slate-850 dark:text-slate-200 mt-1 max-w-[180px] font-semibold">Subscribe to active tier features</p>
                        </div>
                      )}
                    </div>

                    {/* QR Code Scannable Container (Only visible to Members) */}
                    {user?.role === 'Member' && (
                      <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 border border-slate-200/60 dark:border-slate-800/85 relative overflow-hidden">
                        <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100">
                          <img src={card.qrCode} alt="Card QR Code" className="w-40 h-40 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your Card QR Code</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Present this QR code at participating vendors to redeem your {card.discountPercent}% discount.</p>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                            Expires: {new Date(card.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        </div>

                        {/* Diamond QR Code Blur Overlay */}
                        {isDiamondBlurred && (
                          <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                            <div className="bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2">
                              <span className="text-xl">🔒</span>
                            </div>
                            <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Diamond QR Locked</h5>
                            <p className="text-[10px] text-slate-700 dark:text-slate-350 mt-1 max-w-[180px] font-semibold">Upgrade to Diamond plan to activate premium QR</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center justify-center space-y-4 h-full min-h-[400px] border border-slate-200/60 dark:border-slate-800/85 relative overflow-hidden">
                    <div className="text-4xl">💳</div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">No Membership Card</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Purchase a membership plan on the right to unlock customer discounts across all participating outlets.</p>
                    </div>

                    {/* Diamond No Card Blur Overlay */}
                    {isDiamondBlurred && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-950/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2">
                          <span className="text-xl">🔒</span>
                        </div>
                        <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Diamond Tier Locked</h5>
                        <p className="text-[10px] text-slate-700 dark:text-slate-350 mt-1 max-w-[180px] font-semibold">Subscribe to active tier features</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Benefits Summary & Available Plans */}
              <div className="lg:col-span-2 space-y-6">
                {/* Benefits Summary Widget */}
                {(() => {
                  const completedVendorOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out'].includes(o.status));
                  const totalSalesVal = completedVendorOrders.reduce((sum, o) => sum + o.finalAmount, 0);
                  
                  const savingsVal = 0;

                  const activeDiscountText = card && card.status === 'Active'
                    ? `${card.discountPercent}% Card Discount`
                    : 'None';

                  const usageCount = completedVendorOrders.length;
                  
                  const exclusiveBenefits = card && card.status === 'Active'
                    ? (card.planName === 'Silver' ? ['Basic Support Services'] :
                       card.planName === 'Gold' ? ['Priority Support Services', 'Featured Storefront Listing'] :
                       ['Premium Support Services', 'Featured Storefront Listing', 'Exclusive Platform Promotions'])
                    : ['Standard Account Benefits'];

                  return (
                    <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Membership Benefits Summary</h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100/50 dark:border-purple-900/30">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Total Savings Earned</span>
                          <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1 block">₹{savingsVal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Active Discounts</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate" title={activeDiscountText}>{activeDiscountText}</span>
                        </div>
                        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Usage Count</span>
                          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">{usageCount} orders</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider pl-1">Exclusive Vendor Benefits</span>
                        <ul className="grid sm:grid-cols-2 gap-2 text-xs">
                          {exclusiveBenefits.map((b, idx) => (
                            <li key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-emerald-500 font-extrabold">✓</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}

                {/* Available Membership Plans */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-200/60 dark:border-slate-800/85">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Available Membership Plans</h3>
                    <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Upgrade or renew your plan to increase your shopping discount tier</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5">
                    {[
                      {
                        name: 'Silver',
                        price: 500,
                        validityDays: 30,
                        discount: 10,
                        bgGradient: 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500',
                        textColor: 'text-slate-900',
                        validityColor: 'text-slate-700',
                        borderColor: 'border-slate-350/40',
                        shadowColor: 'shadow-slate-500/15',
                        benefits: ['10% Discount', 'Basic Support']
                      },
                      {
                        name: 'Gold',
                        price: 1000,
                        validityDays: 90,
                        discount: 15,
                        bgGradient: 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600',
                        textColor: 'text-amber-955',
                        validityColor: 'text-amber-900',
                        borderColor: 'border-yellow-400/40',
                        shadowColor: 'shadow-yellow-600/15',
                        benefits: ['15% Discount', 'Priority Support', 'Featured Listing']
                      },
                      {
                        name: 'Diamond',
                        price: 2000,
                        validityDays: 365,
                        discount: 20,
                        bgGradient: 'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500',
                        textColor: 'text-indigo-950',
                        validityColor: 'text-indigo-900',
                        borderColor: 'border-cyan-400/40',
                        shadowColor: 'shadow-cyan-600/15',
                        benefits: ['20% Discount', 'Premium Support', 'Featured Listing', 'Exclusive Promotions']
                      }
                    ].map(plan => {
                      const dbPlan = membershipPlans.find(p => p.name === plan.name) || plan;
                      const isCurrent = card?.planName === plan.name && card?.status === 'Active';
                      
                      const isHigherTier = (pName, currentName) => {
                        if (!currentName || card?.status !== 'Active') return true;
                        const tiers = { 'Silver': 1, 'Gold': 2, 'Diamond': 3 };
                        return tiers[pName] > tiers[currentName];
                      };

                      let btnText = 'Purchase Plan';
                      let btnDisabled = false;
                      if (card && card.status === 'Active') {
                        if (isCurrent) {
                          btnText = 'Renew Membership';
                        } else if (isHigherTier(plan.name, card.planName)) {
                          btnText = 'Upgrade Plan';
                        } else {
                          btnText = 'Higher Tier Active';
                          btnDisabled = true;
                        }
                      }

                      return (
                        <div key={plan.name} 
                          onClick={() => {
                            if (plan.name === 'Diamond') {
                              setIsDiamondBlurred(prev => !prev);
                            } else {
                              setIsDiamondBlurred(false);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          className={`rounded-3xl p-5 border flex flex-col justify-between hover-card relative overflow-hidden transition-all duration-300 shadow-xl ${plan.bgGradient} ${plan.textColor} ${plan.borderColor} ${plan.shadowColor} ${
                            isCurrent ? 'ring-4 ring-primary-500/45 border-transparent' : ''
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute -right-8 -top-8 bg-[#faed26] text-[#0b3c7b] text-[10px] font-extrabold px-8 py-4 rotate-45 transform leading-none">
                              Active
                            </span>
                          )}
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full text-white bg-black/15">
                                {plan.name} Plan
                              </span>
                              <div className="flex items-baseline gap-1 mt-3">
                                <span className="text-2xl font-black">₹{dbPlan.price}</span>
                                <span className={`text-xs font-bold ${plan.validityColor}`}>
                                  / {dbPlan.validityDays === 30 ? 'Month' : dbPlan.validityDays === 90 ? '3 Months' : dbPlan.validityDays === 365 ? 'Year' : `${dbPlan.validityDays} Days`}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-black/10 pt-3">
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${plan.validityColor}`}>Plan Benefits</p>
                              <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs font-black">
                                  <span>✓</span> {dbPlan.discountPercent}% Discount Card
                                </li>
                                {plan.benefits.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-xs leading-snug font-semibold">
                                    <span className="opacity-60">•</span> {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (plan.name === 'Diamond') {
                                setIsDiamondBlurred(prev => !prev);
                              } else {
                                setIsDiamondBlurred(false);
                              }
                              handleRenewMembership(plan.name);
                            }}
                            disabled={loading || btnDisabled}
                            className={`w-full py-3 rounded-xl font-bold text-xs mt-6 transition-all active:scale-[0.98] border shadow-sm ${
                              btnDisabled
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent cursor-not-allowed'
                                : isCurrent
                                ? 'bg-white/30 text-current border-black/10 font-black'
                                : 'bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] border-transparent'
                            }`}
                          >
                            {btnText}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Membership History Log */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Membership History Log</h3>
              {membershipHistory.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 italic text-center">No membership transaction history found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">Plan Name</th>
                        <th className="py-3 px-2">Amount</th>
                        <th className="py-3 px-2">Purchase Date</th>
                        <th className="py-3 px-2">Expiry Date</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membershipHistory.map((hist, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-800 dark:text-slate-200">
                          <td className="py-3.5 px-2 font-bold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              hist.planName === 'Silver' ? 'bg-slate-400' :
                              hist.planName === 'Gold' ? 'bg-amber-450' : 'bg-cyan-400'
                            }`} />
                            {hist.planName} Tier
                          </td>
                          <td className="py-3.5 px-2 font-semibold">₹{hist.amount}</td>
                          <td className="py-3.5 px-2">{new Date(hist.purchaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td className="py-3.5 px-2">{new Date(hist.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              hist.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/35' :
                              hist.status === 'Upgraded' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/35' :
                              'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200'
                            }`}>
                              {hist.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
    </>
  );
};

export default Membership;
