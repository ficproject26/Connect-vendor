import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { formatImageUrl } from '../../../../services/apiSetup';
import { 
  Package, ClipboardList, Star, IndianRupee, Clock,
  Edit2, Trash2, Hotel, Briefcase, Layers, Globe, Utensils, ShoppingBag
} from 'lucide-react';

const isServiceOrBookingItem = (item, currentVendorType = '') => {
  if (!item) return false;
  const vType = String(item.vendorType || currentVendorType || '').toLowerCase();
  const cat = String(item.category || item.subCategory || '').toLowerCase();
  const subcat = String(item.subcategory || '').toLowerCase();
  const mainCat = String(item.mainCategory || item.subNavbarCategory || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();

  if (
    vType.includes('service') ||
    vType.includes('hotel') ||
    vType.includes('stay') ||
    vType.includes('travel') ||
    vType.includes('doctor') ||
    vType.includes('hospital') ||
    vType.includes('job') ||
    vType.includes('education')
  ) {
    return true;
  }

  if (['services', 'service', 'stay', 'travel', 'jobs', 'education'].includes(mainCat)) {
    return true;
  }

  const serviceCategories = [
    'services', 'service', 'stay', 'travel', 'it & device support', 'ac service',
    'laptop repairs', 'cctv installation', 'pc repairs', 'full clean', 'cleaning',
    'electrician', 'plumber', 'hospital', 'technician', 'healthcare', 'appointment',
    'stay booking', 'bus booking', 'tour packages', 'taxi service', 'hotel', 'hotels', 'resort', 'resorts',
    'room', 'rooms', 'homestay', 'pg', 'consultation'
  ];
  if (serviceCategories.includes(cat) || serviceCategories.includes(subcat)) {
    return true;
  }

  if (
    cat.includes('service') || cat.includes('repair') || cat.includes('support') ||
    cat.includes('booking') || cat.includes('room') || cat.includes('hotel') ||
    cat.includes('travel') || cat.includes('trip') || cat.includes('tour') ||
    name.includes('service') || name.includes('repair') || name.includes('booking')
  ) {
    return true;
  }

  return false;
};

const getEffectiveItemStatus = (item, currentVendorType = '') => {
  const isService = isServiceOrBookingItem(item, currentVendorType);
  const rawStatus = String(item?.status || '').trim();
  const lowerStatus = rawStatus.toLowerCase();

  const isUnavailableOrOutOfStock = isService
    ? (
        lowerStatus === 'unavailable' ||
        lowerStatus === 'closed' ||
        lowerStatus === 'out of stock' ||
        lowerStatus === 'out of service' ||
        (item.bookingLimit !== undefined && Number(item.bookingLimit) > 0 && Number(item.bookingsCount || 0) >= Number(item.bookingLimit))
      )
    : (
        lowerStatus === 'out of stock' ||
        lowerStatus === 'unavailable' ||
        lowerStatus === 'closed' ||
        lowerStatus.includes('out') ||
        (item.stock !== undefined && Number(item.stock) <= 0)
      );

  if (isUnavailableOrOutOfStock) {
    return {
      isOutOfStock: true,
      isService,
      statusLabel: isService ? 'Unavailable' : 'Out of Stock',
      ribbonLabel: isService ? 'UNAVAILABLE' : 'OUT OF STOCK'
    };
  }

  return {
    isOutOfStock: false,
    isService,
    statusLabel: rawStatus || 'Available',
    ribbonLabel: ''
  };
};

const CatalogCardImage = ({ item, isOutOfStock, isService, mainCat, vendorType }) => {
  const [imgError, setImgError] = useState(false);
  const rawUrl = item.imageUrl || item.image || item.img || '';
  const formattedUrl = rawUrl ? formatImageUrl(rawUrl) : '';

  if (!formattedUrl || imgError) {
    const getCategoryDetails = () => {
      const cat = String(item.category || item.subcategory || mainCat || vendorType || '').toLowerCase();
      if (cat.includes('stay') || cat.includes('hotel') || cat.includes('room') || cat.includes('resort')) {
        return { icon: Hotel, label: 'Stay / Room', gradient: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-600 dark:text-amber-400' };
      }
      if (cat.includes('service') || cat.includes('repair') || cat.includes('support') || cat.includes('cctv') || isService) {
        return { icon: Layers, label: item.category || 'Service', gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400' };
      }
      if (cat.includes('travel') || cat.includes('tour') || cat.includes('bus') || cat.includes('trip')) {
        return { icon: Globe, label: 'Travel Route', gradient: 'from-sky-500/10 to-cyan-500/10 dark:from-sky-500/20 dark:to-cyan-500/20 text-sky-600 dark:text-sky-400' };
      }
      if (cat.includes('food') || cat.includes('dish') || cat.includes('restaurant')) {
        return { icon: Utensils, label: 'Food / Menu', gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400' };
      }
      if (cat.includes('job')) {
        return { icon: Briefcase, label: 'Job Opening', gradient: 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 text-purple-600 dark:text-purple-400' };
      }
      return { icon: ShoppingBag, label: item.category || 'Product', gradient: 'from-slate-500/10 to-slate-600/10 dark:from-slate-500/20 dark:to-slate-600/20 text-slate-600 dark:text-slate-400' };
    };

    const details = getCategoryDetails();
    const IconComp = details.icon;

    return (
      <div className={`w-full h-full bg-gradient-to-br ${details.gradient} bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-3 select-none transition-transform duration-500 group-hover:scale-105`}>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-sm flex items-center justify-center mb-1.5 border border-slate-200/50 dark:border-slate-700/50">
          <IconComp size={22} className={details.text || 'text-primary-600'} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate max-w-[85%] text-center">
          {details.label}
        </span>
      </div>
    );
  }

  return (
    <img
      src={formattedUrl}
      alt=""
      onError={() => setImgError(true)}
      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
        isOutOfStock ? 'grayscale opacity-60' : ''
      }`}
    />
  );
};

const getItemRating = (item, orders = []) => {
  if (!item) return { rating: '5.0', reviews: 0 };
  let uniqueCount = 0;
  if (Array.isArray(orders) && orders.length > 0) {
    const custSet = new Set();
    orders.forEach(o => {
      if (!o || o.status === 'Cancelled' || o.status === 'Rejected') return;
      const matches = (o.items && Array.isArray(o.items) && o.items.some(i => (i.productId && String(i.productId) === String(item._id)) || i.name === item.name)) ||
                      String(o.productId || '') === String(item._id) || o.product_details === item.name;
      if (matches) {
        const custKey = o.memberId || o.customerId || o.memberName || o.candidateEmail || o._id;
        if (custKey) custSet.add(String(custKey));
      }
    });
    uniqueCount = custSet.size;
  } else if (item.salesCount !== undefined) {
    uniqueCount = Number(item.salesCount || 0);
  }
  const charCodeSum = (item.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rating = uniqueCount > 0 ? (4.2 + (charCodeSum % 8) / 10).toFixed(1) : '5.0';
  return { rating, reviews: uniqueCount };
};

const getProductMainCategory = (itemCategory, vType) => {
  const cleanItemCat = String(itemCategory || '').trim().toLowerCase();
  if (['bus', 'car', 'bike', 'cab', 'travel', 'travels', 'package', 'packages', 'tour', 'tours'].includes(cleanItemCat)) {
    return 'Travel';
  }
  if (['food', 'foods', 'restaurant', 'dining'].includes(cleanItemCat)) {
    return 'Food';
  }
  if (['stay', 'hotel', 'hotels', 'resort', 'room'].includes(cleanItemCat)) {
    return 'Stay';
  }
  if (['job', 'jobs', 'application'].includes(cleanItemCat)) {
    return 'Jobs';
  }
  if (['service', 'services', 'hospital', 'clinic'].includes(cleanItemCat)) {
    return 'Services';
  }

  const type = String(vType || '').trim();
  if (type.startsWith('Store') || type.startsWith('Electronics') || type.startsWith('Home & Furniture')) {
    return 'Products';
  }
  if (type.startsWith('Grocery') || type.startsWith('Pharmacy')) {
    return 'Daily Needs';
  }
  if (type.startsWith('Restaurant')) {
    return 'Food';
  }
  if (type.startsWith('Hotel')) {
    return 'Stay';
  }
  if (type.startsWith('Job')) {
    return 'Jobs';
  }
  if (type.startsWith('Education')) {
    return 'Education';
  }
  if (type.startsWith('Travel') || type.startsWith('Tour') || type.startsWith('Transport')) {
    return 'Travel';
  }
  if (type.startsWith('Hospital') || type.startsWith('Service')) {
    return 'Services';
  }
  return 'Products';
};

const ProductList = () => {
  const {
    activeBusinessId,
    activeTab,
    catalog = [],
    loading,
    orders = [],
    terms = {},
    user,
    vendorType = '',
    handleDeleteItem
  } = useDashboard();

  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('All');
  const [catalogFoodTypeFilter, setCatalogFoodTypeFilter] = useState('All');

  const resolvedMainCategory = getProductMainCategory(user?.category, vendorType);
  const isServiceBusiness = ['Services', 'Stay', 'Travel', 'Jobs', 'Education'].includes(resolvedMainCategory);
  const statusOptions = terms.catalogStatuses || (isServiceBusiness ? ['Available', 'Unavailable'] : ['Available', 'Out of Stock']);

  const savedActiveId = activeBusinessId || user?.activeBusinessId || (typeof localStorage !== 'undefined' ? localStorage.getItem('active_business_id') : null);
  const bizOrders = orders.filter(o => !savedActiveId || o.vendorId === savedActiveId || o.vendor_id === savedActiveId);

  const totalItems = catalog.length;
  const totalOrders = bizOrders.length;
  
  const completedStatuses = ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'];
  const revenue = bizOrders
    .filter(o => completedStatuses.includes(o.status))
    .reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
  
  const isTravelCatalog = vendorType.startsWith('Travel') || terms.catalogName === 'Travel Routes' || terms.catalogItem === 'Travel Route';
  const pendingStatuses = ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved'];
  const pendingCount = isTravelCatalog ? totalOrders : bizOrders.filter(o => pendingStatuses.includes(o.status)).length;
  
  const itemSalesMap = {};
  bizOrders.forEach(o => {
    if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
      const itemList = (o.items && o.items.length > 0) ? o.items : (o.product_details ? [{ name: o.product_details, productId: o.productId, quantity: 1 }] : []);
      itemList.forEach(item => {
        const catMatch = catalog.find(c => 
          (item.productId && String(c._id) === String(item.productId)) ||
          (item.id && String(c._id) === String(item.id)) ||
          c.name === item.name
        );
        let name = catMatch ? (isTravelCatalog ? (catMatch.category || catMatch.name) : catMatch.name) : (item.name || o.product_details || 'Item');
        if (isTravelCatalog) {
          if (/car/i.test(name)) name = 'Car';
          else if (/bus/i.test(name)) name = 'Bus';
          else if (/bike/i.test(name)) name = 'Bike';
        }
        itemSalesMap[name] = (itemSalesMap[name] || 0) + (item.quantity || 1);
      });
    }
  });
  const topSelling = Object.entries(itemSalesMap).sort((a, b) => b[1] - a[1])[0];

  let pendingLabel = 'Pending Delivery';
  if (vendorType.startsWith('Hospital')) pendingLabel = 'Pending Appointments';
  else if (vendorType.startsWith('Hotel')) pendingLabel = 'Pending Check-ins';
  else if (vendorType.startsWith('Service Provider')) pendingLabel = 'Pending Bookings';
  else if (vendorType.startsWith('Job')) pendingLabel = 'Pending Applications';
  else if (vendorType.startsWith('Education')) pendingLabel = 'Pending Enrollments';
  else if (vendorType.startsWith('Restaurant')) pendingLabel = 'Pending Orders';
  else if (isTravelCatalog) pendingLabel = 'Travel Bookings';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage {terms.catalogName || 'Catalog'}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Add or edit catalog items details</p>
        </div>
      </div>

      {/* ── Catalog Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Items */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Package size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-blue-600/80 dark:text-blue-300/80 uppercase font-bold tracking-wider truncate">Total {terms.catalogName || 'Items'}</p>
              <p className="text-xl font-extrabold text-blue-900 dark:text-blue-100 tracking-tight">{totalItems}</p>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-100 dark:border-purple-900/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 uppercase font-bold tracking-wider truncate">Total {terms.ordersName || 'Orders'}</p>
              <p className="text-xl font-extrabold text-purple-900 dark:text-purple-100 tracking-tight">{totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Top Selling */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Star size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-amber-600/80 dark:text-amber-300/80 uppercase font-bold tracking-wider truncate">Top {terms.catalogItem || 'Item'}</p>
              <p className="text-sm font-extrabold text-amber-900 dark:text-amber-100 tracking-tight truncate" title={topSelling ? topSelling[0] : 'N/A'}>
                {topSelling ? topSelling[0] : 'N/A'}
              </p>
              {topSelling && <p className="text-[10px] text-amber-500 dark:text-amber-400/70 font-semibold">{topSelling[1]} sold</p>}
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <IndianRupee size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 uppercase font-bold tracking-wider truncate">{terms.catalogItem || 'Item'} Revenue</p>
              <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 tracking-tight">₹{revenue.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-100 dark:border-orange-900/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-xl">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-orange-600/80 dark:text-orange-300/80 uppercase font-bold tracking-wider truncate">{pendingLabel}</p>
              <p className="text-xl font-extrabold text-orange-900 dark:text-orange-100 tracking-tight">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Filter for Restaurant Dietary Preference */}
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

        {/* Main Grid and Search/Filter Bar */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            <div className="flex-1">
              <input
                type="text"
                placeholder={`Search ${(terms.catalogName || 'catalog').toLowerCase()} by name or description...`}
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={catalogCategoryFilter}
                onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Categories</option>
                {[...new Set(catalog.map(item => item.category || item.subCategory || item.childCategory).filter(Boolean))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={catalogStatusFilter}
                onChange={(e) => setCatalogStatusFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-600 dark:text-slate-400">Loading catalog...</p>
          ) : catalog.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40">
              <p className="text-slate-600 dark:text-slate-400 font-medium">Your catalog is currently empty.</p>
            </div>
          ) : (() => {
            const filteredCatalog = catalog.filter(item => {
              const effective = getEffectiveItemStatus(item, vendorType);
              const matchesCategory = catalogCategoryFilter === 'All' || item.category === catalogCategoryFilter;
              const matchesStatus = catalogStatusFilter === 'All' || 
                effective.statusLabel.toLowerCase() === catalogStatusFilter.toLowerCase() ||
                (catalogStatusFilter.toLowerCase().includes('out') && effective.isOutOfStock) ||
                (catalogStatusFilter.toLowerCase().includes('unavail') && effective.isOutOfStock);
              const matchesFoodType = catalogFoodTypeFilter === 'All' || item.foodType === catalogFoodTypeFilter;
              const matchesSearch = !catalogSearchQuery || 
                item.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
                (item.description && item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase()));
              return matchesCategory && matchesStatus && matchesFoodType && matchesSearch;
            });

            if (filteredCatalog.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No items match your filter criteria.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredCatalog.map(item => {
                  const isService = isServiceOrBookingItem(item, vendorType);
                  const effective = getEffectiveItemStatus(item, vendorType);
                  const isItemOutOfStock = effective.isOutOfStock;
                  const statusDisplay = effective.statusLabel;
                  const ribbonLabel = effective.ribbonLabel;
                  const mainCat = getProductMainCategory(item.category, item.vendorType || vendorType);

                  const shouldShowStock = !isService && ['Products', 'Daily Needs', 'Food', 'Jobs', 'Education'].includes(mainCat);
                  
                  const getSalesData = (itemId) => {
                    if (!bizOrders || bizOrders.length === 0) return { count: 0, customersCount: 0 };
                    const custSet = new Set();
                    let count = 0;
                    bizOrders.forEach(order => {
                      if (order.status !== 'Cancelled' && order.status !== 'Rejected') {
                        const match = (order.items && order.items.find(i => String(i.productId || '') === String(itemId) || i.name === item.name)) || String(order.productId || '') === String(itemId) || order.product_details === item.name;
                        if (match) {
                          count += (typeof match === 'object' && match.quantity) ? match.quantity : 1;
                          const custKey = order.memberId || order.customerId || order.memberName || order.candidateEmail || order._id;
                          if (custKey) custSet.add(String(custKey));
                        }
                      }
                    });
                    return { count, customersCount: custSet.size };
                  };
                  const salesInfo = getSalesData(item._id);

                  return (
                    <div 
                      key={item._id} 
                      className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between h-full min-h-[350px] transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 ${
                        isItemOutOfStock ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/80 opacity-90' : ''
                      }`}
                    >
                      <div>
                        {/* Standardized Aspect Ratio Image Container with Fallback */}
                        <div className="mb-2 rounded-lg sm:rounded-xl overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center relative group">
                          {isItemOutOfStock && ribbonLabel && (
                            <div className="absolute top-3.5 -left-10 -rotate-45 bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest py-0.5 sm:py-1 px-9 shadow-md z-10 pointer-events-none text-center min-w-[140px] border-b border-white/10">
                              {ribbonLabel}
                            </div>
                          )}
                          <CatalogCardImage
                            item={item}
                            isOutOfStock={isItemOutOfStock}
                            isService={isService}
                            mainCat={mainCat}
                            vendorType={vendorType}
                          />
                        </div>

                        {/* Category Pill and Price Row with fixed 34px height for row-wide alignment */}
                        <div className="flex justify-between items-start mb-2 gap-2 h-[34px]">
                          <div className="flex items-center gap-1 text-left min-w-0 max-w-[55%]">
                            <span 
                              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase truncate block max-w-full"
                              title={item.category}
                            >
                              {item.category}
                            </span>
                            {vendorType.startsWith('Restaurant') && item.foodType && (
                              <div 
                                className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded shrink-0 ${
                                  item.foodType === 'Veg' ? 'border-emerald-600' : 'border-red-600'
                                }`}
                                title={item.foodType}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${item.foodType === 'Veg' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                              </div>
                            )}
                          </div>

                          {(() => {
                            if (mainCat === 'Jobs') {
                              return (
                                <div className="flex flex-col items-end text-right shrink-0 h-[34px] justify-center">
                                  <span className="text-[9px] text-slate-400 uppercase font-semibold leading-none mb-0.5">Salary</span>
                                  <span className="text-xs sm:text-sm font-bold text-[#0B3C7B] dark:text-[#faed26] leading-none">₹{item.price}</span>
                                </div>
                              );
                            }
                            const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price);
                            const discountPct = hasDiscount ? Math.round(((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100) : 0;

                            return (
                              <div className="flex flex-col items-end text-right shrink-0 min-w-[70px] h-[34px] justify-center">
                                {hasDiscount ? (
                                  <>
                                    <span className="text-[9px] sm:text-[10px] line-through text-slate-400 dark:text-slate-500 leading-none">
                                      ₹{item.originalPrice}
                                    </span>
                                    <div className="flex items-center gap-1 mt-0.5 leading-none">
                                      <span className={`text-xs sm:text-sm font-black leading-none ${isItemOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-450'}`}>
                                        ₹{item.price}
                                      </span>
                                      <span className="inline-block whitespace-nowrap text-[7.5px] sm:text-[8px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded leading-none">
                                        {discountPct}% OFF
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[9px] sm:text-[10px] invisible leading-none select-none">₹0</span>
                                    <span className={`text-xs sm:text-sm font-bold leading-none mt-0.5 ${isItemOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                      ₹{item.price}
                                    </span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Title: 1 line truncated */}
                        <h3 
                          className={`text-xs sm:text-sm font-bold text-left leading-snug truncate h-5 mt-0.5 ${
                            isItemOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                          }`} 
                          title={item.name}
                        >
                          {item.name}
                        </h3>

                        {/* Item Rating: fixed height */}
                        {(() => {
                          const { rating, reviews } = getItemRating(item, bizOrders);
                          return (
                            <div className="flex items-center gap-1 h-4 mt-0.5 mb-1 text-left">
                              <div className={`flex ${isItemOutOfStock ? 'text-slate-300 dark:text-slate-600' : 'text-amber-500'}`}>
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className="text-[9px] sm:text-[10px]">
                                    {i < Math.floor(rating) ? '★' : '☆'}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-700 dark:text-slate-350">{rating}</span>
                              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 dark:text-slate-500">({reviews})</span>
                            </div>
                          );
                        })()}

                        {/* Description: fixed 2 lines height */}
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs text-left leading-snug line-clamp-2 h-7 sm:h-8 overflow-hidden break-words mt-0.5">
                          {item.description || ''}
                        </p>

                        {/* Metadata fields grid */}
                        <div className={`mt-2.5 grid gap-1 text-[9px] sm:text-[10px] bg-slate-50 dark:bg-slate-900/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/50 dark:border-slate-800/50 min-h-[46px] items-center ${shouldShowStock ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <div className="text-center">
                            <span className="block text-[7px] sm:text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
                            <span className={`font-bold ${isItemOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {statusDisplay}
                            </span>
                          </div>
                          {shouldShowStock && item.stock !== undefined && (
                            <div className="text-center border-l border-slate-200 dark:border-slate-800">
                              <span className="block text-[7px] sm:text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{mainCat === 'Jobs' ? 'Vacant' : 'Stock'}</span>
                              <span className={`font-bold ${isItemOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.stock} {mainCat === 'Jobs' ? '' : (item.unit || 'count')}</span>
                            </div>
                          )}
                          <div className="text-center border-l border-slate-200 dark:border-slate-800">
                            <span className="block text-[7px] sm:text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{mainCat === 'Jobs' ? 'Applied' : isService ? 'Bookings' : 'Customers'}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{isService ? salesInfo.count : salesInfo.customersCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Pinned to bottom with mt-auto */}
                      <div className="flex justify-end items-center gap-1.5 sm:gap-2 mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                        {handleDeleteItem && (
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="p-1.5 sm:p-2 rounded-md sm:rounded-lg border transition-colors bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 shadow-sm"
                            title="Delete Item"
                          >
                            <Trash2 size={13} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
