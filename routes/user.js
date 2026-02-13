const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserHours,
  resendRegistrationEmail,
} = require('../controllers/user');

const User = require('../models/User');
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protect to all routes
router.use(protect);

// Only apply authorize('admin') to routes that need it
router
  .route('/')
  .get(authorize('admin'), advancedResults(User), getUsers)
  .post(authorize('admin'), createUser);

router
  .route('/:id/resend-email')
  .post(authorize('admin'), resendRegistrationEmail);


module.exports = router;