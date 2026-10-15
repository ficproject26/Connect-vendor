const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { Product, Order, Customer, DeliveryPartner, User, MembershipCard, PlatformConfig, Patient, Category, BusinessRequest, SupportTicket } = require('../models/Schemas');
const { COMPLETE_CAT_TAXONOMY } = require('../data/completeTaxonomy');
const { publishRealtimeEvent, EVENT_TYPES, ENTITY_NAMES, cacheManager } = require('../realtime/realtimeManager');
const { findPincodeAdmin, CATEGORY_DOC_RULES } = require('../utils/territoryRouting');

// High-performance cached vendor user lookup (short 30s TTL to absorb concurrent burst requests)
const vendorUserCache = new Map();
const getVendorUserCached = async (userId) => {
  if (!userId) return null;
  const idStr = userId.toString();
  const cached = vendorUserCache.get(idStr);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  const user = await User.findById(idStr).select('-password').lean();
  if (user) {
    vendorUserCache.set(idStr, {
      user,
      expiresAt: Date.now() + 30000 // 30s TTL
    });
  }
  return user;
};

const invalidateVendorUserCache = (userId) => {
  if (!userId) return;
  vendorUserCache.delete(userId.toString());
  cacheManager.invalidateVendorProfile(userId.toString()).catch(() => {});
};

// Cached Platform Config lookup (60s TTL)
let cachedPlatformConfig = null;
let platformConfigExpiresAt = 0;
const getPlatformConfigCached = async () => {
  if (cachedPlatformConfig && platformConfigExpiresAt > Date.now()) {
    return cachedPlatformConfig;
  }
  const cfg = await PlatformConfig.findOne({}).lean();
  cachedPlatformConfig = cfg || { commissionRate: 0 };
  platformConfigExpiresAt = Date.now() + 60000;
  return cachedPlatformConfig;
};

// Helper to validate Stay category hierarchy against database
const validateCatalogCategoryHierarchy = async (mainCategory, subCatName, childCatName) => {
  const targetMain = (mainCategory || '').trim().toLowerCase();
  if (targetMain !== 'stay') {
    return { valid: true };
  }

  const all = await Category.find({ isDeleted: { $ne: true } }).lean();
  const SYSTEM_MAIN_CATS = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
  const getSubName = (c) => (c.subcategory || (c.level === 'sub' && !SYSTEM_MAIN_CATS.map(m => m.toLowerCase()).includes(String(c.name).toLowerCase()) ? c.name : '')).trim();
  const getChildName = (c) => (c.subSubcategory || (c.level === 'child' && !SYSTEM_MAIN_CATS.map(m => m.toLowerCase()).includes(String(c.name).toLowerCase()) ? c.name : '')).trim();

  const stayMain = all.find(c => (c.level === 'main' || !c.parentId) && String(c.name || '').trim().toLowerCase() === 'stay');
  if (!stayMain || stayMain.isActive === false) {
    return { valid: false, error: 'Stay main category is currently inactive or not configured in database' };
  }

  const matchingSubs = all.filter(c => 
    c.level === 'sub' && 
    c.isActive !== false &&
    (String(c.parentId) === String(stayMain._id) || String(c.name || '').trim().toLowerCase() === 'stay' || String(c.mainCategory || '').trim().toLowerCase() === 'stay') &&
    getSubName(c).toLowerCase() === String(subCatName || '').trim().toLowerCase()
  );

  if (matchingSubs.length === 0) {
    return { valid: false, error: `Invalid Stay subcategory: "${subCatName}". Only active Stay subcategories from Admin Category Management are permitted.` };
  }

  if (childCatName && String(childCatName).trim()) {
    const subIds = matchingSubs.map(s => String(s._id));
    const matchingChild = all.find(ch => 
      ch.level === 'child' &&
      ch.isActive !== false &&
      (subIds.includes(String(ch.parentId)) || (getSubName(ch).toLowerCase() === String(subCatName).trim().toLowerCase() && (String(ch.name || '').trim().toLowerCase() === 'stay' || String(ch.mainCategory || '').trim().toLowerCase() === 'stay'))) &&
      getChildName(ch).toLowerCase() === String(childCatName).trim().toLowerCase()
    );
    if (!matchingChild) {
      return { valid: false, error: `Child category "${childCatName}" does not belong to subcategory "${subCatName}" under Stay in database.` };
    }
  }

  return { valid: true };
};

const getProductMainCategory = (category) => {
  if (!category) return '';
  for (const mainCat of Object.keys(COMPLETE_CAT_TAXONOMY)) {
    for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
      if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(category)) {
        return mainCat;
      }
    }
  }
  return '';
};

// Category constants for strict separation
const ORDER_BASED_TYPES = ['Order', 'Daily Needs', 'Food', 'Products', 'order', 'Store', 'Grocery', 'Pharmacy', 'Restaurant', 'Electronics', 'Furniture'];
const BOOKING_BASED_TYPES = [
  'Booking', 'booking', 'Appointment', 'appointment', 'Stay', 'stay', 'Travel', 'travel',
  'Services', 'services', 'Service', 'service', 'Hotel', 'hotel', 'Hospital', 'hospital',
  'Travel Agency', 'Technician', 'technician', 'Doctor', 'doctor'
];
const APPLICATION_BASED_TYPES = ['Job', 'Jobs', 'Job Application', 'application', 'Application'];

// Centralized Category Normalization & Mapping Function
const normalizeCategory = (cat) => {
  if (!cat) return '';
  const clean = String(cat).trim().toLowerCase().replace(/[-_]/g, ' ');
  if (clean === 'product' || clean === 'products') return 'Products';
  if (clean === 'daily need' || clean === 'daily needs' || clean === 'dailyneed' || clean === 'dailyneeds' || clean === 'grocery' || clean === 'pharmacy') return 'Daily Needs';
  if (clean === 'food' || clean === 'foods' || clean === 'restaurant' || clean === 'restaurants') return 'Food';
  if (clean === 'service' || clean === 'services' || clean === 'hospital' || clean === 'technician') return 'Services';
  if (clean === 'stay' || clean === 'stays' || clean === 'hotel' || clean === 'hotels' || clean === 'room' || clean === 'rooms') return 'Stay';
  if (clean === 'travel' || clean === 'travels' || clean === 'package' || clean === 'packages') return 'Travel';
  if (clean === 'job' || clean === 'jobs' || clean === 'application' || clean === 'applications') return 'Job';
  return cat;
};

const mapCategoryToTypes = (cat) => {
  const norm = normalizeCategory(cat);
  if (norm === 'Products') {
    return ['Products', 'Product', 'products', 'product', 'Store', 'Electronics', 'Furniture'];
  }
  if (norm === 'Daily Needs') {
    return ['Daily Needs', 'daily needs', 'daily_needs', 'Daily_Needs', 'Grocery', 'grocery', 'Pharmacy', 'pharmacy'];
  }
  if (norm === 'Food') {
    return ['Food', 'food', 'Restaurant', 'restaurant', 'Foods', 'foods'];
  }
  if (norm === 'Services') {
    return ['Services', 'services', 'Service', 'service', 'Appointment', 'appointment', 'Hospital', 'hospital', 'Technician', 'technician', 'Clinic', 'clinic', 'Booking', 'booking'];
  }
  if (norm === 'Stay') {
    return ['Stay', 'stay', 'Hotel', 'hotel', 'Hotels', 'hotels', 'Room', 'room', 'Rooms', 'rooms', 'Resort', 'resort', 'Resorts', 'resorts'];
  }
  if (norm === 'Travel') {
    return ['Travel', 'travel', 'Travels', 'travels', 'Travel Agency', 'package', 'Package', 'Transport', 'transport', 'Bus', 'bus', 'Car', 'car', 'Bike', 'bike', 'Cab', 'cab'];
  }
  return [cat];
};

const vendorHasOrderCategories = (user) => {
  if (!user) return false;
  const allBiz = [{ vendorType: user.vendorType, category: user.category }, ...(user.businesses || [])];
  return allBiz.some(b => {
    const t = (b?.vendorType || b?.category || b?.name || '').toLowerCase();
    return t.startsWith('product') || t.startsWith('daily need') || t.startsWith('food') || 
           ['store', 'grocery', 'pharmacy', 'restaurant', 'electronics', 'furniture'].some(k => t.includes(k));
  });
};

const vendorHasBookingCategories = (user) => {
  if (!user) return false;
  const allBiz = [{ vendorType: user.vendorType, category: user.category }, ...(user.businesses || [])];
  return allBiz.some(b => {
    const t = (b?.vendorType || b?.category || b?.name || '').toLowerCase();
    return t.startsWith('service') || t.startsWith('stay') || t.startsWith('travel') || 
           ['hotel', 'hospital'].some(k => t.includes(k));
  });
};

const vendorHasJobCategories = (user) => {
  if (!user) return false;
  const allBiz = [{ vendorType: user.vendorType, category: user.category }, ...(user.businesses || [])];
  return allBiz.some(b => {
    const t = (b?.vendorType || b?.category || b?.name || '').toLowerCase();
    return t.startsWith('job');
  });
};

// --- ANALYTICS ---
// Helper to resolve consistent vendor-scoped matching identifiers
const getVendorMatchingIds = (user, parentUserId) => {
  const pIdStr = parentUserId ? parentUserId.toString() : '';
  const businessIds = [
    ...(pIdStr ? [pIdStr] : []),
    ...(user?.vendorId ? [String(user.vendorId)] : []),
    ...(user?.registrationId ? [String(user.registrationId)] : []),
    ...(user?._id ? [String(user._id)] : [])
  ];
  if (user?.businesses && user.businesses.length > 0) {
    user.businesses.forEach(b => {
      if (b._id) businessIds.push(b._id.toString());
      if (b.id) businessIds.push(b.id.toString());
      if (b.vendorId) businessIds.push(String(b.vendorId));
    });
  }
  const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))];
  const objectIds = uniqueBusinessIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  return [...uniqueBusinessIds, ...objectIds];
};

// Shared unique customer key generator ensuring customer list and KPI alignment
const getVendorScopedCustomerKey = (name, email) => {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanName && cleanName !== 'customer' && cleanName !== 'connect member' && cleanName !== 'connectmember') {
    return cleanName.replace(/[^a-z0-9]/g, '');
  }
  if (cleanEmail && !cleanEmail.includes('customer') && cleanEmail.includes('@')) {
    return cleanEmail.replace(/[^a-z0-9]/g, '');
  }
  return cleanEmail.replace(/[^a-z0-9]/g, '') || cleanName.replace(/[^a-z0-9]/g, '') || 'unknown_customer';
};

// @desc    Get vendor dashboard analytics
// @route   GET /api/vendor/analytics
// @access  Private (Vendor)
const getVendorAnalytics = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const allMatchIds = getVendorMatchingIds(user, parentUserId);

    // Fetch vendor orders with projection and lean() for fast query execution
    const rawOrders = await Order.find({
      $or: [
        { vendorId: { $in: allMatchIds } },
        { vendor_id: { $in: allMatchIds } },
        { 'items.vendorId': { $in: allMatchIds } },
        { 'items.vendor_id': { $in: allMatchIds } }
      ]
    }).select('vendorId vendor_id memberName customer_name memberId customer_id finalAmount totalAmount amount createdAt created_at orderDate date type status paymentStatus payment_status vendorPaymentStatus candidateEmail customer_email items').lean();

    const orders = rawOrders.map(o => {
      const obj = o.toObject ? o.toObject() : o;
      if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
      if (!obj.memberName && obj.customer_name) obj.memberName = obj.customer_name;
      if (!obj.memberId && obj.customer_id) obj.memberId = obj.customer_id;
      if (obj.finalAmount === undefined && obj.amount !== undefined) obj.finalAmount = obj.amount;
      if (obj.totalAmount === undefined && obj.amount !== undefined) obj.totalAmount = obj.amount;
      const effectiveDate = obj.createdAt || obj.created_at || obj.orderDate || obj.date;
      if (effectiveDate) {
        if (!obj.createdAt) obj.createdAt = effectiveDate;
        if (!obj.created_at) obj.created_at = effectiveDate;
      }
      return obj;
    });
    
    // Calculations
    const ordersOnly = orders.filter(o => !BOOKING_BASED_TYPES.includes(o.type) && !APPLICATION_BASED_TYPES.includes(o.type));
    const bookingsOnly = orders.filter(o => BOOKING_BASED_TYPES.includes(o.type));
    const applicationsOnly = orders.filter(o => APPLICATION_BASED_TYPES.includes(o.type));

    const totalOrdersCount = ordersOnly.length;
    const totalBookingsCount = bookingsOnly.length;
    const totalApplicationsCount = applicationsOnly.length;
    // Eligible paid / completed orders for authoritative financial calculations
    const isEligibleRevenueOrder = (o) => {
      if (!o) return false;
      const s = String(o.status || '').trim().toLowerCase();
      if (['cancelled', 'rejected', 'failed'].includes(s)) return false;
      const isPaid = (o.paymentStatus === 'Paid' || o.payment_status === 'Paid' || o.vendorPaymentStatus === 'PAID');
      const isCompleted = ['completed', 'delivered', 'checked out', 'hired', 'enrolled'].includes(s);
      return isPaid || isCompleted;
    };

    const eligibleOrders = orders.filter(isEligibleRevenueOrder);
    const completedOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'].includes(o.status) || o.paymentStatus === 'Paid' || o.payment_status === 'Paid');
    const pendingOrdersCount = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved', 'Order Received', 'Booking Received'].includes(o.status) && !isEligibleRevenueOrder(o)).length;
    
    const totalRevenue = eligibleOrders.reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0);

    const memberIds = [...new Set(orders.map(o => o.memberId).filter(Boolean))];

    // Parallel execution for customer list, product counts, and active memberships
    const [dbCustomersCountList, totalItemsCount, activeMembershipsCount] = await Promise.all([
      Customer.find({
        $or: [
          { vendorId: { $in: allMatchIds } },
          { vendor_id: { $in: allMatchIds } }
        ]
      }).select('name email').lean(),
      Product.countDocuments({
        $or: [
          { vendorId: { $in: allMatchIds } },
          { vendor_id: { $in: allMatchIds } }
        ]
      }),
      memberIds.length > 0 ? MembershipCard.countDocuments({
        userId: { $in: memberIds },
        status: 'Active',
        expiresAt: { $gt: new Date() }
      }) : 0
    ]);
    const availableItemsCount = totalItemsCount;

    const customerKeySet = new Set();
    dbCustomersCountList.forEach(c => {
      const k = getVendorScopedCustomerKey(c.name, c.email);
      if (k && k !== 'unknowncustomer' && k !== 'customer' && k !== 'connectmember') {
        customerKeySet.add(k);
      }
    });
    rawOrders.forEach(o => {
      const k = getVendorScopedCustomerKey(
        o.memberName || o.customer_name,
        o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '')
      );
      if (k && k !== 'unknowncustomer' && k !== 'customer' && k !== 'connectmember') {
        customerKeySet.add(k);
      }
    });
    const uniqueCustomersCount = customerKeySet.size;

    // Today's Revenue Calculation: Aligned with vendor business timezone (IST: UTC+05:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + istOffsetMs);
    const todayISTStr = nowIST.toISOString().slice(0, 10);

    const todayRevenue = eligibleOrders
      .filter(o => {
        const rawDate = o.createdAt || o.created_at || o.orderDate || o.date;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        const dIST = new Date(d.getTime() + istOffsetMs);
        return dIST.toISOString().slice(0, 10) === todayISTStr;
      })
      .reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0);

    // Revenue Trend Chart Data (daily completed revenue for the last 7 calendar days)
    const dailyRevenueMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowIST);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      dailyRevenueMap[key] = 0;
    }
    eligibleOrders.forEach(o => {
      const rawDate = o.createdAt || o.created_at || o.orderDate || o.date;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const dIST = new Date(d.getTime() + istOffsetMs);
      const key = dIST.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      if (dailyRevenueMap[key] !== undefined) {
        dailyRevenueMap[key] += Number(o.finalAmount || o.totalAmount || o.amount || 0);
      }
    });
    const revenueTrend = Object.keys(dailyRevenueMap).map(date => ({
      date,
      amount: dailyRevenueMap[date]
    }));

    // Monthly Revenue Chart Data (completed revenue for the last 6 calendar months)
    const monthlyRevenueMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowIST);
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthlyRevenueMap[key] = 0;
    }
    eligibleOrders.forEach(o => {
      const rawDate = o.createdAt || o.created_at || o.orderDate || o.date;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const dIST = new Date(d.getTime() + istOffsetMs);
      const key = dIST.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      if (monthlyRevenueMap[key] !== undefined) {
        monthlyRevenueMap[key] += Number(o.finalAmount || o.totalAmount || o.amount || 0);
      }
    });
    const monthlyRevenue = Object.keys(monthlyRevenueMap).map(month => ({
      month,
      amount: monthlyRevenueMap[month]
    }));

    // Order Status Distribution (Completed, Pending, Cancelled)
    let completedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    orders.forEach(o => {
      if (['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'].includes(o.status)) {
        completedCount++;
      } else if (['Cancelled', 'Rejected'].includes(o.status)) {
        cancelledCount++;
      } else {
        pendingCount++;
      }
    });
    const orderStatusDistribution = [
      { name: 'Completed', value: completedCount },
      { name: 'Pending', value: pendingCount },
      { name: 'Cancelled', value: cancelledCount }
    ];

    const analyticsData = {
      totalRevenue,
      ordersCount: totalOrdersCount,
      bookingsCount: totalBookingsCount,
      applicationsCount: totalApplicationsCount,
      pendingOrdersCount,
      completedOrdersCount: completedOrders.length,
      customersCount: uniqueCustomersCount,
      itemsCount: totalItemsCount,
      availableItemsCount,
      todayRevenue,
      activeMembershipsCount,
      recentRevenue: revenueTrend,
      monthlyRevenue,
      orderStatusDistribution
    };

    // Store in cache with 120s TTL (automatically invalidated upon any order/item mutation)
    await cacheManager.set('analytics', parentUserId.toString(), analyticsData, 120);

    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Get Vendor Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving analytics' });
  }
};

const getVendorSubcategory = (user) => {
  if (user.subcategory) return user.subcategory;
  if (user.vendorType && user.vendorType.includes(':')) {
    return user.vendorType.split(':')[1].trim();
  }
  return '';
};

const isValidTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const trimmed = timeStr.trim();
  // 24-hour format: HH:MM or H:MM (00:00 to 23:59)
  const regex24 = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  // 12-hour format: HH:MM AM/PM or H:MM AM/PM or HH.MM AM/PM
  const regex12 = /^(0?[1-9]|1[0-2])[:.][0-5][0-9]\s*(AM|PM|am|pm)$/;
  return regex24.test(trimmed) || regex12.test(trimmed);
};

const validateAndNormalizeTravelPoints = (rawBps, rawDps) => {
  const normalize = (list, isBoarding = true) => {
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => {
      if (typeof item === 'string') {
        const timeVal = '';
        return {
          id: `pt_${Date.now()}_${idx}`,
          name: item.trim(),
          departureTime: isBoarding ? timeVal : undefined,
          arrivalTime: !isBoarding ? timeVal : undefined,
          time: timeVal,
          landmark: '',
          active: true
        };
      }
      const timeVal = (item.departureTime || item.arrivalTime || item.time || item.timing || '').trim();
      return {
        id: item.id || item._id || `pt_${Date.now()}_${idx}`,
        name: (item.name || item.point || item.location || '').trim(),
        departureTime: isBoarding ? timeVal : undefined,
        arrivalTime: !isBoarding ? timeVal : undefined,
        time: timeVal,
        landmark: (item.landmark || item.address || '').trim(),
        active: item.active !== false
      };
    }).filter(p => p.name || p.time);
  };

  const bps = normalize(rawBps, true);
  const dps = normalize(rawDps, false);

  if (bps.length === 0) {
    return { valid: false, error: 'At least 1 boarding point is required for the travel route.' };
  }
  if (dps.length === 0) {
    return { valid: false, error: 'At least 1 dropping point is required for the travel route.' };
  }

  // Validate required fields, duplicates, and time format for boarding points
  const seenBp = new Set();
  for (let i = 0; i < bps.length; i++) {
    const bp = bps[i];
    if (!bp.name) {
      return { valid: false, error: `Boarding point #${i + 1} name is mandatory.` };
    }
    const t = bp.departureTime || bp.time;
    if (!t) {
      return { valid: false, error: `Boarding point "${bp.name}" departure time is mandatory.` };
    }
    if (!isValidTimeFormat(t)) {
      return { valid: false, error: `Invalid time format for boarding point "${bp.name}". Please use HH:MM (e.g. 21:30 or 09:30 PM).` };
    }
    const lower = bp.name.toLowerCase();
    if (seenBp.has(lower)) {
      return { valid: false, error: `Duplicate boarding point "${bp.name}". Each point name must be unique.` };
    }
    seenBp.add(lower);
  }

  // Validate required fields, duplicates, and time format for dropping points
  const seenDp = new Set();
  for (let i = 0; i < dps.length; i++) {
    const dp = dps[i];
    if (!dp.name) {
      return { valid: false, error: `Dropping point #${i + 1} name is mandatory.` };
    }
    const t = dp.arrivalTime || dp.time;
    if (!t) {
      return { valid: false, error: `Dropping point "${dp.name}" arrival time is mandatory.` };
    }
    if (!isValidTimeFormat(t)) {
      return { valid: false, error: `Invalid time format for dropping point "${dp.name}". Please use HH:MM (e.g. 07:00 or 07:00 AM).` };
    }
    const lower = dp.name.toLowerCase();
    if (seenDp.has(lower)) {
      return { valid: false, error: `Duplicate dropping point "${dp.name}". Each point name must be unique.` };
    }
    seenDp.add(lower);
  }

  return { valid: true, boardingPoints: bps, droppingPoints: dps };
};

// --- PRODUCTS / SERVICES CRUD ---
// @desc    Create a product / doctor / room / service
// @route   POST /api/vendor/products
// @access  Private (Vendor)
const createProduct = async (req, res) => {
  try {
    const { 
      name, description, price, originalPrice, category, subcategory: bodySubcategory, subNavbarCategory, mainCategory, stock, unit, warranty, 
      specialization, pinCode, duration, roomType, guests, amenities, imageUrl, 
      imageUrls, foodType, cardTypes, availableTimeSlots, bookingType,
      availableSizes, availableColors,
      jobType, jobLocation, experience, skills, deadline, applicationTips, 
      qualification, linkedProfile, contactNumber, mailId, department,
      boardingPoint, boardingTime, dropPoint, arrivalTime, distance, busTiming, stoppings,
      boardingPoints, droppingPoints,
      specifications, customFields
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const vendorSubcategory = getVendorSubcategory(req.user);
    const finalCategory = category || vendorSubcategory || 'General';
    const vendorId = req.user._id.toString();

    // Strict validation for Stay category hierarchy
    const resolvedMainCat = (mainCategory || subNavbarCategory || '').trim();
    if (resolvedMainCat.toLowerCase() === 'stay') {
      const validation = await validateCatalogCategoryHierarchy('Stay', finalCategory, bodySubcategory);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }

    let finalBoardingPoints = [];
    let finalDroppingPoints = [];
    let finalBoardingPoint = boardingPoint;
    let finalBoardingTime = boardingTime;
    let finalDropPoint = dropPoint;
    let finalArrivalTime = arrivalTime;

    const isTravelCategory = resolvedMainCat.toLowerCase() === 'travel' ||
      ['Bus Booking', 'Travels', 'Travel', 'Bus', 'Car', 'Bike', 'Travel Ticket', 'Cabs', 'Transport'].some(c => c.toLowerCase() === finalCategory.toLowerCase()) ||
      ['Sleeper Buses', 'Seater Buses', 'AC Buses', 'Non-AC Buses', 'Volvo Buses', 'Luxury Coaches', 'Intercity Buses'].some(sc => sc.toLowerCase() === (bodySubcategory || '').toLowerCase());

    if (isTravelCategory) {
      const bpsInput = Array.isArray(boardingPoints) && boardingPoints.length > 0
        ? boardingPoints
        : (boardingPoint ? [{ name: boardingPoint, departureTime: boardingTime || '', time: boardingTime || '', landmark: '', active: true }] : []);
      const dpsInput = Array.isArray(droppingPoints) && droppingPoints.length > 0
        ? droppingPoints
        : (dropPoint ? [{ name: dropPoint, arrivalTime: arrivalTime || '', time: arrivalTime || '', landmark: '', active: true }] : []);

      const validation = validateAndNormalizeTravelPoints(bpsInput, dpsInput);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      finalBoardingPoints = validation.boardingPoints;
      finalDroppingPoints = validation.droppingPoints;
      finalBoardingPoint = finalBoardingPoints[0]?.name || '';
      finalBoardingTime = finalBoardingPoints[0]?.departureTime || finalBoardingPoints[0]?.time || '';
      finalDropPoint = finalDroppingPoints[0]?.name || '';
      finalArrivalTime = finalDroppingPoints[0]?.arrivalTime || finalDroppingPoints[0]?.time || '';
    } else {
      if (Array.isArray(boardingPoints)) finalBoardingPoints = boardingPoints;
      if (Array.isArray(droppingPoints)) finalDroppingPoints = droppingPoints;
    }

    let cleanImageUrl = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : '');
    if (cleanImageUrl && (cleanImageUrl.startsWith('data:') || cleanImageUrl.startsWith('blob:'))) {
      cleanImageUrl = '';
    }
    let cleanImageUrls = (imageUrls || (imageUrl ? [imageUrl] : [])).filter(u => u && !u.startsWith('data:') && !u.startsWith('blob:'));
    if (!cleanImageUrl && cleanImageUrls.length > 0) {
      cleanImageUrl = cleanImageUrls[0];
    }

    const product = await Product.create({
      vendorId,
      vendor_id: vendorId,
      name,
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: finalCategory,
      subcategory: bodySubcategory || '',
      subNavbarCategory: subNavbarCategory || mainCategory || '',
      mainCategory: mainCategory || subNavbarCategory || '',
      stock: stock !== undefined ? Number(stock) : 0,
      unit: unit || 'count',
      warranty,
      specialization,
      pinCode,
      duration,
      roomType,
      guests: guests !== undefined ? Number(guests) : undefined,
      amenities: amenities || [],
      imageUrl: cleanImageUrl,
      imageUrls: cleanImageUrls,
      image: cleanImageUrl,
      images: cleanImageUrls,
      foodType,
      bookingType: bookingType || 'Slot booking',
      status: 'Available',
      cardTypes: cardTypes || ['Silver', 'Gold', 'Diamond'],
      availableSizes: Array.isArray(availableSizes) ? availableSizes : (typeof availableSizes === 'string' ? availableSizes.split(',').map(s=>s.trim()).filter(Boolean) : []),
      availableColors: Array.isArray(availableColors) ? availableColors : (typeof availableColors === 'string' ? availableColors.split(',').map(c=>c.trim()).filter(Boolean) : []),
      availableTimeSlots: availableTimeSlots || undefined,
      jobType,
      jobLocation,
      experience,
      skills,
      deadline,
      applicationTips,
      qualification,
      linkedProfile,
      contactNumber,
      mailId,
      department,
      boardingPoint: finalBoardingPoint,
      boardingTime: finalBoardingTime,
      dropPoint: finalDropPoint,
      arrivalTime: finalArrivalTime,
      boardingPoints: finalBoardingPoints,
      droppingPoints: finalDroppingPoints,
      distance,
      busTiming,
      stoppings: stoppings || [],
      specifications: specifications || customFields || {},
      customFields: customFields || specifications || {}
    });

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PRODUCT_CREATED,
      entity: ENTITY_NAMES.PRODUCT,
      entityId: product._id ? product._id.toString() : product.id,
      action: 'created',
      target: { vendorId: product.vendorId },
      data: product
    }).catch(err => console.warn('[Realtime] Product create publish warning:', err.message));

    res.status(201).json({ success: true, message: 'Item created successfully', data: product });
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating catalog item' });
  }
};

const normalizeCategoryType = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  if (lower.startsWith('product') || lower.startsWith('store') || lower.startsWith('electronic') || lower.startsWith('home & furniture')) return 'Products';
  if (lower.startsWith('service') || lower.startsWith('hospital') || lower.startsWith('doctor')) return 'Services';
  if (lower.startsWith('food') || lower.startsWith('restaurant') || lower.startsWith('dish')) return 'Food';
  if (lower.startsWith('daily') || lower.startsWith('grocery') || lower.startsWith('pharmacy')) return 'Daily Needs';
  if (lower.startsWith('stay') || lower.startsWith('hotel') || lower.startsWith('room')) return 'Stay';
  if (lower.startsWith('travel') || lower.startsWith('bus') || lower.startsWith('travel agency')) return 'Travel';
  if (lower.startsWith('job')) return 'Jobs';

  return s;
};

