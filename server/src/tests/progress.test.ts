import request from 'supertest';
import { setupTestApp, connectTestDB, disconnectTestDB } from './test-setup';
import { User, Verse, Progress, Result } from '../models';

describe('Progress API', () => {
  const app = setupTestApp();

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Verse.deleteMany({});
    await Progress.deleteMany({});
    await Result.deleteMany({});
  });

  it('should submit a typing test result and retrieve progress', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    const userId = user._id.toString();

    const verse = await Verse.create({
      verseOrder: Math.floor(Math.random() * 1000000),
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
      characters: 56,
      words: 12
    });
    const verseId = verse._id.toString();

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    const token = loginRes.body.data.token;

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

  it('should register, login, fetch verse by order, submit result, and retrieve progress and summary', async () => {
    const seededVerse = await Verse.create({
      verseOrder: 42,
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
      characters: 56,
      words: 12
    });

    const startTime = new Date(Date.now() - 30000);
    const endTime = new Date(startTime.getTime() + 30000);
    const resultPayload = {
      verseOrder: seededVerse.verseOrder,
      startTime,
      endTime,
      duration: 30000,
      wpm: 72,
      cps: 6,
      accuracy: 98,
      incorrectCharacters: 1,
      totalCharacters: 56
    };

    await request(app).get('/api/progress').expect(401);
    await request(app)
      .post(`/api/progress/result/${seededVerse._id.toString()}`)
      .send(resultPayload)
      .expect(401);

    const registerRes = await request(app)
      .post('/api/users')
      .send({
        username: 'loopuser',
        email: 'loop@example.com',
        password: 'password123'
      })
      .expect(201);

    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.token).toBeDefined();

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'loop@example.com',
        password: 'password123'
      })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    const loopToken = loginRes.body.data.token;
    expect(loopToken).toBeDefined();

    const verseRes = await request(app)
      .get(`/api/verses/order/${seededVerse.verseOrder}`)
      .expect(200);

    expect(verseRes.body.success).toBe(true);
    expect(verseRes.body.data._id).toBe(seededVerse._id.toString());
    expect(verseRes.body.data.verseOrder).toBe(seededVerse.verseOrder);

    const fetchedVerseId = verseRes.body.data._id;

    const submitRes = await request(app)
      .post(`/api/progress/result/${fetchedVerseId}`)
      .set('Authorization', `Bearer ${loopToken}`)
      .send(resultPayload)
      .expect(201);

    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.result.wpm).toBe(72);
    expect(submitRes.body.data.result.accuracy).toBe(98);
    expect(submitRes.body.data.progress.bestWPM).toBe(72);
    expect(submitRes.body.data.progress.bestAccuracy).toBe(98);

    const progressRes = await request(app)
      .get('/api/progress')
      .set('Authorization', `Bearer ${loopToken}`)
      .expect(200);

    expect(progressRes.body.success).toBe(true);
    expect(progressRes.body.data).toHaveLength(1);
    expect(progressRes.body.data[0].bestWPM).toBe(72);
    expect(progressRes.body.data[0].bestAccuracy).toBe(98);
    expect(progressRes.body.data[0].verse._id).toBe(fetchedVerseId);

    const summaryRes = await request(app)
      .get('/api/progress/summary')
      .set('Authorization', `Bearer ${loopToken}`)
      .expect(200);

    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data.totalVerses).toBe(1);
    expect(summaryRes.body.data.completedVerses).toBe(1);
    expect(summaryRes.body.data.attemptedVerses).toBe(1);
    expect(summaryRes.body.data.averageWPM).toBe(72);
    expect(summaryRes.body.data.bestWPM).toBe(72);
    expect(summaryRes.body.data.averageAccuracy).toBe(98);
    expect(summaryRes.body.data.totalTests).toBe(1);
  });

  it('lists individual results, modifies a result with Progress recomputation, and deletes results cleanly', async () => {
    const verse = await Verse.create({
      verseOrder: 9001,
      book: '1 Kings',
      chapter: 16,
      verse: 17,
      text: 'Omri went up from Gibbethon, and all Israel with him, and they besieged Tirzah.',
      characters: 79,
      words: 14,
    });
    const verseId = verse._id.toString();

    const ownerReg = await request(app)
      .post('/api/users')
      .send({ username: 'owner', email: 'owner@example.com', password: 'password123' })
      .expect(201);
    const ownerToken = ownerReg.body.data.token;

    const otherReg = await request(app)
      .post('/api/users')
      .send({ username: 'other', email: 'other@example.com', password: 'password123' })
      .expect(201);
    const otherToken = otherReg.body.data.token;

    // Submit outlier attempt (8842 WPM) and a normal attempt (54 WPM)
    const outlierRes = await request(app)
      .post(`/api/progress/result/${verseId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        verseOrder: verse.verseOrder,
        startTime: new Date('2026-11-18T10:00:00Z'),
        endTime: new Date('2026-11-18T10:00:00.100Z'),
        duration: 100,
        wpm: 8842,
        cps: 790,
        accuracy: 100,
        incorrectCharacters: 0,
        totalCharacters: 79,
      })
      .expect(201);
    const outlierId = outlierRes.body.data.result._id;

    const normalRes = await request(app)
      .post(`/api/progress/result/${verseId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        verseOrder: verse.verseOrder,
        startTime: new Date('2026-11-18T11:00:00Z'),
        endTime: new Date('2026-11-18T11:00:16Z'),
        duration: 16000,
        wpm: 54,
        cps: 4.94,
        accuracy: 96,
        incorrectCharacters: 3,
        totalCharacters: 79,
      })
      .expect(201);
    const normalId = normalRes.body.data.result._id;

    // List individual results
    const listRes = await request(app)
      .get('/api/progress/results')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.data[0].verse.book).toBe('1 Kings');

    // Other user cannot modify or delete owner's result
    await request(app)
      .patch(`/api/progress/result/${outlierId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ wpm: 60 })
      .expect(404);
    await request(app)
      .delete(`/api/progress/result/${outlierId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    // Reject out-of-range WPM
    await request(app)
      .patch(`/api/progress/result/${normalId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wpm: 9999 })
      .expect(400);

    // Delete the 8842 WPM outlier -> Progress recomputes bestWPM to 54 and attempts to 1
    const delOutlier = await request(app)
      .delete(`/api/progress/result/${outlierId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(delOutlier.body.data.progress.attempts).toBe(1);
    expect(delOutlier.body.data.progress.bestWPM).toBe(54);
    expect(delOutlier.body.data.progress.bestAccuracy).toBe(96);

    // Modify the remaining attempt -> Progress recomputes bestWPM to 62 and bestAccuracy to 99
    const patchRes = await request(app)
      .patch(`/api/progress/result/${normalId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wpm: 62, accuracy: 99, duration: 14000 })
      .expect(200);
    expect(patchRes.body.data.result.wpm).toBe(62);
    expect(patchRes.body.data.result.accuracy).toBe(99);
    expect(patchRes.body.data.progress.bestWPM).toBe(62);
    expect(patchRes.body.data.progress.bestAccuracy).toBe(99);

    // Delete the last remaining attempt -> Progress document is removed completely
    const delLast = await request(app)
      .delete(`/api/progress/result/${normalId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(delLast.body.data.progress).toBeNull();

    const progressAfter = await request(app)
      .get('/api/progress')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(progressAfter.body.data).toHaveLength(0);
  });
});
