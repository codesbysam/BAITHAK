const request = require('supertest');
const app = require('../src/app');

describe('ICE Servers API (GET /api/v1/ice-servers)', () => {
  it('should return ice servers array including STUN and TURN', async () => {
    const res = await request(app).get('/api/v1/ice-servers');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('iceServers');
    expect(Array.isArray(res.body.iceServers)).toBe(true);
    expect(res.body.iceServers.length).toBeGreaterThanOrEqual(1);
  });
});