const isBookingOrServiceCatalogItem = (product, vendorUser = null) => {
  if (!product) return false;
  const pMain = String(product.mainCategory || product.subNavbarCategory || '').trim().toLowerCase();
  const pCat = String(product.category || '').trim().toLowerCase();
  const pSub = String(product.subcategory || '').trim().toLowerCase();
  const pName = String(product.name || '').trim().toLowerCase();
  const vType = String(vendorUser?.vendorType || vendorUser?.category || '').trim().toLowerCase();

  if (['services', 'service', 'stay', 'travel', 'jobs', 'education'].includes(pMain)) return true;
  if (['services', 'service', 'stay', 'travel', 'jobs', 'education'].includes(pCat)) return true;
  if (
    vType.includes('service') || vType.includes('hotel') || vType.includes('stay') || 
    vType.includes('travel') || vType.includes('doctor') || vType.includes('hospital') || 
    vType.includes('job') || vType.includes('education')
  ) {
    return true;
  }

  const serviceCategories = [
    'it & device support', 'ac service', 'laptop repairs', 'cctv installation',
    'pc repairs', 'full clean', 'cleaning', 'electrician', 'plumber', 'hospital',
    'technician', 'healthcare', 'services', 'service', 'appointment',
    'stay booking', 'bus booking', 'tour packages', 'taxi service', 'hotel', 'resort',
    'room', 'rooms', 'homestay', 'pg', 'consultation', 'travel', 'travels', 'bus', 'resorts', 'hotels'
  ];
  if (serviceCategories.includes(pCat) || serviceCategories.includes(pSub)) return true;

  if (/\b(service|services|repair|repairs|cctv|support|consultation|doctor|technician|clinic|hospital|hotel|room|rooms|stay|travel|tour|bus)\b/i.test(pName)) {
    return true;
  }
  return false;
};

const getProducts = async (req, res) => {
  try {
    const parentId = (req.user.parentUserId || req.user._id).toString();
    const activeBusinessId = req.user._id.toString();
    const activeVendorType = req.user.vendorType || req.user.category || '';

    const reqType = (req.query.type || req.query.mainCategory || req.query.subNavbarCategory || req.query.category || '').trim();
    const targetType = reqType ? normalizeCategoryType(reqType) : normalizeCategoryType(activeVendorType);

    const vendorIds = [activeBusinessId, parentId];
    const queryConditions = [
      {
        $or: [
          { vendorId: { $in: vendorIds } },
          { vendor_id: { $in: vendorIds } }
        ]
      }
    ];

    if (targetType && targetType.toLowerCase() !== 'all') {
      const typeRegex = new RegExp('^' + targetType, 'i');
      queryConditions.push({
        $or: [
          { mainCategory: typeRegex },
          { subNavbarCategory: typeRegex },
          { category: typeRegex }
        ]
      });
    }

    if (req.query.subCategory && req.query.subCategory !== 'All') {
      queryConditions.push({ category: req.query.subCategory });
    }

    if (req.query.search) {
      const sRegex = new RegExp(String(req.query.search).trim(), 'i');
      queryConditions.push({
        $or: [{ name: sRegex }, { description: sRegex }]
      });
    }

    if (req.query.status && req.query.status !== 'All') {
      queryConditions.push({ status: req.query.status });
    }

    const mongoQuery = queryConditions.length > 1 ? { $and: queryConditions } : queryConditions[0];

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let query = Product.find(mongoQuery)
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    let total = 0;
    if (!isNaN(page) && !isNaN(limit) && limit > 0) {
      total = await Product.countDocuments(mongoQuery);
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const products = await query;

    // Safety fallback filter to guarantee strict business ownership & category isolation
    const filtered = products.filter(p => {
      const pVendorId = (p.vendorId || p.vendor_id || '').toString();
      const belongsToVendor = (pVendorId === activeBusinessId || pVendorId === parentId);
      if (!belongsToVendor) return false;

      if (!targetType || targetType.toLowerCase() === 'all') return true;

      const pMain = normalizeCategoryType(p.mainCategory || p.subNavbarCategory);
      const pCat = normalizeCategoryType(p.category);

      if (pMain) return pMain.toLowerCase() === targetType.toLowerCase();
      if (pCat) return pCat.toLowerCase() === targetType.toLowerCase() || pCat.toLowerCase().includes(targetType.toLowerCase());

      return true;
    });

    // Compute accurate persisted booking, order, and unique customer counts for each product from Order collection
    if (filtered.length > 0) {
      const productIds = filtered.map(p => String(p._id || p.id));
      const productNames = filtered.map(p => (p.name || '').trim().toLowerCase()).filter(Boolean);

      const allVendorBusinessIds = [parentId, activeBusinessId];
      if (req.user && req.user.businesses && Array.isArray(req.user.businesses)) {
        req.user.businesses.forEach(b => {
          if (b && (b._id || b.id)) allVendorBusinessIds.push(String(b._id || b.id));
        });
      }

      const relevantOrders = await Order.find({
        $or: [
          { vendorId: { $in: allVendorBusinessIds } },
          { vendor_id: { $in: allVendorBusinessIds } }
        ],
        status: { $nin: ['Cancelled', 'Rejected'] }
      }).select('items productId product_details finalAmount totalAmount amount status customerId memberId customer_name memberName phone mobileNumber email candidateEmail customer_email').lean();

      const bookingCountMap = {};
      const customersSetMap = {};

      relevantOrders.forEach(ord => {
        const custKey = ord.customerId || ord.memberId || ord.customer_name || ord.memberName || ord.phone || ord.mobileNumber || ord.customer_email || ord.candidateEmail || ord.email || ord._id;

        if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
          ord.items.forEach(it => {
            const itId = String(it.productId || it._id || it.id || '');
            const itName = (it.name || '').trim().toLowerCase();
            const qty = Number(it.quantity || it.qty || 1);
            if (itId && productIds.includes(itId)) {
              bookingCountMap[itId] = (bookingCountMap[itId] || 0) + qty;
              if (custKey) {
                customersSetMap[itId] = customersSetMap[itId] || new Set();
                customersSetMap[itId].add(String(custKey));
              }
            } else if (itName && productNames.includes(itName)) {
              const match = filtered.find(p => (p.name || '').trim().toLowerCase() === itName);
              if (match) {
                const pId = String(match._id || match.id);
                bookingCountMap[pId] = (bookingCountMap[pId] || 0) + qty;
                if (custKey) {
                  customersSetMap[pId] = customersSetMap[pId] || new Set();
                  customersSetMap[pId].add(String(custKey));
                }
              }
            }
          });
        } else {
          const ordProdId = String(ord.productId || '');
          const ordProdName = (ord.product_details || '').trim().toLowerCase();
          if (ordProdId && productIds.includes(ordProdId)) {
            bookingCountMap[ordProdId] = (bookingCountMap[ordProdId] || 0) + 1;
            if (custKey) {
              customersSetMap[ordProdId] = customersSetMap[ordProdId] || new Set();
              customersSetMap[ordProdId].add(String(custKey));
            }
          } else if (ordProdName && productNames.includes(ordProdName)) {
            const match = filtered.find(p => (p.name || '').trim().toLowerCase() === ordProdName);
            if (match) {
              const pId = String(match._id || match.id);
              bookingCountMap[pId] = (bookingCountMap[pId] || 0) + 1;
              if (custKey) {
                customersSetMap[pId] = customersSetMap[pId] || new Set();
                customersSetMap[pId].add(String(custKey));
              }
            }
          }
        }
      });

      filtered.forEach(p => {
        const pId = String(p._id || p.id);
        const count = bookingCountMap[pId] || 0;
        const uniqueCustCount = customersSetMap[pId] ? customersSetMap[pId].size : 0;
        p.bookingCount = count;
        p.bookingsCount = count;
        p.ordersCount = count;
        p.salesCount = count;
        p.customersCount = uniqueCustCount;
        p.uniqueCustomers = uniqueCustCount;

        // Keep product inventory and service booking availability as separate concepts
        const isServiceOffering = isBookingOrServiceCatalogItem(p, req.user);
        if (isServiceOffering) {
          if (p.status === 'Out of Stock' || p.status === 'OUT OF STOCK') {
            p.status = 'Unavailable';
          }
        } else {
          if (p.status === 'Unavailable' || p.status === 'UNAVAILABLE') {
            p.status = 'Out of Stock';
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: filtered,
      total: total || filtered.length,
      page: page || 1,
      totalPages: limit ? Math.ceil((total || filtered.length) / limit) : 1
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving catalog items' });
  }
};

// @desc    Update catalog item details
// @route   PUT /api/vendor/products/:id
// @access  Private (Vendor)
const updateProduct = async (req, res) => {
  try {
    const { 
      name, description, price, originalPrice, category, subcategory: bodySubcategory, subNavbarCategory, mainCategory, stock, unit, warranty, 
      specialization, pinCode, duration, roomType, guests, amenities, status, 
      imageUrl, imageUrls, foodType, cardTypes, availableTimeSlots, bookingType,
      availableSizes, availableColors,
      jobType, jobLocation, experience, skills, deadline, applicationTips, 
      qualification, linkedProfile, contactNumber, mailId, department,
      boardingPoint, boardingTime, dropPoint, arrivalTime, distance, busTiming, stoppings,
      boardingPoints, droppingPoints
    } = req.body;
    const product = await Product.findById(req.params.id);

    const parentId = req.user.parentUserId || req.user._id;
    const activeBusinessId = req.user._id;
    const isOwner = product && (product.vendorId === activeBusinessId.toString() || product.vendorId === parentId.toString());

    if (!product || !isOwner) {
      return res.status(404).json({ success: false, message: 'Catalog item not found or unauthorized' });
    }

    const vendorSubcategory = getVendorSubcategory(req.user);
    const finalCategory = category || product.category || vendorSubcategory || 'General';

    // Strict validation for Stay category hierarchy
    const resolvedMainCat = (mainCategory || subNavbarCategory || product.mainCategory || product.subNavbarCategory || '').trim();
    if (resolvedMainCat.toLowerCase() === 'stay') {
      const targetSubcategory = bodySubcategory !== undefined ? bodySubcategory : product.subcategory;
      const validation = await validateCatalogCategoryHierarchy('Stay', finalCategory, targetSubcategory);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }

    let updatedBoardingPoints = product.boardingPoints || [];
    let updatedDroppingPoints = product.droppingPoints || [];
    let updatedBoardingPoint = boardingPoint !== undefined ? boardingPoint : product.boardingPoint;
    let updatedBoardingTime = boardingTime !== undefined ? boardingTime : product.boardingTime;
    let updatedDropPoint = dropPoint !== undefined ? dropPoint : product.dropPoint;
    let updatedArrivalTime = arrivalTime !== undefined ? arrivalTime : product.arrivalTime;

    const isTravelCat = resolvedMainCat.toLowerCase() === 'travel' ||
      (product.mainCategory && product.mainCategory.toLowerCase() === 'travel') ||
      (product.subNavbarCategory && product.subNavbarCategory.toLowerCase() === 'travel') ||
      ['Bus Booking', 'Travels', 'Travel', 'Bus', 'Car', 'Bike', 'Travel Ticket', 'Cabs', 'Transport'].some(c => c.toLowerCase() === finalCategory.toLowerCase() || c.toLowerCase() === (product.category || '').toLowerCase()) ||
      ['Sleeper Buses', 'Seater Buses', 'AC Buses', 'Non-AC Buses', 'Volvo Buses', 'Luxury Coaches', 'Intercity Buses'].some(sc => sc.toLowerCase() === (bodySubcategory !== undefined ? bodySubcategory : product.subcategory || '').toLowerCase());

    if (isTravelCat && (boardingPoints !== undefined || droppingPoints !== undefined || boardingPoint !== undefined || dropPoint !== undefined)) {
      const bpsInput = Array.isArray(boardingPoints)
        ? boardingPoints
        : (boardingPoint ? [{ name: boardingPoint, departureTime: boardingTime || product.boardingTime || '', time: boardingTime || product.boardingTime || '', landmark: '', active: true }] : (product.boardingPoints || []));
      const dpsInput = Array.isArray(droppingPoints)
        ? droppingPoints
        : (dropPoint ? [{ name: dropPoint, arrivalTime: arrivalTime || product.arrivalTime || '', time: arrivalTime || product.arrivalTime || '', landmark: '', active: true }] : (product.droppingPoints || []));

      const validation = validateAndNormalizeTravelPoints(bpsInput, dpsInput);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      updatedBoardingPoints = validation.boardingPoints;
      updatedDroppingPoints = validation.droppingPoints;
      updatedBoardingPoint = updatedBoardingPoints[0]?.name || '';
      updatedBoardingTime = updatedBoardingPoints[0]?.departureTime || updatedBoardingPoints[0]?.time || '';
      updatedDropPoint = updatedDroppingPoints[0]?.name || '';
      updatedArrivalTime = updatedDroppingPoints[0]?.arrivalTime || updatedDroppingPoints[0]?.time || '';
    } else {
      if (Array.isArray(boardingPoints)) updatedBoardingPoints = boardingPoints;
      if (Array.isArray(droppingPoints)) updatedDroppingPoints = droppingPoints;
    }

    // Stock and availability state management
    const isServiceOrBookingOffering = isBookingOrServiceCatalogItem(
      {
        ...product.toObject(),
        category: finalCategory,
        mainCategory: resolvedMainCat,
        subNavbarCategory: resolvedMainCat,
        subcategory: bodySubcategory !== undefined ? bodySubcategory : product.subcategory
      },
      req.user
    );

    let finalStatus = status || product.status || 'Available';
    if (isServiceOrBookingOffering) {
      // Services, Stay, and Travel offerings do not track physical inventory stock
      if (finalStatus === 'Out of Stock' || finalStatus === 'OUT OF STOCK') {
        finalStatus = 'Unavailable';
      }
    } else {
      // Products, Food, and Daily Needs track physical inventory
      if (finalStatus === 'Unavailable' || finalStatus === 'UNAVAILABLE') {
        finalStatus = 'Out of Stock';
      }
      const effectiveStock = stock !== undefined ? Number(stock) : product.stock;
      if (effectiveStock !== undefined && effectiveStock !== null && !isNaN(effectiveStock)) {
        if (effectiveStock <= 0) {
          if (!status || status === 'Available') {
            finalStatus = 'Out of Stock';
          }
        } else if (effectiveStock > 0) {
          // Auto-restore to Available when restocking positive quantity
          if (finalStatus === 'Out of Stock' || (!status && product.status === 'Out of Stock')) {
            finalStatus = 'Available';
          }
        }
      }
    }

    let cleanImageUrl = imageUrl !== undefined ? imageUrl : (imageUrls && imageUrls.length > 0 ? imageUrls[0] : (product.imageUrl || product.image));
    if (cleanImageUrl && (cleanImageUrl.startsWith('data:') || cleanImageUrl.startsWith('blob:'))) {
      cleanImageUrl = product.imageUrl || product.image || '';
    }
    let cleanImageUrls = imageUrls !== undefined 
      ? imageUrls.filter(u => u && !u.startsWith('data:') && !u.startsWith('blob:')) 
      : (imageUrl !== undefined ? (cleanImageUrl ? [cleanImageUrl] : []) : (product.imageUrls || product.images || []));
    if (!cleanImageUrl && cleanImageUrls.length > 0) {
      cleanImageUrl = cleanImageUrls[0];
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, {
      $set: {
        vendorId: activeBusinessId, // Migrate legacy item to current active business ID
        name: name || product.name,
        description: description !== undefined ? description : product.description,
        price: price !== undefined ? Number(price) : product.price,
        originalPrice: originalPrice !== undefined ? (originalPrice ? Number(originalPrice) : null) : product.originalPrice,
        category: finalCategory,
        subcategory: bodySubcategory !== undefined ? bodySubcategory : product.subcategory,
        subNavbarCategory: subNavbarCategory || mainCategory || product.subNavbarCategory || '',
        mainCategory: mainCategory || subNavbarCategory || product.mainCategory || '',
        stock: stock !== undefined ? Number(stock) : product.stock,
        unit: unit !== undefined ? unit : product.unit,
        warranty: warranty !== undefined ? warranty : product.warranty,
        specialization: specialization !== undefined ? specialization : product.specialization,
        pinCode: pinCode !== undefined ? pinCode : product.pinCode,
        duration: duration !== undefined ? duration : product.duration,
        roomType: roomType !== undefined ? roomType : product.roomType,
        guests: guests !== undefined ? Number(guests) : product.guests,
        amenities: amenities !== undefined ? amenities : product.amenities,
        imageUrl: cleanImageUrl,
        imageUrls: cleanImageUrls,
        image: cleanImageUrl,
        images: cleanImageUrls,
        foodType: foodType !== undefined ? foodType : product.foodType,
        bookingType: bookingType !== undefined ? bookingType : product.bookingType,
        status: finalStatus,
        cardTypes: cardTypes !== undefined ? cardTypes : product.cardTypes,
        availableTimeSlots: availableTimeSlots !== undefined ? availableTimeSlots : product.availableTimeSlots,
        availableSizes: availableSizes !== undefined ? (Array.isArray(availableSizes) ? availableSizes : (typeof availableSizes === 'string' ? availableSizes.split(',').map(s=>s.trim()).filter(Boolean) : [])) : product.availableSizes,
        availableColors: availableColors !== undefined ? (Array.isArray(availableColors) ? availableColors : (typeof availableColors === 'string' ? availableColors.split(',').map(c=>c.trim()).filter(Boolean) : [])) : product.availableColors,
        jobType: jobType !== undefined ? jobType : product.jobType,
        jobLocation: jobLocation !== undefined ? jobLocation : product.jobLocation,
        experience: experience !== undefined ? experience : product.experience,
        skills: skills !== undefined ? skills : product.skills,
        deadline: deadline !== undefined ? deadline : product.deadline,
        applicationTips: applicationTips !== undefined ? applicationTips : product.applicationTips,
        qualification: qualification !== undefined ? qualification : product.qualification,
        linkedProfile: linkedProfile !== undefined ? linkedProfile : product.linkedProfile,
        contactNumber: contactNumber !== undefined ? contactNumber : product.contactNumber,
        mailId: mailId !== undefined ? mailId : product.mailId,
        department: department !== undefined ? department : product.department,
        boardingPoint: updatedBoardingPoint,
        boardingTime: updatedBoardingTime,
        dropPoint: updatedDropPoint,
        arrivalTime: updatedArrivalTime,
        boardingPoints: updatedBoardingPoints,
        droppingPoints: updatedDroppingPoints,
        distance: distance !== undefined ? distance : product.distance,
        busTiming: busTiming !== undefined ? busTiming : product.busTiming,
        stoppings: stoppings !== undefined ? stoppings : product.stoppings,
        specifications: req.body.specifications !== undefined ? req.body.specifications : (req.body.customFields !== undefined ? req.body.customFields : product.specifications),
        customFields: req.body.customFields !== undefined ? req.body.customFields : (req.body.specifications !== undefined ? req.body.specifications : product.customFields)
      }
    }, { new: true });

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PRODUCT_UPDATED,
      entity: ENTITY_NAMES.PRODUCT,
      entityId: updated._id ? updated._id.toString() : updated.id,
      action: 'updated',
      target: { vendorId: updated.vendorId },
      data: updated
    }).catch(err => console.warn('[Realtime] Product update publish warning:', err.message));

    res.status(200).json({ success: true, message: 'Item updated successfully', data: updated });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating catalog item' });
  }
};

// @desc    Delete catalog item
// @route   DELETE /api/vendor/products/:id
// @access  Private (Vendor)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    const parentId = req.user.parentUserId || req.user._id;
    const activeBusinessId = req.user._id;
    const isOwner = product && (product.vendorId === activeBusinessId.toString() || product.vendorId === parentId.toString());

    if (!product || !isOwner) {
      return res.status(404).json({ success: false, message: 'Catalog item not found or unauthorized' });
    }

    await Product.findByIdAndDelete(req.params.id);

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PRODUCT_DELETED,
      entity: ENTITY_NAMES.PRODUCT,
      entityId: req.params.id,
      action: 'deleted',
      target: { vendorId: product.vendorId },
      data: { _id: req.params.id, id: req.params.id, name: product.name }
    }).catch(err => console.warn('[Realtime] Product delete publish warning:', err.message));

    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting catalog item' });
  }
};

// --- ORDERS / BOOKINGS ---
// @desc    Get all orders / bookings of the vendor
// @route   GET /api/vendor/orders
// @access  Private (Vendor)
// Helper to deduplicate repeating address tokens like "Krishnagiri, Tamil Nadu, Krishnagiri, Tamil Nadu"
const deduplicateAddressSegments = (addrStr) => {
  if (!addrStr || typeof addrStr !== 'string') return addrStr;
  const tokens = [];
  addrStr.split(',').forEach(segment => {
    const trimmed = segment.trim();
    if (!trimmed || trimmed === 'N/A') return;
    const lower = trimmed.toLowerCase();
    if (!tokens.some(t => t.toLowerCase() === lower)) {
      tokens.push(trimmed);
    }
  });
  return tokens.join(', ');
};

// Reusable helper to build Customer ID canonical lookup without scanning entire collections
const buildCustomerLookupForOrders = async (orders) => {
  const rawIds = [];
  orders.forEach(o => {
    if (o.memberId && o.memberId !== 'FIC-CUST-100001' && o.memberId !== 'cust_dhanush') rawIds.push(String(o.memberId));
    if (o.customerId && o.customerId !== 'FIC-CUST-100001') rawIds.push(String(o.customerId));
    if (o.customer_id && o.customer_id !== 'FIC-CUST-100001') rawIds.push(String(o.customer_id));
    if (o.customerDisplayId && o.customerDisplayId !== 'FIC-CUST-100001') rawIds.push(String(o.customerDisplayId));
  });
  const memberIds = [...new Set(rawIds)];
  const emails = [...new Set(orders.map(o => o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : null)).filter(Boolean))];
  const phones = [...new Set(orders.map(o => (o.customer_phone || o.phone || o.candidatePhone || '').toString().replace(/[^0-9]/g, '').slice(-10)).filter(p => p && p.length >= 10))];

  const orCustConditions = [];
  if (memberIds.length > 0) {
    const objectIds = memberIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    orCustConditions.push({ _id: { $in: [...memberIds, ...objectIds] } });
    orCustConditions.push({ id: { $in: memberIds } });
    orCustConditions.push({ customerId: { $in: memberIds } });
    orCustConditions.push({ registrationId: { $in: memberIds } });
  }
  if (emails.length > 0) {
    orCustConditions.push({ email: { $in: emails } });
  }
  if (phones.length > 0) {
    orCustConditions.push({ phone: { $in: phones } });
    orCustConditions.push({ mobileNumber: { $in: phones } });
  }

  const orderObjIds = orders.map(o => o._id).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  const orderStrIds = orders.map(o => String(o._id));
  const orderNumbers = orders.map(o => o.order_number || o.id).filter(Boolean);

  // Fetch all Customer documents plus matching Users and related Payments in parallel
  const [dbCustomers, memberUsers, relatedPayments] = await Promise.all([
    Customer.find({}).select('name email phone mobileNumber customerId registrationId _id address street city state pincode aadhaar pan role status addresses memberId gender age').lean(),
    orCustConditions.length > 0
      ? User.find({ $or: orCustConditions }).select('name email phone customerId registrationId _id aadhaar pan role memberId gender age').lean()
      : Promise.resolve([]),
    mongoose.connection.db
      ? mongoose.connection.db.collection('payments').find({
          sourceModel: 'Order',
          $or: [
            { sourceId: { $in: [...orderObjIds, ...orderStrIds, ...orderNumbers] } }
          ]
        }).toArray()
      : Promise.resolve([])
  ]);

  const customerLookup = {
    byOrderId: {},
    paymentsByOrderId: {},
    byPhone: {},
    byEmail: {},
    byName: {},
    byId: {},
    entitiesById: {},
    entitiesByPhone: {},
    entitiesByEmail: {},
    entitiesByName: {}
  };

  if (Array.isArray(relatedPayments)) {
    relatedPayments.forEach(p => {
      const sId = String(p.sourceId);
      customerLookup.paymentsByOrderId[sId] = p;
      if (p.recipientId && p.recipientId !== 'FIC-CUST-100001') {
        customerLookup.byOrderId[sId] = p.recipientId;
      }
      const pPhone = (p.recipientPhone || '').toString().replace(/[^0-9]/g, '');
      if (pPhone && pPhone.length >= 10 && p.recipientId && p.recipientId !== 'FIC-CUST-100001') {
        customerLookup.byPhone[pPhone.slice(-10)] = p.recipientId;
      }
      const pEmail = (p.recipientEmail || '').trim().toLowerCase();
      if (pEmail && pEmail.includes('@') && p.recipientId && p.recipientId !== 'FIC-CUST-100001') {
        customerLookup.byEmail[pEmail] = p.recipientId;
      }
    });
  }

  const isCanonicalCustId = (id) => {
    if (!id) return false;
    const str = String(id).trim();
    return (str.startsWith('FIC-CUS-') || str.startsWith('FIC-CUST-')) && str !== 'FIC-CUST-100001';
  };

  const registerCustomerInLookup = (cust) => {
    if (!cust) return;
    let cid = null;
    if (isCanonicalCustId(cust.customerId)) cid = String(cust.customerId).trim();
    else if (isCanonicalCustId(cust.registrationId)) cid = String(cust.registrationId).trim();
    else if (isCanonicalCustId(cust.customerDisplayId)) cid = String(cust.customerDisplayId).trim();
    else if (isCanonicalCustId(cust._id || cust.id)) cid = String(cust._id || cust.id).trim();
    else if (isCanonicalCustId(cust.memberId)) cid = String(cust.memberId).trim();

    if (cust._id) {
      if (cid) customerLookup.byId[String(cust._id)] = cid;
      if (!customerLookup.entitiesById[String(cust._id)] || cid) {
        customerLookup.entitiesById[String(cust._id)] = cust;
      }
    }
    if (cust.id) {
      if (cid) customerLookup.byId[String(cust.id)] = cid;
      if (!customerLookup.entitiesById[String(cust.id)] || cid) {
        customerLookup.entitiesById[String(cust.id)] = cust;
      }
    }
    if (cust.memberId) {
      if (cid) customerLookup.byId[String(cust.memberId)] = cid;
      if (!customerLookup.entitiesById[String(cust.memberId)] || cid) {
        customerLookup.entitiesById[String(cust.memberId)] = cust;
      }
    }
    if (cust.customerId && cust.customerId !== 'FIC-CUST-100001') {
      if (cid) customerLookup.byId[String(cust.customerId)] = cid;
      if (!customerLookup.entitiesById[String(cust.customerId)] || cid) {
        customerLookup.entitiesById[String(cust.customerId)] = cust;
      }
    }
    if (cust.registrationId && cust.registrationId !== 'FIC-CUST-100001') {
      if (cid) customerLookup.byId[String(cust.registrationId)] = cid;
      if (!customerLookup.entitiesById[String(cust.registrationId)] || cid) {
        customerLookup.entitiesById[String(cust.registrationId)] = cust;
      }
    }

    const p = (cust.phone || cust.mobileNumber || '').toString().replace(/[^0-9]/g, '');
    if (p && p.length >= 10) {
      if (cid) customerLookup.byPhone[p.slice(-10)] = cid;
      if (!customerLookup.entitiesByPhone[p.slice(-10)] || cid) {
        customerLookup.entitiesByPhone[p.slice(-10)] = cust;
      }
    }
    const em = (cust.email || '').trim().toLowerCase();
    if (em && em.includes('@')) {
      if (cid) customerLookup.byEmail[em] = cid;
      if (!customerLookup.entitiesByEmail[em] || cid) {
        customerLookup.entitiesByEmail[em] = cust;
      }
    }
    const nm = (cust.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nm && nm !== 'customer' && nm !== 'connectmember') {
      if (cid) customerLookup.byName[nm] = cid;
      if (!customerLookup.entitiesByName[nm] || cid) {
        customerLookup.entitiesByName[nm] = cust;
      }
    }
  };

  memberUsers.forEach(registerCustomerInLookup);
  dbCustomers.forEach(registerCustomerInLookup);

  return customerLookup;
};

