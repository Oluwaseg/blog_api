const { User } = require('../models/model');
const {
  hashPassword,
  generateVerificationToken,
} = require('../utils/authUtils');

/**
 * Find a user by their email
 * @param {string} email - User's email
 * @returns {Promise<Object>} User document
 */
const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

/**
 * Find a user by their ID
 * @param {string} id - User's ID
 * @returns {Promise<Object>} User document
 */
const findUserById = async (id) => {
  return await User.findById(id);
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} New user document
 */
const createUser = async (userData) => {
  const { name, email, password, image } = userData;

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate verification token
  const verificationToken = generateVerificationToken();

  // Create user
  const user = new User({
    name,
    email,
    password: hashedPassword,
    image,
    verificationToken,
  });

  await user.save();
  return { user, verificationToken };
};

/**
 * Check if a username already exists (excluding current user)
 * @param {string} username - Username to check
 * @param {string} userId - Current user ID (optional)
 * @returns {Promise<boolean>} True if username exists
 */
const isUsernameTaken = async (username, userId = null) => {
  const query = { username };

  if (userId) {
    query._id = { $ne: userId };
  }

  const existingUser = await User.findOne(query);
  return !!existingUser;
};

/**
 * Update user profile details
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user document
 */
const updateUserProfile = async (userId, updateData) => {
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  return updatedUser;
};

/**
 * Set a password reset token for a user
 * @param {Object} user - User document
 * @param {string} token - Reset token
 * @param {number} expiry - Expiry time in milliseconds
 * @returns {Promise<Object>} Updated user document
 */
const setPasswordResetToken = async (user, token, expiry) => {
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + expiry;
  await user.save();
  return user;
};

/**
 * Find user by reset token if not expired
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @returns {Promise<Object>} User document
 */
const findUserByResetToken = async (email, token) => {
  return await User.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
};

/**
 * Set user as verified
 * @param {Object} user - User document
 * @returns {Promise<Object>} Updated user document
 */
const verifyUser = async (user) => {
  user.isVerified = true;
  user.verificationToken = null;
  await user.save();
  return user;
};

/**
 * Update user's last active timestamp
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
const updateLastActive = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    user.lastActive = new Date();
    await user.save();
  }
  return user;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  isUsernameTaken,
  updateUserProfile,
  setPasswordResetToken,
  findUserByResetToken,
  verifyUser,
  updateLastActive,
};
