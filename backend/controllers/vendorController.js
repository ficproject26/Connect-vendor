const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { Product, Order, Customer, DeliveryPartner, User, MembershipCard, PlatformConfig, Patient } = require('../models/Schemas');
const { COMPLETE_CAT_TAXONOMY } = require('../data/completeTaxonomy');

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

// --- ANALYTICS ---
// @desc    Get vendor dashboard analytics
// @route   GET /api/vendor/analytics
// @access  Private (Vendor)
const getVendorAnalytics = async (req, res) => {
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

    // Fetch vendor orders
    const rawOrders = await Order.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });

    const orders = rawOrders.map(o => {
      const obj = o.toObject ? o.toObject() : o;
      if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
      if (!obj.memberName && obj.customer_name) obj.memberName = obj.customer_name;
      if (!obj.memberId && obj.customer_id) obj.memberId = obj.customer_id;
      if (obj.finalAmount === undefined && obj.amount !== undefined) obj.finalAmount = obj.amount;
      if (obj.totalAmount === undefined && obj.amount !== undefined) obj.totalAmount = obj.amount;
      return obj;
    });
    
    // Calculations
    const totalOrdersCount = orders.length;
    const completedOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'].includes(o.status));
    const pendingOrdersCount = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved'].includes(o.status)).length;
    
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0);
    const uniqueCustomersCount = await Customer.countDocuments({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });
    const totalItemsCount = await Product.countDocuments({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });
    const availableItemsCount = await Product.countDocuments({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ],
      status: 'Available'
    });

    // Today's Revenue Calculation
    const todayDateString = new Date().toDateString();
    const todayRevenue = completedOrders
      .filter(o => new Date(o.createdAt).toDateString() === todayDateString)
      .reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0);

    // Active Memberships Count
    const memberIds = [...new Set(orders.map(o => o.memberId).filter(Boolean))];
    const activeMembershipsCount = await MembershipCard.countDocuments({
      userId: { $in: memberIds },
      status: 'Active',
      expiresAt: { $gt: new Date() }
    });

    // Revenue Trend Chart Data (daily completed revenue for the last 7 calendar days)
    const dailyRevenueMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dailyRevenueMap[key] = 0;
    }
    completedOrders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      monthlyRevenueMap[key] = 0;
    }
    completedOrders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        ordersCount: totalOrdersCount,
        pendingOrdersCount,
        customersCount: uniqueCustomersCount,
        itemsCount: totalItemsCount,
        availableItemsCount,
        todayRevenue,
        activeMembershipsCount,
        recentRevenue: revenueTrend,
        monthlyRevenue,
        orderStatusDistribution
      }
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
      jobType, jobLocation, experience, skills, deadline, applicationTips, 
      qualification, linkedProfile, contactNumber, mailId, department,
      boardingPoint, boardingTime, dropPoint, arrivalTime, distance, busTiming, stoppings
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const vendorSubcategory = getVendorSubcategory(req.user);
    const finalCategory = category || vendorSubcategory || 'General';
    const vendorId = (req.body.vendorId || req.user._id).toString();

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
      imageUrl: imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : ''),
      imageUrls: imageUrls || (imageUrl ? [imageUrl] : []),
      foodType,
      bookingType: bookingType || 'Slot booking',
      status: 'Available',
      cardTypes: cardTypes || ['Silver', 'Gold', 'Diamond'],
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
      boardingPoint,
      boardingTime,
      dropPoint,
      arrivalTime,
      distance,
      busTiming,
      stoppings: stoppings || []
    });

    res.status(201).json({ success: true, message: 'Item created successfully', data: product });
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating catalog item' });
  }
};

