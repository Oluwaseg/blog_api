const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const socialController = require('../controllers/socialController');

// All routes require authentication
router.use(protect);

// Follow/unfollow routes
router.post('/follow/:userId', socialController.followUser);
router.post('/unfollow/:userId', socialController.unfollowUser);

// Get followers and following users
router.get('/followers', socialController.getFollowers);
router.get('/following', socialController.getFollowing);
router.get('/is-following/:userId', socialController.checkFollowingStatus);

// Get current user's blogs
router.get('/user/blogs', socialController.getUserBlogs);

// Get suggested users to follow
router.get('/suggestions', socialController.getSuggestedUsers);

// Search for users
router.get('/search', socialController.searchUsers);

module.exports = router;
