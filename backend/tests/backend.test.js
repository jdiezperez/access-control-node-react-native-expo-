// tests/backend.test.js
const request = require('supertest');
const { app } = require('../app');
const { EventGuest, Event } = require('../db');

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

describe('EventGuest model', () => {
  it('should expose date-based status fields without boolean status columns', async () => {
    const attributes = Object.keys(EventGuest.rawAttributes);
    expect(attributes).toContain('invited_date');
    expect(attributes).toContain('accepted_date');
    expect(attributes).toContain('attended_date');
    expect(attributes).not.toContain('invited');
    expect(attributes).not.toContain('accepted');
    expect(attributes).not.toContain('attended');
  });
});

describe('Event model', () => {
  it('should expose start and end date fields for events', async () => {
    const attributes = Object.keys(Event.rawAttributes);
    expect(attributes).toContain('date_start');
    expect(attributes).toContain('date_end');
    expect(attributes).not.toContain('date');
  });
});
