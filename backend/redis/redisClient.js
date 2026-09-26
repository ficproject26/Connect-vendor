/**
 * Resilient Redis Client & Pub/Sub Infrastructure
 * Provides multi-instance distributed messaging with automatic in-memory fallback.
 */

const Redis = require('ioredis');
const EventEmitter = require('events');

// In-memory fallback event broker if Redis is unavailable
class InMemoryBroker extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
    this.store = new Map();
  }

  async publish(channel, message) {
    this.emit(channel, message);
    this.emit('*', channel, message);
    return 1;
  }

  async subscribe(channel, callback) {
    if (channel === '*') {
      this.on('*', callback);
    } else {
      this.on(channel, (msg) => callback(channel, msg));
    }
    return 1;
  }

  async unsubscribe(channel) {
    this.removeAllListeners(channel);
    return 1;
  }

  // Basic in-memory key-value cache
  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + (duration * 1000);
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key) {
    if (key.includes('*')) {
      const regex = new RegExp('^' + key.replace(/\*/g, '.*') + '$');
      let count = 0;
      for (const k of this.store.keys()) {
        if (regex.test(k)) {
          this.store.delete(k);
          count++;
        }
      }
      return count;
    }
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    for (const [k, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt < Date.now()) {
        this.store.delete(k);
        continue;
      }
      if (regex.test(k)) {
        matched.push(k);
      }
    }
    return matched;
  }
}

class RedisManager {
  constructor() {
    this.isRedisConnected = false;
    this.isConnecting = false;
    this.inMemoryBroker = new InMemoryBroker();
    this.pubClient = null;
    this.subClient = null;
    this.cacheClient = null;
    this.subscriptions = new Map(); // channel -> Set of callback handlers
    this.stats = {
      publishedEvents: 0,
      receivedEvents: 0,
      reconnectCount: 0,
      mode: 'in-memory-fallback',
      lastConnectedAt: null
    };

    this.initClients();
  }

  initClients() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_CACHE_URL;
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    const redisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        // Exponential backoff capped at 15s to keep trying without overwhelming logs
        const delay = Math.min(times * 1000, 15000);
        return delay;
      }
    };

    try {
      if (redisUrl) {
        this.pubClient = new Redis(redisUrl, redisOptions);
        this.subClient = new Redis(redisUrl, redisOptions);
        this.cacheClient = new Redis(redisUrl, redisOptions);
      } else {
        const connConfig = {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          ...redisOptions
        };
        this.pubClient = new Redis(connConfig);
        this.subClient = new Redis(connConfig);
        this.cacheClient = new Redis(connConfig);
      }

      this.setupClientEvents(this.pubClient, 'Publisher');
      this.setupClientEvents(this.subClient, 'Subscriber');
      this.setupClientEvents(this.cacheClient, 'Cache');

      // Attempt initial connection asynchronously
      this.connectRedis();
    } catch (err) {
      console.warn(`[RedisManager] Initial Redis client setup notice: ${err.message}. Using high-performance in-memory fallback.`);
    }
  }

  setupClientEvents(client, name) {
    if (!client) return;

    client.on('connect', () => {
      console.log(`🚀 [Redis] ${name} connected successfully.`);
      this.isRedisConnected = true;
      this.stats.mode = 'redis-distributed';
      this.stats.lastConnectedAt = new Date().toISOString();
      if (name === 'Subscriber') {
        this.resubscribeAll();
      }
    });

    client.on('ready', () => {
      this.isRedisConnected = true;
    });

    client.on('error', (err) => {
      // Graceful error logging - do not crash process
      if (this.isRedisConnected) {
        console.warn(`⚠️ [Redis] ${name} connection warning: ${err.message}. Switching to in-memory fallback.`);
      }
      this.isRedisConnected = false;
      this.stats.mode = 'in-memory-fallback';
    });

    client.on('close', () => {
      this.isRedisConnected = false;
      this.stats.mode = 'in-memory-fallback';
    });

    client.on('reconnecting', () => {
      this.stats.reconnectCount++;
    });
  }

  async connectRedis() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      await Promise.all([
        this.pubClient?.connect().catch(() => {}),
        this.subClient?.connect().catch(() => {}),
        this.cacheClient?.connect().catch(() => {})
      ]);
    } catch (e) {
      // Ignored - fallback active
    } finally {
      this.isConnecting = false;
    }
  }

  async resubscribeAll() {
    if (!this.isRedisConnected || !this.subClient) return;
    for (const channel of this.subscriptions.keys()) {
      try {
        await this.subClient.subscribe(channel);
        console.log(`📡 [Redis] Resubscribed to channel: ${channel}`);
      } catch (err) {
        console.warn(`⚠️ [Redis] Failed to resubscribe to ${channel}:`, err.message);
      }
    }
  }

  /**
   * Publish event to a Redis channel
   * @param {string} channel
   * @param {Object|string} message
   */
  async publish(channel, message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.stats.publishedEvents++;

    // Always publish to in-memory broker so local subscribers receive it immediately
    this.inMemoryBroker.publish(channel, payload);

    if (this.isRedisConnected && this.pubClient) {
      try {
        await this.pubClient.publish(channel, payload);
      } catch (err) {
        console.warn(`⚠️ [Redis] Publish to ${channel} failed, handled via fallback:`, err.message);
      }
    }
  }

  /**
   * Subscribe to a Redis channel
   * @param {string} channel
   * @param {Function} handler (channel, message)
   */
  async subscribe(channel, handler) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(handler);

    // Subscribe to in-memory broker
    this.inMemoryBroker.subscribe(channel, (ch, msg) => {
      this.stats.receivedEvents++;
      handler(ch, msg);
    });

    // Subscribe to Redis if connected
    if (this.isRedisConnected && this.subClient) {
      try {
        await this.subClient.subscribe(channel);
        this.subClient.on('message', (ch, msg) => {
          if (ch === channel) {
            handler(ch, msg);
          }
        });
      } catch (err) {
        console.warn(`⚠️ [Redis] Redis subscription to ${channel} failed:`, err.message);
      }
    }
  }

  /**
   * Cache getter
   */
  async getCache(key) {
    if (this.isRedisConnected && this.cacheClient) {
      try {
        const val = await this.cacheClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (e) {
        // Fallback to in-memory
      }
    }
    return this.inMemoryBroker.get(key);
  }

  /**
   * Cache setter
   */
  async setCache(key, value, ttlSeconds = 300) {
    if (this.isRedisConnected && this.cacheClient) {
      try {
        await this.cacheClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      } catch (e) {
        // Fallback to in-memory
      }
    }
    await this.inMemoryBroker.set(key, value, 'EX', ttlSeconds);
    return true;
  }

  /**
   * Cache invalidator
   */
  async delCache(key) {
    if (this.isRedisConnected && this.cacheClient) {
      try {
        if (key.includes('*')) {
          const keys = await this.cacheClient.keys(key);
          if (keys.length > 0) {
            await this.cacheClient.del(...keys);
          }
        } else {
          await this.cacheClient.del(key);
        }
      } catch (e) {
        // Fallback
      }
    }
    await this.inMemoryBroker.del(key);
    return true;
  }

  getStatus() {
    return {
      connected: this.isRedisConnected,
      mode: this.stats.mode,
      reconnectCount: this.stats.reconnectCount,
      publishedEvents: this.stats.publishedEvents,
      receivedEvents: this.stats.receivedEvents,
      activeChannels: Array.from(this.subscriptions.keys())
    };
  }
}

// Export singleton instance
const redisManager = new RedisManager();
module.exports = redisManager;
