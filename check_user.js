
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

async function checkUser() {
    const email = 'niyomubenjamin@gmail.com';
    const client = await pool.connect();
    try {
        const res = await client.query(
            `SELECT id, email, role, status, email_verified, password_hash FROM users WHERE email = $1`,
            [email]
        );

        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User not found.');
        }
    } catch (err) {
        console.error('Error querying user:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkUser();
