const { User, MembershipPlan, MembershipCard, Order, PlatformConfig, BusinessRequest } = require('../models/Schemas');
const mongoose = require('mongoose');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    const totalVendors = await User.countDocuments({ role: 'Vendor' });
    const pendingVendors = await User.countDocuments({ role: 'Vendor', status: 'Pending' });
    const approvedVendors = await User.countDocuments({ role: 'Vendor', status: 'Approved' });
    const rejectedVendors = await User.countDocuments({ role: 'Vendor', status: 'Rejected' });
    const totalMembers = await User.countDocuments({ role: 'Member' });

    res.status(200).json({
      success: true,
      data: {
        totalVendors,
        pendingVendors,
        approvedVendors,
        rejectedVendors,
        totalMembers
      }
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard stats' });
  }
};

// @desc    Get pending vendor requests
// @route   GET /api/admin/vendors/requests
// @access  Private (Admin)
const getPendingVendors = async (req, res) => {
  try {
    const requests = await User.find({ role: 'Vendor', status: 'Pending' });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('Get Pending Vendors Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vendor requests' });
  }
};

// @desc    Approve a vendor request
// @route   PUT /api/admin/vendors/:id/approve
// @access  Private (Admin)
const approveVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor || (vendor.role !== 'Vendor' && vendor.role !== 'vendor')) {
      return res.status(404).json({ success: false, message: 'Vendor application not found' });
    }

    vendor.status = 'Approved';
    await vendor.save();

    res.status(200).json({ success: true, message: 'Vendor request approved successfully', data: vendor });
  } catch (error) {
    console.error('Approve Vendor Error:', error);
    res.status(500).json({ success: false, message: 'Server error approving vendor' });
  }
};

// @desc    Reject a vendor request
// @route   PUT /api/admin/vendors/:id/reject
// @access  Private (Admin)
const rejectVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor || (vendor.role !== 'Vendor' && vendor.role !== 'vendor')) {
      return res.status(404).json({ success: false, message: 'Vendor application not found' });
    }

    vendor.status = 'Rejected';
    await vendor.save();

    res.status(200).json({ success: true, message: 'Vendor request rejected successfully', data: vendor });
  } catch (error) {
    console.error('Reject Vendor Error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting vendor' });
  }
};

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private (Admin)
const getAllVendors = async (req, res) => {
  try {
    // Return all vendors
    const vendors = await User.find({ role: { $in: ['Vendor', 'vendor'] } });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('Get All Vendors Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vendors list' });
  }
};

// @desc    Toggle Vendor activation (Approved <-> Rejected)
// @route   PUT /api/admin/vendors/:id/toggle-status
// @access  Private (Admin)
const toggleVendorStatus = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor || (vendor.role !== 'Vendor' && vendor.role !== 'vendor')) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (req.body && req.body.status) {
      const raw = String(req.body.status).trim();
      vendor.status = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    } else {
      const currentStatus = (vendor.status || '').toLowerCase();
      vendor.status = (currentStatus === 'approved' || currentStatus === 'active') ? 'Rejected' : 'Approved';
    }

    const isActiveState = ['Approved', 'Active'].includes(vendor.status);
    vendor.isActive = isActiveState;
    vendor.isApproved = isActiveState;

    if (vendor.businesses && Array.isArray(vendor.businesses)) {
      vendor.businesses.forEach(b => {
        b.status = vendor.status;
        b.isActive = isActiveState;
      });
    }

    await vendor.save();

    res.status(200).json({ 
      success: true, 
      message: `Vendor account status updated to ${vendor.status}`, 
      data: vendor 
    });
  } catch (error) {
    console.error('Toggle Vendor Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error toggling vendor status' });
  }
};

