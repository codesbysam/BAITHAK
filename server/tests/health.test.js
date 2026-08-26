const request = require('supertest');
const app = require('../src/app');

describe('Health Check API', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
