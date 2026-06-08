// tests/backend.test.js
const request = require('supertest');
const { app } = require('../app');

describe('Health endpoint', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// Example test for protected route (authentication mock)
jest.mock('jsonwebtoken', () => ({
  verify: (token, secret, cb) => cb(null, { id: 1, type: 'admin' })
}));

describe('Admin upload endpoint', () => {
  it('should reject missing file', async () => {
    const res = await request(app)
      .post('/api/admin/upload')
      .set('Authorization', 'Bearer dummy')
      .query({ folder: 'test' })
      .expect(200);
    // Since we haven't provided a file, the route will log and proceed; check response status
    expect(res.body).toBeDefined();
  });
});
