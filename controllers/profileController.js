const {
  comparePassword,
  hashPassword,
  formatUserResponse,
} = require('../utils/authUtils');
const {
  sendSuccess,
  sendError,
  statusCodes,
} = require('../utils/responseUtils');
const {
  findUserById,
  updateUserProfile,
  isUsernameTaken,
  updateLastActive,
} = require('../services/userService');

/**
 * Get current user's profile
 * @route GET /api/profile
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await findUserById(userId);

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    // Update last active timestamp
    await updateLastActive(userId);

    // Format and return user profile
    return sendSuccess(res, statusCodes.OK, null, {
      user: formatUserResponse(user, true),
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to fetch user profile',
      error
    );
  }
};

/**
 * Update user profile details
 * @route PUT /api/profile
 */
const updateUserDetails = async (req, res) => {
  try {
    console.log('Received update user details request:', req.body);

    const {
      username,
      name,
      bio,
      dob,
      contact,
      address,
      social,
      profession,
      interests,
    } = req.body;

    const userId = req.user._id;
    console.log('User ID:', userId);

    // Initialize update data object
    const updateData = {};

    // Basic fields
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (bio) updateData.bio = bio;
    if (dob) updateData.dob = new Date(dob);
    if (profession) updateData.profession = profession;
    if (interests && Array.isArray(interests)) updateData.interests = interests;

    // Nested contact information
    if (contact) {
      updateData.contact = {};
      if (contact.phone) updateData.contact.phone = contact.phone;
      if (contact.alternateEmail)
        updateData.contact.alternateEmail = contact.alternateEmail;
      if (contact.website) updateData.contact.website = contact.website;
    }

    // Nested address information
    if (address) {
      updateData.address = {};
      if (address.street) updateData.address.street = address.street;
      if (address.city) updateData.address.city = address.city;
      if (address.state) updateData.address.state = address.state;
      if (address.country) updateData.address.country = address.country;
      if (address.postalCode)
        updateData.address.postalCode = address.postalCode;
    }

    // Nested social media information
    if (social) {
      updateData.social = {};
      if (social.github) updateData.social.github = social.github;
      if (social.twitter) updateData.social.twitter = social.twitter;
      if (social.linkedin) updateData.social.linkedin = social.linkedin;
      if (social.facebook) updateData.social.facebook = social.facebook;
      if (social.instagram) updateData.social.instagram = social.instagram;
    }

    // Update last active timestamp
    updateData.lastActive = new Date();

    console.log('Update data prepared:', updateData);

    // Validate if there's anything to update
    if (Object.keys(updateData).length === 0) {
      console.log('Error: No valid fields provided for update');
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'No valid fields provided for update'
      );
    }

    // Check if username already exists
    if (username) {
      const isTaken = await isUsernameTaken(username, userId);
      console.log('Username check:', { username, isTaken });
      if (isTaken) {
        return sendError(res, statusCodes.CONFLICT, 'Username already exists');
      }
    }

    // Update user details
    console.log('Attempting to update user profile with data:', updateData);
    const updatedUser = await updateUserProfile(userId, updateData);

    if (!updatedUser) {
      console.log('Error: User not found when trying to update');
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    return sendSuccess(
      res,
      statusCodes.OK,
      'User details updated successfully',
      { user: formatUserResponse(updatedUser, true) }
    );
  } catch (error) {
    console.error('Error updating user details:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update user details',
      error
    );
  }
};

/**
 * Update user password
 * @route PUT /api/profile/password
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Current password and new password are required'
      );
    }

    const user = await findUserById(userId);

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendError(
        res,
        statusCodes.UNAUTHORIZED,
        'Current password is incorrect'
      );
    }

    // Validate new password
    if (newPassword.length < 6) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'New password must be at least 6 characters long'
      );
    }

    // Check if new password is the same as current
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'New password must be different from current password'
      );
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return sendSuccess(res, statusCodes.OK, 'Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update password',
      error
    );
  }
};

/**
 * Update profile picture
 * @route PUT /api/profile/picture
 */
const changeProfilePicture = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    // Check if a new profile image was uploaded
    if (!req.file) {
      return sendError(res, statusCodes.BAD_REQUEST, 'No image file uploaded');
    }

    // Update profile picture with Cloudinary path
    const imageUrl = req.file.path;
    user.image = imageUrl;
    await user.save();

    return sendSuccess(
      res,
      statusCodes.OK,
      'Profile picture updated successfully',
      { image: user.image }
    );
  } catch (error) {
    console.error('Error changing profile picture:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update profile picture',
      error
    );
  }
};

module.exports = {
  getUserProfile,
  updateUserDetails,
  updatePassword,
  changeProfilePicture,
};