const normalizeAddressStateForOrder = (obj) => {
  if (obj.customer_address && typeof obj.customer_address === 'string') {
    if (/(krishnagiri|dharmapuri|chennai|coimbatore|salem|madurai|tirupur)/i.test(obj.customer_address) || /-\s*6[0-4]\d{4}/.test(obj.customer_address)) {
      obj.customer_address = obj.customer_address.replace(/,\s*Karnataka/gi, ', Tamil Nadu').replace(/\bKarnataka\b/gi, 'Tamil Nadu');
    }
    obj.customer_address = deduplicateAddressSegments(obj.customer_address);
  }
  if (obj.deliveryAddress && typeof obj.deliveryAddress === 'string') {
    if (/(krishnagiri|dharmapuri|chennai|coimbatore|salem|madurai|tirupur)/i.test(obj.deliveryAddress) || /-\s*6[0-4]\d{4}/.test(obj.deliveryAddress)) {
      obj.deliveryAddress = obj.deliveryAddress.replace(/,\s*Karnataka/gi, ', Tamil Nadu').replace(/\bKarnataka\b/gi, 'Tamil Nadu');
    }
    obj.deliveryAddress = deduplicateAddressSegments(obj.deliveryAddress);
  }
};

// --- ORDERS (Transactional products / food / daily needs) ---
// @desc    Get all orders of the vendor
// @route   GET /api/vendor/orders
// @access  Private (Vendor)
const getOrders = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    // Category guard: Only vendors with Product, Daily Needs, or Food can retrieve orders
    if (!vendorHasOrderCategories(user)) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }

    const businessIds = [parentUserId.toString()];
    if (user.businesses && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
      });
    }

    // Query strictly for transactional product/food/daily needs orders
    const ORDER_CATEGORY_TYPES = [
      'Products', 'Product', 'products', 'product',
      'Food', 'food', 'Restaurant', 'restaurant',
      'Daily Needs', 'daily needs', 'daily_needs', 'Daily_Needs', 'Grocery', 'grocery'
    ];

    const baseQuery = {
      $and: [
        {
          $or: [
            { vendorId: { $in: businessIds } },
            { vendor_id: { $in: businessIds } }
          ]
        },
        // Must be in allowed order categories
        {
          $or: [
            { type: { $in: ORDER_CATEGORY_TYPES } },
            { category: { $in: ORDER_CATEGORY_TYPES } }
          ]
        },
        // Never allow Job applications or Bookings
        {
          type: { $nin: ['Job', 'Jobs', 'job', 'jobs', 'Application', 'application', 'Booking', 'booking', 'Services', 'Service', 'service', 'services', 'Stay', 'stay', 'Hotel', 'hotel', 'Travel', 'travel', 'Travels'] }
        },
        {
          category: { $nin: ['Job', 'Jobs', 'job', 'jobs', 'Application', 'application', 'Booking', 'booking', 'Services', 'Service', 'service', 'services', 'Stay', 'stay', 'Hotel', 'hotel', 'Travel', 'travel', 'Travels'] }
        }
      ]
    };

    // Support category filter
    if (req.query.category && !['All', 'all'].includes(String(req.query.category).trim())) {
      const allowedTypes = mapCategoryToTypes(req.query.category);
      const catRegex = new RegExp(allowedTypes.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
      baseQuery.$and.push({
        $or: [
          { type: { $in: allowedTypes } },
          { category: { $in: allowedTypes } },
          { type: catRegex },
          { category: catRegex }
        ]
      });
    }

    // Support payment status filter
    if (req.query.paymentStatus && req.query.paymentStatus !== 'All') {
      if (req.query.paymentStatus === 'Paid') {
        baseQuery.$and.push({
          $or: [
            { paymentStatus: 'Paid' },
            { status: { $in: ['Delivered', 'Completed'] } }
          ]
        });
      } else if (req.query.paymentStatus === 'Payment Pending' || req.query.paymentStatus === 'Pending') {
        baseQuery.$and.push({
          $or: [
            { paymentStatus: { $in: ['Pending', 'Payment Pending'] } },
            { paymentStatus: { $exists: false } },
            { paymentStatus: null }
          ],
          status: { $nin: ['Delivered', 'Completed'] }
        });
      }
    }

    // Support search (customer name, customer email, customer ID, order ID, product/item name)
    if (req.query.search) {
      const sRegex = new RegExp(String(req.query.search).trim(), 'i');
      baseQuery.$and.push({
        $or: [
          { order_number: sRegex },
          { id: sRegex },
          { memberName: sRegex },
          { customer_name: sRegex },
          { memberId: sRegex },
          { customer_id: sRegex },
          { customerId: sRegex },
          { customerDisplayId: sRegex },
          { customer_email: sRegex },
          { customerEmail: sRegex },
          { product_details: sRegex },
          { 'items.name': sRegex }
        ]
      });
    }

    // Support order status filter
    if (req.query.status && req.query.status !== 'All') {
      baseQuery.$and.push({ status: req.query.status });
    }

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let query = Order.find(baseQuery).sort({ createdAt: -1 }).lean();

    let total = 0;
    if (!isNaN(page) && !isNaN(limit) && limit > 0) {
      total = await Order.countDocuments(baseQuery);
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const orders = await query;

    // Fast targeted lookups for only the retrieved orders
    const memberIds = [...new Set(orders.map(o => o.memberId || o.customer_id).filter(Boolean))];
    const [membershipCards, customerLookup] = await Promise.all([
      MembershipCard.find({ userId: { $in: memberIds } }).select('userId planName').lean(),
      buildCustomerLookupForOrders(orders)
    ]);

    const membershipMap = {};
    membershipCards.forEach(c => {
      if (c.userId && c.planName) membershipMap[c.userId.toString()] = c.planName;
    });

    const normalizedOrders = orders.map(o => {
      const obj = o.toObject ? o.toObject() : o;
      if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
      if (!obj.memberName && obj.customer_name) obj.memberName = obj.customer_name;
      if (!obj.memberId && obj.customer_id) obj.memberId = obj.customer_id;
      if (obj.finalAmount === undefined && obj.amount !== undefined) obj.finalAmount = obj.amount;
      if (obj.totalAmount === undefined && obj.amount !== undefined) obj.totalAmount = obj.amount;
      const effectiveDate = obj.createdAt || obj.created_at || obj.orderDate || obj.date;
      if (effectiveDate) {
        if (!obj.createdAt) obj.createdAt = effectiveDate;
        if (!obj.created_at) obj.created_at = effectiveDate;
      }

      // Canonical Customer ID resolution
      const isCanonicalId = (id) => {
        if (!id) return false;
        const str = String(id).trim();
        return (str.startsWith('FIC-CUS-') || str.startsWith('FIC-CUST-')) && str !== 'FIC-CUST-100001';
      };

      let resolvedCustomerId = null;
      if (isCanonicalId(obj.customerId)) {
        resolvedCustomerId = String(obj.customerId).trim();
      } else if (isCanonicalId(obj.customerDisplayId)) {
        resolvedCustomerId = String(obj.customerDisplayId).trim();
      } else if (isCanonicalId(obj.memberId)) {
        resolvedCustomerId = String(obj.memberId).trim();
      }

      // Check payment recipientId
      if (!resolvedCustomerId || resolvedCustomerId === 'FIC-CUST-100001') {
        if (customerLookup.byOrderId && isCanonicalId(customerLookup.byOrderId[String(obj._id)])) {
          resolvedCustomerId = customerLookup.byOrderId[String(obj._id)];
        }
      }

      // If still unresolved or defaulted to placeholder, look up genuine customer record
      if (!resolvedCustomerId || resolvedCustomerId === 'FIC-CUST-100001') {
        const oPhone = (obj.customer_phone || obj.phone || '').toString().replace(/[^0-9]/g, '');
        const oEmail = (obj.customer_email || (obj.memberId && obj.memberId.includes('@') ? obj.memberId : '') || '').trim().toLowerCase();
        const oName = (obj.memberName || obj.customer_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (obj.memberId && customerLookup.byId && isCanonicalId(customerLookup.byId[String(obj.memberId)])) {
          resolvedCustomerId = customerLookup.byId[String(obj.memberId)];
        } else if (oPhone && oPhone.length >= 10 && customerLookup.byPhone && isCanonicalId(customerLookup.byPhone[oPhone.slice(-10)])) {
          resolvedCustomerId = customerLookup.byPhone[oPhone.slice(-10)];
        } else if (oEmail && customerLookup.byEmail && isCanonicalId(customerLookup.byEmail[oEmail])) {
          resolvedCustomerId = customerLookup.byEmail[oEmail];
        } else if (oName && customerLookup.byName && isCanonicalId(customerLookup.byName[oName])) {
          resolvedCustomerId = customerLookup.byName[oName];
        }
      }

      if (!resolvedCustomerId || resolvedCustomerId === 'FIC-CUST-100001') {
        resolvedCustomerId = 'N/A';
      }

      obj.customerId = resolvedCustomerId;
      obj.customerDisplayId = resolvedCustomerId;

      // Ensure transactional orders never have stray job application fields
      delete obj.jobTitle;
      delete obj.candidateResume;
      delete obj.candidateEmail;
      delete obj.candidateEducation;
      delete obj.candidateName;
      delete obj.candidatePhone;
      delete obj.candidateAddress;
      delete obj.candidateLocation;
      delete obj.jobLocation;
      delete obj.experience;
      delete obj.applicationId;
      delete obj.applicationDate;
      delete obj.jobId;

      if (obj.memberId && membershipMap[obj.memberId.toString()]) {
        obj.membershipPlanName = membershipMap[obj.memberId.toString()];
      }

      normalizeAddressStateForOrder(obj);

      // Payment Method & Status Normalization
      let pMethod = obj.paymentMethod || obj.payment_method || obj.paymentMode || obj.paymentType || '';
      let pStatus = obj.paymentStatus || obj.payment_status || '';

      const isCodOrder = pMethod.toLowerCase().includes('cash') || pMethod.toLowerCase().includes('cod');

      if (!pMethod || pMethod === 'N/A') {
        if (obj.walletTxnId || (obj.transactionId && String(obj.transactionId).startsWith('TXN_'))) {
          pMethod = 'Connect Wallet';
        } else if (obj.razorpayPaymentId || obj.razorpayOrderId) {
          pMethod = 'Online (Razorpay)';
        } else {
          pMethod = 'Connect Wallet';
        }
      } else {
        const lowerM = pMethod.toLowerCase().trim();
        if (lowerM === 'wallet' || lowerM === 'connect wallet') pMethod = 'Connect Wallet';
        else if (lowerM === 'cod' || lowerM === 'cash on delivery') pMethod = 'Cash on Delivery';
        else if (lowerM === 'upi') pMethod = 'UPI';
        else if (lowerM === 'card') pMethod = 'Card';
        else if (lowerM === 'netbanking' || lowerM === 'net banking') pMethod = 'Net Banking';
        else if (lowerM === 'razorpay' || lowerM === 'online') pMethod = 'Online (Razorpay)';
      }

      if (!pStatus || pStatus === 'N/A') {
        if (isCodOrder) {
          pStatus = ['Delivered', 'Completed'].includes(obj.status) ? 'Paid' : 'Pending';
        } else {
          pStatus = 'Paid';
        }
      } else if (isCodOrder && ['Delivered', 'Completed'].includes(obj.status)) {
        pStatus = 'Paid';
      }

      // Cross-reference genuine payment from payments collection
      const matchedPayment = customerLookup.paymentsByOrderId ? customerLookup.paymentsByOrderId[String(obj._id)] : null;
      if (matchedPayment) {
        if (matchedPayment.transactionReference || matchedPayment.paymentId) {
          obj.transactionId = matchedPayment.transactionReference || matchedPayment.paymentId;
        }
        if (matchedPayment.paymentDate) {
          obj.paidAt = matchedPayment.paymentDate;
        }
        if (matchedPayment.status === 'PAID') {
          pStatus = 'Paid';
        }
      }

      obj.paymentMethod = pMethod;
      obj.payment_method = pMethod;
      obj.paymentStatus = pStatus;
      obj.payment_status = pStatus;

      if (!obj.transactionId) {
        if (!isCodOrder) {
          obj.transactionId = obj.razorpayPaymentId || obj.walletTxnId || null;
        } else {
          obj.transactionId = null;
        }
      }
      if (!obj.paidAt && pStatus === 'Paid') {
        obj.paidAt = obj.paymentDate || obj.created_at || obj.createdAt || new Date();
      }

      return obj;
    });

    res.status(200).json({
      success: true,
      data: normalizedOrders,
      total: total || normalizedOrders.length,
      page: page || 1,
      totalPages: limit ? Math.ceil((total || normalizedOrders.length) / limit) : 1
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving orders' });
  }
};

// --- BOOKINGS (Stay / Services / Appointments / Travel) ---
// @desc    Get all bookings and reservations of the vendor
// @route   GET /api/vendor/bookings
// @access  Private (Vendor)
const getBookings = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    // Category guard: Only vendors with Services, Stay, or Travel can retrieve bookings
    if (!vendorHasBookingCategories(user)) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }

    const businessIds = [
      parentUserId.toString(),
      ...(user._id ? [user._id.toString()] : []),
      ...(user.vendorId ? [user.vendorId.toString()] : []),
      ...(user.registrationId ? [user.registrationId.toString()] : [])
    ];
    if (user.businesses && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
        if (b.id) businessIds.push(b.id.toString());
        if (b.vendorId) businessIds.push(b.vendorId.toString());
        if (b.businessId) businessIds.push(b.businessId.toString());
      });
    }
    const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))];

    // Query strictly for bookings and reservation types, excluding orders and jobs
    const baseQuery = {
      $and: [
        {
          $or: [
            { vendorId: { $in: uniqueBusinessIds } },
            { vendor_id: { $in: uniqueBusinessIds } }
          ]
        },
        {
          $or: [
            { type: { $in: BOOKING_BASED_TYPES } },
            { category: { $in: BOOKING_BASED_TYPES } },
            { 'items.category': { $in: BOOKING_BASED_TYPES } },
            { 'items.mainCategory': { $in: ['Services', 'services', 'Stay', 'stay', 'Travel', 'travel'] } },
            { doctorName: { $exists: true, $ne: null } },
            { serviceName: { $exists: true, $ne: null } },
            { checkInDate: { $exists: true, $ne: null } },
            { roomNumber: { $exists: true, $ne: null } },
            { vehicleType: { $exists: true, $ne: null } }
          ]
        },
        {
          type: { $nin: [...ORDER_BASED_TYPES.filter(t => !BOOKING_BASED_TYPES.includes(t)), ...APPLICATION_BASED_TYPES] }
        }
      ]
    };

    // Support category filter for bookings
    if (req.query.category && !['All', 'all'].includes(String(req.query.category).trim())) {
      const allowedTypes = mapCategoryToTypes(req.query.category);
      const catRegex = new RegExp(allowedTypes.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
      const isStayFilter = ['stay', 'hotel', 'hotels', 'room', 'rooms'].includes(String(req.query.category).trim().toLowerCase());
      const isServicesFilter = ['services', 'service', 'appointment', 'hospital', 'technician'].includes(String(req.query.category).trim().toLowerCase());
      const isTravelFilter = ['travel', 'travels', 'package', 'transport'].includes(String(req.query.category).trim().toLowerCase());

      baseQuery.$and.push({
        $or: [
          { type: { $in: allowedTypes } },
          { category: { $in: allowedTypes } },
          { type: catRegex },
          { category: catRegex },
          { 'items.mainCategory': catRegex },
          ...(isStayFilter ? [
            { checkInDate: { $exists: true, $ne: null } },
            { roomNumber: { $exists: true, $ne: null } },
            { 'items.category': { $in: ['Stay', 'Hotels', 'Resorts', 'Hotel', 'Resort', 'Rooms'] } }
          ] : []),
          ...(isServicesFilter ? [
            { type: { $in: ['Services', 'services', 'Service', 'service', 'Appointment', 'appointment', 'Booking', 'booking'] } },
            { category: { $in: ['Services', 'services', 'Service', 'service'] } },
            { doctorName: { $exists: true, $ne: null } },
            { serviceName: { $exists: true, $ne: null } },
            { 'items.category': { $in: ['Services', 'IT & Device Support', 'Ac Service', 'Hospital', 'Technician', 'Service', 'services', 'service'] } },
            { 'items.mainCategory': { $in: ['Services', 'services', 'Service', 'service'] } },
            { 'items.name': new RegExp('service|consultation|repair|appointment|support', 'i') },
            { product_details: new RegExp('service|consultation|repair|appointment|support', 'i') }
          ] : []),
          ...(isTravelFilter ? [
            { vehicleType: { $exists: true, $ne: null } },
            { 'items.category': { $in: ['Travel', 'Travels', 'Bus', 'Car', 'Bike'] } }
          ] : [])
        ]
      });
    }

    // Support search
    if (req.query.search) {
      const sRegex = new RegExp(String(req.query.search).trim(), 'i');
      baseQuery.$and.push({
        $or: [
          { order_number: sRegex },
          { memberName: sRegex },
          { customer_name: sRegex },
          { doctorName: sRegex },
          { serviceName: sRegex }
        ]
      });
    }

    // Support status filter
    if (req.query.status && req.query.status !== 'All') {
      baseQuery.$and.push({ status: req.query.status });
    }

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let query = Order.find(baseQuery).sort({ createdAt: -1 }).lean();

    let total = 0;
    if (!isNaN(page) && !isNaN(limit) && limit > 0) {
      total = await Order.countDocuments(baseQuery);
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const bookings = await query;

// Robust Date Formatter preserving exact calendar date as DD MMM YYYY (e.g. 15 Oct 2026)
const formatDisplayDate = (val) => {
  if (!val || val === 'Not provided' || val === 'N/A') return 'Not provided';
  if (typeof val === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(val.trim())) {
    return val.trim();
  }
  const cleanStr = String(val).replace(/^[A-Za-z]{3},\s*/, '').trim();
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const [y, m, day] = cleanStr.substring(0, 10).split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(cleanStr);
  }
  if (!d || isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Pure calendar-date night difference helper (Check-out date − Check-in date)
const calculateCalendarNights = (inVal, outVal) => {
  if (!inVal || !outVal || inVal === 'Not provided' || outVal === 'Not provided') return null;
  const parseToDate = (v) => {
    if (!v) return null;
    const s = String(v).replace(/^[A-Za-z]{3},\s*/, '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.substring(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(s);
    return (!isNaN(d.getTime())) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
  };
  const dIn = parseToDate(inVal);
  const dOut = parseToDate(outVal);
  if (!dIn || !dOut) return null;
  const diffDays = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
};

// Helper to enrich a booking with real-time customer, stay, guest, and property details
const enrichBookingWithDetails = (b, user, customerLookup = {}, productMap = {}, membershipMap = {}) => {
  const obj = b.toObject ? b.toObject() : { ...b };
  if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
  if (!obj.memberName && obj.customer_name) obj.memberName = obj.customer_name;
  if (!obj.memberId && obj.customer_id) obj.memberId = obj.customer_id;
  if (obj.finalAmount === undefined && obj.amount !== undefined) obj.finalAmount = obj.amount;
  if (obj.totalAmount === undefined && obj.amount !== undefined) obj.totalAmount = obj.amount;

  const effectiveDate = obj.createdAt || obj.created_at || obj.orderDate || obj.date;
  if (effectiveDate) {
    if (!obj.createdAt) obj.createdAt = effectiveDate;
    if (!obj.created_at) obj.created_at = effectiveDate;
  }

  // Canonical Customer ID resolution
  const isCanonicalCustId = (id) => {
    if (!id) return false;
    const str = String(id).trim();
    return (str.startsWith('FIC-CUS-') || str.startsWith('FIC-CUST-')) && str !== 'FIC-CUST-100001';
  };

  let resolvedCustomerId = null;
  if (isCanonicalCustId(obj.customerId)) {
    resolvedCustomerId = String(obj.customerId).trim();
  } else if (isCanonicalCustId(obj.customerDisplayId)) {
    resolvedCustomerId = String(obj.customerDisplayId).trim();
  } else if (isCanonicalCustId(obj.memberId)) {
    resolvedCustomerId = String(obj.memberId).trim();
  }

  const oPhone = (obj.customer_phone || obj.phone || '').toString().replace(/[^0-9]/g, '');
  const oEmail = (obj.customer_email || (obj.memberId && String(obj.memberId).includes('@') ? obj.memberId : '') || '').trim().toLowerCase();
  const oName = (obj.memberName || obj.customer_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  let matchedCustomer = null;
  if (customerLookup && customerLookup.entitiesById) {
    matchedCustomer = (obj.memberId && customerLookup.entitiesById[String(obj.memberId)]) ||
                      (obj.customer_id && customerLookup.entitiesById[String(obj.customer_id)]) ||
                      (obj.customerId && customerLookup.entitiesById[String(obj.customerId)]) ||
                      (oPhone && oPhone.length >= 10 && customerLookup.entitiesByPhone[oPhone.slice(-10)]) ||
                      (oEmail && customerLookup.entitiesByEmail[oEmail]) ||
                      (oName && customerLookup.entitiesByName[oName]) || null;
  }

  if (!resolvedCustomerId && matchedCustomer) {
    const mId = matchedCustomer.customerId || matchedCustomer.registrationId || matchedCustomer.customerDisplayId || (isCanonicalCustId(matchedCustomer._id) ? String(matchedCustomer._id) : null);
    if (isCanonicalCustId(mId)) resolvedCustomerId = String(mId).trim();
  }
  if (!resolvedCustomerId && customerLookup && customerLookup.byOrderId && isCanonicalCustId(customerLookup.byOrderId[String(obj._id)])) {
    resolvedCustomerId = String(customerLookup.byOrderId[String(obj._id)]).trim();
  }
  if (!resolvedCustomerId) {
    resolvedCustomerId = 'N/A';
  }

  obj.customerId = resolvedCustomerId;
  obj.customerDisplayId = resolvedCustomerId;

  if (obj.memberId && membershipMap[obj.memberId.toString()]) {
    obj.membershipPlanName = membershipMap[obj.memberId.toString()];
  }

  // Guest details & list (must be defined before bookingHolder for gender/age extraction)
  let rawGuestList = [];
  if (Array.isArray(obj.guestList) && obj.guestList.length > 0) {
    rawGuestList = obj.guestList;
  } else if (Array.isArray(obj.guestDetails) && obj.guestDetails.length > 0) {
    rawGuestList = obj.guestDetails;
  } else if (Array.isArray(obj.guestsInfo) && obj.guestsInfo.length > 0) {
    rawGuestList = obj.guestsInfo;
  }

  // Booking Holder / Primary Customer Details
  let customerAddress = obj.customer_address || obj.deliveryAddress || obj.shippingAddress;
  if (!customerAddress || customerAddress === 'N/A' || customerAddress === 'Bangalore Center') {
    if (matchedCustomer?.address) {
      customerAddress = matchedCustomer.address;
    } else {
      customerAddress = 'Not provided';
    }
  }
  customerAddress = deduplicateAddressSegments(customerAddress);

  obj.bookingHolder = {
    name: matchedCustomer?.name || obj.memberName || obj.customer_name || 'Customer',
    customerId: resolvedCustomerId,
    phone: matchedCustomer?.phone || obj.customer_phone || obj.phone || 'Not provided',
    email: matchedCustomer?.email || obj.customer_email || 'Not provided',
    address: customerAddress,
    aadhaar: matchedCustomer?.aadhaar || obj.aadhaar || null,
    pan: matchedCustomer?.pan || obj.pan || null,
    gender: matchedCustomer?.gender || obj.gender || obj.customer_gender || (rawGuestList[0]?.gender) || null,
    age: matchedCustomer?.age || obj.age || obj.customer_age || (rawGuestList[0]?.age) || null,
    role: matchedCustomer?.role || 'customer'
  };
  obj.customerDetails = obj.bookingHolder;

  // Pre-fetch product details to aid accurate categorization
  const firstItem = (obj.items && obj.items[0]) || {};
  const targetProdId = firstItem.productId || obj.productId;
  const matchedProd = targetProdId && productMap ? productMap[String(targetProdId)] : null;

  // Determine true business category for the booking
  const rawType = String(obj.type || '').trim().toLowerCase();
  const rawCat = String(obj.category || '').trim().toLowerCase();
  const prodMainCat = String(matchedProd?.mainCategory || firstItem?.mainCategory || '').trim().toLowerCase();
  const prodSubNavCat = String(matchedProd?.subNavbarCategory || firstItem?.subNavbarCategory || '').trim().toLowerCase();
  const prodCat = String(matchedProd?.category || firstItem?.category || '').trim().toLowerCase();
  const prodName = String(matchedProd?.name || firstItem?.name || '').trim().toLowerCase();
  const rawSubCat = String(obj.subcategory || obj.subCategory || matchedProd?.subcategory || firstItem?.subcategory || '').trim().toLowerCase();
  const detailStr = String(obj.product_details || firstItem?.name || '').toLowerCase();

  const isTravelTerm = (str) => {
    if (!str) return false;
    const s = String(str).trim().toLowerCase();
    if (['travel', 'travels', 'package', 'packages', 'bus', 'vehicle', 'cab', 'car', 'bike', 'transport', 'flight', 'train', 'taxi'].includes(s)) {
      return true;
    }
    return /\b(ac\s*car|non\s*ac\s*car|car|ac\s*bus|non\s*ac\s*bus|bus|bike|superbike|mini\s*superbike|tempo|van|taxi|cab|flight|train|transport|travel|travels)\b/i.test(s);
  };

  // 1. Explicit Services Check
  const isServices = ['services', 'service'].includes(prodMainCat) ||
                     ['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawType) ||
                     ['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawCat) ||
                     ['it & device support', 'ac service', 'laptop repairs', 'cctv installation', 'pc repairs', 'full clean', 'cleaning', 'electrician', 'plumber', 'hospital', 'technician', 'healthcare'].includes(prodCat) ||
                     ['it & device support', 'ac service', 'laptop repairs', 'cctv installation', 'pc repairs', 'full clean', 'cleaning', 'electrician', 'plumber', 'hospital', 'technician', 'healthcare'].includes(rawSubCat) ||
                     Boolean(obj.doctorName || obj.patientName || obj.serviceName) ||
                     /\b(service|services|repair|repairs|cctv|support|consultation|doctor|technician|clinic|hospital)\b/i.test(detailStr) ||
                     /\b(service|services|repair|repairs|cctv|support|consultation|doctor|technician)\b/i.test(prodName);

  // 2. Explicit Stay Check
  const isStay = !isServices && (
    ['stay', 'hotel', 'hotels', 'resort', 'resorts'].includes(prodMainCat) ||
    ['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawType) ||
    ['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawCat) ||
    ['hotels', 'resorts', 'rooms', 'luxury', 'hill station', 'cottages', 'villas', 'resort', 'hotel', 'homestay', 'pg', 'stay'].includes(prodCat) ||
    ['hotels', 'resorts', 'rooms', 'luxury', 'hill station', 'cottages', 'villas', 'resort', 'hotel', 'homestay', 'pg', 'stay'].includes(rawSubCat) ||
    Boolean(obj.roomNumber || obj.roomName || obj.staySchedule || (obj.checkInDate && !obj.boardingPoint && !obj.vehicleType)) ||
    /\b(room|rooms|hotel|hotels|resort|resorts|suite|villa|cottage|homestay|lodge|pg)\b/i.test(detailStr) ||
    /\b(room|rooms|hotel|hotels|resort|resorts|suite|villa|cottage|homestay|lodge|pg)\b/i.test(prodName)
  );

  // Resolve business by ID or matching category to prevent business name mismatch
  let currentBiz = null;
  if (user?.businesses && user.businesses.length > 0) {
    if (obj.vendorId || obj.vendor_id) {
      currentBiz = user.businesses.find(biz => String(biz._id || biz.id) === String(obj.vendorId || obj.vendor_id));
    }
    if (!currentBiz && isStay) {
      currentBiz = user.businesses.find(biz => {
        const t = (biz.vendorType || biz.category || '').toLowerCase();
        return t.includes('stay') || t.includes('hotel');
      });
    }
    if (!currentBiz && isServices) {
      currentBiz = user.businesses.find(biz => {
        const t = (biz.vendorType || biz.category || '').toLowerCase();
        return t.includes('service') || t.includes('hospital');
      });
    }
  }

  // Validate 13-digit property ID; never expose 24-character internal MongoDB ObjectIds
  const candidatePropId = String(
    obj.propertyId ||
    currentBiz?.propertyId ||
    currentBiz?.documents?.property_id?.number ||
    ''
  ).trim();
  const validPropertyId = /^\d{13}$/.test(candidatePropId) ? candidatePropId : 'Not provided';

  const resolvedBizName = currentBiz?.businessName || (isStay ? 'Enjoy Hotel' : (user?.businessName || user?.name || 'Business'));

  obj.propertyDetails = {
    propertyName: obj.propertyName || obj.hotelName || resolvedBizName,
    propertyId: validPropertyId,
    address: currentBiz?.address || user?.address || 'Not provided',
    location: currentBiz?.city || user?.city || 'Not provided',
    contactPhone: currentBiz?.phone || user?.phone || 'Not provided',
    contactEmail: user?.email || 'Not provided'
  };

  // 3. Genuine Travel Check
  const isTravel = !isServices && !isStay && (
    ['travel', 'travels'].includes(prodMainCat) ||
    ['travel', 'travels', 'package', 'packages', 'transport'].includes(rawType) ||
    ['travel', 'travels', 'package', 'packages', 'transport'].includes(rawCat) ||
    ['car', 'bus', 'bike', 'mini superbikes', 'ac car', 'non ac car', 'ac bus', 'non ac bus', 'superbikes', 'travel', 'travels', 'package'].includes(prodCat) ||
    ['car', 'bus', 'bike', 'mini superbikes', 'ac car', 'non ac car', 'ac bus', 'non ac bus', 'superbikes', 'travel', 'travels', 'package'].includes(rawSubCat) ||
    Boolean(obj.vehicleNumber || obj.vehicleType || (obj.boardingPoint && obj.droppingPoint) || obj.busName || obj.carName || obj.bikeName) ||
    isTravelTerm(detailStr) ||
    isTravelTerm(prodName)
  );

  // 4. Job Applications Check
  const isJob = !isServices && !isStay && !isTravel && (
    ['job', 'jobs', 'application', 'job_application'].includes(rawType) || 
    ['job', 'jobs', 'application', 'job_application'].includes(rawCat) ||
    Boolean(obj.candidateResume || (obj.applicationId && String(obj.applicationId).startsWith('APP')))
  );

  // 5. Food Orders Check
  const isFood = !isServices && !isStay && !isTravel && !isJob && (
    ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawType) ||
    ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawCat) ||
    ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(prodMainCat) ||
    /food|restaurant|biryani|chicken|pizza|burger|meal|dish/i.test(detailStr)
  );

  if (isServices) {
    obj.category = 'Services';
    obj.type = 'Services';
  } else if (isStay) {
    obj.category = 'Stay';
    obj.type = 'Stay';
  } else if (isTravel) {
    obj.category = 'Travel';
    obj.type = 'Travel';
  } else if (isJob) {
    obj.category = 'Jobs';
    obj.type = 'Job';
  } else if (isFood) {
    obj.category = 'Food';
    obj.type = 'Food';
  } else {
    obj.category = obj.category || obj.type || 'Unknown';
    obj.type = obj.type || obj.category || 'Unknown';
  }

  // Ensure non-job records never keep stray job application fields
  if (!isJob) {
    delete obj.jobTitle;
    delete obj.candidateResume;
    delete obj.candidateEmail;
    delete obj.candidateEducation;
    delete obj.candidateName;
    delete obj.candidatePhone;
    delete obj.candidateAddress;
    delete obj.candidateLocation;
    delete obj.jobLocation;
    delete obj.experience;
    delete obj.applicationId;
    delete obj.applicationDate;
    delete obj.jobId;
  }

  // Deduplicate address on booking holder if present
  if (obj.bookingHolder && obj.bookingHolder.address) {
    obj.bookingHolder.address = deduplicateAddressSegments(obj.bookingHolder.address);
  }
  if (obj.customerDetails && obj.customerDetails.address) {
    obj.customerDetails.address = deduplicateAddressSegments(obj.customerDetails.address);
  }

  if (isStay) {
    // Schedule & Timing (Check-in & Check-out)
    const rawCheckInDate = obj.checkInDate || obj.check_in_date || obj.checkinDate || (obj.staySchedule && obj.staySchedule.checkInDate) || firstItem.checkInDate || firstItem.check_in_date || obj.appointmentDate;
    let checkInDate = formatDisplayDate(rawCheckInDate);
    let checkInTime = obj.checkInTime || obj.check_in_time || obj.checkinTime || (obj.staySchedule && obj.staySchedule.checkInTime) || firstItem.checkInTime || '';

    // Exhaustive resolution of stored check-out date from all possible fields
    const rawCheckOutDate = obj.checkOutDate || obj.check_out_date || obj.checkoutDate || obj.checkOut || obj.checkout || obj.departureDate || obj.departure_date || obj.toDate || obj.endDate || (obj.dates && (obj.dates.checkOut || obj.dates.checkOutDate)) || (obj.roomDetails && obj.roomDetails.checkOutDate) || (obj.staySchedule && (obj.staySchedule.checkOutDate || obj.staySchedule.scheduledCheckOutDate)) || firstItem.checkOutDate || firstItem.check_out_date || firstItem.checkoutDate || firstItem.departureDate || firstItem.toDate || firstItem.endDate || '';
    let checkOutDate = rawCheckOutDate ? formatDisplayDate(rawCheckOutDate) : '';
    let checkOutTime = obj.checkOutTime || obj.check_out_time || obj.checkoutTime || obj.departureTime || (obj.staySchedule && obj.staySchedule.checkOutTime) || firstItem.checkOutTime || '';

    // Parse time range if appointmentTimeSlot has "02:00 PM - 06:00 PM"
    if ((!checkInTime || !checkOutTime) && obj.appointmentTimeSlot && obj.appointmentTimeSlot.includes('-')) {
      const parts = obj.appointmentTimeSlot.split('-').map(s => s.trim());
      if (!checkInTime && parts[0]) checkInTime = parts[0];
      if (!checkOutTime && parts[1]) checkOutTime = parts[1];
    }
    if (!checkInTime) checkInTime = '12:00 PM';
    if (!checkOutTime) checkOutTime = '11:00 AM';

    // Compute calendar nights from check-in and check-out dates
    let calNights = calculateCalendarNights(checkInDate, checkOutDate);

    // Only derive check-out date if completely missing from booking data AND an explicit nightsCount > 0 was provided
    if (!checkOutDate && checkInDate && checkInDate !== 'Not provided') {
      const explicitNights = obj.nightsCount || obj.nights || obj.numberOfNights || (obj.roomDetails && obj.roomDetails.nightsCount) || firstItem.nightsCount;
      if (explicitNights && Number(explicitNights) > 0) {
        const nights = Number(explicitNights);
        const cleanDateStr = String(checkInDate).replace(/^[A-Za-z]+,\s*/, '').trim();
        let parsedDate = null;
        if (/^\d{4}-\d{2}-\d{2}/.test(cleanDateStr)) {
          const [y, m, d] = cleanDateStr.substring(0, 10).split('-').map(Number);
          parsedDate = new Date(y, m - 1, d);
        } else {
          parsedDate = new Date(cleanDateStr);
        }
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const outD = new Date(parsedDate);
          outD.setDate(outD.getDate() + nights);
          checkOutDate = formatDisplayDate(outD);
          calNights = nights;
        }
      } else {
        checkOutDate = 'Not provided';
      }
    }

    const explicitRooms = obj.roomsCount || obj.roomCount || obj.numberOfRooms || firstItem.quantity;
    const finalRoomsCount = (explicitRooms && Number(explicitRooms) > 0) ? Number(explicitRooms) : null;
    const explicitNights = obj.nightsCount || obj.nights || obj.numberOfNights || (obj.roomDetails && obj.roomDetails.nightsCount) || firstItem.nightsCount;
    const finalNightsCount = (calNights !== null && calNights > 0) ? calNights : ((explicitNights && Number(explicitNights) > 0) ? Number(explicitNights) : null);

    obj.roomDetails = {
      name: matchedProd?.name || firstItem.name || obj.roomName || obj.product_details || 'Deluxe Room',
      type: matchedProd?.subcategory || matchedProd?.category || obj.roomType || firstItem.subcategory || 'Deluxe Room',
      category: matchedProd?.subcategory || obj.roomCategory || obj.subcategory || 'Stay',
      id: String(matchedProd?._id || targetProdId || 'Not provided'),
      roomNumber: obj.roomNumber || matchedProd?.roomNumber || 'Not assigned',
      roomsCount: finalRoomsCount,
      nightsCount: finalNightsCount,
      price: Number(matchedProd?.price || firstItem.price || obj.amount || 0)
    };
    obj.roomsCount = finalRoomsCount;
    obj.nightsCount = finalNightsCount;

    obj.staySchedule = {
      checkInDate: checkInDate || 'Not provided',
      checkInTime: checkInTime || 'Not provided',
      checkOutDate: checkOutDate || 'Not provided',
      checkOutTime: checkOutTime || 'Not provided',
      scheduledCheckInDate: checkInDate || 'Not provided',
      scheduledCheckInTime: checkInTime || 'Not provided',
      scheduledCheckOutDate: checkOutDate || 'Not provided',
      scheduledCheckOutTime: checkOutTime || 'Not provided',
      actualCheckIn: obj.actualCheckIn || null,
      actualCheckInDate: obj.actualCheckInDate || null,
      actualCheckInTime: obj.actualCheckInTime || null,
      actualCheckOut: obj.actualCheckOut || null,
      actualCheckOutDate: obj.actualCheckOutDate || null,
      actualCheckOutTime: obj.actualCheckOutTime || null
    };

    obj.checkInDate = obj.staySchedule.checkInDate;
    obj.checkInTime = obj.staySchedule.checkInTime;
    obj.checkOutDate = obj.staySchedule.checkOutDate;
    obj.checkOutTime = obj.staySchedule.checkOutTime;
  } else {
    // Explicitly ensure non-stay bookings do NOT have misleading staySchedule or room details
    delete obj.staySchedule;
    delete obj.roomDetails;
  }

  // Travel specific schedule and vehicle details
  if (isTravel) {
    const travelDateVal = obj.travelDate || obj.travel_date || obj.journeyDate || obj.departureDate || 'Not provided';
    const departureTimeVal = obj.departureTime || obj.time || obj.bookingTime || obj.schedule || 'Not provided';
    obj.travelDate = travelDateVal;
    obj.departureTime = departureTimeVal;

    let resolvedVehicleType = 'Vehicle';
    if (/non\s*ac\s*car/i.test(detailStr) || /non\s*ac\s*car/i.test(prodName)) resolvedVehicleType = 'Non-AC Car';
    else if (/ac\s*car/i.test(detailStr) || /ac\s*car/i.test(prodName)) resolvedVehicleType = 'AC Car';
    else if (/car/i.test(detailStr) || /car/i.test(prodCat) || /car/i.test(rawCat) || /car/i.test(rawSubCat) || /car/i.test(prodName)) resolvedVehicleType = 'Car';
    else if (/non\s*ac\s*bus/i.test(detailStr) || /non\s*ac\s*bus/i.test(prodName)) resolvedVehicleType = 'Non-AC Bus';
    else if (/ac\s*bus/i.test(detailStr) || /ac\s*bus/i.test(prodName)) resolvedVehicleType = 'AC Bus';
    else if (/bus/i.test(detailStr) || /bus/i.test(prodCat) || /bus/i.test(rawCat) || /bus/i.test(rawSubCat) || /bus/i.test(prodName)) resolvedVehicleType = 'Bus';
    else if (/bike/i.test(detailStr) || /bike/i.test(prodCat) || /bike/i.test(rawCat) || /bike/i.test(rawSubCat) || /bike/i.test(prodName)) resolvedVehicleType = 'Bike';

    obj.vehicleType = obj.vehicleType || resolvedVehicleType;
    obj.vehicleDetails = {
      travelType: obj.travelType || obj.vehicleDetails?.travelType || resolvedVehicleType,
      vehicleType: obj.vehicleType || resolvedVehicleType,
      vehicleNumber: obj.vehicleNumber || obj.vehicleDetails?.vehicleNumber || null,
      numberOfVehicles: obj.numberOfVehicles || obj.vehicleDetails?.numberOfVehicles || 1,
      pickupDropInfo: obj.pickupDropInfo || obj.boardingPoint || obj.droppingPoint || null,
      boardingPoint: obj.boardingPoint || obj.from || obj.source || obj.vehicleDetails?.boardingPoint || null,
      droppingPoint: obj.droppingPoint || obj.to || obj.destination || obj.vehicleDetails?.droppingPoint || null
    };
  } else {
    // Explicitly clean up travel-specific attributes from non-travel bookings
    delete obj.travelDate;
    delete obj.departureTime;
    delete obj.vehicleType;
    delete obj.vehicleDetails;
    delete obj.busName;
    delete obj.carName;
    delete obj.bikeName;
    delete obj.travelType;
  }

  // Services specific details
  if (isServices) {
    obj.appointmentDate = obj.appointmentDate || obj.date || obj.bookingDate || 'Not provided';
    obj.appointmentTimeSlot = obj.appointmentTimeSlot || obj.time || 'Standard Slot';
    obj.serviceName = obj.serviceName || (obj.doctorName ? `Dr. ${obj.doctorName} Consultation` : null) || obj.product_details || firstItem.name || obj.name || obj.title || 'General Service';
  }

  // Guest details & list (already resolved above)
  const adults = obj.adults !== undefined ? Number(obj.adults) : (obj.adultsCount !== undefined ? Number(obj.adultsCount) : (rawGuestList.length > 0 ? rawGuestList.length : 1));
  const children = obj.children !== undefined ? Number(obj.children) : (obj.childrenCount !== undefined ? Number(obj.childrenCount) : 0);
  const infants = obj.infants !== undefined ? Number(obj.infants) : (obj.infantsCount !== undefined ? Number(obj.infantsCount) : 0);
  const totalGuests = Number(obj.guests || obj.numberOfGuests || obj.guestCount || (adults + children + infants) || (rawGuestList.length > 0 ? rawGuestList.length : 1));

  obj.adults = adults;
  obj.children = children;
  obj.infants = infants;
  obj.totalGuests = totalGuests;

  // Build resolved guest list ensuring Guest 1 is primary booking holder
  const formattedGuests = [];
  if (rawGuestList.length > 0) {
    rawGuestList.forEach((g, idx) => {
      formattedGuests.push({
        guestNumber: idx + 1,
        isPrimary: idx === 0,
        fullName: g.fullName || g.name || (idx === 0 ? obj.bookingHolder.name : `Guest ${idx + 1}`),
        age: g.age || (idx === 0 ? (obj.bookingHolder.age || obj.age || null) : null),
        gender: g.gender || (idx === 0 ? (obj.bookingHolder.gender || obj.gender || null) : null),
        phoneNumber: g.phoneNumber || g.phone || (idx === 0 ? obj.bookingHolder.phone : null),
        email: g.email || (idx === 0 ? obj.bookingHolder.email : null),
        aadhaarNumber: g.aadhaarNumber || g.aadhaar || (idx === 0 ? obj.bookingHolder.aadhaar : null),
        panNumber: g.panNumber || g.pan || (idx === 0 ? obj.bookingHolder.pan : null),
        idType: g.idType || (g.aadhaarNumber || (idx === 0 && obj.bookingHolder.aadhaar) ? 'Aadhaar' : (g.panNumber || (idx === 0 && obj.bookingHolder.pan) ? 'PAN' : null)),
        idNumber: g.idNumber || g.aadhaarNumber || g.panNumber || (idx === 0 ? (obj.bookingHolder.aadhaar || obj.bookingHolder.pan) : null),
        idVerificationStatus: g.idVerificationStatus || 'Verified',
        address: g.address || (idx === 0 ? obj.bookingHolder.address : null)
      });
    });
  } else {
    formattedGuests.push({
      guestNumber: 1,
      isPrimary: true,
      fullName: obj.bookingHolder.name,
      age: obj.bookingHolder.age || obj.age || null,
      gender: obj.bookingHolder.gender || obj.gender || null,
      phoneNumber: obj.bookingHolder.phone,
      email: obj.bookingHolder.email,
      aadhaarNumber: obj.bookingHolder.aadhaar,
      panNumber: obj.bookingHolder.pan,
      idType: obj.bookingHolder.aadhaar ? 'Aadhaar' : (obj.bookingHolder.pan ? 'PAN' : null),
      idNumber: obj.bookingHolder.aadhaar || obj.bookingHolder.pan || null,
      idVerificationStatus: 'Verified',
      address: obj.bookingHolder.address
    });
  }

  obj.guestList = formattedGuests;
  obj.resolvedGuestList = formattedGuests;

  // Status mapping for Bookings: Replace generic "Order Received" with legitimate booking status
  const isPaid = (obj.paymentStatus === 'Paid' || obj.payment_status === 'Paid');
  if (obj.status === 'Order Received' || !obj.status || obj.status === 'Pending') {
    if (isStay || isTravel || isServices) {
      obj.status = isPaid ? 'Confirmed' : 'Pending';
    } else {
      obj.status = 'Booking Received';
    }
  }

  // Status history
  if (!Array.isArray(obj.statusHistory) || obj.statusHistory.length === 0) {
    obj.statusHistory = [
      {
        status: 'Booking Created',
        timestamp: obj.createdAt || new Date().toISOString(),
        updatedBy: 'Customer / Booking System',
        notes: `Booking initiated for ${isStay ? (obj.roomDetails?.name || 'Stay') : isTravel ? (obj.vehicleDetails?.vehicleType || 'Travel') : (obj.product_details || 'Service')}`
      }
    ];
    if (obj.status && obj.status !== 'Pending') {
      obj.statusHistory.push({
        status: obj.status,
        timestamp: obj.updatedAt || obj.createdAt || new Date().toISOString(),
        updatedBy: 'System / Vendor',
        notes: `Booking status is currently ${obj.status}`
      });
    }
  }

  normalizeAddressStateForOrder(obj);
  return obj;
};

    // Fast targeted lookups for only the retrieved bookings
    const memberIds = [...new Set(bookings.map(o => o.memberId || o.customer_id).filter(Boolean))];
    const prodIds = [...new Set(bookings.map(o => (o.items && o.items[0]?.productId) || o.productId).filter(Boolean))];

    const [membershipCards, customerLookup, roomProducts] = await Promise.all([
      MembershipCard.find({ userId: { $in: memberIds } }).select('userId planName').lean(),
      buildCustomerLookupForOrders(bookings),
      Product.find({ _id: { $in: prodIds } }).lean()
    ]);

    const membershipMap = {};
    membershipCards.forEach(c => {
      if (c.userId && c.planName) membershipMap[c.userId.toString()] = c.planName;
    });

    const productMap = {};
    roomProducts.forEach(p => {
      productMap[String(p._id)] = p;
      if (p.id) productMap[String(p.id)] = p;
    });

    const normalizedBookings = bookings.map(b => enrichBookingWithDetails(b, user, customerLookup, productMap, membershipMap));

    res.status(200).json({
      success: true,
      data: normalizedBookings,
      total: total || normalizedBookings.length,
      page: page || 1,
      totalPages: limit ? Math.ceil((total || normalizedBookings.length) / limit) : 1
    });
  } catch (error) {
    console.error('Get Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving bookings' });
  }
};

// @route   GET /api/vendor/orders/:id
// @route   GET /api/vendor/bookings/:id
// @desc    Get detailed real-time information for a single booking / order
const getOrderById = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Order / Booking ID is required' });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);
    let order = null;
    if (isValidObjectId) {
      order = await Order.findById(targetId).lean();
    }
    if (!order) {
      order = await Order.findOne({ $or: [{ id: targetId }, { order_number: targetId }, { applicationId: targetId }] }).lean();
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Booking / Order not found' });
    }

    // IDOR Defense: verify order belongs to authenticated vendor's account or businesses
    const businessIds = new Set([
      (req.user.parentUserId || '').toString(),
      (req.user._id || '').toString(),
      (user._id || '').toString(),
      (user.vendorId || '').toString(),
      (user.registrationId || '').toString()
    ]);
    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b && b._id) businessIds.add(b._id.toString());
        if (b && b.id) businessIds.add(b.id.toString());
      });
    }

    const orderVendorId = (order.vendorId || order.vendor_id || '').toString();
    let isAuthorized = businessIds.has(orderVendorId);
    if (!isAuthorized && order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.vendorId && businessIds.has(item.vendorId.toString())) {
          isAuthorized = true;
          break;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(404).json({ success: false, message: 'Booking / Order not found or unauthorized' });
    }

    const customerLookup = await buildCustomerLookupForOrders([order]);

    const prodId = (order.items && order.items[0]?.productId) || order.productId;
    let productMap = {};
    if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
      const prod = await Product.findById(prodId).lean();
      if (prod) {
        productMap[String(prod._id)] = prod;
        if (prod.id) productMap[String(prod.id)] = prod;
      }
    }

    const enriched = enrichBookingWithDetails(order, user, customerLookup, productMap);

    res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Get Order By ID Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving booking details' });
  }
};

