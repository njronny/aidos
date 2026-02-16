import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Auth Routes', () => {
  let token: string;

  describe('POST /api/auth/login', () => {
    it('should reject empty credentials', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid credentials', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should reject without token', async () => {
      const res = await request(API_URL).get('/api/auth/verify');
      expect(res.status).toBe(401);
    });

    it('should accept valid token', async () => {
      // Login first
      const loginRes = await request(API_URL)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'aidos123' });
      
      token = loginRes.body.data.token;
      
      const verifyRes = await request(API_URL)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);
      
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.valid).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token', async () => {
      const res = await request(API_URL)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.expiresIn).toBeDefined();
    });
  });
});

describe('API Projects Routes', () => {
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    // Login
    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'aidos123' });
    token = loginRes.body.data.token;
  });

  describe('GET /api/projects', () => {
    it('should list projects with pagination', async () => {
      const res = await request(API_URL)
        .get('/api/projects?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter projects by status', async () => {
      const res = await request(API_URL)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        res.body.data.forEach((p: any) => {
          expect(p.status).toBe('active');
        });
      }
    });

    it('should search projects', async () => {
      const res = await request(API_URL)
        .get('/api/projects?search=test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a project', async () => {
      const res = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project', description: 'Test description' });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      projectId = res.body.data.id;
    });

    it('should reject project without name', async () => {
      const res = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get a project', async () => {
      const res = await request(API_URL)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(API_URL)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
    });
  });

  afterAll(async () => {
    // Cleanup - delete test project
    if (projectId) {
      await request(API_URL)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);
    }
  });
});
