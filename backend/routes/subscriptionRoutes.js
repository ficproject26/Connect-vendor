const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getSubscriptions,
  getSubscriptionHistory,
  getSubscriptionSummary,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getBusinessSubscription,
  handleRazorpayWebhook,
  getSubscriptionConfig,
  updateSubscriptionConfig
} = require('../controllers/subscriptionController');

const router = express.Router();

// Webhook endpoint: public, verified via Razorpay HMAC signature
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// Protected routes for authenticated Vendors
router.use(protect);

// Vendor Subscriptions Status & Summary
router.get('/', authorize('Vendor', 'Admin'), getSubscriptions);

// Real Subscription History (with filters: this-month, last-month, custom date)
router.get('/history', authorize('Vendor', 'Admin'), getSubscriptionHistory);

// Real Monthly & Yearly Summaries (database aggregation)
router.get('/summary', authorize('Vendor', 'Admin'), getSubscriptionSummary);

// Single Business Subscription Check
router.get('/business/:businessId', authorize('Vendor', 'Admin'), getBusinessSubscription);

// Create Razorpay Order for Business Subscription
router.post('/create-order', authorize('Vendor'), createSubscriptionOrder);

// Verify Razorpay Payment and Activate Subscription
router.post('/verify-payment', authorize('Vendor'), verifySubscriptionPayment);

// Admin Configuration Endpoints
router.get('/admin/config', authorize('Admin', 'Vendor'), getSubscriptionConfig);
router.put('/admin/config', authorize('Admin'), updateSubscriptionConfig);

module.exports = router;
