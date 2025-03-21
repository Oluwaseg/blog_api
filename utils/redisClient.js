const { createClient } = require('redis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const defaultTTL = parseInt(process.env.REDIS_TTL || '3600', 10);

let redisClient;

/**
 * Initialize and connect to Redis
 */
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', err => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log('✅ Redis connected successfully');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Don't crash the app if Redis isn't available
    return null;
  }
};

/**
 * Set a key in Redis cache with default TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds
 */
const setCache = async (key, value, ttl = defaultTTL) => {
  if (!redisClient?.isOpen) return false;

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttl });
    return true;
  } catch (error) {
    console.error('Redis setCache error:', error);
    return false;
  }
};

/**
 * Get a value from Redis cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Parsed value or null if not found
 */
const getCache = async key => {
  if (!redisClient?.isOpen) return null;

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis getCache error:', error);
    return null;
  }
};

/**
 * Delete a key from Redis cache
 * @param {string} key - Cache key
 */
const deleteCache = async key => {
  if (!redisClient?.isOpen) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis deleteCache error:', error);
    return false;
  }
};

/**
 * Clear a pattern of keys from Redis cache
 * @param {string} pattern - Pattern to match keys (e.g. 'blog:*')
 */
const clearCachePattern = async pattern => {
  if (!redisClient?.isOpen) return false;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Redis clearCachePattern error:', error);
    return false;
  }
};

module.exports = {
  connectRedis,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern,
};
