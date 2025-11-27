const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { createUserByAdmin } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All admin routes require an authenticated admin user
router.use(authenticate, requireRole('admin'));

// Account lifecycle
router.patch('/accounts/:accountId/activate', adminController.activateAccount);
router.patch('/accounts/:accountId/deactivate', adminController.deactivateAccount);
router.delete('/accounts/:accountId', adminController.deleteAccount);

// User lifecycle
router.post('/users', createUserByAdmin);
// router.get('/users', adminController.getAllUsers); // Moved to userRoutes
// router.get('/users/:userId', adminController.getUserById); // Moved to userRoutes
router.patch('/users/:userId/activate', adminController.activateUser);
router.patch('/users/:userId/deactivate', adminController.deactivateUser);
router.patch('/users/:userId/verify', adminController.verifyUser);
router.delete('/users/:userId', adminController.deleteUser);

// Dashboard stats (date-range based)
router.get('/dashboard/summary', adminController.getDashboardSummary);

module.exports = router;
