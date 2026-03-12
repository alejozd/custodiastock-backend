import request from 'supertest';
import app from '../app.js';

describe('Health and Root endpoints', () => {
  it('should return 200 for the root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Custodia API running');
  });

  it('should return 200 for the health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.statusCode).toEqual(404);
  });
});
