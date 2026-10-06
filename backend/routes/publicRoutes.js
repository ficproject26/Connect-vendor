const express = require('express');
const mongoose = require('mongoose');
const { Product, User, Order, Category, Customer } = require('../models/Schemas');
const { COMPLETE_CAT_TAXONOMY } = require('../data/completeTaxonomy');

const router = express.Router();

const getItemMainCategory = (itemCategory) => {
  if (!itemCategory) return '';
  
  // 1. Search in specific target categories first to prevent misclassification as generic Services/Products
  const priorityCats = ["Daily Needs", "Food", "Stay", "Travel", "Jobs"];
  for (const mainCat of priorityCats) {
    if (COMPLETE_CAT_TAXONOMY[mainCat]) {
      for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
        if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
          return mainCat;
        }
      }
    }
  }
  
  // 2. Fallback to generic Services, Products, or others
  const fallbackCats = ["Services", "Products", "Membership"];
  for (const mainCat of fallbackCats) {
    if (COMPLETE_CAT_TAXONOMY[mainCat]) {
      for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
        if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
          return mainCat;
        }
      }
    }
  }
  
  return '';
};

// Helper to determine customer app tab
const getSubNavbarCategory = (baseVendorType, category) => {
  const mainCat = getItemMainCategory(category);
  if (mainCat) return mainCat;

  const type = (baseVendorType || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // 1. Check vendor type / business type first (strongest indicator)
  if (type.includes('grocery') || type.includes('pharmacy') || type.includes('daily needs') || type.includes('dailyneeds')) return 'Daily Needs';
  if (type.includes('restaurant') || type.includes('food')) return 'Food';
  if (type.includes('hotel') || type.includes('stay')) return 'Stay';
  if (type.includes('travel')) return 'Travel';
  if (type.includes('hospital') || type.includes('service') || type.includes('education')) return 'Services';
  if (type.includes('store') || type.includes('electronics') || type.includes('furniture') || type.includes('product')) return 'Products';

  // 2. Fallback to product category name
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining') || cat.includes('dish')) return 'Food';
  if (cat.includes('stay') || cat.includes('hotel') || cat.includes('room') || cat.includes('accommodation')) return 'Stay';
  if (cat.includes('travel') || cat.includes('cab') || cat.includes('bus') || cat.includes('flight')) return 'Travel';
  if (cat.includes('job') || cat.includes('it jobs')) return 'Jobs';
  if (cat.includes('grocery') || cat.includes('pharmacy') || cat.includes('healthcare') || cat.includes('daily needs') || cat.includes('rice') || cat.includes('medicine')) return 'Daily Needs';
  if (cat.includes('service') || cat.includes('hospital') || cat.includes('education') || cat.includes('doctor') || cat.includes('clinic')) return 'Services';

  return 'Products';
};

// GET /api/public/products
router.get('/products', async (req, res) => {
  try {
    // 1. Fetch all users from database
    const allVendorUsers = await User.find({}).lean();

    const suspendedIds = new Set();
    const suspendedNames = new Set();
    const vendorMap = {};
    const activeVendorKeyToUser = new Map();

    allVendorUsers.forEach(vendor => {
      const vStatus = (vendor.status || vendor.vendorStatus || '').toString().toLowerCase().trim();
      const isUserSuspended = 
        ['suspended', 'inactive', 'rejected', 'deactivated', 'disabled', 'blocked'].includes(vStatus) || 
        vendor.isActive === false || 
        vendor.isApproved === false ||
        vendor.isLocked === true || 
        vendor.isSuspended === true ||
        vendor.status === 'SUSPENDED' ||
        vendor.vendorStatus === 'SUSPENDED';

      const vendorKeys = [
        vendor._id ? vendor._id.toString() : '',
        vendor.vendorId ? vendor.vendorId.toString() : '',
        vendor.registrationId ? vendor.registrationId.toString() : '',
        vendor.regId ? vendor.regId.toString() : '',
        vendor.id ? vendor.id.toString() : '',
        vendor.username ? vendor.username.toLowerCase().trim() : '',
        vendor.handle ? vendor.handle.toLowerCase().trim() : '',
        vendor.email ? vendor.email.toLowerCase().trim() : '',
        vendor.phone ? vendor.phone.toString().replace(/\D/g, '') : '',
        vendor.mobileNumber ? vendor.mobileNumber.toString().replace(/\D/g, '') : '',
        vendor.telephone ? vendor.telephone.toString().replace(/\D/g, '') : '',
        vendor.businessName ? vendor.businessName.toLowerCase().trim() : '',
        vendor.name ? vendor.name.toLowerCase().trim() : '',
        vendor.companyName ? vendor.companyName.toLowerCase().trim() : '',
        vendor.brand ? vendor.brand.toLowerCase().trim() : '',
        vendor.vendorCode ? vendor.vendorCode.toString().toLowerCase().trim() : ''
      ].filter(Boolean);

      if (isUserSuspended) {
        vendorKeys.forEach(k => {
          suspendedIds.add(k);
          suspendedNames.add(k);
        });

        if (vendor.businesses && Array.isArray(vendor.businesses)) {
          vendor.businesses.forEach(b => {
            if (b._id) {
              suspendedIds.add(b._id.toString());
              suspendedNames.add(b._id.toString());
            }
            if (b.businessName) {
              suspendedIds.add(b.businessName.toLowerCase().trim());
              suspendedNames.add(b.businessName.toLowerCase().trim());
            }
            if (b.name) {
              suspendedIds.add(b.name.toLowerCase().trim());
              suspendedNames.add(b.name.toLowerCase().trim());
            }
          });
        }
      } else {
        vendorKeys.forEach(k => {
          activeVendorKeyToUser.set(k, vendor);
        });

        // User is active, but check each business sub-document
        if (vendor.businesses && Array.isArray(vendor.businesses)) {
          vendor.businesses.forEach(biz => {
            const bizStatus = (biz.status || '').toLowerCase().trim();
            const isBizSuspended = ['suspended', 'inactive', 'rejected', 'deactivated'].includes(bizStatus) || biz.isActive === false;
            
            if (isBizSuspended) {
              if (biz._id) {
                suspendedIds.add(biz._id.toString());
                suspendedNames.add(biz._id.toString());
              }
              if (biz.businessName) {
                suspendedIds.add(biz.businessName.toLowerCase().trim());
                suspendedNames.add(biz.businessName.toLowerCase().trim());
              }
              if (biz.name) {
                suspendedIds.add(biz.name.toLowerCase().trim());
                suspendedNames.add(biz.name.toLowerCase().trim());
              }
            } else if (biz._id) {
              activeVendorKeyToUser.set(biz._id.toString(), vendor);
              if (biz.businessName) activeVendorKeyToUser.set(biz.businessName.toLowerCase().trim(), vendor);
              if (biz.name) activeVendorKeyToUser.set(biz.name.toLowerCase().trim(), vendor);

              const vCity = biz.city || vendor.city || vendor.bankCity || 'Bangalore';
              const bData = {
                name: biz.businessName || vendor.businessName || vendor.name,
                baseVendorType: biz.baseVendorType || biz.vendorType || vendor.baseVendorType || vendor.vendorType,
                category: biz.category || vendor.category,
                city: vCity,
                address: vendor.address || '',
                logo: biz.logo || vendor.logo || '',
                mobileNumber: vendor.mobileNumber || vendor.telephone || '',
                operatingHours: vendor.operatingHours || ''
              };
              vendorMap[biz._id.toString()] = bData;
              if (biz.businessName) vendorMap[biz.businessName.toLowerCase().trim()] = bData;
              if (biz.name) vendorMap[biz.name.toLowerCase().trim()] = bData;
            }
          });
        }

        const vCity = vendor.city || vendor.bankCity || 'Bangalore';
        const vData = {
          name: vendor.businessName || vendor.name,
          baseVendorType: vendor.baseVendorType || vendor.vendorType,
          category: vendor.category,
          city: vCity,
          address: vendor.address || '',
          logo: vendor.logo || '',
          mobileNumber: vendor.mobileNumber || vendor.telephone || '',
          operatingHours: vendor.operatingHours || ''
        };
        vendorKeys.forEach(k => {
          vendorMap[k] = vData;
        });
      }
    });

    // 2. Fetch all products
    const products = await Product.find({}).lean();

    // Filter products: exclude any product belonging to a suspended vendor or marked suspended
    const activeProducts = products.filter(p => {
      const pStatus = (p.status || p.productStatus || '').toString().toLowerCase().trim();
      if (['suspended', 'inactive', 'rejected', 'deactivated', 'blocked'].includes(pStatus) || p.isSuspended === true || p.isVendorSuspended === true) {
        return false;
      }

      const productVendorKeys = [
        p.vendorId ? p.vendorId.toString() : '',
        p.vendor_id ? p.vendor_id.toString() : '',
        p.vendor ? p.vendor.toString() : '',
        p.createdBy ? p.createdBy.toString() : '',
        p.userId ? p.userId.toString() : '',
        p.user ? p.user.toString() : '',
        p.registrationId ? p.registrationId.toString() : '',
        p.regId ? p.regId.toString() : '',
        p.businessId ? p.businessId.toString() : '',
        p.outletId ? p.outletId.toString() : '',
        p.storeId ? p.storeId.toString() : '',
        p.username ? p.username.toLowerCase().trim() : '',
        p.vendorUsername ? p.vendorUsername.toLowerCase().trim() : '',
        p.vendorEmail ? p.vendorEmail.toLowerCase().trim() : '',
        p.email ? p.email.toLowerCase().trim() : '',
        p.vendorPhone ? p.vendorPhone.toString().replace(/\D/g, '') : '',
        p.phone ? p.phone.toString().replace(/\D/g, '') : '',
        p.mobileNumber ? p.mobileNumber.toString().replace(/\D/g, '') : '',
        p.vendorName ? p.vendorName.toLowerCase().trim() : '',
        p.brand ? p.brand.toLowerCase().trim() : '',
        p.companyName ? p.companyName.toLowerCase().trim() : '',
        p.company ? p.company.toLowerCase().trim() : '',
        p.businessName ? p.businessName.toLowerCase().trim() : ''
      ].filter(Boolean);

      // 1. If ANY key of this product matches suspendedIds or suspendedNames -> EXCLUDE IT!
      const isProductSuspended = productVendorKeys.some(k => suspendedIds.has(k) || suspendedNames.has(k));
      if (isProductSuspended) {
        return false;
      }

      // 2. Cross-reference matching vendor user using O(1) Map lookup
      let matchingVendorUser = null;
      for (const k of productVendorKeys) {
        if (activeVendorKeyToUser.has(k)) {
          matchingVendorUser = activeVendorKeyToUser.get(k);
          break;
        }
      }

      if (!matchingVendorUser) {
        // Exclude products that do not belong to any active registered vendor user in the system
        return false;
      }

      return true;
    });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // 3. Map active products to customer app format
    const mappedProducts = activeProducts.map(p => {
      const vIdStr = (p.vendorId || p.vendor_id || '').toString();
      const vendor = vendorMap[vIdStr] || {
        name: p.vendorName || p.brand || p.companyName || 'Store Vendor',
        baseVendorType: 'Store Vendor',
        category: p.category || 'General',
        city: 'Bangalore',
        address: '',
        logo: '',
        mobileNumber: '',
        operatingHours: ''
      };
      let rawImg = p.imageUrl || p.image || p.img || (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : '');
      if (rawImg) {
        if (rawImg.includes('vercel.app') || rawImg.includes('trycloudflare.com') || rawImg.includes(':8000') || rawImg.includes(':8001') || rawImg.includes('43.204.141.105')) {
          rawImg = rawImg.replace(/^https?:\/\/[^/]+/, baseUrl);
        }
      }
      const finalImg = rawImg 
        ? (rawImg.startsWith('/uploads') ? `${baseUrl}${rawImg}` : rawImg)
        : ((p.subNavbarCategory || req.query.subNavbarCategory) === 'Services' 
            ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60' 
            : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60');

      return {
        id: p._id,
        vendorId: vIdStr || p._id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        unit: p.unit || 'count',
        stock: p.stock,
        status: p.status || 'Available',
        originalPrice: p.originalPrice ? p.originalPrice : (p.mrp || p.price),
        guests: p.guests || 2,
        amenities: p.amenities || [],
        category: p.category || vendor.category || 'General',
        subcategory: p.subcategory || '',
        subSubcategory: p.subSubcategory || '',
        subNavbarCategory: p.subNavbarCategory || p.category || '',
        warranty: p.warranty,
        specialization: p.specialization,
        pinCode: p.pinCode,
        duration: p.duration,
        roomType: p.roomType,
        foodType: p.foodType,
        bookingType: p.bookingType || 'Slot booking',
        cardTypes: p.cardTypes || ['Silver', 'Gold', 'Diamond'],
        availableTimeSlots: p.availableTimeSlots,
        jobType: p.jobType,
        jobLocation: p.jobLocation,
        experience: p.experience,
        skills: p.skills,
        deadline: p.deadline,
        applicationTips: p.applicationTips,
        qualification: p.qualification,
        linkedProfile: p.linkedProfile,
        contactNumber: p.contactNumber || vendor.mobileNumber,
        mailId: p.mailId,
        department: p.department,
        boardingPoint: p.boardingPoint,
        boardingTime: p.boardingTime,
        dropPoint: p.dropPoint,
        arrivalTime: p.arrivalTime,
        boardingPoints: p.boardingPoints || [],
        droppingPoints: p.droppingPoints || [],
        distance: p.distance,
        busTiming: p.busTiming,
        stoppings: p.stoppings || [],
        specifications: p.specifications || p.customFields || {},
        customFields: p.customFields || p.specifications || {},
        image: finalImg,
        images: p.imageUrls && p.imageUrls.length > 0
          ? p.imageUrls.map(img => {
              let cleanImg = img;
              if (cleanImg.includes('vercel.app') || cleanImg.includes('trycloudflare.com') || cleanImg.includes(':8000') || cleanImg.includes(':8001') || cleanImg.includes('43.204.141.105')) {
                cleanImg = cleanImg.replace(/^https?:\/\/[^/]+/, baseUrl);
              }
              return cleanImg.startsWith('/uploads') ? `${baseUrl}${cleanImg}` : cleanImg;
            })
          : [finalImg],
        rating: p.rating || 4.5,
        reviews: p.reviews !== undefined ? p.reviews : 12,
        vendorName: p.vendorName || vendor.name,
        vendorLogo: vendor.logo,
        vendorAddress: vendor.address,
        vendorOperatingHours: vendor.operatingHours,
        vendorCity: (() => {
          const pin = String(p.pinCode || '').trim();
          if (pin.startsWith('56')) return 'Bangalore';
          if (pin.startsWith('60')) return 'Chennai';
          if (pin.startsWith('50')) return 'Hyderabad';
          if (pin.startsWith('40')) return 'Mumbai';
          if (pin.startsWith('11')) return 'Delhi';
          if (pin.startsWith('64')) return 'Coimbatore';
          return p.city || vendor.city || 'Pan India';
        })(),
        tag: p.status === 'Unavailable' ? 'Unavailable' : (p.status === 'Low Stock' ? 'Low Stock' : 'Verified Partner'),
        discount: p.discount || (p.originalPrice && p.originalPrice > p.price ? `${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% off` : ''),
        delivery: 'Free Delivery'
      };
    });

    res.status(200).json({ success: true, products: mappedProducts });
  } catch (error) {
    console.error('Get Public Products Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving products catalog' });
  }
});

// DELETE /api/public/products/delete-all
router.delete('/products/delete-all', async (req, res) => {
  try {
    await Product.deleteMany({});
    res.status(200).json({ success: true, message: 'All products and services deleted successfully' });
  } catch (error) {
    console.error('Delete all products error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting products' });
  }
});

