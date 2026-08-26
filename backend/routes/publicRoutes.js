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
    const suspendedCategoryKeys = new Set();
    const vendorMap = {};

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
    const products = await Product.find({});

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

      // 2. Cross-reference matching vendor user in allVendorUsers
      const matchingVendorUser = allVendorUsers.find(v => {
        const vId = v._id ? v._id.toString() : '';
        const vPrimaryBizId = v.primaryBusinessId ? v.primaryBusinessId.toString() : '';
        const vVenId = v.vendorId ? v.vendorId.toString() : '';
        const vRegId = v.registrationId ? v.registrationId.toString() : '';
        const vRegId2 = v.regId ? v.regId.toString() : '';
        const vUser = v.username ? v.username.toLowerCase().trim() : '';
        const vEmail = v.email ? v.email.toLowerCase().trim() : '';
        const vPhone = v.phone ? v.phone.toString().replace(/\D/g, '') : '';
        const vMob = v.mobileNumber ? v.mobileNumber.toString().replace(/\D/g, '') : '';
        const vBiz = v.businessName ? v.businessName.toLowerCase().trim() : '';
        const vName = v.name ? v.name.toLowerCase().trim() : '';

        const vBizListKeys = [];
        if (v.businesses && Array.isArray(v.businesses)) {
          v.businesses.forEach(b => {
            if (b._id) vBizListKeys.push(b._id.toString());
            if (b.businessName) vBizListKeys.push(b.businessName.toLowerCase().trim());
            if (b.name) vBizListKeys.push(b.name.toLowerCase().trim());
          });
        }

        const allKeysForVendor = [vId, vPrimaryBizId, vVenId, vRegId, vRegId2, vUser, vEmail, vPhone, vMob, vBiz, vName, ...vBizListKeys].filter(Boolean);

        return productVendorKeys.some(k => allKeysForVendor.includes(k));
      });

      if (!matchingVendorUser) {
        // Exclude products that do not belong to any active registered vendor user in the system
        return false;
      }

      const vStatus = (matchingVendorUser.status || matchingVendorUser.vendorStatus || '').toString().toLowerCase().trim();
      const isSusp = ['suspended', 'inactive', 'rejected', 'deactivated', 'disabled', 'blocked'].includes(vStatus) || 
                     matchingVendorUser.isActive === false || 
                     matchingVendorUser.isApproved === false ||
                     matchingVendorUser.isLocked === true || 
                     matchingVendorUser.isSuspended === true;
      if (isSusp) {
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
        : (subNavbarCategory === 'Services' 
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
    customerDisplayId
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
      jobLocation: req.body.jobLocation,
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
            jobLocation: req.body.jobLocation || existing.jobLocation,
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

    // Reduce stock count for ordered items
    try {
      if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const qty = Number(item.quantity || item.qty || 1);
          let prod = null;
          if (item.productId || item._id || item.id) {
            prod = await Product.findById(item.productId || item._id || item.id);
          }
          if (!prod && item.name) {
            prod = await Product.findOne({ name: item.name, $or: [{ vendorId }, { vendor_id: vendorId }] });
          }
          if (prod && typeof prod.stock === 'number') {
            prod.stock = Math.max(0, prod.stock - qty);
            if (prod.stock === 0) {
              prod.status = 'Out of Stock';
            }
            await prod.save();
          }
        }
      } else if (req.body.productId || req.body.product_details) {
        let prod = null;
        if (req.body.productId) prod = await Product.findById(req.body.productId);
        if (!prod && req.body.product_details) {
          prod = await Product.findOne({ name: req.body.product_details, $or: [{ vendorId }, { vendor_id: vendorId }] });
        }
        if (prod && typeof prod.stock === 'number') {
          const qty = Number(req.body.quantity || 1);
          prod.stock = Math.max(0, prod.stock - qty);
          if (prod.stock === 0) {
            prod.status = 'Out of Stock';
          }
          await prod.save();
        }
      }
    } catch (stockErr) {
      console.error('Error reducing stock for public order:', stockErr);
    }
    
    res.status(201).json({ success: true, message: 'Order created in vendor dashboard successfully', data: order });
  } catch (error) {
    console.error('Create Public Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order in vendor dashboard' });
  }
});

// @route   GET /api/public/categories/subcategories/fields
// @desc    Get required vendor fields for subcategory or child category
router.get('/categories/subcategories/fields', async (req, res) => {
  try {
    const { name, subcategory, subcategoryId } = req.query;
    let query = { isDeleted: { $ne: true } };
    if (subcategoryId) {
      query._id = subcategoryId;
    } else if (subcategory || name) {
      const catName = (subcategory || name).trim();
      const escName = catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subSubcategory: new RegExp(`^${escName}$`, 'i') },
        { subcategory: new RegExp(`^${escName}$`, 'i') },
        { name: new RegExp(`^${escName}$`, 'i') }
      ];
    } else {
      return res.json({ success: true, requiredVendorFields: [] });
    }

    const catDoc = await Category.findOne(query).sort({ level: -1 }).select('name subcategory subSubcategory requiredVendorFields').lean();
    return res.json({
      success: true,
      category: catDoc?.subSubcategory || catDoc?.subcategory || catDoc?.name || subcategory || name || '',
      requiredVendorFields: catDoc?.requiredVendorFields || []
    });
  } catch (err) {
    console.error('Error fetching category required vendor fields:', err);
    return res.json({ success: true, requiredVendorFields: [] });
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
