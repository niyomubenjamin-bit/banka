const request = require('supertest');
const app = require('../app');
const { query, pool } = require('../config/db');
const { signToken } = require('../utils/jwt');

describe('Admin User Creation', () => {
  let adminToken;

  beforeAll(async () => {
    // Create a temporary admin user for testing
    const passwordHash = await require('../utils/password').hashPassword('password123');
    await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, status)
       VALUES ('testadmin@banka.com', $1, 'Test', 'Admin', 'admin', TRUE, 'active')`,
      [passwordHash],
    );
    const { rows } = await query("SELECT id, role FROM users WHERE email = 'testadmin@banka.com'");
    adminToken = signToken({ id: rows[0].id, role: rows[0].role });
  });

  afterAll(async () => {
    // Clean up the temporary admin user
    await query("DELETE FROM users WHERE email = 'testadmin@banka.com'");
    await query("DELETE FROM users WHERE email = 'newstaff@banka.com'");
    pool.end();
  });

  it('should allow an admin to create a new staff user', async () => {
    const response = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newstaff@banka.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'Staff',
        role: 'staff',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('newstaff@banka.com');
    expect(response.body.user.role).toBe('staff');
  });
});
