import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestApp } from './test-setup';
import { User, Verse, Progress } from '../models';

describe('Progress API', () => {
  const app = setupTestApp();
  let token: string;
  let userId: string;
  let verseId: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await Verse.deleteMany({});
    await Progress.deleteMany({});

    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    userId = user._id.toString();

    const verse = await Verse.create({
      verseOrder: Math.floor(Math.random() * 1000000),
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
      characters: 56,
      words: 12
    });
    verseId = verse._id.toString();

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    token = loginRes.body.data.token;
  });

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/type-the-bible-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Progress API', () => {
    it('should submit a typing test result and retrieve progress', async () => {
      // Submit a typing test result
      const res = await request(app)
        .post(`/api/progress/result/${verseId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          user: userId,
          verseId: verseId,
          verseOrder: 1,
          startTime: new Date(),
          endTime: new Date(),
          duration: 60000,
          wpm: 50,
          cps: 5,
          accuracy: 95,
          incorrectCharacters: 5,
          totalCharacters: 300
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.progress.bestWPM).toBe(50);

      // Get user progress
      const progressRes = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(progressRes.body.success).toBe(true);
      expect(progressRes.body.data).toHaveLength(1);

      // Get progress summary
      const summaryRes = await request(app)
        .get('/api/progress/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(summaryRes.body.success).toBe(true);
      expect(summaryRes.body.data.totalTests).toBe(1);
    });
  });
});