// POST /api/public/orders
router.post('/orders', async (req, res) => {
  console.log('[Sync Request Body]:', JSON.stringify(req.body, null, 2));
  const {
    id, // Customer Order ID (e.g. ORD1243)
    vendorId,
    memberId,
    memberName,
    type,
    items,
    totalAmount,
    discountApplied,
    finalAmount,
    candidateEmail,
    candidateResume,
    experience,
    candidateEducation,
    order_number,
    appointmentDate,
    appointmentTimeSlot,
    doctorName,
    tableNumber,
    roomNumber,
    prescriptionUrl,
    customerDisplayId,
    // Payment fields from customer backend
    paymentMethod,
    paymentStatus,
    razorpayPaymentId,
    razorpayOrderId,
    transactionId,
    paidAt,
    paymentProvider,
    paymentReference
  } = req.body;

  if (!vendorId || !memberName || finalAmount === undefined || finalAmount === null) {
    return res.status(400).json({ success: false, message: 'Vendor ID, Member name, and Final amount are required' });
  }

  try {
    const targetVendor = await User.findOne({
      role: { $in: ['Vendor', 'vendor'] },
      $or: [
        { _id: vendorId },
        { vendorId: vendorId },
        { registrationId: vendorId },
        { regId: vendorId },
        { primaryBusinessId: vendorId },
        { 'businesses._id': vendorId }
      ]
    });

    if (targetVendor) {
      const vStatus = (targetVendor.status || targetVendor.vendorStatus || '').toString().toLowerCase().trim();
      const isSuspended = ['suspended', 'inactive', 'rejected', 'deactivated', 'disabled', 'blocked'].includes(vStatus) || 
                          targetVendor.isActive === false || 
                          targetVendor.isApproved === false || 
                          targetVendor.isLocked === true || 
                          targetVendor.isSuspended === true;
      if (isSuspended) {
        return res.status(403).json({ success: false, message: 'This vendor is currently suspended and cannot receive new orders or bookings.' });
      }
    }

    let orderType = type || 'Order';
    if (!type) {
      const vendor = await User.findOne({
        role: 'Vendor',
        $or: [ { _id: vendorId }, { 'businesses._id': vendorId } ]
      });
      if (vendor) {
        const vType = vendor.baseVendorType || vendor.vendorType;
        const isHospital = vType && (vType === 'Hospital' || vType.startsWith('Hospital Vendor'));
        if (isHospital) orderType = 'Appointment';
        else if (vType && (vType.startsWith('Hotel') || vType.startsWith('Service Provider Vendor'))) orderType = 'Booking';
      }
    }

    const isJob = orderType === 'Job' || req.body.type === 'Job';
    const appId = req.body.applicationId || id || order_number || (isJob ? ('APP-' + new Date().getFullYear() + '-' + String(Math.floor(100000 + Math.random() * 900000))) : ('ORD' + Math.floor(100000 + Math.random() * 900000)));

    // Resolve canonical Customer ID from database (Customer / User)
    let resolvedCustId = customerDisplayId || req.body.customerId;
    if (!resolvedCustId || !String(resolvedCustId).startsWith('FIC-CUST-')) {
      const matchConditions = [];
      const cleanPhone = (req.body.customer_phone || req.body.candidatePhone || req.body.phone || '').toString().replace(/[^0-9]/g, '');
      if (cleanPhone && cleanPhone.length >= 10) {
        matchConditions.push({ phone: new RegExp(cleanPhone.slice(-10) + '$') });
      }
      const cleanEmail = (candidateEmail || req.body.customer_email || '').trim().toLowerCase();
      if (cleanEmail && cleanEmail.includes('@')) {
        matchConditions.push({ email: cleanEmail });
      }
      const rawName = (req.body.candidateName || memberName || req.body.customer_name || '').trim();
      if (rawName && rawName.toLowerCase() !== 'candidate' && rawName.toLowerCase() !== 'customer') {
        matchConditions.push({ name: new RegExp('^' + rawName + '$', 'i') });
      }
      if (matchConditions.length > 0) {
        const foundCust = await Customer.findOne({ $or: matchConditions });
        if (foundCust) {
          resolvedCustId = foundCust.customerId || foundCust.registrationId;
        }
      }
    }
    if (!resolvedCustId || !String(resolvedCustId).startsWith('FIC-CUST-')) {
      const nLower = (req.body.candidateName || memberName || req.body.customer_name || '').trim().toLowerCase();
      if (nLower === 'swetha' || nLower === 'swetha j') resolvedCustId = 'FIC-CUST-774974';
      else if (nLower === 'sri' || nLower === 'sri bhavani m') resolvedCustId = 'FIC-CUST-214155';
      else if (nLower === 'connect member') resolvedCustId = 'FIC-CUST-462259';
      else resolvedCustId = 'FIC-CUST-100001';
    }

    // Normalize payment method label for vendor display
    const normalizePaymentMethod = (method, provider) => {
      const m = (method || req.body.payment_method || provider || '').toString().toUpperCase();
      if (m.includes('COD') || m.includes('CASH')) return 'Cash on Delivery';
      if (m.includes('WALLET')) return 'Connect Wallet';
      if (m === 'UPI') return 'UPI';
      if (m === 'CARD') return 'Card';
      if (m.includes('BANK')) return 'Net Banking';
      if (m.includes('RAZORPAY') || m.includes('ONLINE')) return 'Online (Razorpay)';
      if (method || req.body.payment_method) return method || req.body.payment_method;
      return 'Connect Wallet';
    };

    const resolvedPaymentMethod = normalizePaymentMethod(paymentMethod, paymentProvider);
    const isCod = resolvedPaymentMethod === 'Cash on Delivery';
    const resolvedPaymentStatus = paymentStatus
      ? (['SUCCESS', 'PAID', 'COMPLETED'].includes(paymentStatus.toString().toUpperCase()) ? 'Paid' : paymentStatus)
      : (req.body.payment_status ? (['SUCCESS', 'PAID', 'COMPLETED'].includes(req.body.payment_status.toString().toUpperCase()) ? 'Paid' : req.body.payment_status) : (isCod ? 'Pending' : 'Paid'));

    const resolvedTxnId = transactionId || req.body.paymentId || razorpayPaymentId || (!isCod ? ('TXN_' + appId) : undefined);
    const resolvedPaidAt = resolvedPaymentStatus === 'Paid' ? (paidAt || new Date()) : undefined;

    const orderData = {
      id: appId,
      order_number: appId,
      applicationId: appId,
      jobId: req.body.jobId || (items && items[0]?.productId) || req.body.productId,
      jobTitle: req.body.jobTitle || (items && items[0]?.name) || req.body.product_details,
      vendorId,
      memberId: memberId || 'cust_dhanush',
      memberName: req.body.candidateName || memberName || req.body.customer_name || 'Candidate',
      candidateName: req.body.candidateName || memberName || req.body.customer_name || 'Candidate',
      type: orderType,
      items: items || [],
      totalAmount: totalAmount ?? finalAmount,
      discountApplied: discountApplied || 0,
      finalAmount: finalAmount,
      status: isJob ? (req.body.status && req.body.status !== 'Pending' && req.body.status !== 'Order Received' ? req.body.status : 'APPLICATION RECEIVED') : (req.body.status || 'Order Received'),
      candidateEmail: candidateEmail || req.body.customer_email,
      candidatePhone: req.body.customer_phone || req.body.candidatePhone || req.body.phone,
      candidateResume,
      experience: experience || 'Fresher',
      candidateEducation: candidateEducation || 'Graduate',
      jobLocation: req.body.jobLocation || req.body.candidateLocation || req.body.customer_address,
      applicationDate: req.body.applicationDate || req.body.created_at || new Date().toISOString(),
      appointmentDate,
      appointmentTimeSlot,
      doctorName,
      tableNumber,
      roomNumber,
      prescriptionUrl,
      customerId: resolvedCustId,
      customerDisplayId: resolvedCustId,
      guests: req.body.guests || req.body.numberOfGuests || req.body.guestCount || req.body.adults || (items && items[0]?.guests),
      adults: req.body.adults || (items && items[0]?.adults),
      children: req.body.children || (items && items[0]?.children),
      customer_address: req.body.customer_address || req.body.address || req.body.deliveryAddress,
      deliveryAddress: req.body.deliveryAddress || req.body.customer_address || req.body.address,
      customer_phone: req.body.customer_phone || req.body.phone,
      // Stay specific fields
      checkInDate: req.body.checkInDate || req.body.check_in_date || appointmentDate,
      checkInTime: req.body.checkInTime || req.body.check_in_time,
      checkOutDate: req.body.checkOutDate || req.body.check_out_date,
      checkOutTime: req.body.checkOutTime || req.body.check_out_time,
      guestList: Array.isArray(req.body.guestList) ? req.body.guestList : (Array.isArray(req.body.guestDetails) ? req.body.guestDetails : []),
      guestDetails: Array.isArray(req.body.guestDetails) ? req.body.guestDetails : (Array.isArray(req.body.guestList) ? req.body.guestList : []),
      adults: req.body.adults || req.body.adultsCount,
      children: req.body.children || req.body.childrenCount,
      infants: req.body.infants || req.body.infantsCount,
      roomsCount: req.body.roomsCount || req.body.numberOfRooms || req.body.roomCount,
      nightsCount: req.body.nightsCount || req.body.numberOfNights || req.body.nights,
      boardingPoint: req.body.boardingPoint || null,
      droppingPoint: req.body.droppingPoint || null,
      boardingPoints: req.body.boardingPoints || [],
      droppingPoints: req.body.droppingPoints || [],
      travelDate: req.body.travelDate || req.body.journeyDate || req.body.departureDate || appointmentDate || null,
      journeyDate: req.body.journeyDate || req.body.travelDate || req.body.departureDate || appointmentDate || null,
      departureDate: req.body.departureDate || req.body.travelDate || req.body.journeyDate || appointmentDate || null,
      departureTime: req.body.departureTime || (req.body.boardingPoint && typeof req.body.boardingPoint === 'object' ? req.body.boardingPoint.time : null) || appointmentTimeSlot || null,
      roomName: req.body.roomName,
      roomType: req.body.roomType,
      roomCategory: req.body.roomCategory,
      vehicleDetails: {
        ...(req.body.vehicleDetails || {}),
        boardingPoint: req.body.boardingPoint || null,
        droppingPoint: req.body.droppingPoint || null,
        pickupDropInfo: req.body.pickupDropInfo || (typeof req.body.boardingPoint === 'string' ? req.body.boardingPoint : (req.body.boardingPoint?.name ? `${req.body.boardingPoint.name} (${req.body.boardingPoint.time || ''})` : null))
      },
      travelType: req.body.travelType || (req.body.vehicleDetails && req.body.vehicleDetails.travelType) || null,
      vehicleType: req.body.vehicleType || (req.body.vehicleDetails && req.body.vehicleDetails.vehicleType) || null,
      vehicleNumber: req.body.vehicleNumber || (req.body.vehicleDetails && req.body.vehicleDetails.vehicleNumber) || null,
      pickupDropInfo: req.body.pickupDropInfo || (typeof req.body.boardingPoint === 'string' ? req.body.boardingPoint : (req.body.boardingPoint?.name ? `${req.body.boardingPoint.name} (${req.body.boardingPoint.time || ''})` : null)) || null,
      specialRequests: req.body.specialRequests || req.body.guestSpecialNote || null,
      statusHistory: req.body.statusHistory || [{
        status: isJob ? 'APPLICATION RECEIVED' : (orderType === 'Stay' ? 'Confirmed' : (req.body.status || 'Order Received')),
        timestamp: new Date().toISOString(),
        updatedBy: 'Customer / Booking System'
      }],
      // Payment fields
      paymentMethod: resolvedPaymentMethod,
      payment_method: resolvedPaymentMethod,
      paymentStatus: resolvedPaymentStatus,
      payment_status: resolvedPaymentStatus,
      ...(resolvedTxnId && { transactionId: resolvedTxnId }),
      ...(resolvedPaidAt && { paidAt: resolvedPaidAt }),
      ...(razorpayPaymentId && { razorpayPaymentId }),
      ...(razorpayOrderId && { razorpayOrderId }),
      ...(paymentReference && { paymentReference }),
      ...(paymentProvider && { paymentProvider: resolvedPaymentMethod || paymentProvider })
    };

    // Helper function for atomic stock reduction
    const reduceStockForOrder = async (orderDoc, targetVendorId) => {
      if (!orderDoc || orderDoc.stockReduced) return;
      try {
        const items = orderDoc.items && Array.isArray(orderDoc.items) && orderDoc.items.length > 0
          ? orderDoc.items
          : (orderDoc.productId || orderDoc.product_details ? [{ productId: orderDoc.productId, name: orderDoc.product_details, quantity: orderDoc.quantity || 1 }] : []);

        for (const item of items) {
          const qty = Math.max(1, Number(item.quantity || item.qty || 1));
          let prodId = item.productId || item._id || item.id;
          let prod = null;

          if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
            prod = await Product.findById(prodId);
          }
          if (!prod && item.name) {
            prod = await Product.findOne({ name: item.name, $or: [{ vendorId: targetVendorId }, { vendor_id: targetVendorId }] });
          }

          if (prod && typeof prod.stock === 'number') {
            const newStock = Math.max(0, prod.stock - qty);
            const updateFields = { stock: newStock };
            if (newStock === 0) {
              updateFields.status = 'Out of Stock';
            }
            await Product.updateOne({ _id: prod._id }, { $set: updateFields });
          }
        }
        await Order.updateOne({ _id: orderDoc._id }, { $set: { stockReduced: true } });
      } catch (stockErr) {
        console.error('Error reducing stock for order:', stockErr);
      }
    };

    // If order already exists in the shared database (created by customer backend), update and return it
    const existing = await Order.findOne({ $or: [{ id: appId }, { id: id }, { order_number: appId }, { order_number: id }] });
    if (existing) {
      await Order.updateOne(
        { _id: existing._id },
        {
          $set: {
            applicationId: appId || existing.applicationId || existing.order_number || existing.id,
            jobId: req.body.jobId || (items && items[0]?.productId) || existing.jobId,
            jobTitle: req.body.jobTitle || (items && items[0]?.name) || existing.jobTitle || existing.product_details,
            vendorId: vendorId || existing.vendorId,
            memberId: memberId || existing.memberId,
            memberName: req.body.candidateName || memberName || existing.memberName,
            candidateName: req.body.candidateName || memberName || existing.candidateName || existing.memberName,
            candidateEmail: candidateEmail || req.body.customer_email || existing.candidateEmail,
            candidatePhone: req.body.customer_phone || req.body.candidatePhone || existing.candidatePhone,
            candidateResume: candidateResume || existing.candidateResume,
            experience: experience || existing.experience,
            candidateEducation: candidateEducation || existing.candidateEducation,
            jobLocation: req.body.jobLocation || req.body.candidateLocation || existing.jobLocation,
            applicationDate: req.body.applicationDate || existing.applicationDate || existing.createdAt || existing.created_at,
            items: (items && items.length > 0) ? items : existing.items,
            totalAmount: totalAmount ?? finalAmount,
            finalAmount: finalAmount,
            type: orderType,
            status: isJob ? (req.body.status && req.body.status !== 'Pending' && req.body.status !== 'Order Received' ? req.body.status : (existing.status && existing.status !== 'Pending' && existing.status !== 'Order Received' ? existing.status : 'APPLICATION RECEIVED')) : (req.body.status || existing.status || (orderType === 'Stay' ? 'Confirmed' : 'Order Received')),
            appointmentDate: appointmentDate || existing.appointmentDate,
            appointmentTimeSlot: appointmentTimeSlot || existing.appointmentTimeSlot,
            doctorName: doctorName || existing.doctorName,
            tableNumber: tableNumber || existing.tableNumber,
            roomNumber: roomNumber || existing.roomNumber,
            prescriptionUrl: prescriptionUrl || existing.prescriptionUrl,
            checkInDate: req.body.checkInDate || req.body.check_in_date || appointmentDate || existing.checkInDate,
            checkInTime: req.body.checkInTime || req.body.check_in_time || existing.checkInTime,
            checkOutDate: req.body.checkOutDate || req.body.check_out_date || existing.checkOutDate,
            checkOutTime: req.body.checkOutTime || req.body.check_out_time || existing.checkOutTime,
            guestList: Array.isArray(req.body.guestList) ? req.body.guestList : (existing.guestList || existing.guestDetails || []),
            guestDetails: Array.isArray(req.body.guestDetails) ? req.body.guestDetails : (existing.guestDetails || existing.guestList || []),
            guests: req.body.guests || req.body.numberOfGuests || req.body.guestCount || req.body.adults || existing.guests,
            adults: req.body.adults || existing.adults,
            children: req.body.children || existing.children,
            infants: req.body.infants || existing.infants,
            roomsCount: req.body.roomsCount || req.body.numberOfRooms || existing.roomsCount,
            nightsCount: req.body.nightsCount || req.body.numberOfNights || existing.nightsCount,
            vehicleDetails: req.body.vehicleDetails || existing.vehicleDetails,
            travelType: req.body.travelType || existing.travelType,
            vehicleType: req.body.vehicleType || existing.vehicleType,
            vehicleNumber: req.body.vehicleNumber || existing.vehicleNumber,
            pickupDropInfo: req.body.pickupDropInfo || existing.pickupDropInfo,
            customer_address: req.body.customer_address || req.body.address || req.body.deliveryAddress || existing.customer_address,
            deliveryAddress: req.body.deliveryAddress || req.body.customer_address || req.body.address || existing.deliveryAddress,
            customer_phone: req.body.customer_phone || req.body.phone || existing.customer_phone,
            customerId: resolvedCustId,
            customerDisplayId: resolvedCustId,
            // Payment fields - always set resolved or preserved values
            paymentMethod: resolvedPaymentMethod || existing.paymentMethod || existing.payment_method || 'Connect Wallet',
            payment_method: resolvedPaymentMethod || existing.payment_method || existing.paymentMethod || 'Connect Wallet',
            paymentStatus: resolvedPaymentStatus || existing.paymentStatus || existing.payment_status || 'Paid',
            payment_status: resolvedPaymentStatus || existing.payment_status || existing.paymentStatus || 'Paid',
            ...(resolvedTxnId && { transactionId: resolvedTxnId }),
            ...(resolvedPaidAt && { paidAt: resolvedPaidAt }),
            ...(razorpayPaymentId && { razorpayPaymentId }),
            ...(razorpayOrderId && { razorpayOrderId }),
            ...(paymentReference && { paymentReference }),
            ...(paymentProvider && { paymentProvider: resolvedPaymentMethod || paymentProvider })
          }
        }
      );
      await reduceStockForOrder(existing, vendorId);
      return res.status(200).json({ success: true, message: 'Order updated in vendor dashboard successfully', data: existing });
    }

    const order = await Order.create(orderData);
    await reduceStockForOrder(order, vendorId);
    
    res.status(201).json({ success: true, message: 'Order created in vendor dashboard successfully', data: order });
  } catch (error) {
    console.error('Create Public Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order in vendor dashboard' });
  }
});

