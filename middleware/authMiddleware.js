const jwt = require('jsonwebtoken');
const { User } = require('../models/model');
const { sendError, statusCodes } = require('../utils/responseUtils');
require('dotenv').config();

/**
 * Protect routes requiring authentication
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      // Get token from cookie
      token = req.cookies.jwt;
    }

    if (!token) {
      return sendError(
        res,
        statusCodes.UNAUTHORIZED,
        'Not authorized to access this route'
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.userId);

      if (!user) {
        return sendError(res, statusCodes.UNAUTHORIZED, 'User not found');
      }

      if (!user.isVerified) {
        return sendError(
          res,
          statusCodes.FORBIDDEN,
          'Email not verified. Please verify your email to access this resource'
        );
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      return sendError(
        res,
        statusCodes.UNAUTHORIZED,
        'Not authorized, token invalid or expired'
      );
    }
  } catch (error) {
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Server error',
      error
    );
  }
};

module.exports = {
  protect,
};
