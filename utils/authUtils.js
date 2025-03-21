const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Create a JWT token with user information
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const createToken = user => {
  const tokenData = {
    userId: user._id,
    email: user.email,
    name: user.name,
    username: user.username,
    image: user.image,
  };

  const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
    expiresIn: '1hr',
  });
  return token;
};

/**
 * Create a password reset token
 * @param {Object} user - User object
 * @returns {string} Reset token
 */
const createPasswordResetToken = user => {
  return jwt.sign(
    { email: user.email, userId: user._id },
    process.env.RESET_PASSWORD_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a random verification token
 * @returns {string} Random hex token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async password => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if match
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Format user data for response
 * @param {Object} user - User object from database
 * @param {boolean} withDetails - Include detailed profile info
 * @returns {Object} Formatted user data
 */
const formatUserResponse = (user, includeDetails = false) => {
  const baseResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    image: user.image,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
    followersCount: user.followers ? user.followers.length : 0,
    followingCount: user.following ? user.following.length : 0,
  };

  if (includeDetails) {
    return {
      ...baseResponse,
      bio: user.bio,
      dob: user.dob,
      contact: user.contact,
      address: user.address,
      social: user.social,
      profession: user.profession,
      interests: user.interests,
      lastActive: user.lastActive,
      joinedAt: user.joinedAt,
    };
  }

  return baseResponse;
};

module.exports = {
  createToken,
  createPasswordResetToken,
  generateVerificationToken,
  hashPassword,
  comparePassword,
  formatUserResponse,
};
