const request = require('supertest');
const app = require('../server');

describe('NexRide API Tests', () => {
    describe('GET /api/drivers', () => {
        it('should return a list of drivers', async () => {
            const res = await request(app).get('/api/drivers');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('GET /api/drivers/available', () => {
        it('should return available drivers', async () => {
            const res = await request(app).get('/api/drivers/available');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('Auth Endpoints', () => {
        it('should fail login with wrong credentials', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: 'wrong@example.com', password: 'wrong' });
            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBeFalsy();
        });
    });
});
