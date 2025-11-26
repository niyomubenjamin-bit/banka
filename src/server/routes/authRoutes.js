const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/signup', authController.signup); // register client user and send OTP email
router.post('/verify-otp', authController.verifyEmailOtp); // verify signup OTP
router.post('/login', authController.login); // verified users only
router.post('/verify-login-otp', authController.verifyLoginOtp); // verify OTP for login MFA
router.post('/forgot-password', authController.forgotPasswordRequest); // send OTP for password reset
router.post('/reset-password', authController.resetPasswordWithOtp); // reset password using OTP

// Profile & security center (authenticated)
router.get('/me', authenticate, authController.getCurrentUserProfile);
router.patch('/me', authenticate, authController.updateCurrentUserProfile);
router.post('/me/change-password', authenticate, authController.changePasswordAuthenticated);
router.get('/me/login-activity', authenticate, authController.getLoginActivity);

// Admin creates staff/admin accounts
router.post(
  '/admin/users',
  authenticate,
  requireRole('admin'),
  authController.createUserByAdmin,
);

module.exports = router;
