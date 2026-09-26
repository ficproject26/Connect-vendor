/**
 * Centralized Event Publisher
 * Generates, standardizes, deduplicates, and publishes events via Redis Pub/Sub.
 */

const { createStandardEvent } = require('../events/eventValidator');
const { REDIS_CHANNELS, EVENT_TYPES } = require('../events/eventTypes');
const redisManager = require('../redis/redisClient');
const cacheManager = require('../cache/cacheManager');

class EventPublisher {
  constructor() {
    this.recentEvents = new Map(); // hash -> timestamp (deduplication cache)
    this.dedupWindowMs = 2000; // 2 seconds deduplication window
    this.totalPublished = 0;
  }

  /**
   * Generates a unique deduplication fingerprint for an event
   */
  getFingerprint(event, entity, entityId, action) {
    return `${event}:${entity}:${entityId}:${action}`;
  }

  /**
   * Publish a committed event to the ecosystem
   * @param {Object} options
   * @param {string} options.event - One of EVENT_TYPES
   * @param {string} options.entity - Entity name (e.g. 'order', 'product')
   * @param {string} options.entityId - Primary ID of entity
   * @param {string} options.action - 'created' | 'updated' | 'deleted' | 'status_changed'
   * @param {number} [options.version] - Entity version or timestamp
   * @param {Object} [options.target] - Scoping info { vendorId, userId, role, businessId }
   * @param {Object} [options.data] - Entity payload
   * @returns {Promise<Object>} The published structured event
   */
  async publish({
    event,
    entity,
    entityId,
    action = 'updated',
    version,
    target = {},
    data = {}
  }) {
    const startTime = Date.now();

    // 1. Build standardized event envelope
    const standardEvent = createStandardEvent({
      event,
      entity,
      entityId,
      action,
      version,
      target,
      data
    });

    // 2. Deduplication check
    const fingerprint = this.getFingerprint(standardEvent.event, standardEvent.entity, standardEvent.entityId, standardEvent.action);
    const now = Date.now();
    const lastEmitted = this.recentEvents.get(fingerprint);

    if (lastEmitted && (now - lastEmitted < this.dedupWindowMs)) {
      // If same event was fired in the last window with identical state, avoid flooding
      return standardEvent;
    }
    this.recentEvents.set(fingerprint, now);

    // Prune old deduplication fingerprints periodically
    if (this.recentEvents.size > 2000) {
      for (const [key, ts] of this.recentEvents.entries()) {
        if (now - ts > 10000) {
          this.recentEvents.delete(key);
        }
      }
    }

    // 3. Cache Invalidation triggered by event
    await this.triggerCacheInvalidation(standardEvent);

    // 4. Publish to Redis Pub/Sub
    const channel = REDIS_CHANNELS.GLOBAL;
    await redisManager.publish(channel, standardEvent);

    this.totalPublished++;
    const duration = Date.now() - startTime;
    console.log(`[EventPublisher] 🚀 Event published [${standardEvent.event}] for ${standardEvent.entity}:${standardEvent.entityId} in ${duration}ms (target: ${JSON.stringify(standardEvent.target)})`);

    return standardEvent;
  }

  /**
   * Automatically invalidates relevant caches based on event domain
   */
  async triggerCacheInvalidation(evt) {
    try {
      const vendorId = evt.target?.vendorId;
      const userId = evt.target?.userId;

      switch (evt.entity) {
        case 'product':
          await cacheManager.invalidateProduct(vendorId);
          break;
        case 'order':
          await cacheManager.invalidateOrder(vendorId);
          break;
        case 'deliveryPartner':
          await cacheManager.invalidateDeliveryPartner(vendorId);
          break;
        case 'user':
        case 'vendor':
          await cacheManager.invalidateVendorProfile(userId || vendorId);
          break;
        case 'category':
          await cacheManager.invalidateCategories();
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[EventPublisher] Cache invalidation warning:', err.message);
    }
  }

  getStats() {
    return {
      totalPublished: this.totalPublished,
      activeDedupEntries: this.recentEvents.size
    };
  }
}

const eventPublisher = new EventPublisher();
module.exports = eventPublisher;