// @desc    Edit Vendor details
// @route   PUT /api/admin/vendors/:id
// @access  Private (Admin)
const editVendorDetails = async (req, res) => {
  try {
    const { name, businessName, mobileNumber, address, gstNumber, vendorType, status } = req.body;
    
    const vendor = await User.findById(req.params.id);
    if (!vendor || (vendor.role !== 'Vendor' && vendor.role !== 'vendor')) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const updateFields = {
      name: name || vendor.name,
      businessName: businessName || vendor.businessName,
      mobileNumber: mobileNumber || vendor.mobileNumber,
      address: address || vendor.address,
      gstNumber: gstNumber !== undefined ? gstNumber : vendor.gstNumber,
      vendorType: vendorType || vendor.vendorType
    };

    if (status) {
      const rawStatus = String(status).trim();
      const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      const isActiveState = ['Approved', 'Active'].includes(formattedStatus);
      updateFields.status = formattedStatus;
      updateFields.isActive = isActiveState;
      updateFields.isApproved = isActiveState;

      if (vendor.businesses && Array.isArray(vendor.businesses)) {
        updateFields.businesses = vendor.businesses.map(b => ({
          ...(typeof b.toObject === 'function' ? b.toObject() : b),
          status: formattedStatus,
          isActive: isActiveState
        }));
      }
    }

    const updated = await User.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });

    res.status(200).json({ success: true, message: 'Vendor details updated successfully', data: updated });
  } catch (error) {
    console.error('Edit Vendor Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating vendor details' });
  }
};

// @desc    Get all members
// @route   GET /api/admin/members
// @access  Private (Admin)
const getAllMembers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['Member', 'Vendor'] } });
    
    const enrichedMembers = [];
    for (const u of users) {
      const card = await MembershipCard.findOne({ userId: u._id });
      if (u.role === 'Member' || card) {
        enrichedMembers.push({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          card: card ? {
            membershipId: card.membershipId,
            planName: card.planName,
            discountPercent: card.discountPercent,
            status: card.status,
            expiresAt: card.expiresAt
          } : null
        });
      }
    }

    res.status(200).json({ success: true, data: enrichedMembers });
  } catch (error) {
    console.error('Get All Members Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving members list' });
  }
};

// @desc    Get all membership plans
// @route   GET /api/admin/membership-plans
// @access  Private (Admin)
const getMembershipPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({});
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Get Membership Plans Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving membership plans' });
  }
};

// @desc    Update membership plan details
// @route   PUT /api/admin/membership-plans/:id
// @access  Private (Admin)
const updateMembershipPlan = async (req, res) => {
  try {
    const { price, discountPercent, validityDays, benefits } = req.body;
    
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found' });
    }

    const updated = await MembershipPlan.findByIdAndUpdate(req.params.id, {
      $set: {
        price: price !== undefined ? price : plan.price,
        discountPercent: discountPercent !== undefined ? discountPercent : plan.discountPercent,
        validityDays: validityDays !== undefined ? validityDays : plan.validityDays,
        benefits: benefits || plan.benefits
      }
    }, { new: true });

    res.status(200).json({ success: true, message: 'Membership plan updated successfully', data: updated });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating membership plan' });
  }
};

// @desc    Get system reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = async (req, res) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'Member' });
    
    // Membership distribution
    const cards = await MembershipCard.find({});
    const planDistribution = { Silver: 0, Gold: 0, Diamond: 0 };
    cards.forEach(card => {
      if (planDistribution[card.planName] !== undefined) {
        planDistribution[card.planName]++;
      }
    });

    // Vendor type distribution
    const vendors = await User.find({ role: 'Vendor' });
    const vendorTypeDistribution = {};
    vendors.forEach(v => {
      if (v.vendorType) {
        vendorTypeDistribution[v.vendorType] = (vendorTypeDistribution[v.vendorType] || 0) + 1;
      }
    });

    // Simple revenue reporting from system transactions (orders)
    const orders = await Order.find({ status: 'Completed' });
    const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalRevenue,
        planDistribution,
        vendorTypeDistribution
      }
    });
  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ success: false, message: 'Server error generating system reports' });
  }
};

// @desc    Get all system orders / transactions
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Get All Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving transactions' });
  }
};

// @desc    Get Platform Configuration
// @route   GET /api/admin/commission-config
// @access  Private (Admin)
const getPlatformConfig = async (req, res) => {
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
    console.error('Get Platform Config Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving configuration' });
  }
};

