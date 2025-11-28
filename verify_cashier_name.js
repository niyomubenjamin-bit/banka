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
        const loginData = await loginRes.json();

        if (loginRes.status !== 202) {
            console.error('Login failed or did not require OTP:', loginData);
            return;
        }
        console.log('OTP sent.');

        // 2. Get OTP from DB
        console.log('Fetching OTP from DB...');
        const { rows: otpRows } = await pool.query(
            `SELECT code FROM otps 
       JOIN users ON otps.user_id = users.id 
       WHERE users.email = 'staff@example.com' 
       ORDER BY otps.created_at DESC LIMIT 1`
        );
        const otp = otpRows[0].code;
        console.log('OTP:', otp);

        // 3. Verify OTP
        console.log('Verifying OTP...');
        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'staff@example.com', otp }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
            console.error('OTP verification failed:', verifyData);
            return;
        }
        const token = verifyData.token;
        console.log('Logged in. Token obtained.');

        // 4. Get a client account
        console.log('Fetching a client account...');
        const { rows: accountRows } = await pool.query(
            `SELECT accounts.id FROM accounts 
       JOIN users ON accounts.owner_id = users.id 
       WHERE users.role = 'client' LIMIT 1`
        );

        if (accountRows.length === 0) {
            console.error('No client accounts found.');
            return;
        }
        const accountId = accountRows[0].id;
        console.log('Target Account ID:', accountId);

        // 4.5 Credit account to ensure funds
        console.log('Crediting account...');
        const creditRes = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/credit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount: 1000, description: 'Test credit for cashier name' }),
        });

        if (!creditRes.ok) {
            const err = await creditRes.json();
            console.error('Credit failed:', err);
            return;
        }
        console.log('Credit successful.');

        // 5. Debit account to create a transaction with cashier_id
        console.log('Creating a debit transaction...');
        const debitRes = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/debit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount: 100, description: 'Test debit for cashier name' }),
        });

        if (!debitRes.ok) {
            const err = await debitRes.json();
            console.error('Debit failed:', err);
            return;
        }
        console.log('Debit successful.');

        // 6. Fetch transactions and check for cashier name
        console.log('Fetching transactions...');
        const txRes = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (txRes.ok) {
            const txData = await txRes.json();
            console.log('SUCCESS: Transactions fetched successfully.');
            const latestTx = txData.transactions[0];
            console.log('Latest Transaction:', {
                id: latestTx.id,
                type: latestTx.type,
                amount: latestTx.amount,
                cashier_id: latestTx.cashier_id,
                cashier_first_name: latestTx.cashier_first_name,
                cashier_last_name: latestTx.cashier_last_name
            });

            if (latestTx.cashier_first_name && latestTx.cashier_last_name) {
                console.log('VERIFICATION PASSED: Cashier name is present.');
            } else {
                console.error('VERIFICATION FAILED: Cashier name is missing.');
            }

        } else {
            const errData = await txRes.json();
            console.error('FAILURE: Could not fetch transactions.');
            console.error('Status:', txRes.status);
            console.error('Message:', errData.message);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
