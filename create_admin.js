
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

async function createAdmin() {
  const admin = {
    email: 'niyomubenjamin@gmail.com',
    password: 'adminpassword', // Please change this
    firstName: 'Admin',
    lastName: 'User',
  };

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(admin.password, salt);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, status)
       VALUES ($1, $2, $3, $4, 'admin', true, 'active')
       ON CONFLICT (email) DO NOTHING
       RETURNING *`,
      [admin.email, hash, admin.firstName, admin.lastName]
    );

    if (res.rows.length > 0) {
      console.log('Admin user created successfully:');
      console.log(res.rows[0]);
    } else {
      console.log('Admin user with that email already exists.');
    }
  } finally {
    client.release();
    pool.end();
  }
}

createAdmin().catch(err => {
  console.error('Error creating admin user:', err);
});