// @desc    Update Platform Configuration
// @route   PUT /api/admin/commission-config
// @access  Private (Admin)
const updatePlatformConfig = async (req, res) => {
  try {
    const { commissionRate, collectionMethod, deductionMethod, vendorPayout, settlementCycle } = req.body;
    let config = await PlatformConfig.findOne({});
    if (!config) {
      config = await PlatformConfig.create({
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : 0,
        collectionMethod: collectionMethod || 'Admin Receives Full Payment',
        deductionMethod: deductionMethod || 'Commission Deducted Before Settlement',
        vendorPayout: vendorPayout || 'Remaining Balance Transferred to Vendor',
        settlementCycle: settlementCycle || 'Weekly'
      });
    } else {
      config.commissionRate = commissionRate !== undefined ? Number(commissionRate) : config.commissionRate;
      config.collectionMethod = collectionMethod || config.collectionMethod;
      config.deductionMethod = deductionMethod || config.deductionMethod;
      config.vendorPayout = vendorPayout || config.vendorPayout;
      config.settlementCycle = settlementCycle || config.settlementCycle;
      await config.save();
    }
    res.status(200).json({ success: true, message: 'Platform configuration updated successfully', data: config });
  } catch (error) {
    console.error('Update Platform Config Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating configuration' });
  }
};

// @desc    Get all business onboarding requests (Admin/KYC queue)
// @route   GET /api/admin/business-requests
// @access  Private (Admin)
const getAdminBusinessRequests = async (req, res) => {
  try {
    const { status, pincode } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (pincode) query.pincode = pincode;

    const requests = await BusinessRequest.find(query).sort({ submittedDate: -1 }).lean();
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('Get Admin Business Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving business requests' });
  }
};

// @desc    Pincode Admin review of business request (Accept / Reject)
// @route   PUT /api/admin/business-requests/:id/pincode-review
// @access  Private (Admin / Pincode Admin)
const reviewBusinessByPincodeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'ACCEPT' or 'REJECT'

    if (!['ACCEPT', 'REJECT', 'APPROVE'].includes(String(action).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be ACCEPT or REJECT.' });
    }

    const request = await BusinessRequest.findOne({
      $or: [{ _id: id }, { businessId: id }, { requestId: id }]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Business request not found' });
    }

    const isAccept = ['ACCEPT', 'APPROVE'].includes(String(action).toUpperCase());
    if (!isAccept && (!rejectionReason || !String(rejectionReason).trim())) {
      return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
    }

    const previousStatus = request.status;
    const newStatus = isAccept ? 'KYC Pending' : 'Pincode Rejected';
    const reasonText = isAccept ? 'Pincode Admin verified territory and approved' : String(rejectionReason).trim();

    request.status = newStatus;
    if (!isAccept) {
      request.rejectionReason = reasonText;
    }
    request.auditTrail.push({
      previousStatus,
      newStatus,
      actor: req.user.name || 'Pincode Admin',
      actorRole: 'Pincode Admin',
      action: isAccept ? 'Pincode Admin Approved' : 'Pincode Admin Rejected',
      reason: reasonText,
      timestamp: new Date()
    });

    await request.save();

    // Update in User.businesses
    const user = await User.findById(request.vendorId);
    if (user && user.businesses) {
      const bIdx = user.businesses.findIndex(b => b._id.toString() === request.businessId.toString());
      if (bIdx !== -1) {
        user.businesses[bIdx].status = newStatus;
        if (!isAccept) {
          user.businesses[bIdx].rejectionReason = reasonText;
        }
        user.businesses[bIdx].auditTrail.push({
          previousStatus,
          newStatus,
          actor: req.user.name || 'Pincode Admin',
          actorRole: 'Pincode Admin',
          action: isAccept ? 'Pincode Admin Approved' : 'Pincode Admin Rejected',
          reason: reasonText,
          timestamp: new Date()
        });
        user.markModified('businesses');
        await user.save();
      }
    }

    // Sync to kyc_records
    try {
      const db = mongoose.connection.db;
      await db.collection('kyc_records').updateOne(
        { businessId: request.businessId },
        { 
          $set: { 
            status: newStatus,
            pincodeAdminReview: {
              reviewedBy: req.user.name || 'Pincode Admin',
              action: isAccept ? 'Approved' : 'Rejected',
              reason: reasonText,
              date: new Date()
            }
          } 
        }
      );
    } catch (kErr) {}

    res.status(200).json({
      success: true,
      message: isAccept ? 'Business request approved by Pincode Admin! Moved to KYC Team queue.' : 'Business request rejected by Pincode Admin.',
      data: request
    });
  } catch (error) {
    console.error('Pincode Admin Review Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing review: ' + error.message });
  }
};

