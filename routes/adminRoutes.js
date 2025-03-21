const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');
const {
  validate,
  adminValidation,
} = require('../middleware/validationMiddleware');

// Apply both auth middleware and admin middleware to all routes
router.use(protect);
router.use(adminOnly);

// Admin routes for user management with validation
router.get(
  '/users',
  validate(adminValidation.pagination, 'query'),
  adminController.getAllUsers
);

router.get(
  '/users/:id',
  validate(adminValidation.userIdParam, 'params'),
  adminController.getUserById
);

router.put(
  '/users/:id/role',
  validate(adminValidation.userIdParam, 'params'),
  validate(adminValidation.updateUserRole),
  adminController.updateUserRole
);

router.delete(
  '/users/:id',
  validate(adminValidation.userIdParam, 'params'),
  adminController.deleteUser
);

// Admin routes for statistics
router.get('/stats', adminController.getUserStats);

module.exports = router;