// --- APPLICATIONS (Job applications submitted for vendor's vacancies) ---
// @desc    Get all job applications for the vendor's vacancies
// @route   GET /api/vendor/applications
// @access  Private (Vendor)
const getApplications = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    // Category guard: Only vendors with Jobs can retrieve job applications
    if (!vendorHasJobCategories(user)) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }

    // Isolate Job business IDs only (do not leak Travel, Food, Stay business IDs from same vendor)
    const jobBusinessIds = [];
    const isRootJob = vendorHasJobCategories({ vendorType: user.vendorType, category: user.category });
    if (isRootJob) jobBusinessIds.push(parentUserId.toString());
    if (user.businesses && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        const bCat = (b?.vendorType || b?.category || b?.subcategory || b?.name || '').toLowerCase();
        if (bCat.startsWith('job')) {
          if (b._id) jobBusinessIds.push(b._id.toString());
        }
      });
    }
    if (jobBusinessIds.length === 0) jobBusinessIds.push(parentUserId.toString());

    // Find all job postings created by this vendor to strictly guard candidate applications
    const vendorJobs = await Product.find({
      $and: [
        {
          $or: [
            { vendorId: { $in: jobBusinessIds } },
            { vendor_id: { $in: jobBusinessIds } }
          ]
        },
        {
          $or: [
            { type: { $regex: /^job/i } },
            { mainCategory: { $regex: /^job/i } },
            { category: { $regex: /^job/i } }
          ]
        }
      ]
    }).select('_id id name title').lean();

    const vendorJobIds = vendorJobs.map(j => String(j._id || j.id));

    // Base query: strictly applications matching this vendor's vacancies or vendor ID
    // NEVER match general bookings or orders merely because applicationId exists
    const baseQuery = {
      $and: [
        {
          type: { $in: APPLICATION_BASED_TYPES, $nin: [...ORDER_BASED_TYPES, ...BOOKING_BASED_TYPES] }
        },
        {
          category: { $nin: ['Travel', 'travel', 'Food', 'food', 'Stay', 'stay', 'Products', 'products', 'Daily Needs', 'daily needs', 'Services', 'services'] }
        },
        {
          $or: [
            { order_number: { $not: /^BKG|^ORD/i } },
            { type: { $in: ['Job', 'Jobs', 'Job Application', 'application', 'Application'] } }
          ]
        },
        {
          $or: [
            { vendorId: { $in: jobBusinessIds } },
            { vendor_id: { $in: jobBusinessIds } },
            ...(vendorJobIds.length > 0 ? [{ jobId: { $in: vendorJobIds } }, { productId: { $in: vendorJobIds } }] : [])
          ]
        }
      ]
    };

    // Support search
    if (req.query.search) {
      const sRegex = new RegExp(String(req.query.search).trim(), 'i');
      baseQuery.$and.push({
        $or: [
          { applicationId: sRegex },
          { order_number: sRegex },
          { candidateName: sRegex },
          { memberName: sRegex },
          { customer_name: sRegex },
          { candidateEmail: sRegex },
          { candidatePhone: sRegex },
          { jobTitle: sRegex }
        ]
      });
    }

    // Support status filter
    if (req.query.status && req.query.status !== 'All') {
      baseQuery.$and.push({ status: req.query.status });
    }

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let query = Order.find(baseQuery).sort({ applicationDate: -1, createdAt: -1, created_at: -1 }).lean();

    let total = 0;
    if (!isNaN(page) && !isNaN(limit) && limit > 0) {
      total = await Order.countDocuments(baseQuery);
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const applications = await query;
    const customerLookup = await buildCustomerLookupForOrders(applications);

    // Build map of vendor job vacancies and fetch any extra referenced jobs
    const jobVacancyMap = {};
    vendorJobs.forEach(j => {
      jobVacancyMap[String(j._id || j.id)] = j;
    });

    const unmappedJobIds = applications
      .map(a => String(a.jobId || (a.items && a.items[0]?.productId) || a.productId || ''))
      .filter(id => id && !jobVacancyMap[id]);

    if (unmappedJobIds.length > 0) {
      const extraJobs = await Product.find({
        _id: { $in: unmappedJobIds },
        $or: [
          { type: { $regex: /^job/i } },
          { mainCategory: { $regex: /^job/i } },
          { category: { $regex: /^job/i } }
        ]
      }).select('_id id name title').lean();
      extraJobs.forEach(j => {
        jobVacancyMap[String(j._id || j.id)] = j;
      });
    }

    const normalizedApplications = applications.map(app => {
      const obj = app.toObject ? app.toObject() : app;
      if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
      if (!obj.candidateName) obj.candidateName = obj.memberName || obj.customer_name || 'Candidate';
      if (!obj.memberName) obj.memberName = obj.candidateName;
      if (!obj.candidateEmail) obj.candidateEmail = obj.customer_email || '';
      if (!obj.candidatePhone) obj.candidatePhone = obj.customer_phone || obj.phone || '';
      if (!obj.applicationId) obj.applicationId = obj.order_number || obj.id || String(obj._id);
      if (!obj.applicationDate) obj.applicationDate = obj.createdAt || obj.created_at || new Date().toISOString();
      if (!obj.status || obj.status === 'Pending' || obj.status === 'Order Received') {
        obj.status = 'APPLICATION RECEIVED';
      }

      // Resolve real job vacancy title and Job ID
      const targetJobId = String(obj.jobId || (obj.items && obj.items[0]?.productId) || obj.productId || '');
      const matchedJob = jobVacancyMap[targetJobId];
      if (matchedJob) {
        obj.jobTitle = matchedJob.title || matchedJob.name || 'Job details unavailable';
        obj.jobId = String(matchedJob._id || matchedJob.id);
      } else if (obj.jobTitle && !['Car', 'Non Ac Car', 'Dell', 'Mobile Phone', 'Wheat', 'Dove', 'Apex'].some(p => obj.jobTitle.toLowerCase() === p.toLowerCase())) {
        obj.jobId = targetJobId || 'N/A';
      } else {
        obj.jobTitle = 'Job details unavailable';
        obj.jobId = targetJobId || 'N/A';
      }

      let resolvedCustomerId = null;
      if (obj.customerId && String(obj.customerId).startsWith('FIC-CUST-') && obj.customerId !== 'FIC-CUST-100001') {
        resolvedCustomerId = String(obj.customerId);
      } else if (obj.customerDisplayId && String(obj.customerDisplayId).startsWith('FIC-CUST-') && obj.customerDisplayId !== 'FIC-CUST-100001') {
        resolvedCustomerId = String(obj.customerDisplayId);
      } else {
        const oPhone = (obj.candidatePhone || obj.customer_phone || '').toString().replace(/[^0-9]/g, '');
        const oEmail = (obj.candidateEmail || obj.customer_email || '').trim().toLowerCase();
        const oName = (obj.candidateName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (oPhone && oPhone.length >= 10 && customerLookup.byPhone[oPhone.slice(-10)]) {
          resolvedCustomerId = customerLookup.byPhone[oPhone.slice(-10)];
        } else if (oEmail && customerLookup.byEmail[oEmail]) {
          resolvedCustomerId = customerLookup.byEmail[oEmail];
        } else if (oName && customerLookup.byName[oName]) {
          resolvedCustomerId = customerLookup.byName[oName];
        }
      }
      obj.customerId = resolvedCustomerId || (obj.memberId && !obj.memberId.startsWith('FIC-CUST-100001') ? obj.memberId : 'N/A');
      obj.customerDisplayId = obj.customerId;

      return obj;
    });

    res.status(200).json({
      success: true,
      data: normalizedApplications,
      total: total || normalizedApplications.length,
      page: page || 1,
      totalPages: limit ? Math.ceil((total || normalizedApplications.length) / limit) : 1
    });
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving applications' });
  }
};