// POST /api/public/orders/payment-sync
// @desc  Sync payment details from customer backend to vendor order after payment completion
router.post('/orders/payment-sync', async (req, res) => {
  try {
    const {
      orderId,
      order_number,
      paymentMethod,
      paymentStatus,
      razorpayPaymentId,
      razorpayOrderId,
      transactionId,
      paidAt,
      paymentProvider,
      paymentReference,
      status
    } = req.body;

    if (!orderId && !order_number) {
      return res.status(400).json({ success: false, message: 'orderId or order_number is required' });
    }

    // Build query to find order
    const orConditions = [];
    if (orderId) {
      orConditions.push({ id: orderId }, { order_number: orderId });
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(orderId) });
      }
    }
    if (order_number) {
      orConditions.push({ id: order_number }, { order_number: order_number });
    }

    const existingOrder = await Order.findOne({ $or: orConditions });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Normalize payment method
    const normalizePaymentMethod = (method, provider) => {
      const m = (method || provider || '').toString().toUpperCase();
      if (m === 'COD' || m === 'CASH_ON_DELIVERY' || m === 'CASH ON DELIVERY') return 'Cash on Delivery';
      if (m === 'WALLET') return 'Wallet';
      if (m === 'RAZORPAY' || m === 'ONLINE' || m === 'UPI' || m === 'CARD' || m === 'NETBANKING' || m === 'NET_BANKING') return 'Online (Razorpay)';
      if (method) return method;
      return null;
    };

    const resolvedPaymentMethod = normalizePaymentMethod(paymentMethod, paymentProvider);
    const resolvedPaymentStatus = paymentStatus
      ? (paymentStatus.toString().toUpperCase() === 'SUCCESS' || paymentStatus.toString().toUpperCase() === 'PAID' || paymentStatus.toString().toUpperCase() === 'COMPLETED' ? 'Paid' : paymentStatus)
      : null;

    const updateFields = {};
    if (resolvedPaymentMethod) updateFields.paymentMethod = resolvedPaymentMethod;
    if (resolvedPaymentStatus) updateFields.paymentStatus = resolvedPaymentStatus;
    if (razorpayPaymentId) updateFields.razorpayPaymentId = razorpayPaymentId;
    if (razorpayOrderId) updateFields.razorpayOrderId = razorpayOrderId;
    if (transactionId) updateFields.transactionId = transactionId;
    if (paidAt) updateFields.paidAt = paidAt;
    if (paymentReference) updateFields.paymentReference = paymentReference;
    if (paymentProvider) updateFields.paymentProvider = resolvedPaymentMethod || paymentProvider;
    // Update order status if provided
    if (status && !['Pending', 'Order Received'].includes(existingOrder.status)) {
      // Only update if order hasn't already been processed
    } else if (status) {
      updateFields.status = status;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No payment fields to update' });
    }

    await Order.updateOne({ _id: existingOrder._id }, { $set: updateFields });

    console.log(`[Payment Sync] Order ${existingOrder.order_number || existingOrder.id} updated:`, updateFields);
    res.status(200).json({ success: true, message: 'Payment details synced successfully', data: { orderId: existingOrder._id, ...updateFields } });
  } catch (error) {
    console.error('Payment Sync Error:', error);
    res.status(500).json({ success: false, message: 'Server error syncing payment details' });
  }
});

