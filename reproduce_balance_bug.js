require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:banka@localhost:5432/banka_db',
});

const API_BASE_URL = 'http://localhost:3000';

async function run() {
    try {
        // 1. Login as Staff
        console.log('Logging in as staff...');
        const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'staff@example.com', password: 'password123' }),
        });

        if (loginRes.status !== 202) {
            console.error('Login failed or did not require OTP');
            return;
        }

        // 2. Get OTP
        const { rows: otpRows } = await pool.query(
            `SELECT code FROM otps 
       JOIN users ON otps.user_id = users.id 
       WHERE users.email = 'staff@example.com' 
       ORDER BY otps.created_at DESC LIMIT 1`
        );
        const otp = otpRows[0].code;

        // 3. Verify OTP
        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'staff@example.com', otp }),
        });
        const verifyData = await verifyRes.json();
        const token = verifyData.token;

        // 4. Get a client account
        const { rows: accountRows } = await pool.query(
            `SELECT accounts.id, accounts.balance FROM accounts 
       JOIN users ON accounts.owner_id = users.id 
       WHERE users.role = 'client' LIMIT 1`
        );
        const accountId = accountRows[0].id;
        const initialBalance = Number(accountRows[0].balance);
        console.log(`Initial Balance: ${initialBalance}`);

        // 5. Credit account
        const creditAmount = 100;
        console.log(`Crediting account with ${creditAmount}...`);
        const creditRes = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/credit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount: creditAmount, description: 'Test credit for balance check' }),
        });
        const creditData = await creditRes.json();

        console.log('Credit Response Account Balance:', creditData.account.balance);
        console.log('Credit Response Transaction New Balance:', creditData.transaction.new_balance);

        // 6. Verify consistency
        if (Number(creditData.account.balance) !== Number(creditData.transaction.new_balance)) {
            console.error('MISMATCH DETECTED!');
            console.error(`Account Balance: ${creditData.account.balance}`);
            console.error(`Transaction New Balance: ${creditData.transaction.new_balance}`);
        } else {
            console.log('Balances match.');
        }

        // 7. Check if it was string concatenation
        if (creditData.account.balance == `${initialBalance}${creditAmount}`) {
            console.error('DETECTED STRING CONCATENATION BUG!');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