// @desc    Update order / booking / appointment status
// @route   PUT /api/vendor/orders/:id/status
// @access  Private (Vendor)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryPartnerId } = req.body;
    const targetId = req.params.id;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);

    let order = null;
    if (isValidObjectId) {
      try {
        order = await Order.findById(new mongoose.Types.ObjectId(targetId)) || await Order.findById(targetId);
      } catch (e) {
        order = null;
      }
    }

    if (!order) {
      const orConditions = [
        { id: targetId },
        { order_number: targetId },
        { applicationId: targetId }
      ];
      if (isValidObjectId) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(targetId) });
        orConditions.push({ _id: targetId });
      }
      try {
        order = await Order.findOne({ $or: orConditions });
      } catch (e) {
        order = null;
      }
    }

    // Direct MongoDB native collection fallback for complete resilience
    if (!order) {
      try {
        const rawDoc = await mongoose.connection.db.collection('orders').findOne(
          isValidObjectId
            ? { $or: [{ _id: new mongoose.Types.ObjectId(targetId) }, { _id: targetId }, { id: targetId }, { order_number: targetId }, { applicationId: targetId }] }
            : { $or: [{ _id: targetId }, { id: targetId }, { order_number: targetId }, { applicationId: targetId }] }
        );
        if (rawDoc) {
          order = Order.hydrate(rawDoc);
        }
      } catch (e) {
        order = null;
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order/Booking not found' });
    }

    const parentUserId = (req.user.parentUserId || req.user._id || req.user.id).toString();
    const currentUserId = (req.user._id || req.user.id).toString();

    const parentUser = await User.findById(parentUserId).lean();
    const currentUser = await User.findById(currentUserId).lean();

    const businessIds = new Set([parentUserId, currentUserId]);
    if (req.user.primaryBusinessId) businessIds.add(req.user.primaryBusinessId.toString());

    [parentUser, currentUser, req.user].forEach(u => {
      if (u) {
        if (u._id) businessIds.add(u._id.toString());
        if (u.id) businessIds.add(u.id.toString());
        if (u.vendorId) businessIds.add(u.vendorId.toString());
        if (u.registrationId) businessIds.add(u.registrationId.toString());
        if (u.businesses && Array.isArray(u.businesses)) {
          u.businesses.forEach(b => {
            if (b && b._id) businessIds.add(b._id.toString());
            if (b && b.id) businessIds.add(b.id.toString());
          });
        }
      }
    });

    const allowedVendorIds = Array.from(businessIds);
    const orderVendorId = (order.vendorId || order.vendor_id || '').toString();

    if (orderVendorId && !allowedVendorIds.includes(orderVendorId)) {
      let isProductMatch = false;
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.vendorId && allowedVendorIds.includes(item.vendorId.toString())) {
            isProductMatch = true;
            break;
          }
          if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
            const prod = await Product.findById(item.productId).lean();
            if (prod && (prod.vendorId || prod.vendor_id) && allowedVendorIds.includes((prod.vendorId || prod.vendor_id).toString())) {
              isProductMatch = true;
              break;
            }
          }
        }
      }

      if (!isProductMatch && orderVendorId) {
        const targetVendor = await User.findById(orderVendorId).lean();
        if (targetVendor && (
          targetVendor._id?.toString() === parentUserId ||
          targetVendor.parentUserId?.toString() === parentUserId
        )) {
          isProductMatch = true;
        }
      }

      if (!isProductMatch && req.user.role === 'Vendor') {
        isProductMatch = true;
      }

      if (!isProductMatch) {
        return res.status(403).json({ success: false, message: 'Order/Booking not found or unauthorized' });
      }
    }

    const oldStatus = order.status;
    order.status = status || order.status;

    // Track actual check-in / check-out timestamps for Stay bookings
    const isStay = order.type === 'Stay' || order.category === 'Stay' || (order.items && order.items[0]?.category === 'Stay');
    if (isStay) {
      if (order.status === 'Checked In' && !order.actualCheckIn) {
        const now = new Date();
        order.actualCheckIn = now;
        order.actualCheckInDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        order.actualCheckInTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      } else if (['Checked Out', 'Completed'].includes(order.status) && !order.actualCheckOut) {
        const now = new Date();
        order.actualCheckOut = now;
        order.actualCheckOutDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        order.actualCheckOutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    if (order.status !== oldStatus) {
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date().toISOString(),
        updatedBy: req.user.name || 'Vendor Sub-Admin',
        notes: `Status changed from "${oldStatus}" to "${order.status}"`
      });
    }

    if (deliveryPartnerId !== undefined) {
      order.deliveryPartnerId = deliveryPartnerId;
      
      // Update delivery partner status
      if (deliveryPartnerId) {
        await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
          $set: { status: 'On Delivery' }
        });
      }
    }

    // If delivery completed, release the delivery partner
    if (['Delivered', 'Completed', 'Cancelled'].includes(order.status) && order.deliveryPartnerId) {
      await DeliveryPartner.findByIdAndUpdate(order.deliveryPartnerId, {
        $set: { status: 'Available' }
      });
    }

    // Auto-mark payment as Paid when order is Delivered or Completed
    if (['Delivered', 'Completed'].includes(order.status)) {
      const isCod = String(order.paymentMethod || order.payment_method || '').toLowerCase().includes('cash') ||
                    String(order.paymentMethod || order.payment_method || '').toLowerCase().includes('cod');
      if (isCod || order.paymentStatus !== 'Paid') {
        order.paymentStatus = 'Paid';
        order.payment_status = 'Paid';
        if (!order.paidAt) order.paidAt = new Date();
      }
    }

    try {
      await order.save();
    } catch (saveErr) {
      console.warn('Order.save() error, falling back to direct db update:', saveErr.message);
    }

    // Direct MongoDB collection update to guarantee persistence for native ObjectId records
    try {
      const dbUpdate = { status: order.status };
      if (order.deliveryPartnerId !== undefined) dbUpdate.deliveryPartnerId = order.deliveryPartnerId;
      if (order.paymentStatus) {
        dbUpdate.paymentStatus = order.paymentStatus;
        dbUpdate.payment_status = order.paymentStatus;
      }
      if (order.paidAt) dbUpdate.paidAt = order.paidAt;
      if (order.actualCheckIn) dbUpdate.actualCheckIn = order.actualCheckIn;
      if (order.actualCheckInDate) dbUpdate.actualCheckInDate = order.actualCheckInDate;
      if (order.actualCheckInTime) dbUpdate.actualCheckInTime = order.actualCheckInTime;
      if (order.actualCheckOut) dbUpdate.actualCheckOut = order.actualCheckOut;
      if (order.actualCheckOutDate) dbUpdate.actualCheckOutDate = order.actualCheckOutDate;
      if (order.actualCheckOutTime) dbUpdate.actualCheckOutTime = order.actualCheckOutTime;
      if (order.statusHistory) dbUpdate.statusHistory = order.statusHistory;

      await mongoose.connection.db.collection('orders').updateOne(
        { $or: [{ _id: order._id }, { id: order.id }, { order_number: order.order_number }] },
        { $set: dbUpdate }
      );
    } catch (dbErr) {
      console.warn('Direct MongoDB collection status update warning:', dbErr.message);
    }

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.ORDER_STATUS_CHANGED,
      entity: ENTITY_NAMES.ORDER,
      entityId: order._id ? order._id.toString() : order.id,
      action: 'status_changed',
      target: {
        vendorId: order.vendorId || order.vendor_id,
        userId: order.memberId || order.customer_id
      },
      data: order
    }).catch(err => console.warn('[Realtime] Order status publish warning:', err.message));

    // Sync order status back to customer backend (Connect App)
    if (order.status !== oldStatus) {
      try {
        let custStatus = order.status;
        if (order.status === 'Accepted') custStatus = 'Preparing';
        else if (order.status === 'Out for Delivery') custStatus = 'Out For Delivery';

        const syncUrl = `http://localhost:8002/api/orders/${order._id}/status`;
        await fetch(syncUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: custStatus })
        }).then(r => r.json()).catch(err => console.warn('Customer backend status sync failed:', err.message));
      } catch (err) {
        console.warn('Failed to sync order status to customer backend:', err.message);
      }
    }
    if (order.status !== oldStatus && ['Completed', 'Delivered'].includes(order.status)) {
      const customer = await Customer.findOne({ vendorId: order.vendorId, email: order.memberId }) || 
                       await Customer.findOne({ vendorId: order.vendorId, name: order.memberName });
      if (customer) {
        customer.ordersCount += 1;
        customer.totalSpent += (order.finalAmount || order.amount || 0);
        await customer.save();
      } else {
        await Customer.create({
          vendorId: order.vendorId,
          name: order.memberName,
          email: order.memberId,
          ordersCount: 1,
          totalSpent: (order.finalAmount || order.amount || 0)
        });
      }
    }

    const normalizedOrder = order.toObject ? order.toObject() : order;
    if (!normalizedOrder.vendorId && normalizedOrder.vendor_id) normalizedOrder.vendorId = normalizedOrder.vendor_id;
    if (!normalizedOrder.memberName && normalizedOrder.customer_name) normalizedOrder.memberName = normalizedOrder.customer_name;
    if (!normalizedOrder.memberId && normalizedOrder.customer_id) normalizedOrder.memberId = normalizedOrder.customer_id;
    if (normalizedOrder.finalAmount === undefined && normalizedOrder.amount !== undefined) normalizedOrder.finalAmount = normalizedOrder.amount;
    if (normalizedOrder.totalAmount === undefined && normalizedOrder.amount !== undefined) normalizedOrder.totalAmount = normalizedOrder.amount;

    res.status(200).json({ success: true, message: 'Order status updated successfully', data: normalizedOrder });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating order status' });
  }
};

// @desc    Download / view candidate resume
// @route   GET /api/vendor/orders/:id/resume
// @access  Private (Vendor)
const getOrderResume = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);

    let order = null;
    if (isValidObjectId) {
      try {
        order = await Order.findById(new mongoose.Types.ObjectId(targetId)) || await Order.findById(targetId);
      } catch (e) {
        order = null;
      }
    }
    if (!order) {
      const orConditions = [{ id: targetId }, { order_number: targetId }, { applicationId: targetId }];
      if (isValidObjectId) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(targetId) });
        orConditions.push({ _id: targetId });
      }
      order = await Order.findOne({ $or: orConditions });
    }
    if (!order) {
      try {
        const rawDoc = await mongoose.connection.db.collection('orders').findOne(
          isValidObjectId
            ? { $or: [{ _id: new mongoose.Types.ObjectId(targetId) }, { _id: targetId }, { id: targetId }, { order_number: targetId }, { applicationId: targetId }] }
            : { $or: [{ _id: targetId }, { id: targetId }, { order_number: targetId }, { applicationId: targetId }] }
        );
        if (rawDoc) order = Order.hydrate(rawDoc);
      } catch (e) {
        order = null;
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Candidate Application not found' });
    }

    // IDOR Defense: verify vendor authorization for this candidate application
    const parentUserId = (req.user.parentUserId || req.user._id || req.user.id || '').toString();
    const currentUserId = (req.user._id || req.user.id || '').toString();
    const vendorUser = await User.findById(parentUserId);

    const businessIds = new Set([parentUserId, currentUserId]);
    if (vendorUser) {
      if (vendorUser._id) businessIds.add(vendorUser._id.toString());
      if (vendorUser.vendorId) businessIds.add(vendorUser.vendorId.toString());
      if (vendorUser.registrationId) businessIds.add(vendorUser.registrationId.toString());
      if (vendorUser.businesses && Array.isArray(vendorUser.businesses)) {
        vendorUser.businesses.forEach(b => {
          if (b && b._id) businessIds.add(b._id.toString());
          if (b && b.id) businessIds.add(b.id.toString());
        });
      }
    }

    const orderVendorId = (order.vendorId || order.vendor_id || '').toString();
    let isAuthorized = businessIds.has(orderVendorId);
    if (!isAuthorized && order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.vendorId && businessIds.has(item.vendorId.toString())) {
          isAuthorized = true;
          break;
        }
      }
    }

    if (!isAuthorized && (order.jobId || (order.items && order.items[0]?.productId) || order.productId)) {
      const targetJobId = String(order.jobId || (order.items && order.items[0]?.productId) || order.productId);
      const isVendorJob = await Product.exists({
        _id: targetJobId,
        $or: [
          { vendorId: { $in: Array.from(businessIds) } },
          { vendor_id: { $in: Array.from(businessIds) } }
        ]
      });
      if (isVendorJob) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(404).json({ success: false, message: 'Candidate Application not found or unauthorized' });
    }

    const rawResume = (order.candidateResume || '').trim();
    const candidateName = order.candidateName || order.memberName || order.customer_name || 'Candidate';
    const filename = rawResume ? path.basename(rawResume) : `${candidateName}_Resume.pdf`;
    const isDownload = req.query.download === 'true' || req.query.download === '1';

    // 1. Check if file physically exists on disk (Path Traversal Protected)
    const searchDirs = [
      path.join(__dirname, '..', 'uploads', 'resumes'),
      path.join(__dirname, '..', 'uploads')
    ];

    let foundFilePath = null;
    if (rawResume) {
      const cleanRaw = rawResume.replace(/\\/g, '/');
      const baseName = path.basename(cleanRaw);
      let decodedBase = baseName;
      try {
        decodedBase = decodeURIComponent(baseName);
      } catch (e) {
        decodedBase = baseName;
      }
      decodedBase = path.basename(decodedBase);

      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        const resolvedDir = path.resolve(dir);
        const candidates = [
          path.resolve(dir, baseName),
          path.resolve(dir, decodedBase),
          path.resolve(dir, decodedBase.replace(/\s+/g, ' ')),
          path.resolve(dir, decodedBase.replace(/\s+/g, ''))
        ];
        for (const cand of candidates) {
          if (cand.startsWith(resolvedDir) && fs.existsSync(cand) && fs.statSync(cand).isFile()) {
            foundFilePath = cand;
            break;
          }
        }
        if (foundFilePath) break;
      }
    }

    if (foundFilePath) {
      const disposition = isDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
      return res.sendFile(path.resolve(foundFilePath));
    }

    // 2. Generate valid PDF from candidate application details if physical file is absent on ephemeral disk
    const { generateCandidateResumePdf } = require('../utils/pdfGenerator');
    const pdfBuffer = generateCandidateResumePdf({
      candidateName,
      candidateEmail: order.candidateEmail || 'Not Provided',
      candidatePhone: order.candidatePhone || order.customer_phone || 'Not Provided',
      jobTitle: order.jobTitle || order.product_details || (order.items && order.items[0]?.name) || 'Job Role',
      candidateEducation: order.candidateEducation || 'Graduate',
      experience: order.experience || 'Fresher',
      jobLocation: order.jobLocation || 'Not Specified',
      applicationId: order.applicationId || order.order_number || order.id || String(order._id),
      applicationDate: order.applicationDate || order.created_at || order.createdAt || new Date().toISOString(),
      status: order.status || 'APPLICATION RECEIVED',
      filename
    });

    res.setHeader('Content-Type', 'application/pdf');
    const disposition = isDownload ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Get Order Resume Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving resume' });
  }
};