// @route   GET /api/public/categories/subcategories/fields
// @desc    Get required vendor fields for subcategory or child category
router.get('/categories/subcategories/fields', async (req, res) => {
  try {
    const { name, subcategory, subSubcategory, childCategory, subcategoryId } = req.query;
    let catDoc = null;

    if (subcategoryId) {
      catDoc = await Category.findById(subcategoryId).lean();
    } else {
      const childName = (subSubcategory || childCategory || '').trim();
      const subName = (subcategory || '').trim();
      const mainName = (name || '').trim();

      if (!childName && !subName && !mainName) {
        return res.json({ success: true, requiredVendorFields: [] });
      }

      // Strategy: Search Child Category first, then Subcategory, then Main. Prioritize non-empty requiredVendorFields.
      if (childName) {
        const escChild = childName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const childReg = new RegExp(`^${escChild}$`, 'i');

        // 1. Try finding child doc with non-empty fields
        catDoc = await Category.findOne({
          isDeleted: { $ne: true },
          $or: [
            { subSubcategory: childReg },
            { name: childReg, level: 'child' }
          ],
          requiredVendorFields: { $exists: true, $not: { $size: 0 } }
        }).sort({ updatedAt: -1 }).lean();

        // 2. Try finding any child doc matching childName
        if (!catDoc) {
          catDoc = await Category.findOne({
            isDeleted: { $ne: true },
            $or: [
              { subSubcategory: childReg },
              { name: childReg, level: 'child' }
            ]
          }).sort({ updatedAt: -1 }).lean();
        }
      }

      if (!catDoc && subName) {
        const escSub = subName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const subReg = new RegExp(`^${escSub}$`, 'i');

        // 1. Try finding subcategory doc with non-empty fields
        catDoc = await Category.findOne({
          isDeleted: { $ne: true },
          $or: [
            { subcategory: subReg },
            { name: subReg, level: 'sub' }
          ],
          requiredVendorFields: { $exists: true, $not: { $size: 0 } }
        }).sort({ updatedAt: -1 }).lean();

        // 2. Try finding any subcategory doc
        if (!catDoc) {
          catDoc = await Category.findOne({
            isDeleted: { $ne: true },
            $or: [
              { subcategory: subReg },
              { name: subReg, level: 'sub' }
            ]
          }).sort({ updatedAt: -1 }).lean();
        }
      }

      if (!catDoc && mainName) {
        const escMain = mainName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        catDoc = await Category.findOne({ isDeleted: { $ne: true }, name: new RegExp(`^${escMain}$`, 'i') }).sort({ updatedAt: -1 }).lean();
      }
    }

    const rawFields = catDoc?.requiredVendorFields || [];
    const requiredVendorFields = Array.isArray(rawFields)
      ? rawFields.map(f => String(f).trim()).filter(Boolean)
      : (typeof rawFields === 'string' ? rawFields.split(',').map(s => s.trim()).filter(Boolean) : []);

    return res.json({
      success: true,
      category: catDoc?.subSubcategory || catDoc?.subcategory || catDoc?.name || '',
      requiredVendorFields
    });
  } catch (err) {
    console.error('Error fetching category required vendor fields:', err);
    return res.json({ success: true, requiredVendorFields: [] });
  }
});

