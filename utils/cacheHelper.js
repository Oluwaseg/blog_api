const { deleteCache, clearCachePattern } = require('./redisClient');

/**
 * Clear blog-related caches when data changes
 * @param {string} blogSlug - The slug of the blog post that changed
 */
const invalidateBlogCaches = async blogSlug => {
  try {
    // Clear specific blog cache
    if (blogSlug) {
      await deleteCache(`blog:/api/blogs/${blogSlug}`);
    }

    // Clear homepage and category caches
    await clearCachePattern('homepage:*');
    await clearCachePattern('category:*');

    return true;
  } catch (error) {
    console.error('Error invalidating blog caches:', error);
    return false;
  }
};

/**
 * Clear user-related caches when user data changes
 * @param {string} userId - The ID of the user that changed
 */
const invalidateUserCaches = async userId => {
  try {
    if (userId) {
      await clearCachePattern(`user:*${userId}*`);
    }
    return true;
  } catch (error) {
    console.error('Error invalidating user caches:', error);
    return false;
  }
};

module.exports = {
  invalidateBlogCaches,
  invalidateUserCaches,
};
