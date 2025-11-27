const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All user routes require authentication and either 'admin' or 'staff' role
router.use(authenticate, requireRole('admin', 'staff'));

router.get('/', userController.getAllUsers);
router.get('/:userId', userController.getUserById);

module.exports = router;
