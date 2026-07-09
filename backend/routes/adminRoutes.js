const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);
router.use(authorize('Admin'));

router.get('/stats', getAdminStats);
router.get('/vendors/requests', getPendingVendors);
router.put('/vendors/:id/approve', approveVendor);
router.put('/vendors/:id/reject', rejectVendor);
router.get('/vendors', getAllVendors);
router.put('/vendors/:id/toggle-status', toggleVendorStatus);
router.put('/vendors/:id', editVendorDetails);
router.get('/members', getAllMembers);
router.get('/membership-plans', getMembershipPlans);
router.put('/membership-plans/:id', updateMembershipPlan);
router.get('/reports', getReports);
router.get('/orders', getAllOrders);
router.get('/commission-config', getPlatformConfig);
router.put('/commission-config', updatePlatformConfig);

// Settlement routes (Admin)
const { getAllSettlements, createSettlement, updateSettlementStatus } = require('../controllers/settlementController');
router.get('/settlements', getAllSettlements);
router.post('/settlements', createSettlement);
router.put('/settlements/:id', updateSettlementStatus);

module.exports = router;
