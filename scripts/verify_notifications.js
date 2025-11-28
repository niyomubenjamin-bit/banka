require('dotenv').config();
delete process.env.EMAIL_USER;
delete process.env.EMAIL_PASS;
const { pool, query } = require('../src/server/config/db');
const accountController = require('../src/server/controllers/accountController');
const authController = require('../src/server/controllers/authController');

// Mock request/response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verify() {
    try {
        console.log('Starting verification...');

        // 1. Create a test user
        const email = `test_notify_${Date.now()}@example.com`;
        const reqSignup = {
            body: {
                firstName: 'Test',
                lastName: 'Notify',
                email,
                password: 'password123',
                accountType: 'savings'
            }
        };
        const resSignup = mockRes();
        await authController.signup(reqSignup, resSignup);

        if (resSignup.statusCode !== 201) {
            throw new Error(`Signup failed: ${JSON.stringify(resSignup.data)}`);
        }
        console.log('User created:', email);

        // Get user ID
        const { rows: userRows } = await query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRows[0].id;

        // 2. Update settings (enable alerts)
        const reqUpdate = {
            user: { id: userId },
            body: {
                settings: {
                    alert_transaction: true,
                    alert_low_balance: true
                }
            }
        };
        const resUpdate = mockRes();
        await authController.updateCurrentUserProfile(reqUpdate, resUpdate);

        if (resUpdate.statusCode !== 200) {
            throw new Error(`Update settings failed: ${JSON.stringify(resUpdate.data)}`);
        }
        console.log('Settings updated:', resUpdate.data.user.settings);

        // 3. Get account ID
        const { rows: accRows } = await query('SELECT id FROM accounts WHERE owner_id = $1', [userId]);
        const accountId = accRows[0].id;

        // 4. Credit account (should trigger transaction alert)
        console.log('Crediting account...');
        const reqCredit = {
            user: { id: userId }, // Mock auth user
            params: { accountId },
            body: { amount: 10000, description: 'Test Credit' }
        };
        const resCredit = mockRes();
        await accountController.creditAccount(reqCredit, resCredit);
        console.log('Credit response:', resCredit.statusCode);

        // Wait a bit for async alert
        await new Promise(r => setTimeout(r, 1000));

        // 5. Debit account to low balance (should trigger transaction AND low balance alert)
        console.log('Debiting account to low balance...');
        const reqDebit = {
            user: { id: userId },
            params: { accountId },
            body: { amount: 6000, description: 'Test Debit' } // Balance 10000 -> 4000
        };
        const resDebit = mockRes();
        await accountController.debitAccount(reqDebit, resDebit);
        console.log('Debit response:', resDebit.statusCode);

        // Wait a bit for async alert
        await new Promise(r => setTimeout(r, 1000));

        console.log('Verification complete. Check logs for [DEV EMAIL].');

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        pool.end();
    }
}

verify();
