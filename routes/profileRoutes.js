const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');
const {
  validate,
  profileValidation,
} = require('../middleware/validationMiddleware');
const { upload } = require('../middleware/image.config');

// Get user profile - protected route
router.get('/', protect, profileController.getUserProfile);

// Update user details - protected route with validation
router.put(
  '/',
  protect,
  validate(profileValidation.updateDetails),
  profileController.updateUserDetails
);

// Update user password - protected route with validation
router.put(
  '/password',
  protect,
  validate(profileValidation.updatePassword),
  profileController.updatePassword
);

// Update profile picture - protected route
router.put(
  '/picture',
  protect,
  upload.single('profileImage'),
  profileController.changeProfilePicture
);

module.exports = router;
