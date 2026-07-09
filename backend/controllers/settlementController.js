const { Settlement, User, PlatformConfig } = require('../models/Schemas');

// Helper to seed mock settlements if none exist
const seedMockSettlementsIfNeeded = async () => {
  try {
    const count = await Settlement.countDocuments();
    if (count > 0) return;

    // Get all approved vendors
    const vendors = await User.find({ role: 'Vendor', status: 'Approved' });
    if (vendors.length === 0) return;

    const config = await PlatformConfig.findOne({}) || { commissionRate: 0 };
    const rate = config.commissionRate;

    const mockSettlements = [];
    const baseDate = new Date();

    vendors.forEach((vendor, vIdx) => {
      const businessList = (vendor.businesses && vendor.businesses.length > 0)
        ? vendor.businesses
        : [{ _id: vendor._id, businessName: vendor.businessName || vendor.name }];

      businessList.forEach((biz, bIdx) => {
        // Create 3 historical mock settlements for each business
        for (let i = 1; i <= 3; i++) {
          const gross = [4500, 8200, 12500][i - 1] + (vIdx * 1500) + (bIdx * 500);
          const comm = Math.round(gross * (rate / 100));
          const net = gross - comm;

          const date = new Date(baseDate);
          date.setDate(baseDate.getDate() - (i * 7)); // 7, 14, 21 days ago

          mockSettlements.push({
            vendorId: biz._id,
            vendorBusinessName: biz.businessName || vendor.businessName || vendor.name,
            settlementDate: date,
            grossAmount: gross,
            commissionRate: rate,
            commissionDeducted: comm,
            netAmount: net,
            status: i === 1 ? 'Processing' : 'Completed'
          });
        }
      });
    });

    for (const item of mockSettlements) {
      await Settlement.create(item);
    }
    console.log(`🤖 Seeded ${mockSettlements.length} mock settlements in database.`);
  } catch (error) {
    console.error('Failed to seed mock settlements:', error.message);
  }
};

// @desc    Get settlements for logged-in vendor
// @route   GET /api/vendor/settlements
// @access  Private (Vendor)
const getVendorSettlements = async (req, res) => {
  try {
    await seedMockSettlementsIfNeeded();
    
    const parentUserId = req.user.parentUserId || req.user._id;
    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [parentUserId.toString()];
    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b._id) {
          businessIds.push(b._id.toString());
        }
      });
    }

    const settlements = await Settlement.find({ vendorId: { $in: businessIds } });
    // Sort descending by date
    settlements.sort((a, b) => new Date(b.settlementDate) - new Date(a.settlementDate));
    res.status(200).json({ success: true, data: settlements });
  } catch (error) {
    console.error('Get Vendor Settlements Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving settlements' });
  }
};

// @desc    Get all settlements
// @route   GET /api/admin/settlements
// @access  Private (Admin)
const getAllSettlements = async (req, res) => {
  try {
    await seedMockSettlementsIfNeeded();
    const settlements = await Settlement.find({});
    // Sort descending by date
    settlements.sort((a, b) => new Date(b.settlementDate) - new Date(a.settlementDate));
    res.status(200).json({ success: true, data: settlements });
  } catch (error) {
    console.error('Get All Settlements Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving all settlements' });
  }
};

// @desc    Create new settlement
// @route   POST /api/admin/settlements
// @access  Private (Admin)
const createSettlement = async (req, res) => {
  try {
    const { vendorId, grossAmount, status } = req.body;
    if (!vendorId || !grossAmount) {
      return res.status(400).json({ success: false, message: 'Vendor and gross amount are required' });
    }

    const vendor = await User.findById(vendorId) || await User.findOne({ "businesses._id": vendorId });
    if (!vendor || vendor.role !== 'Vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const config = await PlatformConfig.findOne({}) || { commissionRate: 0 };
    const commissionRate = config.commissionRate;
    const commissionDeducted = Math.round(Number(grossAmount) * (commissionRate / 100));
    const netAmount = Number(grossAmount) - commissionDeducted;

    const newSettlement = await Settlement.create({
      vendorId,
      vendorBusinessName: vendor.businessName || vendor.name,
      settlementDate: new Date(),
      grossAmount: Number(grossAmount),
      commissionRate,
      commissionDeducted,
      netAmount,
      status: status || 'Pending'
    });

    res.status(201).json({ success: true, data: newSettlement, message: 'Settlement created successfully' });
  } catch (error) {
    console.error('Create Settlement Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating settlement' });
  }
};

// @desc    Update settlement status
// @route   PUT /api/admin/settlements/:id
// @access  Private (Admin)
const updateSettlementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Processing', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid settlement status' });
    }

    const settlement = await Settlement.findById(id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    settlement.status = status;
    await settlement.save();

    res.status(200).json({ success: true, data: settlement, message: `Settlement status updated to ${status}` });
  } catch (error) {
    console.error('Update Settlement Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating settlement status' });
  }
};

module.exports = {
  getVendorSettlements,
  getAllSettlements,
  createSettlement,
  updateSettlementStatus
};
