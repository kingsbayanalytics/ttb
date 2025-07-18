import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestApp } from './test-setup';
import { User } from '../models';

describe('Auth API', () => {
  const app = setupTestApp();

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/type-the-bible-test');
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/users', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('testuser');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login a user', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
    });
  });
});