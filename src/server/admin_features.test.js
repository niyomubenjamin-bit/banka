const request = require('supertest');
const app = require('./app');
const { pool } = require('./config/db');
const jwt = require('jsonwebtoken');

describe('Admin Features', () => {
    let adminToken;
    let adminUserId;

    beforeAll(async () => {
        // Create Admin User
        const adminRes = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
       VALUES ('admin_feat_test@banka.com', 'hashedpassword', 'Admin', 'Test', 'admin', 'active', true)
       RETURNING id, email, role`
        );
        adminUserId = adminRes.rows[0].id;

        // Generate Admin Token
        adminToken = jwt.sign(
            { id: adminUserId, email: 'admin_feat_test@banka.com', role: 'admin' },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email = 'admin_feat_test@banka.com'");
        await pool.end();
    });

    describe('GET /api/admin/dashboard/summary', () => {
        it('should accept date filters', async () => {
            const res = await request(app)
                .get('/api/admin/dashboard/summary?startDate=2023-01-01&endDate=2023-12-31')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('transactions');
            expect(res.body.transactions.filters).toEqual({
                startDate: '2023-01-01',
                endDate: '2023-12-31'
            });
        });
    });
});
