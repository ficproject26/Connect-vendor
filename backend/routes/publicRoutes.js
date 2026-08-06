const express = require('express');
const { Product, User, Order, Category } = require('../models/Schemas');
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
    const allVendorUsers = await User.find({});

    const suspendedIds = new Set();
    const suspendedNames = new Set();
    const vendorMap = {};

    allVendorUsers.forEach(vendor => {
      const vStatus = (vendor.status || '').toLowerCase().trim();
      const isUserSuspended = ['suspended', 'inactive', 'rejected'].includes(vStatus) || vendor.isActive === false || vendor.isLocked === true;

      const vendorIdStr = vendor._id ? vendor._id.toString() : '';
      const emailLower = vendor.email ? vendor.email.toLowerCase().trim() : '';

      if (isUserSuspended) {
        if (vendorIdStr) suspendedIds.add(vendorIdStr);
        if (vendor.vendorId) suspendedIds.add(vendor.vendorId.toString());
        if (vendor.registrationId) suspendedIds.add(vendor.registrationId.toString());
        if (emailLower) suspendedIds.add(emailLower);
        if (vendor.businessName) suspendedNames.add(vendor.businessName.toLowerCase().trim());
        if (vendor.name) suspendedNames.add(vendor.name.toLowerCase().trim());

        if (vendor.businesses && Array.isArray(vendor.businesses)) {
          vendor.businesses.forEach(b => {
            if (b._id) suspendedIds.add(b._id.toString());
            if (b.businessName) suspendedNames.add(b.businessName.toLowerCase().trim());
            if (b.name) suspendedNames.add(b.name.toLowerCase().trim());
          });
        }
      } else {
        // User is active, but check each business sub-document
        if (vendor.businesses && Array.isArray(vendor.businesses)) {
          vendor.businesses.forEach(biz => {
            const bizStatus = (biz.status || '').toLowerCase().trim();
            const isBizSuspended = ['suspended', 'inactive', 'rejected'].includes(bizStatus) || biz.isActive === false;
            
            if (isBizSuspended) {
              if (biz._id) suspendedIds.add(biz._id.toString());
              if (biz.businessName) suspendedNames.add(biz.businessName.toLowerCase().trim());
              if (biz.name) suspendedNames.add(biz.name.toLowerCase().trim());
            } else if (biz._id) {
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
        if (vendorIdStr) vendorMap[vendorIdStr] = vData;
        if (vendor.vendorId) vendorMap[vendor.vendorId.toString()] = vData;
        if (vendor.registrationId) vendorMap[vendor.registrationId.toString()] = vData;
        if (emailLower) vendorMap[emailLower] = vData;
        if (vendor.businessName) vendorMap[vendor.businessName.toLowerCase().trim()] = vData;
        if (vendor.name) vendorMap[vendor.name.toLowerCase().trim()] = vData;
      }
    });

    // 2. Fetch all products
    const products = await Product.find({});

    // Filter products: must belong to an active vendor in vendorMap, and must NOT be in suspendedIds or suspendedNames
    const activeProducts = products.filter(p => {
      const vIdStr = (p.vendorId || p.vendor_id || '').toString().trim();
      const pBizId = (p.businessId || p.outletId || p.storeId || '').toString().trim();
      const vEmail = (p.vendorEmail || '').toLowerCase().trim();
      const pVendorName = (p.vendorName || p.brand || p.companyName || p.businessName || '').toLowerCase().trim();

      // If vendor or business is explicitly suspended by ID, email, or brand name -> exclude
      if (
        (vIdStr && suspendedIds.has(vIdStr)) ||
        (pBizId && suspendedIds.has(pBizId)) ||
        (vEmail && suspendedIds.has(vEmail)) ||
        (pVendorName && suspendedNames.has(pVendorName))
      ) {
        return false;
      }

      // Product MUST belong to an active vendor or active business in vendorMap
      const hasActiveVendor = (vIdStr && !!vendorMap[vIdStr]) || 
                             (pBizId && !!vendorMap[pBizId]) || 
                             (vEmail && !!vendorMap[vEmail]) ||
                             (pVendorName && !!vendorMap[pVendorName]);
      return hasActiveVendor;
    });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // 3. Map active products to customer app format
    const mappedProducts = activeProducts.map(p => {
      const vIdStr = (p.vendorId || p.vendor_id || '').toString();
      const vendor = vendorMap[vIdStr] || {
        name: 'Store Vendor',
        baseVendorType: 'Store Vendor',
        category: p.category || 'General',
        city: 'Bangalore',
        address: '',
        logo: '',
        mobileNumber: '',
        operatingHours: ''
      };
      const subNavbarCategory = p.subNavbarCategory || p.mainCategory || getSubNavbarCategory(vendor.baseVendorType, p.category);
      
      return {
        id: p._id,
        vendorId: vIdStr || p._id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        unit: p.unit || 'count',
        stock: p.stock,
        status: p.status || 'Available',
        originalPrice: p.originalPrice || Math.round(p.price * 1.25),
        guests: p.guests || 2,
        amenities: p.amenities || [],
        category: p.category || vendor.category || 'General',
        subcategory: p.subcategory || '',
        subSubcategory: p.subSubcategory || '',
        subNavbarCategory: subNavbarCategory,
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
        distance: p.distance,
        busTiming: p.busTiming,
        stoppings: p.stoppings || [],
        image: p.imageUrl 
          ? (p.imageUrl.startsWith('/uploads') ? `${baseUrl}${p.imageUrl}` : p.imageUrl)
          : (subNavbarCategory === 'Services' 
              ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60' 
              : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'),
        images: p.imageUrls && p.imageUrls.length > 0
          ? p.imageUrls.map(img => img.startsWith('/uploads') ? `${baseUrl}${img}` : img)
          : [p.imageUrl 
              ? (p.imageUrl.startsWith('/uploads') ? `${baseUrl}${p.imageUrl}` : p.imageUrl)
              : (subNavbarCategory === 'Services' 
                  ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60' 
                  : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60')],
        rating: 4.5,
        reviews: 120,
        vendorName: vendor.name,
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
          return vendor.city || 'Bangalore';
        })(),
        tag: p.status === 'Unavailable' ? 'Unavailable' : (p.status === 'Low Stock' ? 'Low Stock' : 'Verified Partner'),
        discount: '20% off',
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
    customerDisplayId
  } = req.body;

  if (!vendorId || !memberName || finalAmount === undefined || finalAmount === null) {
    return res.status(400).json({ success: false, message: 'Vendor ID, Member name, and Final amount are required' });
  }

  try {
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

    const orderData = {
      id: id,
      order_number: order_number,
      vendorId,
      memberId: memberId || 'cust_dhanush',
      memberName,
      type: orderType,
      items: items || [],
      totalAmount: totalAmount ?? finalAmount,
      discountApplied: discountApplied || 0,
      finalAmount: finalAmount,
      status: 'Pending',
      candidateEmail,
      candidateResume,
      experience,
      candidateEducation,
      appointmentDate,
      appointmentTimeSlot,
      doctorName,
      tableNumber,
      roomNumber,
      prescriptionUrl,
      customerDisplayId
    };

    // If order already exists in the shared database (created by customer backend), update and return it
    const existing = await Order.findOne({ id: id });
    if (existing) {
      await Order.updateOne(
        { id: id },
        {
          $set: {
            vendorId: vendorId || existing.vendorId,
            memberId: memberId || existing.memberId,
            memberName: memberName || existing.memberName,
            candidateEmail: candidateEmail || existing.candidateEmail,
            candidateResume: candidateResume || existing.candidateResume,
            experience: experience || existing.experience,
            candidateEducation: candidateEducation || existing.candidateEducation,
            items: (items && items.length > 0) ? items : existing.items,
            totalAmount: totalAmount ?? finalAmount,
            finalAmount: finalAmount,
            type: orderType,
            appointmentDate: appointmentDate || existing.appointmentDate,
            appointmentTimeSlot: appointmentTimeSlot || existing.appointmentTimeSlot,
            doctorName: doctorName || existing.doctorName,
            tableNumber: tableNumber || existing.tableNumber,
            roomNumber: roomNumber || existing.roomNumber,
            prescriptionUrl: prescriptionUrl || existing.prescriptionUrl
          }
        }
      );
      return res.status(200).json({ success: true, message: 'Order updated in vendor dashboard successfully', data: existing });
    }

    const order = await Order.create(orderData);
    
    res.status(201).json({ success: true, message: 'Order created in vendor dashboard successfully', data: order });
  } catch (error) {
    console.error('Create Public Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order in vendor dashboard' });
  }
});

// @route   GET /api/public/categories
// @desc    Get dynamic admin categories and base taxonomy
router.get('/categories', async (req, res) => {
  try {
    const dbCats = await Category.find({ isDeleted: { $ne: true } }).lean();
    res.status(200).json({ success: true, data: dbCats || [], taxonomy: COMPLETE_CAT_TAXONOMY });
  } catch (error) {
    console.error('Get Public Categories Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching categories', taxonomy: COMPLETE_CAT_TAXONOMY });
  }
});

module.exports = router;
