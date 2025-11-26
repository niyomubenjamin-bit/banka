
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

async function updateUser() {
    const email = 'niyomubenjamin@gmail.com';
    const newPassword = 'adminpassword';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    const client = await pool.connect();
    try {
        const res = await client.query(
            `UPDATE users 
       SET role = 'admin', password_hash = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, email, role, status`,
            [hash, email]
        );

        if (res.rows.length > 0) {
            console.log('User updated successfully:', res.rows[0]);
        } else {
            console.log('User not found to update.');
        }
    } catch (err) {
        console.error('Error updating user:', err);
    } finally {
        client.release();
        pool.end();
    }
}

updateUser();
