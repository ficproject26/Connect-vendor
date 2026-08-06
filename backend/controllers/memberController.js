const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MembershipCard, MembershipPlan, User, Order, Product, MembershipHistory } = require('../models/Schemas');
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

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const sendVendorEmail = async (vendor, memberName, product, order) => {
  const emailContent = `
========================================
📧 CONNECT APP - EMAIL NOTIFICATION
========================================
To: ${vendor.email}
Subject: New Transaction Notification - ${vendor.businessName}

Dear ${vendor.name || 'Vendor Partner'},

A new discounted transaction has been registered at your storefront via Connect App QR Code scan.

--- TRANSACTION DETAILS ---
Order ID:        ${order._id.toUpperCase()}
Customer Name:   ${memberName}
Item/Service:    ${product.name}
Total Amount:    ₹${order.totalAmount}
Discount:        -₹${order.discountApplied}
Final Payout:    ₹${order.finalAmount}

${order.tableNumber ? `Table Number:   ${order.tableNumber}` : ''}
${order.roomNumber ? `Room Number:    ${order.roomNumber}` : ''}
${order.doctorName ? `Doctor Name:    ${order.doctorName}` : ''}
${order.appointmentDate ? `Appt Date:      ${order.appointmentDate}` : ''}

Please log in to your Connect App Dashboard to manage and fulfill this request.

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
    console.error('Failed to write email notification log:', err.message);
  }
};

const sendSubscriptionEmail = async (user, planName, price, card) => {
  const emailContent = `
========================================
📧 CONNECT APP - EMAIL NOTIFICATION
========================================
To: ${user.email}
Subject: Subscription Payment Confirmation - ${planName} Plan

Dear ${user.name},

Your monthly subscription payment has been processed successfully.

--- PAYMENT DETAILS ---
Membership ID:      ${card.membershipId}
Plan Name:          ${planName} Tier
Amount Paid:        ₹${price}
Discount Percent:   ${card.discountPercent}%
Expires On:         ${new Date(card.expiresAt).toISOString().split('T')[0]}

Thank you for being a valued member!

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
    console.error('Failed to write subscription email notification log:', err.message);
  }
};