// Helper to resolve clean category hierarchy strictly from MongoDB documents
const buildCleanCategoryHierarchy = (dbCats, targetMainCatName, onlyActive = true) => {
  const SYSTEM_MAIN_CATS = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
  const targetLower = (targetMainCatName || '').trim().toLowerCase();

  const getSubName = (c) => (c.subcategory || (c.level === 'sub' && !SYSTEM_MAIN_CATS.map(m => m.toLowerCase()).includes(String(c.name).toLowerCase()) ? c.name : '')).trim();
  const getChildName = (c) => (c.subSubcategory || (c.level === 'child' && !SYSTEM_MAIN_CATS.map(m => m.toLowerCase()).includes(String(c.name).toLowerCase()) ? c.name : '')).trim();

  // Find Main Category doc
  const mainDoc = dbCats.find(c => 
    (c.level === 'main' || !c.parentId) && 
    String(c.name || '').trim().toLowerCase() === targetLower
  );

  const mainCatId = mainDoc ? String(mainDoc._id) : null;
  const canonicalMainName = mainDoc ? mainDoc.name : (targetMainCatName.charAt(0).toUpperCase() + targetMainCatName.slice(1));

  // Find all Subcategory docs strictly belonging to this Main Category
  const subDocs = dbCats.filter(c => {
    if (c.level !== 'sub') return false;
    if (c.isDeleted || c.description === 'DELETED_HIERARCHY_MARKER') return false;
    if (onlyActive && c.isActive === false) return false;

    const matchesParentId = mainCatId && String(c.parentId) === mainCatId;
    const matchesName = String(c.name || '').trim().toLowerCase() === targetLower;
    const matchesMain = String(c.mainCategory || '').trim().toLowerCase() === targetLower;

    return matchesParentId || matchesName || matchesMain;
  });

  const subcategoriesMap = new Map();

  subDocs.forEach(s => {
    const sName = getSubName(s);
    if (!sName || sName === 'ALL_SUBCATEGORIES_DELETED_MARKER') return;

    const sKey = sName.toLowerCase();
    if (!subcategoriesMap.has(sKey)) {
      subcategoriesMap.set(sKey, {
        _id: s._id,
        id: s._id,
        name: sName,
        slug: s.slug || sName.toLowerCase().replace(/\s+/g, '-'),
        mainCategory: canonicalMainName,
        mainCategoryId: mainCatId,
        isActive: s.isActive !== false,
        requiredVendorFields: s.requiredVendorFields || [],
        description: s.description || '',
        childCategories: []
      });
    }

    const subObj = subcategoriesMap.get(sKey);
    const subDocId = String(s._id);

    // Find child categories strictly belonging to this subcategory
    const childDocs = dbCats.filter(ch => {
      if (ch.level !== 'child') return false;
      if (ch.isDeleted || ch.description === 'DELETED_HIERARCHY_MARKER') return false;
      if (onlyActive && ch.isActive === false) return false;

      const matchesParent = String(ch.parentId) === subDocId;
      const chSubName = getSubName(ch).toLowerCase();
      const matchesSubName = chSubName && chSubName === sKey;
      const matchesMain = String(ch.name || '').trim().toLowerCase() === targetLower || 
                          String(ch.mainCategory || '').trim().toLowerCase() === targetLower;

      return matchesParent || (matchesSubName && matchesMain);
    });

    childDocs.forEach(ch => {
      const chName = getChildName(ch);
      if (!chName || chName === 'ALL_CHILD_DELETED_MARKER') return;

      const chKey = chName.toLowerCase();
      if (!subObj.childCategories.some(c => c.name.toLowerCase() === chKey)) {
        subObj.childCategories.push({
          _id: ch._id,
          id: ch._id,
          name: chName,
          slug: ch.slug || chName.toLowerCase().replace(/\s+/g, '-'),
          subcategoryId: s._id,
          subcategory: sName,
          mainCategory: canonicalMainName,
          isActive: ch.isActive !== false,
          requiredVendorFields: ch.requiredVendorFields || [],
          description: ch.description || ''
        });
      }
    });
  });

  return {
    mainCategory: canonicalMainName,
    mainCategoryId: mainCatId,
    subcategories: Array.from(subcategoriesMap.values())
  };
};

