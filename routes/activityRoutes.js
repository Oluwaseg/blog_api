const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

// All routes require authentication
router.use(protect);

// Get user activities
router.get('/', activityController.getUserActivities);

// Mark activities as read
router.put('/read', activityController.markActivitiesAsRead);

module.exports = router;
