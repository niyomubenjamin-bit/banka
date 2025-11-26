const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createTestUser() {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const email = 'client@example.com';

        // Check if user exists
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        let userId;

        if (rows.length > 0) {
            console.log('User already exists');
            userId = rows[0].id;
        } else {
            // Create user
            const res = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
           VALUES ($1, $2, 'Test', 'Client', 'client', 'active', true)
           RETURNING id`,
                [email, hashedPassword]
            );
            console.log('User created:', res.rows[0].id);
            userId = res.rows[0].id;
        }

        // Check for account
        const { rows: accRows } = await client.query('SELECT * FROM accounts WHERE owner_id = $1', [userId]);
        let accId;

        if (accRows.length === 0) {
            const accRes = await client.query(
                `INSERT INTO accounts (account_number, owner_id, type, balance, status)
             VALUES ('1234567890', $1, 'savings', 5000.00, 'active')
             RETURNING id`,
                [userId]
            );
            console.log('Account created');
            accId = accRes.rows[0].id;
        } else {
            accId = accRows[0].id;
        }

        // Check for transactions
        const { rows: txRows } = await client.query('SELECT * FROM transactions WHERE account_id = $1', [accId]);
        if (txRows.length === 0) {
            await client.query(
                `INSERT INTO transactions (account_id, type, amount, old_balance, new_balance, description)
             VALUES ($1, 'credit', 1000, 4000, 5000, 'Salary Deposit'),
                    ($1, 'debit', 200, 5000, 4800, 'Grocery Shopping')`,
                [accId]
            );
            console.log('Transactions created');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

createTestUser();
