const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  resendVerification,
  updateDetails,
  updatePassword,
forgotPassword,
resetPassword ,
registerAdmin
} = require('../controllers/auth');

const router = express.Router();

const { protect, authorize, requireVerifiedEmail } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post("/register-admin", registerAdmin);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/updatedetails', protect, requireVerifiedEmail, updateDetails);
router.put('/updatepassword', protect, requireVerifiedEmail, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);


module.exports = router;