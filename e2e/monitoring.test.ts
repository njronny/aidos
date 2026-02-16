import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Monitoring Routes', () => {
  let token: string;

  beforeAll(async () => {
    // Login first
    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'aidos123' });
    token = loginRes.body.data.token;
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return system metrics', async () => {
      const res = await request(API_URL)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('memory');
      expect(res.body.data).toHaveProperty('cpu');
      expect(res.body.data).toHaveProperty('uptime');
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const res = await request(API_URL).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status with checks', async () => {
      const res = await request(API_URL).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
    });
  });
});

describe('API Users Routes', () => {
  let token: string;

  beforeAll(async () => {
    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'aidos123' });
    token = loginRes.body.data.token;
  });

  describe('GET /api/users/me', () => {
    it('should return current user info', async () => {
      const res = await request(API_URL)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data).toHaveProperty('role');
    });

    it('should reject without token', async () => {
      const res = await request(API_URL).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return user list for admin', async () => {
      const res = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});

describe('Rate Limiting', () => {
  it('should rate limit excessive requests', async () => {
    // Make many requests quickly
    const promises = [];
    for (let i = 0; i < 110; i++) {
      promises.push(
        request(API_URL)
          .get('/health')
      );
    }
    
    const results = await Promise.all(promises);
    const statusCodes = results.map(r => r.status);
    
    // Should get at least some 429 responses
    expect(statusCodes.includes(429)).toBe(true);
  }, 30000);
});