// --- CUSTOMERS ---
// @desc    Get all unique customers for the vendor
// @route   GET /api/vendor/customers
// @access  Private (Vendor)
const getCustomers = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [
      parentUserId.toString(),
      ...(user.vendorId ? [String(user.vendorId)] : []),
      ...(user.registrationId ? [String(user.registrationId)] : []),
      ...(user._id ? [String(user._id)] : [])
    ];
    if (user.businesses && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
        if (b.id) businessIds.push(b.id.toString());
        if (b.vendorId) businessIds.push(String(b.vendorId));
      });
    }
    const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))];
    const objectIds = uniqueBusinessIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const allMatchIds = [...uniqueBusinessIds, ...objectIds];

    const [dbCustomers, rawOrders] = await Promise.all([
      Customer.find({
        $or: [
          { vendorId: { $in: allMatchIds } },
          { vendor_id: { $in: allMatchIds } }
        ]
      }).lean(),
      Order.find({
        $or: [
          { vendorId: { $in: allMatchIds } },
          { vendor_id: { $in: allMatchIds } },
          { 'items.vendorId': { $in: allMatchIds } },
          { 'items.vendor_id': { $in: allMatchIds } }
        ]
      }).select('vendorId vendor_id memberName customer_name candidateEmail customer_email memberId customer_phone phone mobileNumber contactNumber candidatePhone memberPhone customer_address address deliveryAddress shippingAddress location candidateAddress memberAddress finalAmount totalAmount amount customerId customer_id customerDisplayId registrationId paymentStatus payment_status status type category order_number id _id').lean()
    ]);

    const customerMap = {};

    const getCustomerKey = (name, email) => {
      const cleanName = (name || '').trim().toLowerCase();
      const cleanEmail = (email || '').trim().toLowerCase();
      if (cleanName && cleanName !== 'customer' && cleanName !== 'connect member') {
        return cleanName.replace(/[^a-z0-9]/g, '');
      }
      if (cleanEmail && !cleanEmail.includes('customer') && cleanEmail.includes('@')) {
        return cleanEmail.replace(/[^a-z0-9]/g, '');
      }
      return cleanEmail || cleanName || 'unknown_customer';
    };

    // 1. Register all DB customer records (already lean POJOs)
    dbCustomers.forEach(obj => {
      const name = (obj.name || 'Customer').trim();
      const email = (obj.email || obj.memberId || '').trim();
      const key = getCustomerKey(name, email);
      const uniqueId = `cust_${key}`;
      const addr = obj.address || obj.location || obj.city || obj.street || obj.fullAddress || '';
      const isCanonical = (id) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-')) && String(id) !== 'FIC-CUST-100001';
      const cId = isCanonical(obj.customerId) 
        ? String(obj.customerId).trim()
        : isCanonical(obj.registrationId) 
        ? String(obj.registrationId).trim()
        : null;

      customerMap[key] = {
        _id: uniqueId,
        memberId: obj.memberId || email || uniqueId,
        customerId: cId || null,
        registrationId: cId || null,
        customerDisplayId: cId || null,
        name: name,
        email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
        phone: obj.phone || obj.mobileNumber || '',
        gender: obj.gender || 'Not provided',
        age: obj.age || null,
        address: addr,
        ordersCount: 0,
        totalSpent: 0,
        vendorId: obj.vendorId || obj.vendor_id
      };
    });

    // 2. Register all customers from orders
    rawOrders.forEach(o => {
      const name = (o.memberName || o.customer_name || 'Customer').trim();
      const email = (o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || '').trim();
      const phone = o.customer_phone || o.phone || o.mobileNumber || o.contactNumber || o.candidatePhone || o.memberPhone || '';
      const addr = o.customer_address || o.address || o.deliveryAddress || o.shippingAddress || o.location || o.candidateAddress || o.memberAddress || '';
      const key = getCustomerKey(name, email);
      const uniqueId = `cust_${key}`;
      const isCanonical = (id) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-')) && String(id) !== 'FIC-CUST-100001';
      const rawCustId = isCanonical(o.customerId) 
        ? String(o.customerId).trim()
        : isCanonical(o.customer_id) 
        ? String(o.customer_id).trim()
        : isCanonical(o.customerDisplayId) 
        ? String(o.customerDisplayId).trim()
        : isCanonical(o.registrationId) 
        ? String(o.registrationId).trim()
        : null;

      if (!customerMap[key]) {
        customerMap[key] = {
          _id: uniqueId,
          memberId: (email && email.includes('@')) ? email : uniqueId,
          customerId: rawCustId || null,
          registrationId: rawCustId || null,
          customerDisplayId: rawCustId || null,
          name: name,
          email: (email && email.includes('@')) ? email : (name !== 'Customer' ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com` : ''),
          phone: phone,
          gender: o.gender || o.customer_gender || (o.guestList && o.guestList[0]?.gender) || 'Not provided',
          age: o.age || o.customer_age || (o.guestList && o.guestList[0]?.age) || null,
          address: addr,
          ordersCount: 0,
          totalSpent: 0,
          vendorId: o.vendorId || o.vendor_id
        };
      } else {
        if (!customerMap[key].customerId && rawCustId) {
          customerMap[key].customerId = rawCustId;
          customerMap[key].registrationId = rawCustId;
          customerMap[key].customerDisplayId = rawCustId;
        }
        if (!customerMap[key].phone && phone) {
          customerMap[key].phone = phone;
        }
        if (!customerMap[key].address && addr) {
          customerMap[key].address = addr;
        }
        if (email && email.includes('@') && (!customerMap[key].email || !customerMap[key].email.includes('@'))) {
          customerMap[key].email = email;
        }
        if ((!customerMap[key].gender || customerMap[key].gender === 'Not provided') && (o.gender || o.customer_gender)) {
          customerMap[key].gender = o.gender || o.customer_gender;
        }
        if (!customerMap[key].age && (o.age || o.customer_age)) {
          customerMap[key].age = o.age || o.customer_age;
        }
      }
    });

    // 2.5 Fill missing customer address/phone/gender from User profiles
    const customerEmails = [];
    const customerPhones = [];
    const customerNames = [];
    Object.values(customerMap).forEach(cust => {
      const e = (cust.email || '').trim().toLowerCase();
      const p = (cust.phone || '').toString().trim().replace(/[^0-9]/g, '');
      const n = (cust.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (e && e.includes('@') && !e.includes('gmail.com')) customerEmails.push(e);
      if (p && p.length >= 8) customerPhones.push(p);
      if (n && n !== 'customer' && n.length > 2) customerNames.push(n);
    });

    const userQuery = [];
    if (customerEmails.length) userQuery.push({ email: { $in: customerEmails } });
    if (customerPhones.length) userQuery.push({ phone: { $in: customerPhones } }, { mobileNumber: { $in: customerPhones } });
    if (customerNames.length) userQuery.push({ name: { $in: customerNames.map(n => new RegExp(`^${n}$`, 'i')) } });

    let usersByEmail = {};
    let usersByPhone = {};
    let usersByName = {};

    if (userQuery.length > 0) {
      const [matchedUsers, matchedGlobalCustomers] = await Promise.all([
        User.find({ $or: userQuery })
          .select('name email phone mobileNumber address street city district state pincode postalCode registrationId customerId gender age _id')
          .lean(),
        Customer.find({ $or: userQuery })
          .select('name email phone mobileNumber address street city state pincode registrationId customerId gender age _id')
          .lean()
      ]);

      matchedUsers.forEach(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPhone = (u.phone || u.mobileNumber || '').toString().trim().replace(/[^0-9]/g, '');
        const uName = (u.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (uEmail) usersByEmail[uEmail] = u;
        if (uPhone) {
          usersByPhone[uPhone] = u;
          if (uPhone.length >= 10) usersByPhone[uPhone.slice(-10)] = u;
        }
        if (uName && uName !== 'customer') usersByName[uName] = u;
      });

      matchedGlobalCustomers.forEach(c => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cPhone = (c.phone || c.mobileNumber || '').toString().trim().replace(/[^0-9]/g, '');
        const cName = (c.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cEmail && !usersByEmail[cEmail]) usersByEmail[cEmail] = c;
        if (cPhone) {
          if (!usersByPhone[cPhone]) usersByPhone[cPhone] = c;
          if (cPhone.length >= 10 && !usersByPhone[cPhone.slice(-10)]) usersByPhone[cPhone.slice(-10)] = c;
        }
        if (cName && cName !== 'customer' && !usersByName[cName]) usersByName[cName] = c;
      });
    }

    Object.keys(customerMap).forEach(key => {
      const cust = customerMap[key];
      const custNameClean = (cust.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const custEmailClean = (cust.email || '').trim().toLowerCase();
      const custPhoneClean = (cust.phone || '').toString().trim().replace(/[^0-9]/g, '');

      const matchedUser = usersByEmail[custEmailClean] ||
        usersByPhone[custPhoneClean] ||
        (custPhoneClean.length >= 10 ? usersByPhone[custPhoneClean.slice(-10)] : null) ||
        (custNameClean.length > 2 && custNameClean !== 'customer' ? usersByName[custNameClean] : null);

      if (matchedUser) {
        if (!cust.phone && (matchedUser.phone || matchedUser.mobileNumber)) {
          cust.phone = matchedUser.phone || matchedUser.mobileNumber;
        }
        const isCanonical = (id) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-')) && String(id) !== 'FIC-CUST-100001';
        const regId = isCanonical(matchedUser.customerId) ? matchedUser.customerId : (isCanonical(matchedUser.registrationId) ? matchedUser.registrationId : null);
        if (regId) {
          cust.registrationId = regId;
          cust.customerId = regId;
          cust.customerDisplayId = regId;
        }
        if ((!cust.gender || cust.gender === 'Not provided') && matchedUser.gender) {
          cust.gender = matchedUser.gender;
        }
        if (!cust.age && matchedUser.age) {
          cust.age = matchedUser.age;
        }
        const uAddrParts = [matchedUser.address, matchedUser.street, matchedUser.city, matchedUser.district, matchedUser.state, matchedUser.pincode || matchedUser.postalCode]
          .filter(p => p && typeof p === 'string' && p.trim() !== '' && p !== 'N/A' && !/^\d{6}$/.test(p.trim()));

        if (uAddrParts.length > 0) {
          const uFullAddr = deduplicateAddressSegments(uAddrParts.join(', '));
          if (!cust.address || cust.address === 'N/A' || cust.address === 'Bangalore Center' || cust.address.trim() === '') {
            cust.address = uFullAddr;
          }
        }
      }
    });

    // 3. Calculate ordersCount and totalSpent independently for each customer and attach canonical customerId
    Object.keys(customerMap).forEach(key => {
      const cust = customerMap[key];
      const custNameClean = cust.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const custEmailClean = cust.email.toLowerCase();
      const custPhoneClean = (cust.phone || '').toString().trim().replace(/[^0-9]/g, '');

      const custOrders = rawOrders.filter(o => {
        if (o.type && APPLICATION_BASED_TYPES.includes(o.type)) return false;

        const rawPayStatus = (o.paymentStatus || o.payment_status || '').toLowerCase();
        const rawStatus = (o.status || '').toLowerCase();
        const isPaid = ['paid', 'successful', 'completed'].includes(rawPayStatus) || ['delivered', 'completed', 'checked out'].includes(rawStatus);
        if (!isPaid) return false;

        const oNameClean = (o.memberName || o.customer_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const oEmailClean = (o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || '').trim().toLowerCase();
        const oMemberIdClean = (o.memberId || o.customerId || '').toString().trim().toLowerCase();

        if (custNameClean && oNameClean && custNameClean === oNameClean && custNameClean !== 'customer' && custNameClean !== 'connectmember') return true;
        if (custEmailClean && oEmailClean && custEmailClean === oEmailClean && custEmailClean.includes('@')) return true;
        if (cust.memberId && oMemberIdClean && cust.memberId.toLowerCase() === oMemberIdClean && !oMemberIdClean.startsWith('cust_')) return true;
        return false;
      });

      const uniqueCustOrders = [];
      const seenOrdIds = new Set();
      for (const ord of custOrders) {
        const oId = String(ord._id || ord.order_number || ord.id);
        if (!seenOrdIds.has(oId)) {
          seenOrdIds.add(oId);
          uniqueCustOrders.push(ord);
        }
      }

      cust.ordersCount = uniqueCustOrders.length;
      cust.totalSpent = uniqueCustOrders.reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0);

      const isCanonical = (id) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-')) && String(id) !== 'FIC-CUST-100001';
      let canonicalId = isCanonical(cust.customerId)
        ? cust.customerId 
        : isCanonical(cust.registrationId) 
        ? cust.registrationId 
        : null;

      if (!canonicalId) {
        const matched = usersByEmail[custEmailClean] ||
          usersByPhone[custPhoneClean] ||
          (custPhoneClean.length >= 10 ? usersByPhone[custPhoneClean.slice(-10)] : null) ||
          (custNameClean.length > 2 && custNameClean !== 'customer' ? usersByName[custNameClean] : null);

        if (matched) {
          const mId = matched.customerId || matched.registrationId;
          if (isCanonical(mId)) {
            canonicalId = mId;
          }
        }
      }

      if (!canonicalId) {
        canonicalId = 'N/A';
      }

      cust.customerId = canonicalId;
      cust.customerDisplayId = canonicalId;
      cust.registrationId = canonicalId;
      cust.address = deduplicateAddressSegments(cust.address) || 'Not provided';
    });

    const finalCustomers = Object.values(customerMap);
    res.status(200).json({ success: true, data: finalCustomers });
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customers list' });
  }
};

// @desc    Get genuine purchase and booking history for a specific customer
// @route   GET /api/vendor/customers/:customerId/purchases
// @access  Private (Vendor)
const getCustomerPurchases = async (req, res) => {
  try {
    const parentUserId = (req.user.parentUserId || req.user._id).toString();
    const activeBusinessId = (req.user._id || '').toString();
    const user = (await getVendorUserCached(parentUserId)) || req.user;
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [
      parentUserId,
      activeBusinessId,
      (req.user._id || '').toString(),
      (req.user.vendorId || '').toString(),
      (req.user.registrationId || '').toString(),
      (user._id || '').toString(),
      (user.vendorId || '').toString(),
      (user.registrationId || '').toString()
    ];
    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b && (b._id || b.id)) businessIds.push(String(b._id || b.id));
        if (b && b.vendorId) businessIds.push(String(b.vendorId));
      });
    }
    const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))];
    const objectIds = uniqueBusinessIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    const allMatchIds = [...uniqueBusinessIds, ...objectIds];

    const rawParam = String(req.params.customerId || '').trim();
    const queryEmail = String(req.query.email || '').trim().toLowerCase();
    const queryName = String(req.query.name || '').trim();
    const queryPhone = String(req.query.phone || '').trim().replace(/[^0-9]/g, '');

    const customerIdentifier = rawParam !== 'undefined' && rawParam !== 'null' && rawParam !== 'N/A' ? rawParam : '';
    if (!customerIdentifier && !queryEmail && !queryName && !queryPhone) {
      return res.status(400).json({ success: false, message: 'Customer identifier is required' });
    }

    const ids = [];
    const names = [];
    const emails = [];
    const phones = [];

    if (customerIdentifier) ids.push(customerIdentifier);
    if (queryEmail) emails.push(queryEmail);
    if (queryName) names.push(queryName.toLowerCase());
    if (queryPhone) {
      phones.push(queryPhone);
      if (queryPhone.length >= 10) phones.push(queryPhone.slice(-10));
    }

    let cleanKey = '';
    if (customerIdentifier.startsWith('cust_')) {
      cleanKey = customerIdentifier.replace(/^cust_/, '').trim();
      if (cleanKey) {
        ids.push(cleanKey);
        names.push(cleanKey.toLowerCase());
      }
    } else if (customerIdentifier) {
      names.push(customerIdentifier.toLowerCase());
    }

    // Resolve customer identity from User and Customer collections safely
    let lookupQueries = [];
    if (customerIdentifier) {
      lookupQueries.push(
        { customerId: customerIdentifier },
        { registrationId: customerIdentifier },
        { memberId: customerIdentifier }
      );
      if (mongoose.Types.ObjectId.isValid(customerIdentifier)) {
        lookupQueries.push({ _id: customerIdentifier });
      }
      if (customerIdentifier.includes('@')) {
        lookupQueries.push({ email: customerIdentifier.toLowerCase() });
        emails.push(customerIdentifier.toLowerCase());
      }
    }
    if (cleanKey) {
      lookupQueries.push(
        { name: new RegExp(`^${cleanKey}$`, 'i') },
        { email: new RegExp(`^${cleanKey}`, 'i') },
        { customerId: new RegExp(`^${cleanKey}`, 'i') },
        { memberId: new RegExp(`^${cleanKey}`, 'i') }
      );
    }
    if (queryEmail) {
      lookupQueries.push({ email: queryEmail });
    }
    if (queryName) {
      lookupQueries.push({ name: new RegExp(`^${queryName}$`, 'i') });
    }
    if (queryPhone && queryPhone.length >= 10) {
      lookupQueries.push(
        { phone: new RegExp(`${queryPhone.slice(-10)}$`) },
        { mobileNumber: new RegExp(`${queryPhone.slice(-10)}$`) }
      );
    }

    let targetDocs = [];
    if (lookupQueries.length > 0) {
      const [uDocs, cDocs] = await Promise.all([
        User.find({ $or: lookupQueries }).select('name email phone mobileNumber customerId registrationId _id').lean().catch(() => []),
        Customer.find({ $or: lookupQueries }).select('name email phone mobileNumber customerId registrationId _id').lean().catch(() => [])
      ]);
      targetDocs = [...uDocs, ...cDocs];
    }

    targetDocs.forEach(targetDoc => {
      if (targetDoc.name) names.push(targetDoc.name.trim().toLowerCase());
      if (targetDoc.email) emails.push(targetDoc.email.trim().toLowerCase());
      const p = (targetDoc.phone || targetDoc.mobileNumber || '').toString().replace(/[^0-9]/g, '');
      if (p) {
        phones.push(p);
        if (p.length >= 10) phones.push(p.slice(-10));
      }
      if (targetDoc.customerId) ids.push(String(targetDoc.customerId));
      if (targetDoc.registrationId) ids.push(String(targetDoc.registrationId));
      if (targetDoc.memberId) ids.push(String(targetDoc.memberId));
      if (targetDoc._id) ids.push(String(targetDoc._id));
    });

    // Clean and deduplicate name regexes
    const uniqueNames = [...new Set(names.filter(n => n && n !== 'customer' && n !== 'connect member' && n.length > 1))];
    const nameRegexes = uniqueNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

    const customerMatchOr = [
      { customerId: { $in: ids } },
      { customer_id: { $in: ids } },
      { registrationId: { $in: ids } },
      { memberId: { $in: ids } },
      { customerDisplayId: { $in: ids } },
      { 'bookingHolder.customerId': { $in: ids } },
      { 'bookingHolder.customer_id': { $in: ids } }
    ];
    if (emails.length > 0) {
      customerMatchOr.push(
        { customer_email: { $in: emails } },
        { candidateEmail: { $in: emails } },
        { email: { $in: emails } },
        { memberId: { $in: emails } },
        { 'bookingHolder.email': { $in: emails } }
      );
    }
    if (phones.length > 0) {
      customerMatchOr.push(
        { customer_phone: { $in: phones } },
        { phone: { $in: phones } },
        { mobileNumber: { $in: phones } },
        { 'bookingHolder.phone': { $in: phones } }
      );
    }
    if (nameRegexes.length > 0) {
      customerMatchOr.push(
        { memberName: { $in: nameRegexes } },
        { customer_name: { $in: nameRegexes } },
        { 'bookingHolder.name': { $in: nameRegexes } }
      );
    }

    const orderQueryConditions = [
      {
        $or: [
          { vendorId: { $in: allMatchIds } },
          { vendor_id: { $in: allMatchIds } },
          { 'items.vendorId': { $in: allMatchIds } },
          { 'items.vendor_id': { $in: allMatchIds } }
        ]
      },
      {
        type: { $nin: ['Job', 'Jobs', 'job', 'jobs', 'Application', 'application'] }
      },
      {
        $or: customerMatchOr
      }
    ];

    const orders = await Order.find({ $and: orderQueryConditions })
      .sort({ createdAt: -1, created_at: -1 })
      .lean();

    const mapped = orders.map(o => {
      const isBooking = ['Stay', 'stay', 'Hotel', 'hotel', 'Travel', 'travel', 'Services', 'Service', 'service', 'services', 'Appointment', 'appointment', 'Booking', 'booking'].includes(o.type) || ['Stay', 'stay', 'Hotel', 'hotel', 'Travel', 'travel', 'Services', 'Service', 'service', 'services'].includes(o.category);
      const firstItem = o.items && o.items[0];
      const itemName = o.product_details || o.serviceName || o.roomName || o.roomNumber || (firstItem && firstItem.name) || o.packageName || (isBooking ? 'Booking Service' : 'Catalog Product');
      const orderDate = o.appointmentDate || o.checkInDate || o.travelDate || o.orderDate || o.createdAt || o.created_at;

      return {
        _id: o._id,
        order_number: o.order_number || o.id || o._id,
        orderNumber: o.order_number || o.id || o._id,
        type: o.type,
        category: o.category || o.type,
        itemName,
        items: o.items || [],
        amount: Number(o.finalAmount || o.totalAmount || o.amount || 0),
        finalAmount: Number(o.finalAmount || o.totalAmount || o.amount || 0),
        orderDate,
        createdAt: o.createdAt || o.created_at,
        created_at: o.created_at || o.createdAt,
        appointmentDate: o.appointmentDate,
        checkInDate: o.checkInDate,
        checkOutDate: o.checkOutDate,
        roomNumber: o.roomNumber,
        appointmentTimeSlot: o.appointmentTimeSlot,
        status: o.status || 'Order Received',
        paymentStatus: o.paymentStatus || o.payment_status || 'Pending',
        paymentMethod: o.paymentMethod || o.payment_method || 'N/A'
      };
    });

    res.status(200).json({
      success: true,
      data: mapped,
      total: mapped.length
    });
  } catch (error) {
    console.error('Get Customer Purchases Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customer purchases' });
  }
};

// --- DELIVERY PARTNERS CRUD ---
// @desc    Create a Delivery Partner (Vendor private)
// @route   POST /api/vendor/delivery-partners
// @access  Private (Vendor)
const createDeliveryPartner = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    const partner = await DeliveryPartner.create({
      ...req.body,
      vendorId,
      status: req.body.status || 'Available'
    });

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PARTNER_CREATED,
      entity: ENTITY_NAMES.PARTNER,
      entityId: partner._id ? partner._id.toString() : partner.id,
      action: 'created',
      target: { vendorId: partner.vendorId },
      data: partner
    }).catch(err => console.warn('[Realtime] Partner create publish warning:', err.message));

    res.status(201).json({ success: true, message: 'Delivery partner added successfully', data: partner });
  } catch (error) {
    console.error('Create Delivery Partner Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating delivery partner' });
  }
};

// @desc    Get delivery partners for the vendor
// @route   GET /api/vendor/delivery-partners
// @access  Private (Vendor)
const getDeliveryPartners = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [parentUserId.toString()];
    if (user.businesses && user.businesses.length > 0) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
      });
    }

    const partners = await DeliveryPartner.find({
      vendorId: { $in: businessIds }
    });
    res.status(200).json({ success: true, data: partners });
  } catch (error) {
    console.error('Get Delivery Partners Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving delivery partners' });
  }
};

// @desc    Update Delivery Partner
// @route   PUT /api/vendor/delivery-partners/:id
// @access  Private (Vendor)
const updateDeliveryPartner = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);

    const parentUserId = (req.user.parentUserId || req.user._id || '').toString();
    const currentUserId = (req.user._id || '').toString();
    const isOwner = partner && (
      String(partner.vendorId) === parentUserId ||
      String(partner.vendorId) === currentUserId ||
      (req.user.businesses && req.user.businesses.some(b => String(b._id) === String(partner.vendorId) || String(b.id) === String(partner.vendorId)))
    );

    if (!partner || !isOwner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found or unauthorized' });
    }

    const updated = await DeliveryPartner.findByIdAndUpdate(req.params.id, {
      $set: {
        ...req.body,
        vendorId: req.user._id
      }
    }, { new: true });

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PARTNER_UPDATED,
      entity: ENTITY_NAMES.PARTNER,
      entityId: updated._id ? updated._id.toString() : updated.id,
      action: 'updated',
      target: { vendorId: updated.vendorId },
      data: updated
    }).catch(err => console.warn('[Realtime] Partner update publish warning:', err.message));

    res.status(200).json({ success: true, message: 'Delivery partner updated successfully', data: updated });
  } catch (error) {
    console.error('Update Delivery Partner Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating delivery partner' });
  }
};

// @desc    Delete Delivery Partner
// @route   DELETE /api/vendor/delivery-partners/:id
// @access  Private (Vendor)
const deleteDeliveryPartner = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);

    const parentUserId = (req.user.parentUserId || req.user._id || '').toString();
    const currentUserId = (req.user._id || '').toString();
    const isOwner = partner && (
      String(partner.vendorId) === parentUserId ||
      String(partner.vendorId) === currentUserId ||
      (req.user.businesses && req.user.businesses.some(b => String(b._id) === String(partner.vendorId) || String(b.id) === String(partner.vendorId)))
    );

    if (!partner || !isOwner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found or unauthorized' });
    }

    await DeliveryPartner.findByIdAndDelete(req.params.id);

    // Real-Time Event Generation (AFTER DB success)
    publishRealtimeEvent({
      event: EVENT_TYPES.PARTNER_DELETED,
      entity: ENTITY_NAMES.PARTNER,
      entityId: req.params.id,
      action: 'deleted',
      target: { vendorId: partner.vendorId },
      data: { _id: req.params.id, id: req.params.id }
    }).catch(err => console.warn('[Realtime] Partner delete publish warning:', err.message));

    res.status(200).json({ success: true, message: 'Delivery partner deleted successfully' });
  } catch (error) {
    console.error('Delete Delivery Partner Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting delivery partner' });
  }
};

// --- PROFILE SETTINGS ---
// @desc    Get Vendor Profile
// @route   GET /api/vendor/profile
// @access  Private (Vendor)
const getProfile = async (req, res) => {
  try {
    const vendorId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const userResponse = { ...user };
    delete userResponse.password;
    userResponse.id = user._id;

    res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};

// @desc    Update Vendor Profile
// @route   PUT /api/vendor/profile
// @access  Private (Vendor)
const updateProfile = async (req, res) => {
  try {
    const vendorId = req.user.parentUserId || req.user._id;
    const user = await User.findById(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    // Sanitize and normalize inputs gracefully without breaking legacy records
    if (req.body.mobileNumber !== undefined && req.body.mobileNumber !== null) {
      let cleanMobile = String(req.body.mobileNumber).replace(/\D/g, '');
      if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.slice(-10);
      }
      if (cleanMobile.length === 10) {
        req.body.mobileNumber = cleanMobile;
      }
    }
    if (req.body.postalCode !== undefined && req.body.postalCode !== null) {
      const cleanPostal = String(req.body.postalCode).replace(/\D/g, '').slice(0, 6);
      if (cleanPostal.length === 6) {
        req.body.postalCode = cleanPostal;
      }
    }
    if (req.body.panNo !== undefined && req.body.panNo !== null) {
      const cleanPan = String(req.body.panNo).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      if (cleanPan && cleanPan !== 'NA' && cleanPan !== 'N/A') {
        req.body.panNo = cleanPan;
      }
    }
    if (req.body.aadhaarNo !== undefined && req.body.aadhaarNo !== null) {
      const cleanAadhaar = String(req.body.aadhaarNo).replace(/\D/g, '').slice(0, 12);
      if (cleanAadhaar.length === 12) {
        req.body.aadhaarNo = cleanAadhaar;
      }
    }
    if (req.body.email !== undefined && req.body.email !== null) {
      req.body.email = String(req.body.email).trim().toLowerCase();
    }
    if (req.body.gstNumber !== undefined && req.body.gstNumber !== null) {
      req.body.gstNumber = String(req.body.gstNumber).toUpperCase().trim();
    }

    // Immutable system-generated and protected security fields that cannot be altered via edit profile
    const protectedFields = ['_id', 'id', 'role', 'vendorId', 'registrationId', 'password', 'otp', 'otpExpires', 'status'];
    protectedFields.forEach(field => {
      delete req.body[field];
    });

    const vendorLevelKeys = [
      'name', 'email', 'agentName', 'alternateVendorName', 'contactPerson', 'mobileNumber',
      'telephone', 'fax', 'alternateNumber', 'coPartnerName', 'panNo', 'aadhaarNo',
      'accountHolderName', 'bankName', 'bankBranch', 'bankStreet', 'bankCity',
      'accountNo', 'ifscCode', 'swiftCode', 'logo'
    ];

    const businessLevelKeys = [
      'businessName', 'name', 'contactPerson', 'agentName', 'alternateVendorName', 'coPartnerName',
      'email', 'phone', 'mobileNumber', 'telephone', 'fax', 'alternateNumber',
      'address', 'street', 'city', 'state', 'country', 'postalCode', 'pincode',
      'gstStatus', 'panNo', 'aadhaarNo', 'companyRegNo', 'gstNumber', 'msmeStatus',
      'businessLicense', 'accountHolderName', 'bankName', 'bankBranch', 'bankStreet',
      'bankCity', 'accountNo', 'ifscCode', 'swiftCode', 'logo'
    ];

    const activeBusinessId = req.body.activeBusinessId || user.primaryBusinessId || (user.businesses && user.businesses[0]?._id);
    const isRootOrPrimary = !activeBusinessId || 
      activeBusinessId.toString() === user._id.toString() || 
      (user.businesses && user.businesses.length > 0 && user.businesses[0]?._id && user.businesses[0]._id.toString() === activeBusinessId.toString());

    // 1. Update Vendor Account Level Information on user record
    vendorLevelKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        if (['name', 'email', 'mobileNumber'].includes(key) && String(req.body[key]).trim() === '' && user[key]) {
          return; // Prevent accidental wiping of essential login credentials
        }
        user[key] = req.body[key];
      }
    });

    // If primary or root business, update top-level business location/name fields on user as well
    if (isRootOrPrimary) {
      ['businessName', 'address', 'street', 'city', 'state', 'country', 'postalCode', 'companyRegNo', 'gstNumber', 'gstStatus', 'msmeStatus', 'businessLicense'].forEach(key => {
        if (req.body[key] !== undefined) {
          if (key === 'businessName' && String(req.body[key]).trim() === '' && user.businessName) return;
          user[key] = req.body[key];
        }
      });
    }

    // 2. Update active business in user.businesses array
    if (activeBusinessId && user.businesses && user.businesses.length > 0) {
      const bizIndex = user.businesses.findIndex(b => 
        b && (String(b._id || '') === String(activeBusinessId) || String(b.id || '') === String(activeBusinessId))
      );
      if (bizIndex !== -1) {
        const b = user.businesses[bizIndex];
        businessLevelKeys.forEach(key => {
          if (req.body[key] !== undefined) {
            if (key === 'businessName' && String(req.body[key]).trim() === '' && b.businessName) return;
            b[key] = req.body[key];
          }
        });
        if (req.body.phone || req.body.mobileNumber || req.body.telephone) {
          b.phone = req.body.phone || req.body.mobileNumber || req.body.telephone;
        }
        if (req.body.pincode || req.body.postalCode || req.body.pinCode) {
          b.pincode = req.body.pincode || req.body.postalCode || req.body.pinCode;
          b.postalCode = b.pincode;
        }
        b.updatedAt = new Date();
      }
    }

    user.markModified('businesses');
    await user.save();
    invalidateVendorUserCache(vendorId);

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    userObj.id = user._id;

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: userObj,
      user: userObj
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating vendor profile' });
  }
};

// @desc    Change Vendor Password
// @route   PUT /api/vendor/change-password
// @access  Private (Vendor)
// @desc    Change Vendor Password
// @route   PUT /api/vendor/change-password
// @access  Private (Vendor)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const vendorId = req.user.parentUserId || req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    // Enforce password complexity
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\"'<>,?]/.test(newPassword);

    if (newPassword.length < 6 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters and contain uppercase letters, lowercase letters, numbers, and special characters.' 
      });
    }

    const user = await User.findById(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
};

// Helper function to send OTP email (secure dispatch without plaintext disk/console credential dumping)
const sendOTPEmail = async (user, otp) => {
  try {
    const nodemailer = require('nodemailer');
    const isRealSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    let transporter;
    if (isRealSMTP) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    if (transporter) {
      const fromEmail = process.env.SMTP_FROM || '"Connect App" <no-reply@connectapp.com>';
      await transporter.sendMail({
        from: fromEmail,
        to: user.email,
        subject: 'Connect App - Password Reset OTP',
        text: `Dear ${user.name || 'Vendor Partner'},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nBest regards,\nConnect App Platform`
      });
    }
    console.log(`✉️ [OTP Service] Password reset OTP generated and dispatched to: ${user.email}`);
  } catch (err) {
    console.warn('[OTP Service] OTP email dispatch warning:', err.message);
  }
};

// @desc    Generate and send forgot password OTP to vendor's email
// @route   POST /api/vendor/forgot-password-otp
// @access  Private (Vendor)
const forgotPasswordOTP = async (req, res) => {
  try {
    const vendorId = req.user.parentUserId || req.user._id;
    const user = await User.findById(vendorId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    await user.save();

    await sendOTPEmail(user, otp);

    res.status(200).json({ success: true, message: 'OTP sent to registered email address' });
  } catch (error) {
    console.error('Forgot Password OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error generating OTP' });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/vendor/reset-password-otp
// @access  Private (Vendor)
const resetPasswordOTP = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const vendorId = req.user.parentUserId || req.user._id;

    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide OTP and new password' });
    }

    // Enforce password complexity
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\"'<>,?]/.test(newPassword);

    if (newPassword.length < 6 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters and contain uppercase letters, lowercase letters, numbers, and special characters.' 
      });
    }

    const user = await User.findById(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Prevent brute-force guessing of OTP
    if ((user.otpAttempts || 0) >= 5) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({ success: false, message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    // Check if OTP matches and has not expired
    if (!user.otp || user.otp !== String(otp).trim()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (!user.otpExpires || new Date(user.otpExpires) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Hash and update the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

// @desc    Get Platform Configuration Read-Only
// @route   GET /api/vendor/commission-config
// @access  Private (Vendor)
const getPlatformConfigReadOnly = async (req, res) => {
  try {
    let config = await PlatformConfig.findOne({});
    if (!config) {
      config = await PlatformConfig.create({
        commissionRate: 0,
        collectionMethod: 'Admin Receives Full Payment',
        deductionMethod: 'Commission Deducted Before Settlement',
        vendorPayout: 'Remaining Balance Transferred to Vendor',
        settlementCycle: 'Weekly'
      });
    }
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('Get Vendor Platform Config Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving configuration' });
  }
};

// --- PATIENTS (Hospital Vendor Specific) ---
// @desc    Get all patients for the hospital vendor
// @route   GET /api/vendor/patients
// @access  Private (Vendor)
const getPatients = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const patients = await Patient.find({ vendorId });
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    console.error('Get Patients Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving patients list' });
  }
};

// @desc    Update hospital notes, follow-up reminders, and treatment remarks for a patient
// @route   PUT /api/vendor/patients/:id/notes
// @access  Private (Vendor)
const updatePatientNotes = async (req, res) => {
  try {
    const { hospitalNotes, followUpReminders, treatmentRemarks } = req.body;
    const patient = await Patient.findById(req.params.id);

    const parentUserId = (req.user.parentUserId || req.user._id || '').toString();
    const currentUserId = (req.user._id || '').toString();
    const isOwner = patient && (
      String(patient.vendorId) === parentUserId ||
      String(patient.vendorId) === currentUserId ||
      (req.user.businesses && req.user.businesses.some(b => String(b._id) === String(patient.vendorId) || String(b.id) === String(patient.vendorId)))
    );

    if (!patient || !isOwner) {
      return res.status(404).json({ success: false, message: 'Patient not found or unauthorized' });
    }

    const updated = await Patient.findByIdAndUpdate(req.params.id, {
      $set: {
        hospitalNotes: hospitalNotes !== undefined ? hospitalNotes : patient.hospitalNotes,
        followUpReminders: followUpReminders !== undefined ? followUpReminders : patient.followUpReminders,
        treatmentRemarks: treatmentRemarks !== undefined ? treatmentRemarks : patient.treatmentRemarks
      }
    }, { new: true });

    res.status(200).json({ success: true, message: 'Patient notes updated successfully', data: updated });
  } catch (error) {
    console.error('Update Patient Notes Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating patient notes' });
  }
};

// @desc    Add a medical record for a patient
// @route   POST /api/vendor/patients/:id/records
// @access  Private (Vendor)
const addPatientRecord = async (req, res) => {
  try {
    const { type, title, doctorName, fileName, fileUrl } = req.body;
    const patient = await Patient.findById(req.params.id);

    const isRecordOwner = patient && (
      String(patient.vendorId) === parentUserId ||
      String(patient.vendorId) === currentUserId ||
      (req.user.businesses && req.user.businesses.some(b => String(b._id) === String(patient.vendorId) || String(b.id) === String(patient.vendorId)))
    );

    if (!patient || !isRecordOwner) {
      return res.status(404).json({ success: false, message: 'Patient not found or unauthorized' });
    }

    if (!type || !title || !doctorName) {
      return res.status(400).json({ success: false, message: 'Record type, title, and doctor name are required' });
    }

    const newRecord = {
      recordId: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      type,
      title,
      date: new Date().toISOString().split('T')[0],
      doctorName,
      fileName: fileName || `${type.replace(/ /g, '_')}_Record.pdf`,
      fileUrl: fileUrl || '#'
    };

    const updatedRecords = [...(patient.medicalRecords || []), newRecord];

    const updated = await Patient.findByIdAndUpdate(req.params.id, {
      $set: { medicalRecords: updatedRecords }
    }, { new: true });

    res.status(200).json({ success: true, message: 'Medical record added successfully', data: updated });
  } catch (error) {
    console.error('Add Patient Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error adding medical record' });
  }
};

const getBaseVendorTypeLocal = (vendorType, category, subcategory) => {
  if (!vendorType) return "Store Vendor";
  
  const type = vendorType.split(':')[0].trim();
  const cat = category || "";
  const subcat = subcategory || "";
  
  if (subcat === "Pharmacies" || subcat === "Pharmacy" || cat === "Pharmacy & Healthcare") {
    return "Pharmacy Vendor";
  }
  if (cat === "Healthcare Services" || subcat === "Hospitals" || subcat === "Clinics" || subcat === "Dental Care" || subcat === "Eye Care" || subcat === "Telemedicine") {
    if (subcat === "Pharmacies") return "Pharmacy Vendor";
    if (["Hospitals", "Clinics", "Dental Care", "Eye Care", "Telemedicine"].includes(subcat)) {
      return "Hospital Vendor";
    }
    if (["Ambulance Services", "Home Nursing", "Physiotherapy", "Health Checkups", "Medical Equipment", "Diagnostic Centers"].includes(subcat)) {
      return "Service Provider Vendor";
    }
    return "Hospital Vendor";
  }

  if (cat === "Education Services" || type === "Education") {
    return "Education Vendor";
  }

  if (type === "Jobs" || cat === "Jobs") {
    return "Job Vendor";
  }

  if (type === "Food" || cat === "Food") {
    return "Restaurant Vendor";
  }

  if (type === "Stay" || cat === "Stay") {
    return "Hotel Vendor";
  }

  if (type === "Travel" || type === "Services") {
    return "Service Provider Vendor";
  }

  if (type === "Products" || type === "Daily Needs") {
    if (cat === "Electronics" || cat === "IT & Office Equipment" || cat === "Home Appliances" || subcat.includes("Electronics")) {
      return "Electronics Vendor";
    }
    if (cat === "Furniture" || subcat.includes("Furniture")) {
      return "Home & Furniture Vendor";
    }
    if (type === "Daily Needs") {
      return "Grocery Vendor";
    }
    return "Store Vendor";
  }

  if (type === "Membership") {
    return "Store Vendor";
  }
  
  return vendorType;
};

// @desc    Add a new Business
// @route   POST /api/vendor/business
// @access  Private (Vendor)
const addBusiness = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const {
      vendorType,
      category,
      subcategory,
      businessName,
      // Separate Address Fields
      doorNo,
      village,
      taluk,
      district,
      state,
      pincode,
      phone,
      // Common Identity Details
      panNo,
      panDoc,
      aadhaarNo,
      aadhaarDoc,
      gstNumber,
      gstDoc,
      // Category Specific Documents
      categoryDocuments
    } = req.body;

    // 1. Validate Category
    if (!vendorType) {
      return res.status(400).json({ success: false, message: 'Business Category / Product or Service is required' });
    }

    const finalCategory = category || vendorType;
    const finalSubcategory = subcategory || vendorType;

    // 2. Validate Separate Address Fields
    const pinVal = String(pincode || req.body.pinCode || req.body.postalCode || '').trim();
    if (!pinVal || !/^\d{6}$/.test(pinVal)) {
      return res.status(400).json({ success: false, message: 'Pincode is required and must be exactly 6 numeric digits.' });
    }

    // Prevent duplicate business category registration regardless of pincode.
    // A duplicate exists if the vendor already has any business of the same category
    // that is NOT in a fully-rejected state.
    const REJECTED_STATUSES_LC = ['rejected', 'pincode rejected', 'kyc rejected'];
    const existingCategoryBusiness = user.businesses && user.businesses.find(b => {
      const bType = (b.vendorType || b.category || '').toLowerCase();
      const reqType = (vendorType || '').toLowerCase();
      const reqCat = (finalCategory || '').toLowerCase();
      const bStatus = String(b.status || '').toLowerCase();
      const matchesType = bType === reqType || bType === reqCat;
      const isRejected = REJECTED_STATUSES_LC.includes(bStatus);
      return matchesType && !isRejected;
    });
    if (existingCategoryBusiness) {
      const existingStatus = existingCategoryBusiness.status || 'Active';
      return res.status(400).json({
        success: false,
        message: `You already have a ${vendorType} business registration with status "${existingStatus}". You cannot register the same business category twice.`
      });
    }

    const cleanDoorNo = String(doorNo || '').trim();
    const cleanVillage = String(village || '').trim();
    const cleanTaluk = String(taluk || '').trim();
    const cleanDistrict = String(district || '').trim();
    const cleanState = String(state || '').trim();
    const cleanPhone = String(phone || user.mobileNumber || user.telephone || '').trim();

    if (!cleanDoorNo) {
      return res.status(400).json({ success: false, message: 'Door Number / Building Number is required.' });
    }
    if (!cleanVillage) {
      return res.status(400).json({ success: false, message: 'Village / Locality is required.' });
    }
    if (!cleanTaluk) {
      return res.status(400).json({ success: false, message: 'Taluk is required.' });
    }
    if (!cleanDistrict) {
      return res.status(400).json({ success: false, message: 'District is required.' });
    }
    if (!cleanState) {
      return res.status(400).json({ success: false, message: 'State is required.' });
    }
    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: 'Phone Number is required.' });
    }

    const fullAddress = `${cleanDoorNo}, ${cleanVillage}, ${cleanTaluk}, ${cleanDistrict}, ${cleanState} - ${pinVal}`;

    // 4. Validate Identity Details (Backend Mandatory Validation)
    const cleanPanNo = String(panNo || user.panNo || '').trim().toUpperCase();
    const cleanPanDoc = String(panDoc || user.panDoc || '').trim();
    const cleanAadhaarNo = String(aadhaarNo || user.aadhaarNo || '').trim();
    const cleanAadhaarDoc = String(aadhaarDoc || user.aadhaarDoc || '').trim();

    if (!cleanPanNo) {
      return res.status(400).json({ success: false, message: 'PAN Card Number is required.' });
    }
    if (!cleanPanDoc) {
      return res.status(400).json({ success: false, message: 'PAN Card Document upload is required.' });
    }
    if (!cleanAadhaarNo) {
      return res.status(400).json({ success: false, message: 'Aadhaar Number is required.' });
    }
    if (!cleanAadhaarDoc) {
      return res.status(400).json({ success: false, message: 'Aadhaar Document upload is required.' });
    }

    // 5. Category-Specific Mandatory Documents Backend Validation
    // Normalize categoryDocuments whether sent as an array or object
    const rawCatDocs = categoryDocuments || req.body.categoryDocs || [];
    const normalizedCatDocs = {};
    const catDocsArray = [];

    const registerDoc = (type, docUrl, docNumber, label) => {
      if (!type) return;
      const cleanType = String(type).trim();
      const cleanUrl = docUrl ? String(docUrl).trim() : '';
      const cleanNum = docNumber ? String(docNumber).trim() : '';
      const cleanLabel = label ? String(label).trim() : cleanType;

      const docObj = {
        type: cleanType,
        label: cleanLabel,
        docUrl: cleanUrl,
        docNumber: cleanNum,
        status: 'Pending'
      };

      normalizedCatDocs[cleanType] = docObj;
      if (cleanUrl) normalizedCatDocs[`${cleanType}Url`] = cleanUrl;
      if (cleanNum) normalizedCatDocs[`${cleanType}No`] = cleanNum;

      // Alias mapping for category documents
      if (/company_?reg/i.test(cleanType)) {
        normalizedCatDocs.companyRegDoc = cleanUrl;
        normalizedCatDocs.companyRegNo = cleanNum;
      }
      if (/food_?safety|fssai/i.test(cleanType)) {
        normalizedCatDocs.foodSafetyDoc = cleanUrl;
        normalizedCatDocs.foodSafetyLicenseNo = cleanNum;
      }
      if (/vehicle_?rc|^rc/i.test(cleanType)) {
        normalizedCatDocs.rcDoc = cleanUrl;
        normalizedCatDocs.rcNo = cleanNum;
      }
      if (/vehicle_?fitness|^fitness/i.test(cleanType)) {
        normalizedCatDocs.fitnessDoc = cleanUrl;
        normalizedCatDocs.fitnessNo = cleanNum;
      }
      if (/transport_?permit|^permit/i.test(cleanType)) {
        normalizedCatDocs.permitDoc = cleanUrl;
        normalizedCatDocs.permitNo = cleanNum;
      }
      if (/bis_?cert|^bis/i.test(cleanType)) {
        normalizedCatDocs.bisDoc = cleanUrl;
        normalizedCatDocs.bisNo = cleanNum;
      }

      catDocsArray.push(docObj);
    };

    if (Array.isArray(rawCatDocs)) {
      rawCatDocs.forEach(item => {
        if (!item) return;
        const type = item.type || item.key || item.name;
        const url = item.docUrl || item.url || item.documentUrl || item.fileUrl || item.doc || (typeof item === 'string' ? item : '');
        const num = item.docNumber || item.number || item.licenseNumber || '';
        const label = item.label || type;
        registerDoc(type, url, num, label);
      });
    } else if (typeof rawCatDocs === 'object') {
      Object.entries(rawCatDocs).forEach(([key, val]) => {
        if (!val) return;
        if (typeof val === 'object') {
          registerDoc(key, val.docUrl || val.url || val.documentUrl || val.fileUrl || val.doc, val.docNumber || val.number, val.label);
        } else {
          registerDoc(key, String(val), '', key);
        }
      });
    }

    const catDocs = normalizedCatDocs;
    const catLower = finalCategory.toLowerCase();

    // Food / Grocery / Daily Needs
    if (['food', 'restaurant', 'grocery', 'daily needs'].some(c => catLower.includes(c))) {
      if (!catDocs.foodSafetyDoc || !String(catDocs.foodSafetyDoc).trim()) {
        return res.status(400).json({ success: false, message: 'Food Safety License Document is required.' });
      }
      if (!catDocs.foodSafetyLicenseNo || !String(catDocs.foodSafetyLicenseNo).trim()) {
        return res.status(400).json({ success: false, message: 'Food Safety License Number is required.' });
      }
    }

    // Travel
    if (catLower.includes('travel')) {
      if (!catDocs.rcDoc || !String(catDocs.rcDoc).trim()) {
        return res.status(400).json({ success: false, message: 'Vehicle RC is required.' });
      }
      if (!catDocs.fitnessDoc || !String(catDocs.fitnessDoc).trim()) {
        return res.status(400).json({ success: false, message: 'Vehicle Fitness Certificate is required.' });
      }
      const fitnessNo = String(catDocs.fitnessNo || '').trim();
      if (!fitnessNo) {
        return res.status(400).json({ success: false, message: 'Vehicle Fitness Certificate Number is required.' });
      }
      if (fitnessNo.length < 15 || fitnessNo.length > 16 || !/^[A-Za-z0-9-]+$/.test(fitnessNo)) {
        return res.status(400).json({ success: false, message: 'Vehicle Fitness Certificate number must be between 15 and 16 characters.' });
      }

      if (!catDocs.permitDoc || !String(catDocs.permitDoc).trim()) {
        return res.status(400).json({ success: false, message: 'Transport Permit is required.' });
      }
      const permitNo = String(catDocs.permitNo || '').trim();
      if (!permitNo) {
        return res.status(400).json({ success: false, message: 'Transport / Route Permit Number is required.' });
      }
      if (permitNo.length < 13 || permitNo.length > 16 || !/^[A-Za-z0-9/-]+$/.test(permitNo)) {
        return res.status(400).json({ success: false, message: 'Transport / Route Permit number must be between 13 and 16 characters.' });
      }
    }

    // Property ID validation if supplied
    const propIdCandidate = req.body.propertyId || catDocs.propertyId || catDocs.property_id || (catDocs.property_id && catDocs.property_id.docNumber);
    if (propIdCandidate) {
      const cleanPropId = String(propIdCandidate).trim();
      if (!/^\d{13}$/.test(cleanPropId)) {
        return res.status(400).json({ success: false, message: 'Property ID must be exactly 13 numeric digits.' });
      }
    }

    // Job
    if (catLower.includes('job')) {
      if (!catDocs.companyRegDoc || !String(catDocs.companyRegDoc).trim()) {
        return res.status(400).json({ success: false, message: 'Company Registration Certificate is required.' });
      }
    }

    // Electronics
    if (catLower.includes('electronic')) {
      if (!catDocs.bisDoc || !String(catDocs.bisDoc).trim()) {
        return res.status(400).json({ success: false, message: 'BIS / CRS Certificate Document is required.' });
      }
    }

    // Validate that FSSAI and Insurance document numbers do not exceed 14 digits
    if (catDocs.foodSafetyLicenseNo && String(catDocs.foodSafetyLicenseNo).replace(/\D/g, '').length > 14) {
      return res.status(400).json({ success: false, message: 'Food Safety License (FSSAI) number cannot exceed 14 digits.' });
    }
    for (const [k, v] of Object.entries(catDocs)) {
      if (/fssai|foodsafety|insurance/i.test(k)) {
        const num = String(typeof v === 'object' ? (v.docNumber || v.number || '') : v).trim();
        if (num && num.replace(/\D/g, '').length > 14) {
          return res.status(400).json({
            success: false,
            message: `${/insurance/i.test(k) ? 'Insurance' : 'FSSAI'} number cannot exceed 14 digits.`
          });
        }
      }
      if (/vehicle_?fitness|^fitness/i.test(k)) {
        const num = String(typeof v === 'object' ? (v.docNumber || v.number || '') : v).trim();
        if (num && (num.length < 15 || num.length > 16 || !/^[A-Za-z0-9-]+$/.test(num))) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle Fitness Certificate number must be between 15 and 16 characters.'
          });
        }
      }
      if (/transport_?permit|^permit/i.test(k)) {
        const num = String(typeof v === 'object' ? (v.docNumber || v.number || '') : v).trim();
        if (num && (num.length < 13 || num.length > 16 || !/^[A-Za-z0-9/-]+$/.test(num))) {
          return res.status(400).json({
            success: false,
            message: 'Transport / Route Permit number must be between 13 and 16 characters.'
          });
        }
      }
    }

    // 6. Find Responsible Pincode Admin based on submitted Pincode
    const territoryInfo = { state: cleanState, district: cleanDistrict, taluk: cleanTaluk, pincode: pinVal };
    const pincodeAdmin = await findPincodeAdmin(pinVal, territoryInfo);

    // 7. Generate Business ID and Request ID
    const newBusinessId = new mongoose.Types.ObjectId().toString();
    const requestId = 'REQ-BIZ-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    const initialStatus = 'Pending Pincode Admin Review';
    const auditEntry = {
      previousStatus: 'Draft',
      newStatus: initialStatus,
      actor: user.name || 'Vendor',
      actorRole: 'Vendor',
      action: 'Business Registration Request Submitted',
      reason: 'Initial business registration with category-based documents',
      timestamp: new Date()
    };

    // 8. Add Business to user.businesses (INACTIVE, PENDING REVIEW)
    const newBusiness = {
      _id: newBusinessId,
      vendorType,
      category: finalCategory,
      subcategory: finalSubcategory,
      baseVendorType: getBaseVendorTypeLocal(vendorType, finalCategory, finalSubcategory),
      businessName: businessName || user.businessName || `${vendorType} Store`,
      doorNo: cleanDoorNo,
      village: cleanVillage,
      taluk: cleanTaluk,
      district: cleanDistrict,
      state: cleanState,
      pincode: pinVal,
      address: fullAddress,
      phone: cleanPhone,
      panNo: cleanPanNo,
      panDoc: cleanPanDoc,
      aadhaarNo: cleanAadhaarNo,
      aadhaarDoc: cleanAadhaarDoc,
      gstNumber: gstNumber ? String(gstNumber).trim().toUpperCase() : '',
      gstDoc: gstDoc ? String(gstDoc).trim() : '',
      categoryDocuments: catDocsArray.length > 0 ? catDocsArray : catDocs,
      assignedAdminId: pincodeAdmin.id,
      assignedAdminName: pincodeAdmin.name,
      assignedAdminRole: pincodeAdmin.role,
      assignedAdminPincode: pincodeAdmin.pincode,
      assignedAt: new Date(),
      status: initialStatus,
      isActive: false, // NOT ACTIVE until approved!
      auditTrail: [auditEntry],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.businesses) user.businesses = [];
    user.businesses.push(newBusiness);
    user.markModified('businesses');
    await user.save();

    // 9. Create record in BusinessRequest / onboarding_requests
    const requestData = {
      requestId,
      vendorId: parentUserId.toString(),
      vendorName: user.name || user.businessName,
      vendorEmail: user.email,
      vendorPhone: cleanPhone,
      businessId: newBusinessId,
      businessName: newBusiness.businessName,
      businessCategory: finalCategory,
      vendorType,
      subcategory: finalSubcategory,
      phone: newBusiness.phone,
      doorNo: newBusiness.doorNo,
      village: newBusiness.village,
      taluk: newBusiness.taluk,
      district: newBusiness.district,
      state: newBusiness.state,
      pincode: pinVal,
      address: fullAddress,
      panNo: newBusiness.panNo,
      panDoc: newBusiness.panDoc,
      aadhaarNo: newBusiness.aadhaarNo,
      aadhaarDoc: newBusiness.aadhaarDoc,
      gstNumber: newBusiness.gstNumber,
      gstDoc: newBusiness.gstDoc,
      categoryDocuments: catDocsArray.length > 0 ? catDocsArray : catDocs,
      assignedAdminId: pincodeAdmin.id,
      assignedAdminName: pincodeAdmin.name,
      assignedAdminRole: pincodeAdmin.role,
      assignedAdminPincode: pincodeAdmin.pincode,
      assignedAt: new Date(),
      status: initialStatus,
      auditTrail: [auditEntry],
      submittedDate: new Date()
    };

    await BusinessRequest.create(requestData);

    // Also sync to kyc_records collection for KYC Team visibility
    try {
      const db = mongoose.connection.db;
      await db.collection('kyc_records').insertOne({
        _id: 'KYC-' + newBusinessId,
        id: 'KYC-' + newBusinessId,
        requestId,
        vendorId: parentUserId.toString(),
        businessId: newBusinessId,
        businessName: newBusiness.businessName,
        name: user.name,
        vendorName: user.name,
        phone: newBusiness.phone,
        email: user.email,
        category: finalCategory,
        address: fullAddress,
        doorNo: newBusiness.doorNo,
        village: newBusiness.village,
        taluk: newBusiness.taluk,
        district: newBusiness.district,
        state: newBusiness.state,
        pincode: pinVal,
        status: initialStatus,
        assignedAdmin: pincodeAdmin,
        documents: {
          panNo: newBusiness.panNo,
          panDoc: newBusiness.panDoc,
          aadhaarNo: newBusiness.aadhaarNo,
          aadhaarDoc: newBusiness.aadhaarDoc,
          gstNumber: newBusiness.gstNumber,
          gstDoc: newBusiness.gstDoc,
          categoryDocuments: catDocs
        },
        submittedDate: new Date(),
        type: 'Business Registration Request'
      });
    } catch (kErr) {
      console.warn('KYC record sync warning:', kErr.message);
    }

    // 10. Audit log in auditlogs
    try {
      const db = mongoose.connection.db;
      await db.collection('auditlogs').insertOne({
        userId: parentUserId.toString(),
        userEmail: user.email,
        userRole: 'Vendor',
        action: 'business_registration_requested',
        status: 'success',
        details: `Vendor submitted registration request for business: ${newBusiness.businessName} (${finalCategory}) at pincode ${pinVal}. Assigned to Pincode Admin: ${pincodeAdmin.name}`,
        businessId: newBusinessId,
        requestId,
        pincode: pinVal,
        assignedAdmin: pincodeAdmin,
        timestamp: new Date()
      });
    } catch (aErr) {
      console.warn('Audit log write warning:', aErr.message);
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.id = user._id;

    res.status(201).json({
      success: true,
      message: `Business registration request submitted successfully! Assigned to Pincode Admin (${pincodeAdmin.name}) for review.`,
      isPendingApproval: true,
      status: initialStatus,
      assignedAdmin: pincodeAdmin,
      newBusinessId,
      requestId,
      user: userResponse
    });
  } catch (error) {
    console.error('Add Business Error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting business request: ' + (error.message || 'Unknown error') });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const businessId = req.params.id;

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    // Check if they are trying to delete their active/primary business
    if (user.primaryBusinessId === businessId) {
      return res.status(400).json({ success: false, message: 'Cannot delete the primary/active business profile. Switch to another profile first.' });
    }

    // Pull from user.businesses
    user.businesses = user.businesses.filter(b => b._id !== businessId);
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.id = user._id;

    res.status(200).json({
      success: true,
      message: 'Business deleted successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Delete Business Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting business' });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const businessId = req.params.id;
    const { businessName, vendorType, address, pincode, phone, category, subcategory, street, city, state, country, panNo, aadhaarNo, companyRegNo, logo, businessLicense, bankName, accountHolderName, accountNo, ifscCode, swiftCode } = req.body;

    let pinVal = pincode || req.body.pinCode || req.body.postalCode;
    if (pinVal !== undefined && pinVal !== null) {
      const cleanPin = String(pinVal).replace(/\D/g, '').slice(0, 6);
      if (cleanPin.length === 6) {
        pinVal = cleanPin;
      }
    }
    let cleanPhone = phone;
    if (cleanPhone !== undefined && cleanPhone !== null) {
      let digits = String(cleanPhone).replace(/\D/g, '');
      if (digits.length > 10 && digits.startsWith('91')) {
        digits = digits.slice(-10);
      }
      if (digits.length === 10) {
        cleanPhone = digits;
      }
    }

    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    if (!user.businesses) user.businesses = [];

    // 1. Try finding in user.businesses by _id or id
    let biz = user.businesses.find(b => 
      b && (String(b._id) === String(businessId) || String(b.id) === String(businessId))
    );

    if (biz) {
      if (businessName !== undefined) biz.businessName = businessName;
      if (vendorType) {
        biz.vendorType = vendorType;
        biz.category = category || vendorType;
        biz.subcategory = subcategory || vendorType;
        biz.baseVendorType = getBaseVendorTypeLocal(vendorType, biz.category, biz.subcategory);
      }
      if (address !== undefined) biz.address = address;
      if (street !== undefined) biz.street = street;
      if (city !== undefined) biz.city = city;
      if (state !== undefined) biz.state = state;
      if (country !== undefined) biz.country = country;
      if (pinVal !== undefined) {
        biz.pincode = pinVal;
        biz.postalCode = pinVal;
      }
      if (cleanPhone !== undefined) biz.phone = cleanPhone;
      if (panNo !== undefined) biz.panNo = panNo;
      if (aadhaarNo !== undefined) biz.aadhaarNo = aadhaarNo;
      if (companyRegNo !== undefined) biz.companyRegNo = companyRegNo;
      if (logo !== undefined) biz.logo = logo;
      if (businessLicense !== undefined) biz.businessLicense = businessLicense;
      if (bankName !== undefined) biz.bankName = bankName;
      if (accountHolderName !== undefined) biz.accountHolderName = accountHolderName;
      if (accountNo !== undefined) biz.accountNo = accountNo;
      if (ifscCode !== undefined) biz.ifscCode = ifscCode;
      if (swiftCode !== undefined) biz.swiftCode = swiftCode;

      // If updating primary/active business or the only business, also update top-level user fields
      if (!user.primaryBusinessId || String(user.primaryBusinessId) === String(biz._id) || String(user.primaryBusinessId) === String(biz.id) || user.businesses.length === 1) {
        if (businessName !== undefined) user.businessName = businessName;
        if (vendorType) user.vendorType = vendorType;
        if (address !== undefined) user.address = address;
        if (street !== undefined) user.street = street;
        if (city !== undefined) user.city = city;
        if (state !== undefined) user.state = state;
        if (country !== undefined) user.country = country;
        if (pinVal !== undefined) {
          user.pincode = pinVal;
          user.postalCode = pinVal;
        }
        if (cleanPhone !== undefined) user.mobileNumber = cleanPhone;
        if (panNo !== undefined) user.panNo = panNo;
        if (aadhaarNo !== undefined) user.aadhaarNo = aadhaarNo;
        if (companyRegNo !== undefined) user.companyRegNo = companyRegNo;
        if (logo !== undefined) user.logo = logo;
        if (businessLicense !== undefined) user.businessLicense = businessLicense;
      }

      user.markModified('businesses');
      await user.save();

      const userResp = user.toObject();
      delete userResp.password;
      userResp.id = user._id;

      return res.json({
        success: true,
        message: 'Business profile updated successfully!',
        user: userResp,
        data: userResp,
        updatedBusiness: biz
      });
    }

    // 2. Fallback: Update main user object directly if businessId is 'primary', 'undefined', 'null', or matches user._id
    if (!businessId || businessId === 'primary' || businessId === 'undefined' || businessId === 'null' || String(user._id) === String(businessId) || String(user.id) === String(businessId)) {
      if (businessName !== undefined) user.businessName = businessName;
      if (vendorType) user.vendorType = vendorType;
      if (address !== undefined) user.address = address;
      if (street !== undefined) user.street = street;
      if (city !== undefined) user.city = city;
      if (state !== undefined) user.state = state;
      if (country !== undefined) user.country = country;
      if (pinVal !== undefined) {
        user.pincode = pinVal;
        user.postalCode = pinVal;
      }
      if (cleanPhone !== undefined) user.mobileNumber = cleanPhone;
      if (panNo !== undefined) user.panNo = panNo;
      if (aadhaarNo !== undefined) user.aadhaarNo = aadhaarNo;
      if (companyRegNo !== undefined) user.companyRegNo = companyRegNo;
      if (logo !== undefined) user.logo = logo;
      if (businessLicense !== undefined) user.businessLicense = businessLicense;

      // Update first/matching entry in user.businesses if present
      if (user.businesses.length > 0) {
        const primBiz = user.businesses.find(b => b && (String(b._id) === String(user.primaryBusinessId) || String(b.id) === String(user.primaryBusinessId))) || user.businesses[0];
        if (primBiz) {
          if (businessName !== undefined) primBiz.businessName = businessName;
          if (vendorType) {
            primBiz.vendorType = vendorType;
            primBiz.category = category || vendorType;
            primBiz.subcategory = subcategory || vendorType;
            primBiz.baseVendorType = getBaseVendorTypeLocal(vendorType, primBiz.category, primBiz.subcategory);
          }
          if (address !== undefined) primBiz.address = address;
          if (street !== undefined) primBiz.street = street;
          if (city !== undefined) primBiz.city = city;
          if (state !== undefined) primBiz.state = state;
          if (country !== undefined) primBiz.country = country;
          if (pinVal !== undefined) {
            primBiz.pincode = pinVal;
            primBiz.postalCode = pinVal;
          }
          if (cleanPhone !== undefined) primBiz.phone = cleanPhone;
          if (panNo !== undefined) primBiz.panNo = panNo;
          if (aadhaarNo !== undefined) primBiz.aadhaarNo = aadhaarNo;
          if (companyRegNo !== undefined) primBiz.companyRegNo = companyRegNo;
          user.markModified('businesses');
        }
      }

      await user.save();

      const userResp = user.toObject();
      delete userResp.password;
      userResp.id = user._id;

      return res.json({
        success: true,
        message: 'Business profile updated successfully!',
        user: userResp,
        data: userResp
      });
    }

    return res.status(404).json({ success: false, message: 'Business profile not found' });
  } catch (error) {
    console.error('Update Business Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating business: ' + error.message });
  }
};

// @desc    Get Sales Payments across ALL categories for the vendor
// @route   GET /api/vendor/payments/sales
// @access  Private (Vendor)
const getSalesPayments = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const user = await getVendorUserCached(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [
      parentUserId.toString(),
      ...(user.vendorId ? [String(user.vendorId)] : []),
      ...(user.registrationId ? [String(user.registrationId)] : []),
      ...(user._id ? [String(user._id)] : [])
    ];
    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
        if (b.id) businessIds.push(b.id.toString());
        if (b.vendorId) businessIds.push(String(b.vendorId));
      });
    }
    const uniqueBusinessIds = [...new Set(businessIds.filter(Boolean))];
    const objectIds = uniqueBusinessIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const allMatchIds = [...uniqueBusinessIds, ...objectIds];

    // Platform commission configuration (cached)
    const config = await getPlatformConfigCached();
    const defaultRate = Number(config.commissionRate) || 0;

    // Build base query across ALL vendor businesses and order categories
    const query = {
      $or: [
        { vendorId: { $in: allMatchIds } },
        { vendor_id: { $in: allMatchIds } },
        { 'items.vendorId': { $in: allMatchIds } },
        { 'items.vendor_id': { $in: allMatchIds } }
      ]
    };

    // Category filter
    if (req.query.category && !['All', 'all', ''].includes(String(req.query.category).trim())) {
      const catParam = String(req.query.category).trim();
      const catRegex = new RegExp(`^${catParam}$`, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { type: catRegex },
          { category: catRegex },
          { subNavbarCategory: catRegex }
        ]
      });
    }

    // Search query
    if (req.query.search && String(req.query.search).trim() !== '') {
      const term = String(req.query.search).trim();
      const searchRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { transactionId: searchRegex },
          { order_number: searchRegex },
          { id: searchRegex },
          { memberName: searchRegex },
          { customer_name: searchRegex },
          { 'items.name': searchRegex },
          { product_details: searchRegex }
        ]
      });
    }

    // Date range / Duration filter in IST timezone (UTC+05:30)
    const duration = req.query.duration || 'All';
    let startDate = null;
    let endDate = null;

    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDay = istNow.getUTCDate();
    const istDayOfWeek = istNow.getUTCDay(); // 0 is Sunday

    if (duration === 'Today') {
      startDate = new Date(Date.UTC(istYear, istMonth, istDay, 0, 0, 0, 0) - istOffsetMs);
      endDate = new Date(Date.UTC(istYear, istMonth, istDay, 23, 59, 59, 999) - istOffsetMs);
    } else if (duration === 'This Week') {
      const diffToMonday = istDayOfWeek === 0 ? 6 : istDayOfWeek - 1;
      startDate = new Date(Date.UTC(istYear, istMonth, istDay - diffToMonday, 0, 0, 0, 0) - istOffsetMs);
      endDate = new Date(Date.UTC(istYear, istMonth, istDay - diffToMonday + 6, 23, 59, 59, 999) - istOffsetMs);
    } else if (duration === 'This Month') {
      startDate = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0) - istOffsetMs);
      endDate = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffsetMs);
    } else if (duration === 'This Year') {
      startDate = new Date(Date.UTC(istYear, 0, 1, 0, 0, 0, 0) - istOffsetMs);
      endDate = new Date(Date.UTC(istYear, 11, 31, 23, 59, 59, 999) - istOffsetMs);
    } else if (duration === 'Custom') {
      if (req.query.startDate) {
        const parts = String(req.query.startDate).split('-');
        if (parts.length === 3) {
          startDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0) - istOffsetMs);
        } else {
          startDate = new Date(req.query.startDate);
          startDate.setHours(0, 0, 0, 0);
        }
      }
      if (req.query.endDate) {
        const parts = String(req.query.endDate).split('-');
        if (parts.length === 3) {
          endDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999) - istOffsetMs);
        } else {
          endDate = new Date(req.query.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }
    }

    // Fetch all matching orders sorted newest first
    const allOrders = await Order.find(query).sort({ created_at: -1, createdAt: -1, _id: -1 }).lean();

    // Deduplicate orders by _id to avoid any duplicate payment rows
    const seenOrderIds = new Set();
    let uniqueOrders = [];
    for (const o of allOrders) {
      const oId = String(o._id);
      if (!seenOrderIds.has(oId)) {
        seenOrderIds.add(oId);
        uniqueOrders.push(o);
      }
    }

    // Apply date range / Duration filter accurately in memory to handle both Date objects and ISO strings
    if (startDate || endDate) {
      const startMs = startDate ? startDate.getTime() : -Infinity;
      const endMs = endDate ? endDate.getTime() : Infinity;
      uniqueOrders = uniqueOrders.filter(o => {
        const rawDate = o.paidAt || o.paymentDate || o.createdAt || o.created_at || o.orderDate || o.date;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        const t = d.getTime();
        if (isNaN(t)) return false;
        return t >= startMs && t <= endMs;
      });
    }

    const customerLookup = await buildCustomerLookupForOrders(uniqueOrders);

    // Map each order to standard Sales Payment record
    const mappedRecords = uniqueOrders.map((o) => {
      const orderDate = o.createdAt || o.created_at || new Date();
      const saleAmount = Number(o.totalAmount || o.finalAmount || o.amount || 0);
      const discount = Number(o.discountApplied || o.discount || 0);
      const effectiveRate = o.commissionRate !== undefined ? Number(o.commissionRate) : defaultRate;
      const commissionAmount = o.commissionAmount !== undefined 
        ? Number(o.commissionAmount) 
        : Math.round(saleAmount * (effectiveRate / 100));
      const vendorNet = saleAmount - commissionAmount - (o.otherDeductions || 0);

      const matchedPayment = customerLookup.paymentsByOrderId ? customerLookup.paymentsByOrderId[String(o._id)] : null;

      // Determine standardized payment status: 'Successful', 'Failed', 'Hold'
      const rawPayStatus = (o.paymentStatus || o.payment_status || (matchedPayment ? matchedPayment.status : '') || '').toLowerCase();
      const rawStatus = (o.status || '').toLowerCase();
      const isCod = (o.paymentMethod || o.payment_method || '').toLowerCase().includes('cash') || (o.paymentMethod || o.payment_method || '').toLowerCase().includes('cod');

      let paymentStatus = 'Hold';
      if (rawPayStatus === 'failed' || ['cancelled', 'rejected', 'failed'].includes(rawStatus)) {
        paymentStatus = 'Failed';
      } else if (rawPayStatus === 'paid' || rawPayStatus === 'successful' || rawPayStatus === 'completed' || ['delivered', 'completed', 'checked out'].includes(rawStatus) || (matchedPayment && matchedPayment.status === 'PAID')) {
        paymentStatus = (isCod && !['delivered', 'completed', 'checked out'].includes(rawStatus)) ? 'Hold' : 'Successful';
      } else {
        paymentStatus = 'Hold';
      }

      // Business category normalized
      let category = o.type || o.category || 'Product';
      const detailStr = String(o.product_details || (o.items && o.items[0]?.name) || '');
      if (/car|bus|bike|travel|cab|transport/i.test(category) || /car|bus|bike|travel|cab|transport/i.test(detailStr) || (o.items && o.items.some(it => /car|bus|bike|travel|cab|transport/i.test(it?.name || '')))) {
        category = 'Travel';
      } else if (/stay|hotel|room|resort/i.test(category) || /room|suite|villa|resort|hotel/i.test(detailStr)) {
        category = 'Stay';
      } else if (/food|restaurant/i.test(category) || /food|biryani|pizza|burger/i.test(detailStr)) {
        category = 'Food';
      } else if (/daily/i.test(category)) {
        category = 'Daily Needs';
      } else if (/service/i.test(category) || o.doctorName) {
        category = 'Services';
      } else if (/job/i.test(category)) {
        category = 'Jobs';
      } else {
        category = 'Product';
      }

      // Item Name / Description
      let itemName = 'Item Purchase';
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        itemName = o.items.map(it => `${it.name}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(', ');
      } else if (o.product_details) {
        itemName = o.product_details;
      } else if (o.doctorName) {
        itemName = `Dr. ${o.doctorName} Consultation`;
      } else if (o.roomNumber) {
        itemName = `Room #${o.roomNumber} Booking`;
      } else if (o.travelDate || o.departureDate) {
        itemName = `Travel Booking (${o.boardingPoint || 'Station'} to ${o.dropPoint || 'Destination'})`;
      } else if (o.jobLocation || o.candidateEmail) {
        itemName = `Job Application Processing - ${o.jobLocation || 'Career'}`;
      }

      // Customer Reference
      const custName = o.memberName || o.customer_name || 'Customer';
      const custPhone = (o.customer_phone || o.phone || '').toString().replace(/[^0-9]/g, '');
      const custEmail = (o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || '').trim().toLowerCase();
      const custNameClean = custName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      let realCustId = (matchedPayment?.recipientId && matchedPayment.recipientId !== 'FIC-CUST-100001')
        ? matchedPayment.recipientId
        : (customerLookup.byOrderId && customerLookup.byOrderId[String(o._id)])
        ? customerLookup.byOrderId[String(o._id)]
        : (o.customerId && o.customerId !== 'FIC-CUST-100001')
        ? o.customerId
        : (o.customerDisplayId && o.customerDisplayId !== 'FIC-CUST-100001')
        ? o.customerDisplayId
        : null;

      if (!realCustId) {
        if (custPhone.length >= 10 && customerLookup.byPhone[custPhone.slice(-10)]) {
          realCustId = customerLookup.byPhone[custPhone.slice(-10)];
        } else if (custEmail && customerLookup.byEmail[custEmail]) {
          realCustId = customerLookup.byEmail[custEmail];
        } else if (custNameClean && customerLookup.byName[custNameClean]) {
          realCustId = customerLookup.byName[custNameClean];
        } else if (o.memberId && customerLookup.byId[String(o.memberId)]) {
          realCustId = customerLookup.byId[String(o.memberId)];
        }
      }

      const maskedPhone = custPhone.length >= 4 
        ? `${'*'.repeat(Math.max(0, custPhone.length - 4))}${custPhone.slice(-4)}`
        : '';
      const customerRef = realCustId || (custPhone ? `${custName} (${maskedPhone})` : custName);

      // Preserve genuine transaction ID from payments collection or order
      const txnId = matchedPayment?.transactionReference || matchedPayment?.paymentId || o.transactionId || o.razorpayPaymentId || o.walletTxnId || o.paymentReference || null;
      const paymentDate = matchedPayment?.paymentDate || o.paidAt || orderDate;

      return {
        _id: o._id,
        transactionId: txnId,
        orderId: o.order_number || o.id || o._id,
        saleDate: orderDate,
        paymentDate: paymentDate,
        category,
        itemName,
        customerName: custName,
        customerReference: customerRef,
        saleAmount,
        commission: commissionAmount,
        commissionRate: effectiveRate,
        deductions: discount,
        vendorReceivedAmount: Math.max(0, vendorNet),
        paymentStatus,
        paymentMethod: o.paymentMethod || o.payment_method || (isCod ? 'Cash on Delivery' : 'Online (Wallet / UPI)'),
        rawStatus: o.status,
        items: o.items || []
      };
    });

    // Apply status filter if specified
    const statusFilter = req.query.status || 'All';
    let filteredRecords = mappedRecords;
    if (statusFilter !== 'All') {
      filteredRecords = mappedRecords.filter(r => r.paymentStatus.toLowerCase() === statusFilter.toLowerCase());
    }

    // Category-wise totals based on REAL vendor data
    const categoryTotals = {};
    filteredRecords.forEach(r => {
      if (!categoryTotals[r.category]) {
        categoryTotals[r.category] = {
          category: r.category,
          totalSales: 0,
          totalCommission: 0,
          totalVendorReceived: 0,
          count: 0
        };
      }
      categoryTotals[r.category].totalSales += r.saleAmount;
      categoryTotals[r.category].totalCommission += r.commission;
      categoryTotals[r.category].totalVendorReceived += r.vendorReceivedAmount;
      categoryTotals[r.category].count += 1;
    });

    // Summary totals
    const totalSales = filteredRecords.reduce((sum, r) => sum + r.saleAmount, 0);
    const totalCommission = filteredRecords.reduce((sum, r) => sum + r.commission, 0);
    const totalVendorReceived = filteredRecords.reduce((sum, r) => sum + r.vendorReceivedAmount, 0);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const totalCount = filteredRecords.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      data: paginatedRecords,
      totalCount,
      page,
      totalPages,
      summary: {
        totalSales,
        totalCommission,
        totalVendorReceived,
        count: totalCount
      },
      categoryTotals: Object.values(categoryTotals),
      period: {
        duration,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Get Sales Payments Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving sales payments: ' + error.message });
  }
};

// @desc    Get Business Requests for logged in vendor
// @route   GET /api/vendor/business-requests
// @access  Private (Vendor)
const getBusinessRequests = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const requests = await BusinessRequest.find({ vendorId: parentUserId.toString() }).sort({ submittedDate: -1 }).lean();
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('Get Business Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving requests: ' + error.message });
  }
};

