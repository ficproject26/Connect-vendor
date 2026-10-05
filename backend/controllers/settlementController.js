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

// @desc    Get settlements (Admin Payments) for logged-in vendor
// @route   GET /api/vendor/settlements
// @access  Private (Vendor)
const getVendorSettlements = async (req, res) => {
  try {
    await seedMockSettlementsIfNeeded();
    
    const parentUserId = req.user.parentUserId || req.user._id || req.user.id;
    const user = await User.findById(parentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor user not found' });
    }

    const businessIds = [parentUserId.toString()];
    const bizCategoryMap = {};
    if (user.vendorType) bizCategoryMap[parentUserId.toString()] = user.vendorType;
    if (user.category) bizCategoryMap[parentUserId.toString()] = user.category;

    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b._id) {
          const bIdStr = b._id.toString();
          businessIds.push(bIdStr);
          bizCategoryMap[bIdStr] = b.category || b.vendorType || 'Product';
        }
      });
    }

    const rawSettlements = await Settlement.find({ vendorId: { $in: businessIds } }).lean();

    // Normalizing each settlement record
    const mapped = rawSettlements.map((s, idx) => {
      const sDate = s.settlementDate || s.createdAt || new Date();
      const rawStatus = (s.status || '').toLowerCase();
      let normalizedStatus = 'Successful';
      if (rawStatus === 'completed') normalizedStatus = 'Successful';
      else if (rawStatus === 'failed') normalizedStatus = 'Failed';
      else if (['pending', 'processing', 'hold'].includes(rawStatus)) normalizedStatus = 'Hold';

      const bizCat = s.category || bizCategoryMap[String(s.vendorId)] || user.vendorType || user.category || 'Product';

      // Standardize category label
      let category = bizCat;
      if (/product/i.test(category)) category = 'Product';
      else if (/food|restaurant/i.test(category)) category = 'Food';
      else if (/daily/i.test(category)) category = 'Daily Needs';
      else if (/service/i.test(category)) category = 'Services';
      else if (/stay|hotel/i.test(category)) category = 'Stay';
      else if (/travel/i.test(category)) category = 'Travel';
      else if (/job/i.test(category)) category = 'Jobs';

      return {
        _id: s._id,
        paymentId: s._id ? String(s._id).slice(-8).toUpperCase() : `ADM-PAY-${idx + 1}`,
        settlementId: s._id,
        paymentDate: sDate,
        settlementDate: sDate,
        processingDate: s.processingDate || sDate,
        periodStart: s.periodStart || new Date(new Date(sDate).getTime() - 7 * 24 * 60 * 60 * 1000),
        periodEnd: s.periodEnd || sDate,
        category,
        paymentType: s.paymentType || 'Direct Bank Settlement (Admin)',
        grossAmount: Number(s.grossAmount || 0),
        commissionRate: Number(s.commissionRate || 0),
        commissionDeducted: Number(s.commissionDeducted || 0),
        amount: Number(s.netAmount || s.grossAmount || 0),
        netAmount: Number(s.netAmount || s.grossAmount || 0),
        status: normalizedStatus,
        rawStatus: s.status,
        vendorBusinessName: s.vendorBusinessName || user.businessName || user.name,
        referenceId: s.referenceId || `REF-${String(s._id).slice(-6).toUpperCase()}`
      };
    });

    // Date range & duration filtering
    const now = new Date();
    const duration = req.query.duration || 'All';
    let startDate = null;
    let endDate = null;

    if (duration === 'Today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (duration === 'This Week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (duration === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (duration === 'This Year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (duration === 'Custom') {
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    let filtered = mapped.filter(item => {
      const itemTime = new Date(item.paymentDate).getTime();
      if (startDate && itemTime < startDate.getTime()) return false;
      if (endDate && itemTime > endDate.getTime()) return false;
      return true;
    });

    // Status filter
    const statusFilter = req.query.status || 'All';
    if (statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Category filter
    if (req.query.category && !['All', 'all', ''].includes(String(req.query.category).trim())) {
      const catParam = String(req.query.category).trim().toLowerCase();
      filtered = filtered.filter(item => item.category.toLowerCase() === catParam);
    }

    // Search query
    if (req.query.search && String(req.query.search).trim() !== '') {
      const term = String(req.query.search).trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.paymentId && item.paymentId.toLowerCase().includes(term)) ||
        (item.referenceId && item.referenceId.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term))
      );
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Category-wise totals based on real Admin payment records
    const categoryBreakdown = {};
    filtered.forEach(s => {
      const cat = s.category || 'Product';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = {
          category: cat,
          totalAmountReceived: 0,
          totalGrossAmount: 0,
          totalCommissionDeducted: 0,
          count: 0
        };
      }
      categoryBreakdown[cat].totalAmountReceived += s.netAmount;
      categoryBreakdown[cat].totalGrossAmount += s.grossAmount;
      categoryBreakdown[cat].totalCommissionDeducted += s.commissionDeducted;
      categoryBreakdown[cat].count += 1;
    });

    const totalReceived = filtered.reduce((sum, s) => sum + s.netAmount, 0);
    const totalGross = filtered.reduce((sum, s) => sum + s.grossAmount, 0);
    const totalCommissionDeducted = filtered.reduce((sum, s) => sum + s.commissionDeducted, 0);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedRecords = filtered.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      data: paginatedRecords,
      totalCount,
      page,
      totalPages,
      summary: {
        totalReceived,
        totalGross,
        totalCommissionDeducted,
        count: totalCount
      },
      categoryBreakdown: Object.values(categoryBreakdown),
      period: {
        duration,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Get Vendor Settlements Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving settlements: ' + error.message });
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
