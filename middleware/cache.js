const { getCache, setCache } = require('../utils/redisClient');

/**
 * Creates a caching middleware that caches responses
 * @param {string} prefix - Cache key prefix
 * @param {Function} keyGenerator - Function to generate cache key from request (defaults to URL)
 * @param {number} ttl - Time to live in seconds
 */
const cacheMiddleware = (prefix, keyGenerator, ttl) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = `${prefix}:${
      keyGenerator ? keyGenerator(req) : req.originalUrl
    }`;

    try {
      // Try to get from cache
      const cachedData = await getCache(key);

      if (cachedData) {
        // Return cached response
        return res.status(200).json(cachedData);
      }

      // Cache miss, capture the response
      const originalSend = res.json;
      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(key, body, ttl).catch(error => {
            console.error('Error setting cache:', error);
          });
        }
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching
    }
  };
};

/**
 * Home page/public blog listing cache middleware
 */
const homepageCache = cacheMiddleware('homepage', null, 300); // 5 minutes

/**
 * Single blog cache middleware
 */
const blogCache = cacheMiddleware(
  'blog',
  req => req.params.slug || req.originalUrl,
  600 // 10 minutes
);

/**
 * Category listing cache middleware
 */
const categoryCache = cacheMiddleware('category', null, 600); // 10 minutes

module.exports = {
  cacheMiddleware,
  homepageCache,
  blogCache,
  categoryCache,
};
