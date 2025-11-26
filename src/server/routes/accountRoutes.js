const express = require('express');
const router = express.Router();

const accountController = require('../controllers/accountController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All account routes require authentication
router.use(authenticate);

// Client features
router.post('/', accountController.createAccount); // create a bank account
router.get('/me', accountController.listAccountsForCurrentUser); // list accounts for logged-in client
router.get('/:accountId/statement.csv', accountController.downloadStatementCsv); // downloadable CSV statement for an account
router.get('/:accountId/transactions', accountController.getAccountTransactions); // transaction history
router.get('/:accountId/transactions/:transactionId', accountController.getTransactionById); // specific transaction

// Staff (cashier) features
router.post(
  '/:accountId/debit',
  requireRole('staff', 'admin'),
  accountController.debitAccount,
);
router.post(
  '/:accountId/credit',
  requireRole('staff', 'admin'),
  accountController.creditAccount,
);

// Admin & staff shared
router.get('/', requireRole('staff', 'admin'), accountController.getAllAccounts); // all user accounts
router.get('/:accountId', requireRole('staff', 'admin'), accountController.getAccountById); // specific user account

module.exports = router;