const getProducts = async (req, res) => {
  try {
    const parentId = req.user.parentUserId || req.user._id;
    const activeBusinessId = req.user._id;
    const activeVendorType = req.user.vendorType || '';

    const products = await Product.find({
      $or: [
        { vendorId: activeBusinessId },
        { vendor_id: activeBusinessId },
        { vendorId: parentId },
        { vendor_id: parentId }
      ]
    });

    const filtered = products.filter(p => {
      const pVendorId = (p.vendorId || p.vendor_id || '').toString();
      if (pVendorId === activeBusinessId.toString()) {
        return true;
      }
      if (pVendorId === parentId.toString()) {
        const mainCat = getProductMainCategory(p.category);
        
        // Normalize vendor types / main categories (e.g. Services, Jobs, Stay, Food, Products, Daily Needs)
        let normalizedVendorType = activeVendorType;
        if (activeVendorType.endsWith(' Vendor')) {
          normalizedVendorType = activeVendorType.replace(' Vendor', '');
        }
        if (normalizedVendorType.startsWith('Restaurant')) {
          normalizedVendorType = 'Food';
        }
        if (normalizedVendorType.startsWith('Hotel')) {
          normalizedVendorType = 'Stay';
        }
        if (normalizedVendorType.startsWith('Travel Agency')) {
          normalizedVendorType = 'Travel';
        }
        if (normalizedVendorType.startsWith('Hospital') || normalizedVendorType.startsWith('Service')) {
          normalizedVendorType = 'Services';
        }
        if (normalizedVendorType.startsWith('Grocery') || normalizedVendorType.startsWith('Pharmacy')) {
          normalizedVendorType = 'Daily Needs';
        }
        if (normalizedVendorType.startsWith('Store') || normalizedVendorType.startsWith('Electronics') || normalizedVendorType.startsWith('Home & Furniture')) {
          normalizedVendorType = 'Products';
        }

        return mainCat.toLowerCase() === normalizedVendorType.toLowerCase();
      }
      return false;
    });

    res.status(200).json({ success: true, data: filtered });
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
      jobType, jobLocation, experience, skills, deadline, applicationTips, 
      qualification, linkedProfile, contactNumber, mailId, department,
      boardingPoint, boardingTime, dropPoint, arrivalTime, distance, busTiming, stoppings
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
        imageUrl: imageUrl !== undefined ? imageUrl : (imageUrls && imageUrls.length > 0 ? imageUrls[0] : product.imageUrl),
        imageUrls: imageUrls !== undefined ? imageUrls : (imageUrl !== undefined ? (imageUrl ? [imageUrl] : []) : product.imageUrls),
        foodType: foodType !== undefined ? foodType : product.foodType,
        bookingType: bookingType !== undefined ? bookingType : product.bookingType,
        status: status || product.status,
        cardTypes: cardTypes !== undefined ? cardTypes : product.cardTypes,
        availableTimeSlots: availableTimeSlots !== undefined ? availableTimeSlots : product.availableTimeSlots,
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
        boardingPoint: boardingPoint !== undefined ? boardingPoint : product.boardingPoint,
        boardingTime: boardingTime !== undefined ? boardingTime : product.boardingTime,
        dropPoint: dropPoint !== undefined ? dropPoint : product.dropPoint,
        arrivalTime: arrivalTime !== undefined ? arrivalTime : product.arrivalTime,
        distance: distance !== undefined ? distance : product.distance,
        busTiming: busTiming !== undefined ? busTiming : product.busTiming,
        stoppings: stoppings !== undefined ? stoppings : product.stoppings
      }
    }, { new: true });

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
const getOrders = async (req, res) => {
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

    // Fetch all products for this vendor to map item product IDs to sub-businesses
    const products = await Product.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });

    const productToBusinessMap = {};
    products.forEach(p => {
      let bizId = p.vendorId || p.vendor_id;
      if (bizId) {
        if (bizId.toString() === parentUserId.toString()) {
          // Resolve correct sub-business for parent-level products using category taxonomy mapping
          const mainCat = getProductMainCategory(p.category);
          const matchedBiz = user.businesses?.find(b => {
            let normalizedVendorType = b.vendorType || '';
            if (normalizedVendorType.endsWith(' Vendor')) {
              normalizedVendorType = normalizedVendorType.replace(' Vendor', '');
            }
            if (normalizedVendorType.startsWith('Restaurant')) normalizedVendorType = 'Food';
            else if (normalizedVendorType.startsWith('Hotel')) normalizedVendorType = 'Stay';
            else if (normalizedVendorType.startsWith('Travel Agency')) normalizedVendorType = 'Travel';
            else if (normalizedVendorType.startsWith('Hospital') || normalizedVendorType.startsWith('Service')) normalizedVendorType = 'Services';
            else if (normalizedVendorType.startsWith('Grocery') || normalizedVendorType.startsWith('Pharmacy')) normalizedVendorType = 'Daily Needs';
            else if (normalizedVendorType.startsWith('Job')) normalizedVendorType = 'Jobs';
            else if (normalizedVendorType.startsWith('Store') || normalizedVendorType.startsWith('Electronics') || normalizedVendorType.startsWith('Home & Furniture')) normalizedVendorType = 'Products';
            
            return mainCat.toLowerCase() === normalizedVendorType.toLowerCase();
          });
          if (matchedBiz) {
            bizId = matchedBiz._id;
          }
        }
        productToBusinessMap[p._id.toString()] = bizId.toString();
      }
    });

    // Fetch orders matching vendor businessIds
    const orders = await Order.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    }).sort({ createdAt: -1 });

    const normalizedOrders = orders.map(o => {
      const obj = o.toObject ? o.toObject() : o;
      if (!obj.vendorId && obj.vendor_id) obj.vendorId = obj.vendor_id;
      if (!obj.memberName && obj.customer_name) obj.memberName = obj.customer_name;
      if (!obj.memberId && obj.customer_id) obj.memberId = obj.customer_id;
      if (obj.finalAmount === undefined && obj.amount !== undefined) obj.finalAmount = obj.amount;
      if (obj.totalAmount === undefined && obj.amount !== undefined) obj.totalAmount = obj.amount;

      // Dynamically override parent vendorId with correct business ID if it's a legacy parent order
      const orderVendorId = obj.vendorId ? obj.vendorId.toString() : '';
      if (orderVendorId === parentUserId.toString() && obj.items && obj.items.length > 0) {
        const firstItemId = obj.items[0].productId;
        if (firstItemId && productToBusinessMap[firstItemId.toString()]) {
          obj.vendorId = productToBusinessMap[firstItemId.toString()];
        }
      }

      return obj;
    });

    res.status(200).json({ success: true, data: normalizedOrders });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving orders' });
  }
};

