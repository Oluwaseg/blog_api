const { sendError, statusCodes } = require('../utils/responseUtils');

/**
 * Middleware to restrict routes to admin users only
 */
const adminOnly = (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return sendError(res, statusCodes.UNAUTHORIZED, 'Not authenticated');
    }

    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return sendError(
        res,
        statusCodes.FORBIDDEN,
        'Access denied. Admin privileges required.'
      );
    }

    // User is authenticated and is an admin
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return sendError(res, statusCodes.INTERNAL_SERVER_ERROR, 'Server error');
  }
};

module.exports = {
  adminOnly,
};