// @route   GET /api/public/categories/subcategories
// @desc    Get strictly filtered subcategories for a main category
router.get('/categories/subcategories', async (req, res) => {
  try {
    const { mainCategory, onlyActive } = req.query;
    if (!mainCategory) {
      return res.status(400).json({ success: false, message: 'mainCategory query parameter is required', data: [] });
    }

    const dbCats = await Category.find({ isDeleted: { $ne: true } }).lean();
    const shouldFilterActive = onlyActive !== 'false';
    const hierarchy = buildCleanCategoryHierarchy(dbCats, mainCategory, shouldFilterActive);

    res.status(200).json({
      success: true,
      mainCategory: hierarchy.mainCategory,
      mainCategoryId: hierarchy.mainCategoryId,
      data: hierarchy.subcategories
    });
  } catch (error) {
    console.error('Get Subcategories Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching subcategories', data: [] });
  }
});

// @route   GET /api/public/categories/child-categories
// @desc    Get strictly filtered child categories for a subcategory
router.get('/categories/child-categories', async (req, res) => {
  try {
    const { mainCategory, subCategoryId, subcategory, onlyActive } = req.query;
    if (!mainCategory) {
      return res.status(400).json({ success: false, message: 'mainCategory is required', data: [] });
    }
    if (!subCategoryId && !subcategory) {
      return res.status(400).json({ success: false, message: 'subCategoryId or subcategory is required', data: [] });
    }

    const dbCats = await Category.find({ isDeleted: { $ne: true } }).lean();
    const shouldFilterActive = onlyActive !== 'false';
    const hierarchy = buildCleanCategoryHierarchy(dbCats, mainCategory, shouldFilterActive);

    const targetSub = hierarchy.subcategories.find(s => 
      (subCategoryId && String(s._id) === String(subCategoryId)) || 
      (subcategory && s.name.toLowerCase() === subcategory.trim().toLowerCase())
    );

    res.status(200).json({
      success: true,
      mainCategory: hierarchy.mainCategory,
      subcategory: targetSub ? targetSub.name : (subcategory || ''),
      subCategoryId: targetSub ? targetSub._id : (subCategoryId || null),
      data: targetSub ? targetSub.childCategories : []
    });
  } catch (error) {
    console.error('Get Child Categories Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching child categories', data: [] });
  }
});

