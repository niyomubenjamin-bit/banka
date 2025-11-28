const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createStaffUser() {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const email = 'staff@example.com';

        // Check if user exists
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length > 0) {
            console.log('Staff user already exists');
        } else {
            // Create user
            const res = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
           VALUES ($1, $2, 'Test', 'Staff', 'staff', 'active', true)
           RETURNING id`,
                [email, hashedPassword]
            );
            console.log('Staff user created:', res.rows[0].id);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

createStaffUser();
