
    const request = require('supertest');
    const app = require('../app');
    const { pool } = require('../config/db');
    
    describe('Admin Login', () => {
      it('should allow an admin to log in with correct credentials', async () => {
        const response = await request(app)
          .post('/api/auth/signin')
          .send({
            email: 'admin@banka.com',
            password: 'password123',
          });
    
        expect(response.status).toBe(200);
        expect(response.body.data.user.role).toBe('admin');
      });
    });
    