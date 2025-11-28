const { query, pool } = require('../config/db');

function requireAuthUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return req.user;
}

function generateAccountNumber() {
  // Simple 10-digit numeric account number
  const min = 10_000_000_000;
  const max = 99_999_999_999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function _createAccountInternal(ownerId, type = 'savings', initialDeposit = 0) {
  const normalizedType = String(type || 'savings').toLowerCase();
  if (!['savings', 'current'].includes(normalizedType)) {
    throw new Error("Invalid account type. Expected 'savings' or 'current'");
  }

  const amount = Number(initialDeposit) || 0;
  if (amount < 0) {
    throw new Error('initialDeposit must be a non-negative number');
  }

  let accountRow;

  // Try a few times in case of rare account_number collision
  for (let i = 0; i < 5; i += 1) {
    const accountNumber = generateAccountNumber();
    try {
      const { rows } = await query(
        `INSERT INTO accounts (account_number, owner_id, type, balance)
         VALUES ($1, $2, $3, $4)
         RETURNING id, account_number, owner_id, type, status, balance, created_at, updated_at`,
        [accountNumber, ownerId, normalizedType, amount],
      );
      accountRow = rows[0];
      break;
    } catch (err) {
      if (err.code === '23505') {
        // unique_violation on account_number, retry
        continue;
      }
      throw err;
    }
  }

  if (!accountRow) {
    throw new Error('Could not create account after multiple attempts');
  }

  return accountRow;
}

async function createAccount(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  try {
    const { type = 'savings', initialDeposit = 0 } = req.body || {};
    const account = await _createAccountInternal(user.id, type, initialDeposit);
    return res.status(201).json({ account });
  } catch (err) {
    console.error('Error in createAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listAccountsForCurrentUser(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  try {
    const { rows } = await query(
      `SELECT id, account_number, owner_id, type, status, balance, created_at, updated_at
       FROM accounts
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [user.id],
    );

    return res.status(200).json({ accounts: rows });
  } catch (err) {
    console.error('Error in listAccountsForCurrentUser handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getAccountTransactions(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  try {
    const { accountId } = req.params;

    const { rows: accountRows } = await query(
      'SELECT id, owner_id FROM accounts WHERE id = $1',
      [accountId],
    );

    if (accountRows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountRows[0];

    // Allow owner, staff, or admin to view transactions
    if (account.owner_id !== user.id && !['staff', 'admin'].includes(user.role)) {
      return res.status(403).json({
        message: 'You are not allowed to view transactions for this account',
      });
    }

    const { rows } = await query(
      `SELECT t.id, t.account_id, t.type, t.amount, t.cashier_id, t.old_balance, t.new_balance, t.description, t.created_at,
              u.first_name as cashier_first_name, u.last_name as cashier_last_name
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.id
       WHERE t.account_id = $1
       ORDER BY t.created_at DESC`,
      [accountId],
    );

    return res.status(200).json({ transactions: rows });
  } catch (err) {
    console.error('Error in getAccountTransactions handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getTransactionById(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  try {
    const { accountId, transactionId } = req.params;

    const { rows: accountRows } = await query(
      'SELECT id, owner_id FROM accounts WHERE id = $1',
      [accountId],
    );

    if (accountRows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.owner_id !== user.id) {
      return res.status(403).json({
        message: 'You are not allowed to view this transaction',
      });
    }

    const { rows } = await query(
      `SELECT id, account_id, type, amount, cashier_id, old_balance, new_balance, description, created_at
       FROM transactions
       WHERE id = $1 AND account_id = $2`,
      [transactionId, accountId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.status(200).json({ transaction: rows[0] });
  } catch (err) {
    console.error('Error in getTransactionById handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function downloadStatementCsv(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  try {
    const { accountId } = req.params;

    const { rows: accountRows } = await query(
      'SELECT id, owner_id, account_number FROM accounts WHERE id = $1',
      [accountId],
    );

    if (accountRows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.owner_id !== user.id) {
      return res.status(403).json({
        message: 'You are not allowed to download a statement for this account',
      });
    }

    const { rows: txRows } = await query(
      `SELECT id, account_id, type, amount, cashier_id, old_balance, new_balance, description, created_at
       FROM transactions
       WHERE account_id = $1
       ORDER BY created_at ASC`,
      [accountId],
    );

    const header = [
      'transaction_id',
      'account_id',
      'type',
      'amount',
      'cashier_id',
      'old_balance',
      'new_balance',
      'description',
      'created_at',
    ];

    const lines = [header.join(',')];

    for (const tx of txRows) {
      const cols = [
        tx.id,
        tx.account_id,
        tx.type,
        tx.amount,
        tx.cashier_id || '',
        tx.old_balance,
        tx.new_balance,
        tx.description ? `"${String(tx.description).replace(/"/g, '""')}"` : '',
        tx.created_at.toISOString(),
      ];
      lines.push(cols.join(','));
    }

    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="account_${account.account_number}_statement.csv"`,
    );

    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error in downloadStatementCsv handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function debitAccount(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  const { accountId } = req.params;
  const { amount, description } = req.body || {};

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({
      message: 'amount must be a positive number',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: accountRows } = await client.query(
      'SELECT id, owner_id, status, balance FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId],
    );

    if (accountRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Account is not active' });
    }

    const oldBalance = Number(account.balance);
    const newBalance = oldBalance - value;

    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, accountId],
    );

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions (account_id, type, amount, cashier_id, old_balance, new_balance, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, account_id, type, amount, cashier_id, old_balance, new_balance, description, created_at`,
      [accountId, 'debit', value, user.id, oldBalance, newBalance, description || null],
    );

    await client.query('COMMIT');

    return res.status(200).json({
      account: { ...account, balance: newBalance },
      transaction: txRows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in debitAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function creditAccount(req, res) {
  const user = requireAuthUser(req, res);
  if (!user) return;

  const { accountId } = req.params;
  const { amount, description } = req.body || {};

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({
      message: 'amount must be a positive number',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: accountRows } = await client.query(
      'SELECT id, owner_id, status, balance FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId],
    );

    if (accountRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Account is not active' });
    }

    const oldBalance = Number(account.balance);
    const newBalance = oldBalance + value;

    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, accountId],
    );

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions (account_id, type, amount, cashier_id, old_balance, new_balance, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, account_id, type, amount, cashier_id, old_balance, new_balance, description, created_at`,
      [accountId, 'credit', value, user.id, oldBalance, newBalance, description || null],
    );

    await client.query('COMMIT');

    return res.status(200).json({
      account: { ...account, balance: newBalance },
      transaction: txRows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in creditAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function getAllAccounts(req, res) {
  try {
    const { rows } = await query(
      `SELECT
         a.id,
         a.account_number,
         a.owner_id,
         a.type,
         a.status,
         a.balance,
         a.created_at,
         a.updated_at,
         u.email AS owner_email,
         u.first_name AS owner_first_name,
         u.last_name AS owner_last_name
       FROM accounts a
       JOIN users u ON a.owner_id = u.id
       ORDER BY a.created_at DESC`,
    );

    return res.status(200).json({ accounts: rows });
  } catch (err) {
    console.error('Error in getAllAccounts handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getAccountById(req, res) {
  try {
    const { accountId } = req.params;

    const { rows } = await query(
      `SELECT
         a.id,
         a.account_number,
         a.owner_id,
         a.type,
         a.status,
         a.balance,
         a.created_at,
         a.updated_at,
         u.email AS owner_email,
         u.first_name AS owner_first_name,
         u.last_name AS owner_last_name
       FROM accounts a
       JOIN users u ON a.owner_id = u.id
       WHERE a.id = $1`,
      [accountId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ account: rows[0] });
  } catch (err) {
    console.error('Error in getAccountById handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createAccount,
  listAccountsForCurrentUser,
  getAccountTransactions,
  getTransactionById,
  downloadStatementCsv,
  debitAccount,
  creditAccount,
  getAllAccounts,
  getAccountById,
  _createAccountInternal,
};