const sendExpiryWarningEmail = async (user, card, daysRemaining) => {
  const emailContent = `
========================================
📧 CONNECT APP - EMAIL NOTIFICATION
========================================
To: ${user.email}
Subject: Subscription Expiry Warning - Action Required

Dear ${user.name},

Your monthly ${card.planName} Tier subscription is expiring in ${daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}.

Please renew your subscription to continue enjoying your ${card.discountPercent}% platform discount.

--- DETAILS ---
Membership ID:      ${card.membershipId}
Plan Name:          ${card.planName} Tier
Expires On:         ${new Date(card.expiresAt).toISOString().split('T')[0]}

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
    console.error('Failed to write expiry warning email notification log:', err.message);
  }
};

// @desc    Get current member's card
// @route   GET /api/member/card
// @access  Private (Member)
const getMemberCard = async (req, res) => {
  try {
    const userId = req.user._id;
    const card = await MembershipCard.findOne({ userId });

    if (!card) {
      return res.status(404).json({ success: false, message: 'Membership card not found' });
    }

    // Check if membership is near expiry (5 days before) and warning has not been sent yet
    const daysRemaining = getDaysRemaining(card.expiresAt);
    if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining >= 0 && !card.expiryWarningSent) {
      try {
        await sendExpiryWarningEmail(req.user, card, daysRemaining);
        card.expiryWarningSent = true;
        await card.save();
      } catch (mailErr) {
        console.error('Failed to send card expiry warning email:', mailErr.message);
      }
    }

    res.status(200).json({ success: true, data: card });
  } catch (error) {
    console.error('Get Member Card Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving membership card' });
  }
};

// @desc    Get participating vendors & discount details
// @route   GET /api/member/discounts
// @access  Private (Member)
const getParticipatingVendors = async (req, res) => {
  try {
    const suspendedStatuses = ['suspended', 'inactive', 'rejected', 'pending'];
    const vendors = await User.find({ 
      $or: [{ role: 'Vendor' }, { role: 'vendor' }]
    });
    
    // Format vendor list for member display (only active/approved and non-suspended vendors)
    const formatted = [];
    
    vendors.forEach(v => {
      const vStatus = (v.status || '').toLowerCase().trim();
      if (suspendedStatuses.includes(vStatus) || v.isActive === false) {
        return; // Exclude suspended/inactive/rejected/pending vendors from customer dashboard
      }

      const addedIds = new Set();
      const vId = v.vendorId || v.registrationId || v._id;
      
      // Add all sub-businesses (filtering out any non-active sub-business)
      if (v.businesses && v.businesses.length > 0) {
        v.businesses.forEach(b => {
          const bStatus = (b.status || '').toLowerCase().trim();
          if (bStatus && suspendedStatuses.includes(bStatus)) return;
          if (b.isActive === false) return;

          formatted.push({
            id: b._id,
            vendorId: vId,
            businessName: b.businessName || v.businessName || v.name,
            vendorType: b.vendorType,
            baseVendorType: b.baseVendorType || b.vendorType,
            category: b.category,
            subcategory: b.subcategory,
            mobileNumber: v.mobileNumber,
            address: v.address || ''
          });
          addedIds.add(b._id.toString());
        });
      }
      
      // Fallback: if primary vendor ID was not in businesses list, add it
      if (!addedIds.has(v._id.toString()) && (!v.primaryBusinessId || !addedIds.has(v.primaryBusinessId.toString()))) {
        formatted.push({
          id: v._id,
          vendorId: vId,
          businessName: v.businessName || v.name,
          vendorType: v.vendorType,
          baseVendorType: v.baseVendorType || v.vendorType,
          category: v.category,
          subcategory: v.subcategory,
          mobileNumber: v.mobileNumber,
          address: v.address || ''
        });
      }
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get Participating Vendors Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vendors list' });
  }
};

// @desc    Place order simulating a membership QR scan redemption
// @route   POST /api/member/redeem
// @access  Private (Member)
const redeemDiscount = async (req, res) => {
  try {
    const memberId = req.user._id;
    const { vendorId, productId, tableNumber, roomNumber, appointmentDate, appointmentTimeSlot, doctorName, prescriptionUrl } = req.body;

    if (!vendorId || !productId) {
      return res.status(400).json({ success: false, message: 'Vendor and item are required' });
    }

    // Get vendor details
    const vendor = await User.findOne({ 
      $or: [{ role: 'Vendor' }, { role: 'vendor' }],
      $or: [ { _id: vendorId }, { 'businesses._id': vendorId } ]
    });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor is not available' });
    }

    const vStatus = (vendor.status || '').toLowerCase().trim();
    if (['suspended', 'inactive', 'rejected', 'pending'].includes(vStatus) || vendor.isActive === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'The admin has suspended your account. Please contact administration.' 
      });
    }

    // Get item details
    const product = await Product.findById(productId);
    const parentId = vendor._id.toString();
    const isProductOwnedByVendor = product && (product.vendorId === vendorId || product.vendorId === parentId);
    if (!product || !isProductOwnedByVendor) {
      return res.status(404).json({ success: false, message: 'Item not found at this vendor' });
    }

    // Get membership card for discount percent
    const card = await MembershipCard.findOne({ userId: memberId });
    if (!card || card.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'No active membership card found' });
    }

    // Check if membership is expired
    if (new Date(card.expiresAt) < new Date()) {
      card.status = 'Expired';
      await card.save();
      return res.status(400).json({ success: false, message: 'Your membership card has expired' });
    }

    // Check if membership card is eligible for this item
    const eligibleCards = product.cardTypes || ['Silver', 'Gold', 'Diamond'];
    if (!eligibleCards.includes(card.planName)) {
      return res.status(400).json({ success: false, message: `Your ${card.planName} membership card does not qualify for this item` });
    }

    // Calculate totals
    const qty = Number(req.body.quantity) || 1;
    const totalAmount = product.price * qty;
    const discountApplied = Math.round((totalAmount * card.discountPercent) / 100);
    const finalAmount = totalAmount - discountApplied;

    // Resolve the final vendorId of the order to the correct sub-business ID
    let finalVendorId = vendorId;
    const mainCat = getProductMainCategory(product.category);
    const matchedBiz = vendor.businesses?.find(b => {
      let normalizedVendorType = b.vendorType || '';
      if (normalizedVendorType.endsWith(' Vendor')) {
        normalizedVendorType = normalizedVendorType.replace(' Vendor', '');
      }
      if (normalizedVendorType.startsWith('Restaurant')) normalizedVendorType = 'Food';
      else if (normalizedVendorType.startsWith('Hotel')) normalizedVendorType = 'Stay';
      else if (normalizedVendorType.startsWith('Travel Agency')) normalizedVendorType = 'Travel';
      else if (normalizedVendorType.startsWith('Hospital') || normalizedVendorType.startsWith('Service')) normalizedVendorType = 'Services';
      else if (normalizedVendorType.startsWith('Grocery') || normalizedVendorType.startsWith('Pharmacy')) normalizedVendorType = 'Daily Needs';
      else if (normalizedVendorType.startsWith('Store') || normalizedVendorType.startsWith('Electronics') || normalizedVendorType.startsWith('Home & Furniture')) normalizedVendorType = 'Products';
      
      return mainCat.toLowerCase() === normalizedVendorType.toLowerCase();
    });
    if (matchedBiz) {
      finalVendorId = matchedBiz._id.toString();
    }

    // Map vendor types to order types
    let orderType = 'Order';
    const vType = vendor.baseVendorType || vendor.vendorType;
    const isHospital = vType && (vType === 'Hospital' || vType.startsWith('Hospital Vendor'));
    if (isHospital) orderType = 'Appointment';
    else if (vType && (vType.startsWith('Hotel') || vType.startsWith('Service Provider Vendor'))) orderType = 'Booking';

    // Prevent double booking for hospital doctors
    if (isHospital && appointmentDate && appointmentTimeSlot) {
      const activeAppointment = await Order.findOne({
        vendorId: finalVendorId,
        type: 'Appointment',
        $or: [
          { 'items.productId': productId },
          { doctorName: doctorName || product.name }
        ],
        appointmentDate,
        appointmentTimeSlot,
        status: { $ne: 'Cancelled' }
      });
      if (activeAppointment) {
        return res.status(400).json({
          success: false,
          message: `Dr. ${doctorName || product.name} is already booked for ${appointmentTimeSlot} on ${appointmentDate}. Please choose another time slot or doctor.`
        });
      }
    }

    const orderData = {
      vendorId: finalVendorId,
      memberId,
      memberName: req.user.name,
      type: orderType,
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: qty
      }],
      totalAmount,
      discountApplied,
      finalAmount,
      status: 'Pending',
      tableNumber,
      roomNumber,
      appointmentDate,
      appointmentTimeSlot,
      doctorName: doctorName || product.name,
      prescriptionUrl
    };

    const order = await Order.create(orderData);

    // Send email notification alert to vendor
    try {
      await sendVendorEmail(vendor, req.user.name, product, order);
    } catch (mailErr) {
      console.error('Mock mail dispatch failed:', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Discount card scanned and order placed successfully!',
      data: order
    });
  } catch (error) {
    console.error('Redeem Discount Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing transaction' });
  }
};

// @desc    Renew / Upgrade membership plan
// @route   POST /api/member/renew
// @access  Private (Member)
const renewMembership = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planName } = req.body;

    const plan = await MembershipPlan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found' });
    }

    // Find current card or create new if not found
    let card = await MembershipCard.findOne({ userId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.validityDays);

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const membershipId = card ? card.membershipId : `MEM-${year}-${randomSuffix}`;

    const qrData = JSON.stringify({
      membershipId,
      name: req.user.name,
      email: req.user.email,
      plan: plan.name,
      discount: plan.discountPercent,
      expiresAt: expiresAt.toISOString().split('T')[0]
    });

    const qrCodeDataUrl = await qrcode.toDataURL(qrData);

    const startDate = new Date();

    if (card) {
      card.planName = plan.name;
      card.discountPercent = plan.discountPercent;
      card.qrCode = qrCodeDataUrl;
      card.status = 'Active';
      card.startDate = startDate;
      card.expiresAt = expiresAt;
      card.expiryWarningSent = false;
      await card.save();
    } else {
      card = await MembershipCard.create({
        userId,
        membershipId,
        planName: plan.name,
        discountPercent: plan.discountPercent,
        qrCode: qrCodeDataUrl,
        status: 'Active',
        startDate,
        expiresAt,
        expiryWarningSent: false
      });
    }

    // Mark previous active history logs for this user as 'Upgraded' or 'Expired'
    try {
      const activeHistories = await MembershipHistory.find({ userId, status: 'Active' });
      for (const hist of activeHistories) {
        hist.status = 'Upgraded';
        await hist.save();
      }

      // Create new history log
      await MembershipHistory.create({
        userId,
        planName: plan.name,
        amount: plan.price,
        purchaseDate: startDate,
        expiresAt,
        status: 'Active'
      });
    } catch (histErr) {
      console.error('Failed to log membership history transaction:', histErr.message);
    }

    // Send email notification of subscription payment
    try {
      await sendSubscriptionEmail(req.user, plan.name, plan.price, card);
    } catch (mailErr) {
      console.error('Mock subscription email dispatch failed:', mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully!',
      data: {
        membershipId: card.membershipId,
        planName: card.planName,
        discountPercent: card.discountPercent,
        qrCode: card.qrCode,
        startDate: card.startDate,
        expiresAt: card.expiresAt
      }
    });
  } catch (error) {
    console.error('Renew Membership Error:', error);
    res.status(500).json({ success: false, message: 'Server error during membership renewal' });
  }
};

// @desc    Get member order history
// @route   GET /api/member/orders
// @access  Private (Member)
const getMemberOrders = async (req, res) => {
  try {
    const memberId = req.user._id;
    const orders = await Order.find({ memberId });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Get Member Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving orders history' });
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(vendorId);
    const vendorOrList = [
      { vendorId: String(vendorId) },
      { registrationId: String(vendorId) },
      { 'businesses._id': String(vendorId) }
    ];
    if (isObjectId) {
      vendorOrList.push({ _id: vendorId });
    }

    const vendorUser = await User.findOne({ $or: vendorOrList });

    let parentId = vendorId;
    let activeVendorType = '';

    if (vendorUser) {
      const vStatus = (vendorUser.status || '').toLowerCase().trim();
      if (['suspended', 'inactive', 'rejected'].includes(vStatus)) {
        return res.status(200).json({ success: true, data: [] });
      }

      parentId = vendorUser._id.toString();
      const activeBiz = vendorUser.businesses?.find(b => b._id.toString() === vendorId.toString());
      if (activeBiz) {
        const bStatus = (activeBiz.status || '').toLowerCase().trim();
        if (bStatus && ['suspended', 'inactive', 'rejected'].includes(bStatus)) {
          return res.status(200).json({ success: true, data: [] });
        }
        activeVendorType = activeBiz.vendorType;
      } else {
        activeVendorType = vendorUser.vendorType || '';
      }
    }

    const productOrList = [
      { vendorId: String(vendorId) },
      { vendor_id: String(vendorId) }
    ];
    if (parentId) {
      productOrList.push({ vendorId: String(parentId) });
      productOrList.push({ vendor_id: String(parentId) });
    }
    if (isObjectId) {
      productOrList.push({ vendorId: new mongoose.Types.ObjectId(vendorId) });
      productOrList.push({ vendor_id: new mongoose.Types.ObjectId(vendorId) });
    }
    if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
      productOrList.push({ vendorId: new mongoose.Types.ObjectId(parentId) });
      productOrList.push({ vendor_id: new mongoose.Types.ObjectId(parentId) });
    }

    const products = await Product.find({
      $or: productOrList,
      status: { $ne: 'Unavailable' }
    });

    const filtered = products.filter(p => {
      const pVendorId = (p.vendorId || p.vendor_id || '').toString();
      const vIdStr = vendorId.toString();
      const pIdStr = parentId ? parentId.toString() : vIdStr;

      if (pVendorId === vIdStr || pVendorId === pIdStr) {
        if (!activeVendorType || pVendorId === vIdStr) return true;
        const mainCat = getProductMainCategory(p.category);
        if (!mainCat) return true;
        
        let normalizedVendorType = activeVendorType;
        if (activeVendorType.endsWith(' Vendor')) {
          normalizedVendorType = activeVendorType.replace(' Vendor', '');
        }
        if (normalizedVendorType.startsWith('Restaurant')) normalizedVendorType = 'Food';
        if (normalizedVendorType.startsWith('Hotel')) normalizedVendorType = 'Stay';
        if (normalizedVendorType.startsWith('Travel Agency')) normalizedVendorType = 'Travel';
        if (normalizedVendorType.startsWith('Hospital') || normalizedVendorType.startsWith('Service')) normalizedVendorType = 'Services';
        if (normalizedVendorType.startsWith('Grocery') || normalizedVendorType.startsWith('Pharmacy')) normalizedVendorType = 'Daily Needs';
        if (normalizedVendorType.startsWith('Store') || normalizedVendorType.startsWith('Electronics') || normalizedVendorType.startsWith('Home & Furniture')) normalizedVendorType = 'Products';

        return !mainCat || mainCat.toLowerCase() === normalizedVendorType.toLowerCase() || (p.category && p.category.toLowerCase().includes(normalizedVendorType.toLowerCase()));
      }
      return false;
    });

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error('Get Vendor Products Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vendor products list' });
  }
};

const getMemberPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({});
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Get Member Plans Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving membership plans' });
  }
};

const getMembershipHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const history = await MembershipHistory.find({ userId });
    history.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Get Membership History Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving membership history' });
  }
};

const getBookedSlots = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { date } = req.query;
    const query = { vendorId, type: 'Appointment', status: { $ne: 'Cancelled' } };
    if (date) {
      query.appointmentDate = date;
    }
    const appointments = await Order.find(query, 'appointmentDate appointmentTimeSlot items doctorName');
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error('Get Booked Slots Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving booked slots' });
  }
};

module.exports = {
  getMemberCard,
  getParticipatingVendors,
  redeemDiscount,
  renewMembership,
  getMemberOrders,
  getVendorProducts,
  getMemberPlans,
  getMembershipHistory,
  getBookedSlots
};
