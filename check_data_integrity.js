require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:banka@localhost:5432/banka_db',
});

async function run() {
    try {
        const { rows: accounts } = await pool.query('SELECT id, account_number, balance FROM accounts');

        console.log(`Checking ${accounts.length} accounts...`);

        for (const account of accounts) {
            const { rows: transactions } = await pool.query(
                'SELECT new_balance, created_at FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1',
                [account.id]
            );

            if (transactions.length > 0) {
                const latestTx = transactions[0];
                const accountBalance = Number(account.balance);
                const txBalance = Number(latestTx.new_balance);

                if (Math.abs(accountBalance - txBalance) > 0.01) {
                    console.error(`MISMATCH FOUND for Account ${account.account_number} (ID: ${account.id})`);
                    console.error(`  Account Balance: ${accountBalance}`);
                    console.error(`  Latest Tx Balance: ${txBalance}`);
                    console.error(`  Difference: ${accountBalance - txBalance}`);
                }
            }
        }
        console.log('Check complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
