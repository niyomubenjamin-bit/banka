const { query } = require('../config/db');

async function activateAccount(req, res) {
  try {
    const { accountId } = req.params;

    const { rowCount } = await query(
      `UPDATE accounts
       SET status = 'active', updated_at = NOW()
       WHERE id = $1`,
      [accountId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ message: 'Account activated successfully' });
  } catch (err) {
    console.error('Error in activateAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deactivateAccount(req, res) {
  try {
    const { accountId } = req.params;

    const { rowCount } = await query(
      `UPDATE accounts
       SET status = 'dormant', updated_at = NOW()
       WHERE id = $1`,
      [accountId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (err) {
    console.error('Error in deactivateAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteAccount(req, res) {
  try {
    const { accountId } = req.params;

    const { rowCount } = await query('DELETE FROM accounts WHERE id = $1', [
      accountId,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error in deleteAccount handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function activateUser(req, res) {
  try {
    const { userId } = req.params;

    const { rowCount } = await query(
      `UPDATE users
       SET status = 'active', updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User activated successfully' });
  } catch (err) {
    console.error('Error in activateUser handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deactivateUser(req, res) {
  try {
    const { userId } = req.params;

    const { rowCount } = await query(
      `UPDATE users
       SET status = 'inactive', updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Error in deactivateUser handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyUser(req, res) {
  try {
    const { userId } = req.params;

    const { rowCount } = await query(
      `UPDATE users
       SET email_verified = true, updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User verified successfully' });
  } catch (err) {
    console.error('Error in verifyUser handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const { userId } = req.params;

    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [
      userId,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error in deleteUser handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDashboardSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Account counts (not date-filtered)
    const { rows: accountRows } = await query(
      `SELECT
         COUNT(*) AS total_accounts,
         COUNT(*) FILTER (WHERE status = 'active') AS active_accounts,
         COUNT(*) FILTER (WHERE status = 'dormant') AS dormant_accounts
       FROM accounts`,
    );

    const accountStats = accountRows[0] || {
      total_accounts: 0,
      active_accounts: 0,
      dormant_accounts: 0,
    };

    // Transaction aggregates, optionally date-filtered
    const txConditions = [];
    const params = [];
    let idx = 1;

    if (startDate) {
      txConditions.push(`created_at >= $${idx}`);
      params.push(startDate);
      idx += 1;
    }

    if (endDate) {
      txConditions.push(`created_at <= $${idx}`);
      params.push(endDate);
      idx += 1;
    }

    const whereClause = txConditions.length
      ? `WHERE ${txConditions.join(' AND ')}`
      : '';

    const txSql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount END), 0) AS total_credited,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount END), 0) AS total_debited
      FROM transactions
      ${whereClause}
    `;

    const { rows: txRows } = await query(txSql, params);

    const txStats = txRows[0] || {
      total_credited: 0,
      total_debited: 0,
    };

    return res.status(200).json({
      accounts: {
        total: Number(accountStats.total_accounts) || 0,
        active: Number(accountStats.active_accounts) || 0,
        dormant: Number(accountStats.dormant_accounts) || 0,
      },
      transactions: {
        totalCredited: Number(txStats.total_credited) || 0,
        totalDebited: Number(txStats.total_debited) || 0,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (err) {
    console.error('Error in getDashboardSummary handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}




module.exports = {
  activateAccount,
  deactivateAccount,
  deleteAccount,
  activateUser,
  deactivateUser,
  deleteUser,
  verifyUser,
  getDashboardSummary,
};
