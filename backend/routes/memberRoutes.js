const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getMemberCard,
  getParticipatingVendors,
  redeemDiscount,
  renewMembership,
  getMemberOrders,
  getVendorProducts,
  getMemberPlans,
  getMembershipHistory,
  getBookedSlots
} = require('../controllers/memberController');

const router = express.Router();

// Apply auth middleware to all member routes
router.use(protect);

router.get('/card', authorize('Member', 'Vendor'), getMemberCard);
router.get('/discounts', authorize('Member'), getParticipatingVendors);
router.post('/redeem', authorize('Member'), redeemDiscount);
router.post('/renew', authorize('Member', 'Vendor'), renewMembership);
router.get('/orders', authorize('Member'), getMemberOrders);
router.get('/vendors/:vendorId/products', authorize('Member'), getVendorProducts);
router.get('/vendors/:vendorId/booked-slots', authorize('Member', 'Vendor'), getBookedSlots);
router.get('/plans', authorize('Member'), getMemberPlans);
router.get('/history', authorize('Member', 'Vendor'), getMembershipHistory);

module.exports = router;
