/**
 * Master Real-Time Infrastructure Coordinator
 * Unifies Redis, WebSocket Server, Event Publisher, Event Subscriber, and Cache.
 */

const redisManager = require('../redis/redisClient');
const socketServer = require('../websocket/socketServer');
const eventPublisher = require('../eventPublisher/publisher');
const eventSubscriber = require('../eventSubscriber/subscriber');
const cacheManager = require('../cache/cacheManager');
const { EVENT_TYPES, ENTITY_NAMES } = require('../events/eventTypes');

class RealtimeManager {
  constructor() {
    this.isInitialized = false;
    this.startTime = Date.now();
  }

  /**
   * Boot the complete real-time subsystem
   * @param {http.Server} httpServer
   */
  init(httpServer) {
    if (this.isInitialized) return;

    // 1. Initialize WebSocket server with HTTP server
    socketServer.init(httpServer);

    // 2. Initialize Redis event subscriber
    eventSubscriber.init();

    this.isInitialized = true;
    console.log('⚡ [RealtimeManager] Global Real-Time Synchronization Architecture is fully ACTIVE.');
  }

  /**
   * Main publishing entry point for controllers
   */
  async publish(options) {
    return eventPublisher.publish(options);
  }

  /**
   * Health and Observability Metrics
   */
  getDiagnostics() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'operational',
      uptime: `${uptimeSec}s`,
      redis: redisManager.getStatus(),
      websocket: socketServer.getStats(),
      publisher: eventPublisher.getStats(),
      subscriber: eventSubscriber.getStats(),
      cache: cacheManager.getStats()
    };
  }
}

const realtimeManager = new RealtimeManager();

module.exports = {
  realtimeManager,
  publishRealtimeEvent: (opts) => realtimeManager.publish(opts),
  cacheManager,
  EVENT_TYPES,
  ENTITY_NAMES
};