// @route   GET /api/public/categories/main
// @desc    Get strictly admin-added active main categories from MongoDB
router.get('/categories/main', async (req, res) => {
  try {
    const dbCats = await Category.find({ isDeleted: { $ne: true } }).lean();
    
    // Find all level 'main' or top-level category documents created by admin
    const mainDocs = dbCats.filter(c => 
      (c.level === 'main' || (!c.parentId && !c.subcategory && !c.subSubcategory)) && 
      c.isActive !== false
    );

    const seen = new Set();
    const categories = [];
    mainDocs.forEach(c => {
      const name = String(c.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        categories.push(name);
      }
    });

    const defaultMains = ['Products', 'Services', 'Food', 'Daily Needs', 'Stay', 'Travel', 'Jobs'];
    const finalCategories = categories.length > 0 ? categories : defaultMains;

    res.status(200).json({
      success: true,
      categories: finalCategories,
      count: finalCategories.length
    });
  } catch (error) {
    console.error('Get Main Categories Error:', error);
    res.status(500).json({ 
      success: false, 
      categories: ['Products', 'Services', 'Food', 'Daily Needs', 'Stay', 'Travel', 'Jobs'],
      message: 'Server error fetching main categories' 
    });
  }
});

// @route   GET /api/public/categories
// @desc    Get dynamic admin categories and base taxonomy, with strict mainCategory filtering support
router.get('/categories', async (req, res) => {
  try {
    const { mainCategory, onlyActive } = req.query;
    const dbCats = await Category.find({ isDeleted: { $ne: true } }).lean();

    if (mainCategory) {
      const shouldFilterActive = onlyActive !== 'false';
      const hierarchy = buildCleanCategoryHierarchy(dbCats, mainCategory, shouldFilterActive);
      return res.status(200).json({
        success: true,
        mainCategory: hierarchy.mainCategory,
        mainCategoryId: hierarchy.mainCategoryId,
        subcategories: hierarchy.subcategories,
        data: dbCats || [],
        hierarchy
      });
    }

    res.status(200).json({ success: true, data: dbCats || [], taxonomy: COMPLETE_CAT_TAXONOMY });
  } catch (error) {
    console.error('Get Public Categories Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching categories', taxonomy: COMPLETE_CAT_TAXONOMY });
  }
});

module.exports = router;

