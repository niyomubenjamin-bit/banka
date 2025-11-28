require('dotenv').config();
const { pool } = require('../src/server/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Add settings column to users table...');

        await client.query('BEGIN');

        // Add settings column if it doesn't exist
        // Default to empty object {}
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
    `);

        console.log('Successfully added settings column.');

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
