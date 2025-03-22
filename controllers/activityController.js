const { Activity } = require('../models/model');
const {
  sendSuccess,
  sendError,
  statusCodes,
} = require('../utils/responseUtils');

/**
 * Create a new activity record
 * @param {Object} activityData - Data for the activity
 * @returns {Promise<Object>} Created activity
 */
const createActivity = async activityData => {
  try {
    // Don't create activities where user and recipient are the same
    if (activityData.user.toString() === activityData.recipient.toString()) {
      return null;
    }

    const activity = new Activity(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
};

/**
 * Get activities for the current user
 * @route GET /api/activities
 */
const getUserActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username image')
      .populate('blogId', 'title slug')
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments({ recipient: req.user._id });
    const unreadCount = await Activity.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    // Format activities for display
    const formattedActivities = activities.map(activity => {
      let message = '';
      switch (activity.type) {
        case 'like':
          message = `liked your post`;
          break;
        case 'comment':
          message = `commented on your post`;
          break;
        case 'reply':
          message = `replied to your comment`;
          break;
        case 'follow':
          message = `started following you`;
          break;
      }

      return {
        ...activity,
        message,
        timeAgo: formatTimeAgo(activity.createdAt),
      };
    });

    return sendSuccess(res, statusCodes.OK, null, {
      activities: formattedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error getting user activities:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get activities',
      error
    );
  }
};

/**
 * Mark activities as read
 * @route PUT /api/activities/read
 */
const markActivitiesAsRead = async (req, res) => {
  try {
    const { activityIds } = req.body;

    if (activityIds && activityIds.length > 0) {
      // Mark specific activities as read
      await Activity.updateMany(
        {
          _id: { $in: activityIds },
          recipient: req.user._id,
        },
        { read: true }
      );
    } else {
      // Mark all activities as read
      await Activity.updateMany(
        { recipient: req.user._id, read: false },
        { read: true }
      );
    }

    return sendSuccess(res, statusCodes.OK, 'Activities marked as read');
  } catch (error) {
    console.error('Error marking activities as read:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to mark activities as read',
      error
    );
  }
};

/**
 * Format the time in a human-readable "time ago" format
 * @param {Date} date - The date to format
 * @returns {String} Formatted time string
 */
const formatTimeAgo = date => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }

  return 'just now';
};

module.exports = {
  createActivity,
  getUserActivities,
  markActivitiesAsRead,
};
