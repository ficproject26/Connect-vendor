const mongoose = require('mongoose');
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

    // Collect all vendor/business identifiers
    const parentIdStr = parentUserId.toString();
    const userObjIdStr = user._id.toString();
    const businessIds = [parentIdStr, userObjIdStr];
    const bizMap = {};
    const allVendorBusinessNames = [user.businessName, user.name].filter(Boolean);

    // Default business entry for user
    const defaultBiz = {
      _id: parentIdStr,
      businessName: user.businessName || user.name,
      category: user.vendorType || user.category || 'Product'
    };
    bizMap[parentIdStr] = defaultBiz;
    bizMap[userObjIdStr] = defaultBiz;

    if (user.vendorId) {
      businessIds.push(user.vendorId);
      bizMap[user.vendorId] = defaultBiz;
    }
    const shortUserVndId = `VND-${userObjIdStr.slice(-6).toUpperCase()}`;
    businessIds.push(shortUserVndId);
    bizMap[shortUserVndId] = defaultBiz;

    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        if (b && b._id) {
          const bIdStr = b._id.toString();
          businessIds.push(bIdStr);
          const shortBizVndId = `VND-${bIdStr.slice(-6).toUpperCase()}`;
          businessIds.push(shortBizVndId);
          const bizEntry = {
            _id: bIdStr,
            businessName: b.businessName || user.businessName || user.name,
            category: b.category || b.vendorType || user.vendorType || user.category || 'Product'
          };
          bizMap[bIdStr] = bizEntry;
          bizMap[shortBizVndId] = bizEntry;
          if (b.businessId) {
            businessIds.push(b.businessId);
            bizMap[b.businessId] = bizEntry;
          }
          if (b.businessName && !allVendorBusinessNames.includes(b.businessName)) {
            allVendorBusinessNames.push(b.businessName);
          }
        }
      });
    }

    // Query real settlement records for this vendor
    const rawSettlements = await Settlement.find({
      $or: [
        { vendorId: { $in: businessIds } },
        { vendorBusinessName: { $in: allVendorBusinessNames } }
      ]
    }).lean();

    // Query real admin payments from payments collection if available
    let rawPayments = [];
    try {
      const db = mongoose.connection.db;
      if (db) {
        rawPayments = await db.collection('payments').find({
          $or: [
            { recipientId: { $in: businessIds } },
            { recipientName: { $in: allVendorBusinessNames } }
          ]
        }).toArray();
      }
    } catch (pErr) {
      console.warn('Payments lookup notice:', pErr.message);
    }

    // Helper: Normalize Status strictly to PAID, PENDING, HOLD, CANCELLED, FAILED
    const normalizeStatus = (raw) => {
      const s = String(raw || '').trim().toLowerCase();
      if (['completed', 'paid', 'successful', 'success'].includes(s)) return 'PAID';
      if (['processing', 'pending', 'in_transit'].includes(s)) return 'PENDING';
      if (['hold', 'on_hold', 'paused'].includes(s)) return 'HOLD';
      if (['cancelled', 'canceled', 'void'].includes(s)) return 'CANCELLED';
      if (['failed', 'rejected', 'error'].includes(s)) return 'FAILED';
      return 'PENDING';
    };

    // Helper: Normalize Category
    const normalizeCategory = (cat) => {
      const c = String(cat || 'Product').trim();
      if (/product/i.test(c)) return 'Product';
      if (/service/i.test(c)) return 'Services';
      if (/food|restaurant/i.test(c)) return 'Food';
      if (/daily/i.test(c)) return 'Daily Needs';
      if (/stay|hotel/i.test(c)) return 'Stay';
      if (/travel/i.test(c)) return 'Travel';
      if (/job/i.test(c)) return 'Jobs';
      return c || 'Product';
    };

    // Helper: Mask Account Number safely
    const maskAccount = (acc) => {
      if (!acc) return 'Registered Bank Account';
      const clean = String(acc).replace(/\s+/g, '');
      if (clean.length <= 4) return clean;
      return 'XXXXXX' + clean.slice(-4);
    };

    // Helper: Format Date
    const formatDateStr = (d) => {
      if (!d) return '-';
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      } catch (e) {
        return String(d);
      }
    };

    // Combine and reconcile settlements and payments to prevent duplicates
    const combinedRecords = [];
    const matchedPaymentIds = new Set();

    rawSettlements.forEach((s) => {
      const sIdStr = String(s._id);
      const sIdSuffix = sIdStr.slice(-6).toUpperCase();
      const sDate = s.settlementDate || s.createdAt || new Date();

      // Find matching payment in payments collection if any
      const matchedPayment = rawPayments.find(p => {
        if (!p) return false;
        const pIdStr = String(p.paymentId || '');
        const pTxn = String(p.transactionReference || '');
        const pSource = String(p.sourceId || '');
        return pIdStr.includes(sIdSuffix) || pTxn.includes(sIdSuffix) || pSource === sIdStr;
      });

      if (matchedPayment) {
        matchedPaymentIds.add(String(matchedPayment._id));
      }

      const activeRecord = matchedPayment || s;
      const matchedBiz = bizMap[String(s.vendorId)] || bizMap[String(matchedPayment?.recipientId)] || defaultBiz;
      const cat = normalizeCategory(s.category || matchedBiz?.category || user.vendorType || user.category);

      const gross = Number(s.grossAmount || matchedPayment?.amount || 0);
      const commRate = Number(s.commissionRate || 0);
      const commDeducted = Number(s.commissionDeducted || (commRate > 0 ? Math.round(gross * (commRate / 100)) : 0));
      const otherDeductions = Number(s.otherDeductions || matchedPayment?.deductions || 0);
      const net = Number(s.netAmount || matchedPayment?.amount || (gross - commDeducted - otherDeductions));

      // Build Payment ID & Reference traceable to database
      const paymentId = matchedPayment?.paymentId || `PAY-${sIdSuffix}`;
      const referenceId = s.referenceId || matchedPayment?.transactionReference || `SETTL-${sIdSuffix}`;
      const transactionId = matchedPayment?.transactionReference || `TXN-${sIdSuffix}`;

      // Period calculation
      let periodLabel = '';
      if (s.periodStart && s.periodEnd) {
        periodLabel = `${formatDateStr(s.periodStart)} – ${formatDateStr(s.periodEnd)}`;
      } else if (matchedPayment?.paymentPeriod) {
        periodLabel = matchedPayment.paymentPeriod;
      } else {
        periodLabel = formatDateStr(sDate);
      }

      // Purpose
      const purpose = s.purpose || s.paymentPurpose || (matchedPayment && matchedPayment.notes) || (s.vendorBusinessName ? `Store settlement for ${s.vendorBusinessName}` : 'Vendor Settlement');

      combinedRecords.push({
        _id: s._id,
        paymentId,
        transactionId,
        referenceId,
        vendorName: user.name,
        vendorId: `VND-${String(matchedBiz?._id || user._id).slice(-6).toUpperCase()}`,
        businessName: matchedBiz?.businessName || s.vendorBusinessName || user.businessName || user.name,
        businessId: matchedBiz?._id ? String(matchedBiz._id) : String(user._id),
        category: cat,
        purpose,
        paymentPeriod: periodLabel,
        paymentDate: sDate,
        grossAmount: gross,
        commissionRate: commRate,
        commissionDeducted: commDeducted,
        otherDeductions: otherDeductions,
        netAmount: net,
        status: normalizeStatus(matchedPayment ? matchedPayment.status : s.status),
        paymentType: s.paymentType || matchedPayment?.paymentMethod || 'Direct Bank Settlement (Admin)',
        bankDetails: {
          accountHolderName: matchedPayment?.bankAccountHolder || user.accountHolderName || user.name,
          bankName: matchedPayment?.bankName || user.bankName || 'Registered Settlement Bank',
          maskedAccount: maskAccount(matchedPayment?.bankAccountNumber || user.accountNo),
          maskedUpi: user.swiftCode || user.ifscCode ? `IFSC: ${user.ifscCode || user.swiftCode}` : 'Bank Direct Transfer',
          paymentMethod: s.paymentType || matchedPayment?.paymentMethod || 'Direct Bank Settlement (Admin)',
          transactionReference: transactionId
        }
      });
    });

    // Add standalone payments not linked to settlements
    rawPayments.forEach((p) => {
      if (matchedPaymentIds.has(String(p._id))) return; // Already merged
      const pIdStr = String(p._id);
      const pDate = p.paymentDate || p.createdAt || new Date();
      const matchedBiz = bizMap[String(p.recipientId)] || defaultBiz;
      const cat = normalizeCategory(matchedBiz?.category || user.vendorType || user.category);

      const gross = Number(p.amount || 0);
      const deductions = Number(p.deductions || 0);
      const net = gross - deductions;

      combinedRecords.push({
        _id: p._id,
        paymentId: p.paymentId || `PAY-${pIdStr.slice(-6).toUpperCase()}`,
        transactionId: p.transactionReference || `TXN-${pIdStr.slice(-6).toUpperCase()}`,
        referenceId: p.transactionReference || `REF-${pIdStr.slice(-6).toUpperCase()}`,
        vendorName: user.name,
        vendorId: `VND-${String(matchedBiz?._id || user._id).slice(-6).toUpperCase()}`,
        businessName: matchedBiz?.businessName || p.recipientName || user.businessName || user.name,
        businessId: matchedBiz?._id ? String(matchedBiz._id) : String(user._id),
        category: cat,
        purpose: p.notes || 'Direct Vendor Payment',
        paymentPeriod: p.paymentPeriod || formatDateStr(pDate),
        paymentDate: pDate,
        grossAmount: gross,
        commissionRate: 0,
        commissionDeducted: 0,
        otherDeductions: deductions,
        netAmount: net,
        status: normalizeStatus(p.status),
        paymentType: p.paymentMethod || 'Direct Bank Settlement (Admin)',
        bankDetails: {
          accountHolderName: p.bankAccountHolder || user.accountHolderName || user.name,
          bankName: p.bankName || user.bankName || 'Registered Settlement Bank',
          maskedAccount: maskAccount(p.bankAccountNumber || user.accountNo),
          maskedUpi: user.ifscCode ? `IFSC: ${user.ifscCode}` : 'Bank Direct Transfer',
          paymentMethod: p.paymentMethod || 'Direct Bank Settlement (Admin)',
          transactionReference: p.transactionReference || `TXN-${pIdStr.slice(-6).toUpperCase()}`
        }
      });
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

    let filtered = combinedRecords.filter(item => {
      const itemTime = new Date(item.paymentDate).getTime();
      if (startDate && itemTime < startDate.getTime()) return false;
      if (endDate && itemTime > endDate.getTime()) return false;
      return true;
    });

    // Status filter
    const statusFilter = req.query.status || 'All';
    if (statusFilter && statusFilter.toUpperCase() !== 'ALL') {
      filtered = filtered.filter(item => item.status.toUpperCase() === statusFilter.toUpperCase());
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
        (item.transactionId && item.transactionId.toLowerCase().includes(term)) ||
        (item.referenceId && item.referenceId.toLowerCase().includes(term)) ||
        (item.vendorName && item.vendorName.toLowerCase().includes(term)) ||
        (item.vendorId && item.vendorId.toLowerCase().includes(term)) ||
        (item.businessName && item.businessName.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        (item.purpose && item.purpose.toLowerCase().includes(term))
      );
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Category-wise totals based on real Admin payment records
    const categoryTotals = {};
    filtered.forEach(s => {
      const cat = s.category || 'Product';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = {
          category: cat,
          totalReceived: 0,
          totalGross: 0,
          totalCommissionDeducted: 0,
          count: 0
        };
      }
      categoryTotals[cat].totalReceived += s.netAmount;
      categoryTotals[cat].totalGross += s.grossAmount;
      categoryTotals[cat].totalCommissionDeducted += s.commissionDeducted;
      categoryTotals[cat].count += 1;
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
      categoryTotals: Object.values(categoryTotals),
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
