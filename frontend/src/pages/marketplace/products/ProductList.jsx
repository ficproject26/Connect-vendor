import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { getBackendUrl } from '../../../../services/apiSetup';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ProductList = () => {
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
      {(activeTab === 'catalog' || activeTab === 'Products') && (
          (() => {
            const registeredSub = user?.subcategory || (user?.vendorType && user.vendorType.includes(':') ? user.vendorType.split(':')[1].trim() : '');
            const uniqueCatalogCategories = [...new Set([
              ...(registeredSub ? [registeredSub] : terms.categories),
              ...catalog.map(item => item.category).filter(Boolean)
            ])];
            const categoriesToRender = uniqueCatalogCategories.filter(cat => {
              if (vendorType.startsWith('Restaurant') && catalogFoodTypeFilter !== 'All') {
                return catalog.some(item => item.category === cat && item.foodType === catalogFoodTypeFilter);
              }
              return true;
            });

            return (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage {terms.catalogName}</h2>
                    <p className="text-slate-800 dark:text-slate-200 text-sm mt-1">Add or edit catalog items details</p>
                  </div>
                  <button
                    onClick={handleOpenAddItem}
                    className="bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98]"
                  >
                    <Plus size={16} /> Add {terms.catalogItem}
                  </button>
                </div>

                {/* Main Two-Column Layout */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Left Sidebar Filters Container (Only for Restaurant food type filter) */}
                  {vendorType.startsWith('Restaurant') && (
                    <div className="w-full md:w-64 shrink-0 space-y-6">
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dietary Preference</h4>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'All', label: 'All Dishes' },
                            { id: 'Veg', label: 'Veg Only', icon: '🟢' },
                            { id: 'Non-Veg', label: 'Non-Veg Only', icon: '🔴' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setCatalogFoodTypeFilter(opt.id)}
                              className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                                catalogFoodTypeFilter === opt.id
                                  ? 'bg-[#faed26]/20 text-[#0B3C7B] border-[#faed26]/40 dark:bg-[#faed26]/10 dark:text-[#faed26] dark:border-[#faed26]/20 font-bold shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {opt.icon && <span className="text-xs">{opt.icon}</span>}
                                {opt.label}
                              </span>
                              {catalogFoodTypeFilter === opt.id && <span className="text-xs">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Grid and Filters Area */}
                  <div className="flex-1 w-full space-y-6">
                    {/* Search & Status Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={`Search ${terms.catalogName.toLowerCase()} by name or description...`}
                          value={catalogSearchQuery}
                          onChange={(e) => setCatalogSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={catalogCardFilter}
                          onChange={(e) => setCatalogCardFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Cards</option>
                          <option value="Silver">Silver Card</option>
                          <option value="Gold">Gold Card</option>
                          <option value="Diamond">Diamond Card</option>
                        </select>
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={catalogStatusFilter}
                          onChange={(e) => setCatalogStatusFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Statuses</option>
                          {terms.catalogStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {loading ? <p className="text-slate-800 dark:text-slate-200">Loading catalog...</p> : catalog.length === 0 ? (
                      <div className="glass-card p-12 text-center rounded-3xl">
                        <p className="text-slate-800 dark:text-slate-200 font-medium">Your catalog is currently empty. Click the button to add items.</p>
                      </div>
                    ) : (
                      (() => {
                        const filteredCatalog = catalog.filter(item => {
                          const matchesCategory = catalogCategoryFilter === 'All' || item.category === catalogCategoryFilter;
                          const matchesStatus = catalogStatusFilter === 'All' || item.status === catalogStatusFilter;
                          const matchesFoodType = catalogFoodTypeFilter === 'All' || item.foodType === catalogFoodTypeFilter;
                          const matchesSearch = item.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
                                                (item.description && item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase()));
                          const cardTypes = item.cardTypes || ['Silver', 'Gold', 'Diamond'];
                          const matchesCard = catalogCardFilter === 'All' || cardTypes.includes(catalogCardFilter);
                          return matchesCategory && matchesStatus && matchesFoodType && matchesSearch && matchesCard;
                        });

                        if (filteredCatalog.length === 0) {
                          return (
                            <div className="glass-card p-12 text-center rounded-3xl">
                              <p className="text-slate-800 dark:text-slate-200 font-medium">No items match your filter criteria.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredCatalog.map(item => (
                              <div 
                                key={item._id} 
                                onClick={(e) => {
                                  if (e.target.closest('button')) return;
                                  handleOpenSalesDetails(item);
                                }}
                                className="glass-card rounded-2xl p-4 flex flex-col justify-between hover-card cursor-pointer"
                              >
                                <div>
                                  <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center relative group">
                                    <img
                                      src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${getBackendUrl()}${item.imageUrl}`) : getFallbackImageUrl(item, vendorType)}
                                      alt={item.name}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                  </div>
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                                        <span>{item.category}</span>
                                      </span>
                                      {vendorType.startsWith('Restaurant') && item.foodType && (
                                        <div 
                                          className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded shrink-0 ${
                                            item.foodType === 'Veg' ? 'border-emerald-600' : 'border-red-600'
                                          }`}
                                          title={item.foodType}
                                        >
                                          <div className={`w-1 h-1 rounded-full ${item.foodType === 'Veg' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                                        </div>
                                      )}
                                    </div>
                                    {(() => {
                                      const types = item.cardTypes || ['Silver', 'Gold', 'Diamond'];
                                      let pct = 0;
                                      let label = "";
                                      
                                      if (user?.role === 'Member') {
                                        const isEligible = types.includes(card?.planName);
                                        pct = isEligible && card ? card.discountPercent : 0;
                                        label = isEligible ? `${card?.planName} Disc.` : "";
                                      } else {
                                        // For Vendor/Admin, show the max discount price
                                        if (types.includes('Diamond')) {
                                          pct = 20;
                                          label = "Diamond Price";
                                        } else if (types.includes('Gold')) {
                                          pct = 15;
                                          label = "Gold Price";
                                        } else if (types.includes('Silver')) {
                                          pct = 10;
                                          label = "Silver Price";
                                        }
                                      }
                                      
                                      const discountedPrice = Math.round(item.price * (1 - pct / 100));
                                      
                                      return (
                                        <div className="flex flex-col items-end">
                                          {pct > 0 ? (
                                            <>
                                              <span className="text-[10px] line-through text-slate-400 dark:text-slate-500">₹{item.price}</span>
                                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-450 leading-none">
                                                ₹{discountedPrice}
                                                <span className="text-[8px] font-extrabold ml-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded align-middle">
                                                  {label}
                                                </span>
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">₹{item.price}</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">{item.name}</h3>
                                  
                                  {/* Item Rating */}
                                  {(() => {
                                    const { rating, reviews } = getItemRating(item);
                                    return (
                                      <div className="flex items-center gap-1 mt-1 mb-1.5">
                                        <div className="flex text-amber-500">
                                          {[...Array(5)].map((_, i) => (
                                            <span key={i} className="text-[10px]">
                                              {i < Math.floor(rating) ? '★' : '☆'}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-350">{rating}</span>
                                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">({reviews})</span>
                                      </div>
                                    );
                                  })()}
                                  <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 line-clamp-1 leading-normal">{item.description}</p>
                                  
                                  {/* Compact metadata fields grid */}
                                  {(() => {
                                    const mainCat = getProductMainCategory(item.category, vendorType);
                                    const shouldShowStock = ['Products', 'Daily Needs', 'Food', 'Stay', 'Jobs', 'Education'].includes(mainCat);
                                    return (
                                      <div className={`mt-2.5 grid gap-1 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 ${shouldShowStock ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        <div className="text-center">
                                          <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
                                          <span className={`font-bold ${item.status.includes('Out') || item.status.includes('Un') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{item.status}</span>
                                        </div>
                                        {shouldShowStock && item.stock !== undefined && (
                                          <div className="text-center border-l border-slate-200 dark:border-slate-800">
                                            <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Stock</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.stock} {item.unit || 'count'}</span>
                                          </div>
                                        )}
                                        <div className="text-center border-l border-slate-200 dark:border-slate-800">
                                          <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Sold</span>
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{getItemSalesData(item._id).count}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
 
                                <div className="flex justify-end gap-1.5 mt-3 pt-2">
                                  <button
                                    onClick={() => handleOpenEditItem(item)}
                                    className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors"
                                    title="Edit Item"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item._id)}
                                    className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 p-2 rounded-lg border border-red-200 dark:border-red-900/30 transition-colors"
                                    title="Delete Item"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}
    </>
  );
};

export default ProductList;
