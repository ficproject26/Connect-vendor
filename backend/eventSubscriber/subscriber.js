/**
 * Centralized Event Subscriber
 * Listens on Redis Pub/Sub channels and dispatches to connected WebSockets.
 */

const { REDIS_CHANNELS } = require('../events/eventTypes');
const redisManager = require('../redis/redisClient');
const socketServer = require('../websocket/socketServer');

class EventSubscriber {
  constructor() {
    this.processedEventIds = new Set();
    this.totalReceived = 0;
    this.isSubscribed = false;
  }

  init() {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    // Subscribe to global and ecosystem-wide channels (including Connect App events)
    const channelsToSubscribe = [
      REDIS_CHANNELS.GLOBAL,
      'connect:realtime:events',
      'connect:events:orders',
      'connect:events:global'
    ];

    channelsToSubscribe.forEach(channelName => {
      redisManager.subscribe(channelName, (channel, rawMessage) => {
        this.handleIncomingMessage(channel, rawMessage);
      });
      console.log(`📡 [EventSubscriber] Subscribed to Redis channel: ${channelName}`);
    });
  }

  /**
   * Process incoming Redis message
   */
  handleIncomingMessage(channel, rawMessage) {
    try {
      this.totalReceived++;
      const event = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;

      if (!event) {
        return;
      }

      // Safe eventId generation for deduplication across different backend envelopes
      const eventId = event.eventId || `${event.event || 'EVT'}_${event.entityId || ''}_${event.version || ''}_${event.timestamp || Date.now()}`;

      // Deduplication check
      if (this.processedEventIds.has(eventId)) {
        return; // Already processed
      }

      this.processedEventIds.add(eventId);

      // Memory cleanup for processed IDs set
      if (this.processedEventIds.size > 5000) {
        const first = this.processedEventIds.values().next().value;
        this.processedEventIds.delete(first);
      }

      // Ensure target vendorId is mapped if present in data payload
      if (!event.target) event.target = {};
      const payloadData = event.data || {};
      if (!event.target.vendorId) {
        const inferredVid = payloadData.vendorId || payloadData.vendor_id || payloadData.businessId;
        if (inferredVid) {
          event.target.vendorId = String(inferredVid);
        }
      }
      if (!event.target.businessId && payloadData.businessId) {
        event.target.businessId = String(payloadData.businessId);
      }

      // Route event to WebSocket server for client delivery
      socketServer.broadcastEvent({
        ...event,
        eventId
      });
    } catch (err) {
      console.error('[EventSubscriber] ❌ Failed to handle incoming message:', err.message);
    }
  }

  getStats() {
    return {
      totalReceived: this.totalReceived,
      dedupCacheSize: this.processedEventIds.size
    };
  }
}

const eventSubscriber = new EventSubscriber();
module.exports = eventSubscriber;
