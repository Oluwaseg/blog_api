const { User } = require('../models/model');
const {
  sendSuccess,
  sendError,
  statusCodes,
} = require('../utils/responseUtils');
const { formatUserResponse } = require('../utils/authUtils');
const { findUserById, updateUserProfile } = require('../services/userService');

/**
 * Get all users
 * @route GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filterField = req.query.filterField;
    const filterValue = req.query.filterValue;

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Prepare filter condition if provided
    const filter = {};
    if (filterField && filterValue) {
      filter[filterField] = { $regex: filterValue, $options: 'i' };
    }

    // Prepare sort condition
    const sort = {};
    sort[sortBy] = sortOrder;

    // Get users with pagination and sorting
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Format user responses
    const formattedUsers = users.map(user => formatUserResponse(user, true));

    // Send success response with pagination info
    return sendSuccess(res, statusCodes.OK, null, {
      users: formattedUsers,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to fetch users',
      error
    );
  }
};

/**
 * Get a specific user by ID
 * @route GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await findUserById(userId);

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    return sendSuccess(res, statusCodes.OK, null, {
      user: formatUserResponse(user, true),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to fetch user',
      error
    );
  }
};

/**
 * Update user role (promote to admin or demote)
 * @route PUT /api/admin/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { isAdmin } = req.body;

    if (isAdmin === undefined) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'isAdmin field is required'
      );
    }

    // Prevent admin from changing their own role
    if (userId === req.user._id.toString()) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You cannot change your own admin status'
      );
    }

    const updateData = { isAdmin };
    const updatedUser = await updateUserProfile(userId, updateData);

    if (!updatedUser) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    return sendSuccess(
      res,
      statusCodes.OK,
      `User ${
        isAdmin ? 'promoted to admin' : 'demoted from admin'
      } successfully`,
      { user: formatUserResponse(updatedUser, true) }
    );
  } catch (error) {
    console.error('Error updating user role:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update user role',
      error
    );
  }
};

/**
 * Delete a user
 * @route DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You cannot delete your own account from admin panel'
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    await User.deleteOne({ _id: userId });

    return sendSuccess(res, statusCodes.OK, 'User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to delete user',
      error
    );
  }
};

/**
 * Get user statistics
 * @route GET /api/admin/stats
 */
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });
    const adminUsers = await User.countDocuments({ isAdmin: true });

    // Get users created in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    // Get active users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: thirtyDaysAgo },
    });

    return sendSuccess(res, statusCodes.OK, null, {
      stats: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        adminUsers,
        newUsers,
        activeUsers,
      },
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to fetch user statistics',
      error
    );
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStats,
};
