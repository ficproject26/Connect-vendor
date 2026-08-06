const { User, MembershipPlan, MembershipCard, Order, PlatformConfig } = require('../models/Schemas');

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
    const { name, businessName, mobileNumber, address, gstNumber, vendorType } = req.body;
    
    const vendor = await User.findById(req.params.id);
    if (!vendor || vendor.role !== 'Vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Update fields
    const updated = await User.findByIdAndUpdate(req.params.id, {
      $set: {
        name: name || vendor.name,
        businessName: businessName || vendor.businessName,
        mobileNumber: mobileNumber || vendor.mobileNumber,
        address: address || vendor.address,
        gstNumber: gstNumber !== undefined ? gstNumber : vendor.gstNumber,
        vendorType: vendorType || vendor.vendorType
      }
    }, { new: true });

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
  updatePlatformConfig
};
