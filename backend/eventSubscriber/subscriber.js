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

    // Subscribe to global and entity-specific channels
    redisManager.subscribe(REDIS_CHANNELS.GLOBAL, (channel, rawMessage) => {
      this.handleIncomingMessage(channel, rawMessage);
    });

    console.log(`📡 [EventSubscriber] Subscribed to Redis channel: ${REDIS_CHANNELS.GLOBAL}`);
  }

  /**
   * Process incoming Redis message
   */
  handleIncomingMessage(channel, rawMessage) {
    try {
      this.totalReceived++;
      const event = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;

      if (!event || !event.eventId) {
        return;
      }

      // Deduplication check
      if (this.processedEventIds.has(event.eventId)) {
        return; // Already processed
      }

      this.processedEventIds.add(event.eventId);

      // Memory cleanup for processed IDs set
      if (this.processedEventIds.size > 5000) {
        const first = this.processedEventIds.values().next().value;
        this.processedEventIds.delete(first);
      }

      // Route event to WebSocket server for client delivery
      socketServer.broadcastEvent(event);
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