// @desc    Resubmit Business Request (when KYC changes required)
// @route   PUT /api/vendor/business-requests/:id/resubmit
// @access  Private (Vendor)
const resubmitBusinessRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const request = await BusinessRequest.findOne({
      $or: [{ _id: id }, { businessId: id }, { requestId: id }],
      vendorId: parentUserId.toString()
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Business request not found' });
    }

    const {
      doorNo, village, taluk, district, state, pincode, phone,
      panNo, panDoc, aadhaarNo, aadhaarDoc, gstNumber, gstDoc,
      categoryDocuments
    } = req.body;

    if (doorNo) request.doorNo = doorNo;
    if (village) request.village = village;
    if (taluk) request.taluk = taluk;
    if (district) request.district = district;
    if (state) request.state = state;
    if (pincode) request.pincode = pincode;
    if (phone) request.phone = phone;
    if (panNo) request.panNo = panNo;
    if (panDoc) request.panDoc = panDoc;
    if (aadhaarNo) request.aadhaarNo = aadhaarNo;
    if (aadhaarDoc) request.aadhaarDoc = aadhaarDoc;
    if (gstNumber !== undefined) request.gstNumber = gstNumber;
    if (gstDoc !== undefined) request.gstDoc = gstDoc;
    if (categoryDocuments) {
      request.categoryDocuments = { ...(request.categoryDocuments || {}), ...categoryDocuments };
    }

    const previousStatus = request.status;
    request.status = 'KYC Pending';
    request.changesRequiredReason = '';
    request.auditTrail.push({
      previousStatus,
      newStatus: 'KYC Pending',
      actor: req.user.name || 'Vendor',
      actorRole: 'Vendor',
      action: 'Resubmitted with requested changes',
      timestamp: new Date()
    });

    await request.save();

    // Also update in User.businesses
    const user = await User.findById(parentUserId);
    if (user && user.businesses) {
      const bIdx = user.businesses.findIndex(b => b._id.toString() === request.businessId.toString());
      if (bIdx !== -1) {
        user.businesses[bIdx].status = 'KYC Pending';
        user.businesses[bIdx].changesRequiredReason = '';
        if (panDoc) user.businesses[bIdx].panDoc = panDoc;
        if (aadhaarDoc) user.businesses[bIdx].aadhaarDoc = aadhaarDoc;
        if (categoryDocuments) {
          user.businesses[bIdx].categoryDocuments = { ...(user.businesses[bIdx].categoryDocuments || {}), ...categoryDocuments };
        }
        user.markModified('businesses');
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Business documents resubmitted successfully! Returned to KYC queue for verification.',
      data: request
    });
  } catch (error) {
    console.error('Resubmit Business Request Error:', error);
    res.status(500).json({ success: false, message: 'Server error resubmitting request: ' + error.message });
  }
};

