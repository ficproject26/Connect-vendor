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


// POST /api/realtime/notify-order
// Allows internal services to trigger real-time order notification
router.post('/notify-order', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order) {
      return res.status(400).json({ success: false, message: 'Order data required' });
    }

    const { publishRealtimeEvent, EVENT_TYPES, ENTITY_NAMES } = require('../realtime/realtimeManager');
    await publishRealtimeEvent({
      event: EVENT_TYPES.ORDER_CREATED,
      entity: ENTITY_NAMES.ORDER,
      entityId: (order._id || order.id || '').toString(),
      action: 'created',
      target: {
        vendorId: (order.vendorId || order.vendor_id || '').toString(),
        userId: (order.memberId || order.userId || order.user_id || '').toString(),
        businessId: (order.businessId || order.primaryBusinessId || '').toString()
      },
      data: order
    });

    res.status(200).json({ success: true, message: 'Realtime order event published successfully' });
  } catch (err) {
    console.error('Notify Order Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to broadcast order event' });
  }
});

module.exports = router;
