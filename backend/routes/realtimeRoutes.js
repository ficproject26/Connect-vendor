/**
 * Real-Time Infrastructure Routes
 * Provides health checks, observability diagnostics, and lightweight reconnection sync.
 */

const express = require('express');
const router = express.Router();
const { realtimeManager } = require('../realtime/realtimeManager');
const { Order, Product, DeliveryPartner, User } = require('../models/Schemas');
const { protect, authorize } = require('../middleware/auth');

// Public health check for real-time system
router.get('/health', (req, res) => {
  const diag = realtimeManager.getDiagnostics();
  res.status(200).json({
    success: true,
    realtime: 'active',
    redisMode: diag.redis.mode,
    activeSockets: diag.websocket.currentConnected
  });
});

// Full system telemetry for admins / monitoring (protected)
router.get('/stats', protect, authorize('Admin'), (req, res) => {
  const diag = realtimeManager.getDiagnostics();
  res.status(200).json({
    success: true,
    diagnostics: diag
  });
});

// Lightweight State Synchronization for Reconnecting Clients
// Allows client to request delta updates that occurred since `sinceTimestamp`
router.get('/sync', protect, async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000); // default to last 1 minute

    const vendorId = req.user.primaryBusinessId || req.user._id;
    const businessIds = [vendorId.toString()];
    if (req.user.businesses && Array.isArray(req.user.businesses)) {
      req.user.businesses.forEach(b => {
        if (b._id) businessIds.push(b._id.toString());
      });
    }

    // Fetch changes since disconnect in parallel
    const [recentOrders, recentProducts] = await Promise.all([
      Order.find({
        $or: [{ vendorId: { $in: businessIds } }, { vendor_id: { $in: businessIds } }],
        updatedAt: { $gte: sinceDate }
      }).sort({ updatedAt: -1 }).limit(50).lean(),
      Product.find({
        $or: [{ vendorId: { $in: businessIds } }, { vendor_id: { $in: businessIds } }],
        updatedAt: { $gte: sinceDate }
      }).sort({ updatedAt: -1 }).limit(50).lean()
    ]);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      delta: {
        orders: recentOrders,
        products: recentProducts
      }
    });
  } catch (err) {
    console.error('Reconnection Sync Error:', err.message);
    res.status(500).json({ success: false, message: 'Sync failed' });
  }
});

module.exports = router;