// @desc    Update order / booking / appointment status
// @route   PUT /api/vendor/orders/:id/status
// @access  Private (Vendor)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryPartnerId } = req.body;
    const order = await Order.findById(req.params.id);

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

    if (!order || !businessIds.includes(order.vendorId.toString())) {
      return res.status(404).json({ success: false, message: 'Order/Booking not found or unauthorized' });
    }

    const oldStatus = order.status;
    order.status = status || order.status;

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

    await order.save();

    // Sync order status back to customer backend (Connect App)
    if (order.status !== oldStatus) {
      try {
        let custStatus = order.status;
        if (order.status === 'Accepted') custStatus = 'Preparing';
        else if (order.status === 'Out for Delivery') custStatus = 'Out For Delivery';

        const syncUrl = `http://localhost:8001/api/orders/${order._id}/status`;
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
        customer.totalSpent += order.finalAmount;
        await customer.save();
      } else {
        await Customer.create({
          vendorId: order.vendorId,
          name: order.memberName,
          email: order.memberId,
          ordersCount: 1,
          totalSpent: order.finalAmount
        });
      }
    }

    res.status(200).json({ success: true, message: 'Order status updated successfully', data: order });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating order status' });
  }
};

// --- CUSTOMERS ---
// @desc    Get all unique customers for the vendor
// @route   GET /api/vendor/customers
// @access  Private (Vendor)
const getCustomers = async (req, res) => {
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

    const dbCustomers = await Customer.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });

    const rawOrders = await Order.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendor_id: { $in: businessIds } }
      ]
    });

    const customerMap = {};

    // Add existing Customer collection entries
    dbCustomers.forEach(c => {
      const obj = c.toObject ? c.toObject() : c;
      const key = (obj.email || obj.memberId || obj.name || obj._id).toString().toLowerCase();
      customerMap[key] = {
        _id: obj._id,
        name: obj.name || 'Customer',
        email: obj.email || '',
        phone: obj.phone || '',
        ordersCount: obj.ordersCount || 0,
        totalSpent: obj.totalSpent || 0
      };
    });

    // Aggregate all customers who have placed orders / applied / booked
    rawOrders.forEach(o => {
      const name = o.memberName || o.customer_name || 'Customer';
      const email = o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
      const key = (email || name || o.memberId).toString().toLowerCase();

      const amount = Number(o.finalAmount || o.totalAmount || o.amount || 0);

      if (customerMap[key]) {
        customerMap[key].ordersCount += 1;
        customerMap[key].totalSpent += amount;
        if (!customerMap[key].name || customerMap[key].name === 'Customer') customerMap[key].name = name;
        if (!customerMap[key].email) customerMap[key].email = email;
      } else {
        customerMap[key] = {
          _id: o.memberId || o._id,
          name: name,
          email: email,
          phone: o.customer_phone || '+91 9876543210',
          ordersCount: 1,
          totalSpent: amount
        };
      }
    });

    const finalCustomers = Object.values(customerMap);
    res.status(200).json({ success: true, data: finalCustomers });
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customers list' });
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

    if (!partner || partner.vendorId !== req.user._id) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found or unauthorized' });
    }

    const updated = await DeliveryPartner.findByIdAndUpdate(req.params.id, {
      $set: {
        ...req.body,
        vendorId: req.user._id
      }
    }, { new: true });

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

    if (!partner || partner.vendorId !== req.user._id) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found or unauthorized' });
    }

    await DeliveryPartner.findByIdAndDelete(req.params.id);
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
    const user = await User.findById(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const userResponse = user.toObject();
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

    const keys = [
      'name', 'email', 'businessName', 'agentName', 'alternateVendorName', 'contactPerson', 'mobileNumber',
      'address', 'street', 'city', 'state', 'country', 'postalCode', 'telephone', 'fax',
      'alternateNumber', 'coPartnerName', 'gstStatus', 'panNo', 'companyRegNo', 'gstNumber',
      'msmeStatus', 'businessLicense', 'accountHolderName', 'bankName', 'bankBranch',
      'bankStreet', 'bankCity', 'accountNo', 'ifscCode', 'swiftCode', 'logo'
    ];

    keys.forEach(key => {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    });

    // Also update in the matching business in the businesses array
    const activeBusinessId = req.body.activeBusinessId || user.primaryBusinessId || (user.businesses && user.businesses[0]?._id);
    if (activeBusinessId && user.businesses) {
      const bizIndex = user.businesses.findIndex(b => b._id.toString() === activeBusinessId.toString());
      if (bizIndex !== -1) {
        if (req.body.businessName !== undefined) {
          user.businesses[bizIndex].businessName = req.body.businessName;
        }
        if (req.body.logo !== undefined) {
          user.businesses[bizIndex].logo = req.body.logo;
        }
        if (req.body.businessLicense !== undefined) {
          user.businesses[bizIndex].businessLicense = req.body.businessLicense;
        }
        if (req.body.businessImages !== undefined) {
          user.businesses[bizIndex].businessImages = req.body.businessImages;
        }
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating vendor profile' });
  }
};

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

    const user = await User.findById(vendorId);
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

// Helper function to send OTP email (mock log)
const sendOTPEmail = async (user, otp) => {
  const emailContent = `
========================================
📧 CONNECT APP - OTP NOTIFICATION
========================================
To: ${user.email}
Subject: Password Reset OTP
Date: ${new Date().toISOString()}

Dear ${user.name || 'Vendor Partner'},

You have requested to reset your password. Please use the following 6-digit One-Time Password (OTP) to verify your request:

🔑 OTP: ${otp}

This OTP is valid for 10 minutes. If you did not request this, please ignore this email.

Best regards,
Connect App Platform
========================================
`;

  console.log(emailContent);

  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const emailLogPath = path.join(dataDir, 'sent_emails.txt');
    fs.appendFileSync(emailLogPath, emailContent + '\n\n');
  } catch (err) {
    console.error('Failed to write OTP email notification log:', err.message);
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

    const user = await User.findById(vendorId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check if OTP matches and has not expired
    if (!user.otp || user.otp !== otp) {
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

    if (!patient || patient.vendorId !== req.user._id) {
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

    if (!patient || patient.vendorId !== req.user._id) {
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
    const { vendorType, category, subcategory, businessName } = req.body;

    if (!vendorType) {
      return res.status(400).json({ success: false, message: 'Vendor Type / Product or Service is required' });
    }

    const finalCategory = category || vendorType;
    const finalSubcategory = subcategory || vendorType;

    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    if (user.status === 'Assigned' || !['Pending', 'Approved', 'Rejected', 'Active'].includes(user.status)) {
      user.status = 'Approved';
    }

    // Check if duplicate business exists
    const duplicate = user.businesses && user.businesses.find(
      b => b.vendorType === vendorType || b.category === finalCategory
    );
    if (duplicate) {
      return res.status(400).json({ success: false, message: `You have already registered the ${vendorType} business profile.` });
    }

    // Compute baseVendorType using local helper
    const baseVendorType = getBaseVendorTypeLocal(vendorType, finalCategory, finalSubcategory);

    const mongoose = require('mongoose');
    const newBusiness = {
      _id: new mongoose.Types.ObjectId().toString(),
      vendorType,
      category: finalCategory,
      subcategory: finalSubcategory,
      baseVendorType,
      businessName: businessName || user.businessName || `${vendorType} Store`,
      logo: user.logo || '',
      businessLicense: user.businessLicense || '',
      businessImages: user.businessImages || []
    };

    if (!user.businesses) {
      user.businesses = [];
    }
    user.businesses.push(newBusiness);

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.id = user._id;

    res.status(201).json({
      success: true,
      message: 'Business added successfully',
      user: userResponse,
      newBusinessId: newBusiness._id
    });
  } catch (error) {
    console.error('Add Business Error:', error);
    res.status(500).json({ success: false, message: 'Server error adding business: ' + (error.message || 'Unknown error') });
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

module.exports = {
  getVendorAnalytics,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getCustomers,
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
  deleteBusiness
};
