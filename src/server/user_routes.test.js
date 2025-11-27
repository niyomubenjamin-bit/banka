const request = require('supertest');
const app = require('./app');
const { pool } = require('./config/db');
const jwt = require('jsonwebtoken');

describe('User Routes (Shared)', () => {
    let adminToken;
    let staffToken;
    let clientToken;
    let testUserId;

    beforeAll(async () => {
        // Create Admin
        const adminRes = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
       VALUES ('admin_shared_test@banka.com', 'hashedpassword', 'Admin', 'Shared', 'admin', 'active', true)
       RETURNING id`
        );
        const adminId = adminRes.rows[0].id;
        adminToken = jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET || 'test_secret');

        // Create Staff
        const staffRes = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
       VALUES ('staff_shared_test@banka.com', 'hashedpassword', 'Staff', 'Shared', 'staff', 'active', true)
       RETURNING id`
        );
        const staffId = staffRes.rows[0].id;
        staffToken = jwt.sign({ id: staffId, role: 'staff' }, process.env.JWT_SECRET || 'test_secret');

        // Create Client
        const clientRes = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
       VALUES ('client_shared_test@banka.com', 'hashedpassword', 'Client', 'Shared', 'client', 'active', true)
       RETURNING id`
        );
        testUserId = clientRes.rows[0].id;
        clientToken = jwt.sign({ id: testUserId, role: 'client' }, process.env.JWT_SECRET || 'test_secret');
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email LIKE '%_shared_test@banka.com'");
        await pool.end();
    });

    describe('GET /api/users', () => {
        it('should allow Admin to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('users');
            expect(Array.isArray(res.body.users)).toBe(true);
        });

        it('should allow Staff to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${staffToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('users');
        });

        it('should deny Client access', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${clientToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/users/:userId', () => {
        it('should allow Admin to get user details', async () => {
            const res = await request(app)
                .get(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.user).toHaveProperty('id', testUserId);
        });

        it('should allow Staff to get user details', async () => {
            const res = await request(app)
                .get(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${staffToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.user).toHaveProperty('id', testUserId);
        });

        it('should deny Client access', async () => {
            const res = await request(app)
                .get(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${clientToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });
});
