const { User } = require('../models/model');
const {
  sendSuccess,
  sendError,
  statusCodes,
} = require('../utils/responseUtils');
const { formatUserResponse } = require('../utils/authUtils');

/**
 * Follow a user
 * @route POST /api/social/follow/:userId
 */
const followUser = async (req, res) => {
  try {
    const userToFollowId = req.params.userId;
    const currentUserId = req.user._id;

    // Prevent following yourself
    if (currentUserId.toString() === userToFollowId) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You cannot follow yourself'
      );
    }

    // Find the user to follow
    const userToFollow = await User.findById(userToFollowId);
    if (!userToFollow) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    // Check if already following
    const currentUser = await User.findById(currentUserId);
    if (currentUser.following.includes(userToFollowId)) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You are already following this user'
      );
    }

    // Update following list for current user
    await User.findByIdAndUpdate(currentUserId, {
      $push: { following: userToFollowId },
    });

    // Update followers list for target user
    await User.findByIdAndUpdate(userToFollowId, {
      $push: { followers: currentUserId },
    });

    return sendSuccess(res, statusCodes.OK, 'User followed successfully');
  } catch (error) {
    console.error('Error following user:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to follow user',
      error
    );
  }
};

/**
 * Unfollow a user
 * @route POST /api/social/unfollow/:userId
 */
const unfollowUser = async (req, res) => {
  try {
    const userToUnfollowId = req.params.userId;
    const currentUserId = req.user._id;

    // Prevent unfollowing yourself
    if (currentUserId.toString() === userToUnfollowId) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You cannot unfollow yourself'
      );
    }

    // Find the user to unfollow
    const userToUnfollow = await User.findById(userToUnfollowId);
    if (!userToUnfollow) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    // Check if actually following
    const currentUser = await User.findById(currentUserId);
    if (!currentUser.following.includes(userToUnfollowId)) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'You are not following this user'
      );
    }

    // Update following list for current user
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: userToUnfollowId },
    });

    // Update followers list for target user
    await User.findByIdAndUpdate(userToUnfollowId, {
      $pull: { followers: currentUserId },
    });

    return sendSuccess(res, statusCodes.OK, 'User unfollowed successfully');
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to unfollow user',
      error
    );
  }
};

/**
 * Get user's followers
 * @route GET /api/social/followers
 */
const getFollowers = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;

    const user = await User.findById(userId)
      .populate('followers', 'name username image bio')
      .lean();

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    return sendSuccess(res, statusCodes.OK, null, {
      followers: user.followers,
    });
  } catch (error) {
    console.error('Error getting followers:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get followers',
      error
    );
  }
};

/**
 * Get users that a user is following
 * @route GET /api/social/following
 */
const getFollowing = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;

    const user = await User.findById(userId)
      .populate('following', 'name username image bio')
      .lean();

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    return sendSuccess(res, statusCodes.OK, null, {
      following: user.following,
    });
  } catch (error) {
    console.error('Error getting following:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get following',
      error
    );
  }
};

/**
 * Get suggested users to follow (users not currently followed)
 * @route GET /api/social/suggestions
 */
const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 5;

    const currentUser = await User.findById(currentUserId);

    // Get users not followed by current user
    const suggestedUsers = await User.find({
      _id: {
        $ne: currentUserId,
        $nin: currentUser.following,
      },
      isVerified: true,
    })
      .select('name username image bio')
      .limit(limit)
      .lean();

    return sendSuccess(res, statusCodes.OK, null, {
      suggestions: suggestedUsers,
    });
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get suggested users',
      error
    );
  }
};

/**
 * Check if current user is following another user
 * @route GET /api/social/is-following/:userId
 */
const checkFollowingStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    return sendSuccess(res, statusCodes.OK, null, { isFollowing });
  } catch (error) {
    console.error('Error checking following status:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to check following status',
      error
    );
  }
};

/**
 * Search for users by name or username
 * @route GET /api/social/search
 */
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.trim() === '') {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Search query is required'
      );
    }

    // Search for users by name or username
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: currentUserId }, // Exclude current user from results
      isVerified: true, // Only include verified users
    })
      .select('name username image bio followers following')
      .limit(10)
      .lean();

    // Add followedByMe field
    const currentUser = await User.findById(currentUserId);
    const usersWithFollowStatus = users.map((user) => ({
      ...user,
      followedByMe: currentUser.following.includes(user._id),
      followersCount: user.followers.length,
      followingCount: user.following.length,
    }));

    return sendSuccess(res, statusCodes.OK, null, {
      users: usersWithFollowStatus,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to search users',
      error
    );
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  checkFollowingStatus,
  searchUsers,
};