// @desc    KYC Team review of business request (Approve / Reject / Request Changes)
// @route   PUT /api/admin/business-requests/:id/kyc-review
// @access  Private (Admin / KYC Team)
const reviewBusinessByKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'APPROVE', 'REJECT', 'REQUEST_CHANGES'

    if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'CHANGES_REQUIRED'].includes(String(action).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_CHANGES.' });
    }

    const request = await BusinessRequest.findOne({
      $or: [{ _id: id }, { businessId: id }, { requestId: id }]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Business request not found' });
    }

    const cleanAction = String(action).toUpperCase();
    const isApprove = cleanAction === 'APPROVE';
    const isReject = cleanAction === 'REJECT';
    const isChanges = ['REQUEST_CHANGES', 'CHANGES_REQUIRED'].includes(cleanAction);

    if ((isReject || isChanges) && (!reason || !String(reason).trim())) {
      return res.status(400).json({ success: false, message: isReject ? 'Rejection reason is mandatory.' : 'Explanation for requested changes is mandatory.' });
    }

    const previousStatus = request.status;
    let newStatus = 'Active';
    if (isReject) newStatus = 'KYC Rejected';
    else if (isChanges) newStatus = 'KYC Changes Required';
    else if (isApprove) newStatus = 'Active';

    request.status = newStatus;
    if (isReject) request.rejectionReason = String(reason).trim();
    if (isChanges) request.changesRequiredReason = String(reason).trim();
    request.kycReviewedBy = req.user._id ? req.user._id.toString() : 'KYC Team';
    request.kycReviewedByName = req.user.name || 'KYC Team';
    request.kycReviewedAt = new Date();

    request.auditTrail.push({
      previousStatus,
      newStatus,
      actor: req.user.name || 'KYC Team',
      actorRole: 'KYC Team',
      action: isApprove ? 'KYC Approved & Business Activated' : isReject ? 'KYC Rejected' : 'KYC Changes Requested',
      reason: reason ? String(reason).trim() : 'Document verification complete',
      timestamp: new Date()
    });

    await request.save();

    // Update in User.businesses
    const user = await User.findById(request.vendorId);
    if (user && user.businesses) {
      const bIdx = user.businesses.findIndex(b => b._id.toString() === request.businessId.toString());
      if (bIdx !== -1) {
        user.businesses[bIdx].status = newStatus;
        user.businesses[bIdx].isActive = isApprove; // Activated upon KYC approval!
        if (isReject) user.businesses[bIdx].rejectionReason = String(reason).trim();
        if (isChanges) user.businesses[bIdx].changesRequiredReason = String(reason).trim();
        user.businesses[bIdx].auditTrail.push({
          previousStatus,
          newStatus,
          actor: req.user.name || 'KYC Team',
          actorRole: 'KYC Team',
          action: isApprove ? 'KYC Approved & Business Activated' : isReject ? 'KYC Rejected' : 'KYC Changes Requested',
          reason: reason ? String(reason).trim() : 'Document verification complete',
          timestamp: new Date()
        });
        user.markModified('businesses');
        await user.save();
      }
    }

    // Sync to kyc_records
    try {
      const db = mongoose.connection.db;
      await db.collection('kyc_records').updateOne(
        { businessId: request.businessId },
        { 
          $set: { 
            status: newStatus,
            verifiedBy: req.user.name || 'KYC Team',
            verifiedDate: new Date(),
            notes: reason || (isApprove ? 'KYC Approved' : '')
          } 
        }
      );
    } catch (kErr) {}

    res.status(200).json({
      success: true,
      message: isApprove ? 'KYC Approved! Business is now ACTIVE.' : isReject ? 'Business KYC rejected.' : 'Requested changes sent to vendor.',
      data: request
    });
  } catch (error) {
    console.error('KYC Review Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing KYC review: ' + error.message });
  }
};

module.exports = {
  getAdminStats,
  getPendingVendors,
  approveVendor,
  rejectVendor,
  getAllVendors,
  toggleVendorStatus,
  editVendorDetails,
  getAllMembers,
  getMembershipPlans,
  updateMembershipPlan,
  getReports,
  getAllOrders,
  getPlatformConfig,
  updatePlatformConfig,
  getAdminBusinessRequests,
  reviewBusinessByPincodeAdmin,
  reviewBusinessByKYC
};
