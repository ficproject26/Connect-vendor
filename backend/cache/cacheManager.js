/**
 * Centralized Cache Manager
 * Enforces real-time cache consistency with automatic invalidation.
 */

const redisManager = require('../redis/redisClient');

class CacheManager {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  generateKey(prefix, identifier) {
    return `connect:cache:${prefix}:${identifier || 'all'}`;
  }

  async get(prefix, identifier) {
    const key = this.generateKey(prefix, identifier);
    try {
      const data = await redisManager.getCache(key);
      if (data !== null && data !== undefined) {
        this.stats.hits++;
        return data;
      }
      this.stats.misses++;
      return null;
    } catch (e) {
      this.stats.misses++;
      return null;
    }
  }

  async set(prefix, identifier, data, ttlSeconds = this.defaultTTL) {
    const key = this.generateKey(prefix, identifier);
    try {
      await redisManager.setCache(key, data, ttlSeconds);
      return true;
    } catch (e) {
      return false;
    }
  }

  async invalidate(prefix, identifier) {
    const key = this.generateKey(prefix, identifier);
    this.stats.invalidations++;
    try {
      await redisManager.delCache(key);
    } catch (e) {}
  }

  async invalidatePattern(pattern) {
    this.stats.invalidations++;
    try {
      await redisManager.delCache(`connect:cache:${pattern}*`);
    } catch (e) {}
  }

  // --- Entity-Specific Invalidation Helpers ---

  async invalidateProduct(vendorId) {
    await Promise.all([
      this.invalidate('products', vendorId),
      this.invalidate('products', 'all'),
      this.invalidatePattern(`products:${vendorId}`)
    ]);
  }

  async invalidateOrder(vendorId) {
    await Promise.all([
      this.invalidate('orders', vendorId),
      this.invalidate('orders', 'all'),
      this.invalidate('analytics', vendorId),
      this.invalidatePattern(`orders:${vendorId}`)
    ]);
  }

  async invalidateDeliveryPartner(vendorId) {
    await Promise.all([
      this.invalidate('partners', vendorId),
      this.invalidatePattern(`partners:${vendorId}`)
    ]);
  }

  async invalidateVendorProfile(userId) {
    await Promise.all([
      this.invalidate('profile', userId),
      this.invalidate('user', userId)
    ]);
  }

  async invalidateCategories() {
    await this.invalidate('categories', 'all');
  }

  getStats() {
    return {
      ...this.stats,
      ratio: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%' 
        : '0%'
    };
  }
}

const cacheManager = new CacheManager();
module.exports = cacheManager;