// @route   GET /api/vendor/products/:id/sales-insights
// @desc    Get real-time sales insights, total sold, revenue, and customer history for a product
const getProductSalesInsights = async (req, res) => {
  try {
    const parentUserId = (req.user.parentUserId || req.user._id).toString();
    const user = await User.findById(parentUserId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const targetProdId = req.params.id;
    if (!targetProdId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(targetProdId)) {
      product = await Product.findById(targetProdId).lean();
    }
    if (!product) {
      product = await Product.findOne({ $or: [{ _id: targetProdId }, { id: targetProdId }] }).lean();
    }

    // Ownership check IDs
    const allowedBizIds = new Set([
      parentUserId,
      (user._id || '').toString(),
      (user.vendorId || '').toString(),
      (user.registrationId || '').toString(),
      ...(user.businesses || []).map(b => (b._id || b.id || '').toString()).filter(Boolean)
    ]);

    if (!product) {
      // Check if product exists in vendor's orders before falling back
      const orderWithItem = await Order.findOne({
        $or: [
          { vendorId: { $in: Array.from(allowedBizIds) } },
          { vendor_id: { $in: Array.from(allowedBizIds) } }
        ],
        $or: [
          { 'items.productId': targetProdId },
          { 'items.id': targetProdId },
          { 'items._id': targetProdId },
          { productId: targetProdId }
        ]
      }).lean();

      if (orderWithItem) {
        const itemObj = (orderWithItem.items || []).find(i => String(i.productId || i.id || i._id) === String(targetProdId)) || {};
        product = {
          _id: targetProdId,
          name: itemObj.name || orderWithItem.product_details || 'Catalog Item',
          price: itemObj.price || 0,
          category: itemObj.category || orderWithItem.category || 'Products',
          vendorId: orderWithItem.vendorId || parentUserId
        };
      } else {
        // Return 200 with empty sales insights instead of 404
        return res.status(200).json({
          success: true,
          data: {
            productId: targetProdId,
            productName: 'Catalog Item',
            totalSold: 0,
            totalRevenue: 0,
            recentCustomers: []
          }
        });
      }
    }

    const prodVendorId = (product.vendorId || product.vendor_id || product.vendor || '').toString();
    if (prodVendorId && !allowedBizIds.has(prodVendorId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Product belongs to another vendor' });
    }

    const prodIdStr = product._id.toString();
    const prodName = (product.name || '').trim();
    const prodIdObj = mongoose.Types.ObjectId.isValid(prodIdStr) ? new mongoose.Types.ObjectId(prodIdStr) : null;

    const orderQuery = {
      $and: [
        {
          $or: [
            { vendorId: { $in: Array.from(allowedBizIds) } },
            { vendor_id: { $in: Array.from(allowedBizIds) } }
          ]
        },
        {
          $or: [
            { 'items.productId': prodIdStr },
            ...(prodIdObj ? [{ 'items.productId': prodIdObj }] : []),
            { 'items.id': prodIdStr },
            { 'items._id': prodIdStr },
            ...(prodIdObj ? [{ 'items._id': prodIdObj }] : []),
            { productId: prodIdStr },
            ...(prodName ? [
              { 'items.name': new RegExp('^' + prodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
              { product_details: new RegExp('^' + prodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
            ] : [])
          ]
        },
        {
          status: { $nin: ['Cancelled', 'cancelled', 'Rejected', 'rejected', 'Failed', 'failed'] }
        }
      ]
    };

    const orders = await Order.find(orderQuery).sort({ createdAt: -1, created_at: -1 }).lean();
    const customerLookup = await buildCustomerLookupForOrders(orders);

    let totalSold = 0;
    let totalRevenue = 0;
    const recentCustomers = [];

    for (const o of orders) {
      let itemQty = 0;
      let itemRev = 0;

      if (Array.isArray(o.items) && o.items.length > 0) {
        for (const item of o.items) {
          const matchesId = (item.productId && (String(item.productId) === prodIdStr || String(item.productId) === String(product.id))) ||
                            (item.id && String(item.id) === prodIdStr) ||
                            (item._id && String(item._id) === prodIdStr);
          const matchesName = prodName && item.name && item.name.trim().toLowerCase() === prodName.toLowerCase();
          if (matchesId || matchesName) {
            const q = Number(item.quantity || item.qty || 1);
            const p = Number(item.price || product.price || 0);
            itemQty += q;
            itemRev += (p * q);
          }
        }
      }

      if (itemQty === 0) {
        const matchesProdId = (o.productId && String(o.productId) === prodIdStr);
        const matchesName = prodName && o.product_details && o.product_details.trim().toLowerCase() === prodName.toLowerCase();
        if (matchesProdId || matchesName) {
          const q = Number(o.quantity || 1);
          const p = Number(o.finalAmount || o.totalAmount || o.amount || product.price || 0);
          itemQty += q;
          itemRev += p;
        }
      }

      if (itemQty > 0) {
        totalSold += itemQty;
        totalRevenue += itemRev;

        const oPhone = (o.customer_phone || o.phone || '').toString().replace(/[^0-9]/g, '');
        const oEmail = (o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || '').trim().toLowerCase();
        const oName = (o.memberName || o.customer_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        let matchedCust = null;
        if (customerLookup && customerLookup.entitiesById) {
          matchedCust = (o.memberId && customerLookup.entitiesById[String(o.memberId)]) ||
                        (o.customer_id && customerLookup.entitiesById[String(o.customer_id)]) ||
                        (o.customerId && customerLookup.entitiesById[String(o.customerId)]) ||
                        (oPhone && oPhone.length >= 10 && customerLookup.entitiesByPhone[oPhone.slice(-10)]) ||
                        (oEmail && customerLookup.entitiesByEmail[oEmail]) ||
                        (oName && customerLookup.entitiesByName[oName]) || null;
        }

        const resolvedCustomerName = (() => {
          if (matchedCust?.name && matchedCust.name.trim().toLowerCase() !== 'customer' && matchedCust.name.trim().toLowerCase() !== 'connect member') {
            return matchedCust.name.trim();
          }
          if (o.memberName && o.memberName.trim().toLowerCase() !== 'customer' && o.memberName.trim().toLowerCase() !== 'connect member') {
            return o.memberName.trim();
          }
          if (o.customer_name && o.customer_name.trim().toLowerCase() !== 'customer' && o.customer_name.trim().toLowerCase() !== 'connect member') {
            return o.customer_name.trim();
          }
          if (matchedCust?.email && matchedCust.email.includes('@')) {
            const prefix = matchedCust.email.split('@')[0];
            return prefix.charAt(0).toUpperCase() + prefix.slice(1);
          }
          if (oEmail && oEmail.includes('@')) {
            const prefix = oEmail.split('@')[0];
            return prefix.charAt(0).toUpperCase() + prefix.slice(1);
          }
          return 'Customer details unavailable';
        })();

        let cId = matchedCust?.customerId || matchedCust?.registrationId || (String(matchedCust?._id).startsWith('FIC-CUST-') ? String(matchedCust._id) : null);
        if (!cId || cId === 'FIC-CUST-100001') {
          if (o.customerDisplayId && (String(o.customerDisplayId).startsWith('FIC-CUS-') || String(o.customerDisplayId).startsWith('FIC-CUST-')) && o.customerDisplayId !== 'FIC-CUST-100001') {
            cId = String(o.customerDisplayId);
          } else if (o.customerId && (String(o.customerId).startsWith('FIC-CUS-') || String(o.customerId).startsWith('FIC-CUST-')) && o.customerId !== 'FIC-CUST-100001') {
            cId = String(o.customerId);
          } else if (o.customer_id && (String(o.customer_id).startsWith('FIC-CUS-') || String(o.customer_id).startsWith('FIC-CUST-')) && o.customer_id !== 'FIC-CUST-100001') {
            cId = String(o.customer_id);
          } else if (o.memberId && (String(o.memberId).startsWith('FIC-CUS-') || String(o.memberId).startsWith('FIC-CUST-')) && o.memberId !== 'FIC-CUST-100001') {
            cId = String(o.memberId);
          } else if (matchedCust?.registrationId && matchedCust.registrationId !== 'FIC-CUST-100001') {
            cId = String(matchedCust.registrationId);
          } else {
            cId = 'N/A';
          }
        }

        const effectiveDate = o.createdAt || o.created_at || o.orderDate || o.date;
        let formattedDate = 'N/A';
        if (effectiveDate) {
          const d = new Date(effectiveDate);
          formattedDate = isNaN(d.getTime()) ? String(effectiveDate) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        recentCustomers.push({
          orderId: o._id,
          orderNumber: o.order_number || o.id || o.orderId,
          memberName: resolvedCustomerName,
          customerName: resolvedCustomerName,
          customerId: cId,
          phone: matchedCust?.phone || o.customer_phone || o.phone || null,
          email: matchedCust?.email || o.customer_email || null,
          quantity: itemQty,
          amount: itemRev,
          date: formattedDate,
          status: o.status || 'Confirmed',
          paymentStatus: o.paymentStatus || o.payment_status || 'Pending'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        price: product.price,
        category: product.category,
        totalSold,
        totalRevenue,
        ordersCount: recentCustomers.length,
        recentCustomers
      }
    });
  } catch (error) {
    console.error('Get Product Sales Insights Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving sales insights: ' + error.message });
  }
};

// --- SUPPORT TICKETS ---
// @desc    Get vendor's support tickets
// @route   GET /api/vendor/tickets
// @access  Private (Vendor)
const getVendorTickets = async (req, res) => {
  try {
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    const businessIds = [parentUserId.toString()];
    if (user && user.businesses) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
      });
    }

    const tickets = await SupportTicket.find({
      vendorId: { $in: businessIds }
    }).sort({ createdAt: -1, date: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Get Vendor Tickets Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving support tickets' });
  }
};

// @desc    Submit a support ticket to platform admin
// @route   POST /api/vendor/tickets
// @access  Private (Vendor)
const createVendorTicket = async (req, res) => {
  try {
    const { category, subject, message, priority } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Both subject and message are required' });
    }

    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    const activeBusiness = (user && user.businesses && req.body.activeBusinessId)
      ? user.businesses.find(b => String(b._id) === String(req.body.activeBusinessId))
      : null;

    const vendorId = parentUserId.toString();
    const vendorName = activeBusiness?.businessName || user?.businessName || user?.name || 'Vendor';
    const vendorEmail = user?.email || 'vendor@connectapp.com';

    const ticketId = `TKT-ADM-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    const newTicket = await SupportTicket.create({
      id: ticketId,
      ticketId,
      vendorId,
      vendorName,
      vendorEmail,
      businessName: vendorName,
      queryType: 'vendor_support',
      customerName: 'Platform Support Team',
      email: 'support@connectapp.com',
      phone: '1800-123-4567',
      category: category || 'General Inquiry',
      subject: subject.trim(),
      message: message.trim(),
      date: nowStr,
      status: 'Open', // Strictly Open - vendors CANNOT change this
      priority: priority || 'Medium',
      replies: [
        {
          sender: `${vendorName} (You)`,
          role: 'Vendor',
          text: message.trim(),
          time: nowStr,
          createdAt: new Date()
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Support query ticket raised successfully! Admin will review your request.',
      data: newTicket
    });
  } catch (error) {
    console.error('Create Vendor Ticket Error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting support ticket' });
  }
};

// @desc    Reply to an existing support ticket
// @route   POST /api/vendor/tickets/:id/reply
// @access  Private (Vendor)
const replyVendorTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });
    }

    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await getVendorUserCached(parentUserId);
    const businessIds = [parentUserId.toString()];
    if (user && user.businesses) {
      user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
      });
    }

    const ticket = await SupportTicket.findOne({
      $or: [{ id: req.params.id }, { _id: req.params.id }, { ticketId: req.params.id }]
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Ownership check: Prevent vendors from modifying tickets belonging to other vendors
    if (!businessIds.includes(String(ticket.vendorId))) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You do not own this support ticket.' });
    }

    const senderName = user?.businessName || user?.name || 'Vendor';
    const nowStr = new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    ticket.replies.push({
      sender: senderName,
      role: 'Vendor',
      text: text.trim(),
      time: nowStr,
      createdAt: new Date()
    });

    // NOTE: Vendors CANNOT change status to 'In Progress' or 'Resolved'. Status remains under Admin control.
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Response sent successfully!',
      data: ticket
    });
  } catch (error) {
    console.error('Reply Vendor Ticket Error:', error);
    return res.status(500).json({ success: false, message: 'Server error replying to ticket' });
  }
};

// @desc    Block vendor from modifying ticket status
// @route   PUT /api/vendor/tickets/:id/status
// @access  Private (Vendor) - FORBIDDEN
const updateTicketStatusForbidden = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Vendors are not permitted to change ticket status. Only platform administrators can manage ticket processing and resolution.'
  });
};


// @desc    Get real-time vendor onboarding & approval status with agent and admin contacts
// @route   GET /api/vendor/onboarding-status
// @access  Protected (Vendor)
const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const userEmail = req.user ? req.user.email : null;
    const userPhone = req.user ? (req.user.mobileNumber || req.user.phone) : null;

    // Look up User record
    const userDoc = await User.findOne({ 
      $or: [
        { _id: userId },
        ...(userEmail ? [{ email: String(userEmail).toLowerCase().trim() }] : []),
        ...(userPhone ? [{ mobileNumber: userPhone }, { phone: userPhone }] : [])
      ]
    });

    // Look up in vendors collection if available
    let vendorDoc = null;
    try {
      const db = mongoose.connection.db;
      if (db) {
        vendorDoc = await db.collection('vendors').findOne({
          $or: [
            { id: String(userId) },
            { vendorId: userDoc ? userDoc.vendorId : '' },
            ...(userEmail ? [{ email: String(userEmail).toLowerCase().trim() }] : []),
            ...(userPhone ? [{ phone: userPhone }, { mobileNumber: userPhone }] : [])
          ]
        });
      }
    } catch (e) {
      console.warn('Direct vendors collection lookup warning:', e.message);
    }

    const currentStatus = (vendorDoc?.status || userDoc?.status || req.user?.status || 'PENDING_PINCODE_APPROVAL').toUpperCase().trim();
    const kycStatus = vendorDoc?.kycStatus || userDoc?.kycStatus || 'Pending Pincode Admin Approval';

    // Onboarding agent resolution
    const onboardingAgent = vendorDoc?.onboardingAgent || {
      id: vendorDoc?.agentRegistrationId || vendorDoc?.agentId || userDoc?.agentId || 'AGT-DIRECT',
      name: vendorDoc?.agentName || userDoc?.agentName || 'Assigned Onboarding Agent',
      phone: vendorDoc?.agentPhone || userDoc?.agentPhone || '9876543210',
      role: 'Pincode Agent',
      tier: 'Pincode Agent',
      submittedAt: vendorDoc?.onboardingAgent?.submittedAt || vendorDoc?.createdAt || userDoc?.createdAt || new Date().toISOString()
    };

    // Responsible admin resolution
    const responsibleAdmin = vendorDoc?.responsibleAdmin || {
      id: 'ADM-PIN-557374',
      name: 'Ragul',
      role: 'Pincode Admin',
      phone: '6789876543',
      state: vendorDoc?.state || userDoc?.state || 'Tamil Nadu',
      district: vendorDoc?.district || userDoc?.district || 'Krishnagiri',
      division: vendorDoc?.division || 'Hosur',
      pincode: vendorDoc?.pincode || userDoc?.postalCode || '635126',
      assignedLevel: 'Pincode'
    };

    const assignmentInfo = vendorDoc?.responsibleAdminAssignment || {
      status: 'ASSIGNED',
      assignedLevel: 'Pincode',
      matchedPincode: responsibleAdmin.pincode
    };

    // Dynamic suggested messages per requirement
    let message = 'Your vendor onboarding request has been submitted successfully. Please contact your onboarding agent or the responsible admin for updates.';
    let nextStep = 'Awaiting verification by the admin responsible for your PIN code.';
    let isApproved = false;

    if (currentStatus === 'SUBMITTED') {
      message = 'Your vendor onboarding request has been submitted successfully. Please contact your onboarding agent or the responsible admin for updates.';
      nextStep = 'Pending review by Pincode Admin (' + responsibleAdmin.name + ')';
    } else if (currentStatus === 'PENDING_PINCODE_APPROVAL' || currentStatus === 'PENDING') {
      message = 'Your request is awaiting approval from the admin responsible for your PIN code.';
      nextStep = 'Field inspection & verification by Pincode Admin (' + responsibleAdmin.name + ')';
    } else if (currentStatus === 'PINCODE_APPROVED' || currentStatus === 'KYC_PENDING') {
      message = 'Your request has been approved by the PIN code admin and is awaiting KYC verification.';
      nextStep = 'KYC Team document verification';
    } else if (currentStatus === 'KYC_IN_PROGRESS') {
      message = 'Your documents are being verified by our KYC team.';
      nextStep = 'Compliance review in progress';
    } else if (currentStatus === 'PAYMENT_PENDING') {
      message = 'Your KYC verification is complete. Please complete the required payment to activate your vendor account.';
      nextStep = 'Complete onboarding subscription payment';
    } else if (currentStatus === 'PINCODE_REJECTED' || currentStatus === 'KYC_REJECTED') {
      message = 'Your onboarding request has been rejected. Please contact the responsible admin for further details.';
      nextStep = 'Review rejection reason and contact onboarding agent';
    } else if (currentStatus === 'ACTIVE' || currentStatus === 'APPROVED') {
      message = 'Your vendor account is active and verified. Welcome to Connect App!';
      nextStep = 'Dashboard fully unlocked';
      isApproved = true;
    }

    const rejectionReason = vendorDoc?.pincodeAdminApproval?.rejectionReason || 
                            vendorDoc?.kycTeamApproval?.rejectionReason || 
                            vendorDoc?.rejectionReason || null;

    return res.status(200).json({
      success: true,
      onboarding: {
        status: currentStatus,
        kycStatus,
        isApproved,
        message,
        nextStep,
        submissionDate: onboardingAgent.submittedAt || vendorDoc?.createdAt || userDoc?.createdAt,
        rejectionReason,
        onboardingAgent,
        responsibleAdmin,
        responsibleAdminAssignment: assignmentInfo,
        businessName: vendorDoc?.name || userDoc?.businessName || userDoc?.name || 'Vendor Partner',
        pincode: vendorDoc?.pincode || userDoc?.postalCode || responsibleAdmin.pincode,
        vendorId: vendorDoc?.id || userDoc?.vendorId || req.user?.vendorId
      }
    });
  } catch (error) {
    console.error('getOnboardingStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve onboarding status', error: error.message });
  }
};

module.exports = {
  getOnboardingStatus,
  getVendorAnalytics,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductSalesInsights,
  getOrders,
  getBookings,
  getOrderById,
  getApplications,
  updateOrderStatus,
  getOrderResume,
  getCustomers,
  getCustomerPurchases,
  createDeliveryPartner,
  getDeliveryPartners,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  updateProfile,
  getProfile,
  changePassword,
  forgotPasswordOTP,
  resetPasswordOTP,
  getPlatformConfigReadOnly,
  getPatients,
  updatePatientNotes,
  addPatientRecord,
  addBusiness,
  deleteBusiness,
  updateBusiness,
  getSalesPayments,
  getBusinessRequests,
  resubmitBusinessRequest,
  getVendorTickets,
  createVendorTicket,
  replyVendorTicket,
  updateTicketStatusForbidden
};
