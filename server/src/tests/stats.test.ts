import { performance } from 'perf_hooks';
import request from 'supertest';
import { Progress, Result, User, Verse } from '../models';
import { CANONICAL_BOOK_ORDER } from '../utils/bookMapping';
import { connectTestDB, disconnectTestDB, setupTestApp } from './test-setup';

describe('Stats API (Story 2.2)', () => {
  const app = setupTestApp();

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Verse.deleteMany({}),
      Result.deleteMany({}),
      Progress.deleteMany({}),
    ]);
  });

  async function registerAndLogin(suffix: string) {
    const res = await request(app)
      .post('/api/users')
      .send({
        username: `statsuser-${suffix}`,
        email: `stats-${suffix}@example.com`,
        password: 'password123',
      })
      .expect(201);

    return {
      userId: res.body.data._id as string,
      token: res.body.data.token as string,
    };
  }

  it('requires authentication on all /api/stats/* routes', async () => {
    await request(app).get('/api/stats/trend').expect(401);
    await request(app).get('/api/stats/activity').expect(401);
    await request(app).get('/api/stats/coverage').expect(401);
  });

  it('returns 400 with {success:false, message} for invalid query parameters', async () => {
    const { token } = await registerAndLogin('invalid-params');

    const badRange = await request(app)
      .get('/api/stats/trend?range=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badRange.body.success).toBe(false);
    expect(badRange.body.message).toMatch(/range/i);

    const badTrendTz = await request(app)
      .get('/api/stats/trend?range=30&tz=Mars/Olympus')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badTrendTz.body.success).toBe(false);
    expect(badTrendTz.body.message).toMatch(/tz/i);

    const badYear = await request(app)
      .get('/api/stats/activity?year=abcd')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badYear.body.success).toBe(false);
    expect(badYear.body.message).toMatch(/year/i);

    const badActivityTz = await request(app)
      .get('/api/stats/activity?year=2026&tz=Not/AZone')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badActivityTz.body.success).toBe(false);
    expect(badActivityTz.body.message).toMatch(/tz/i);
  });

  it('computes trend, activity, and coverage isolated to the authenticated user with timezone bucketing', async () => {
    const owner = await registerAndLogin('owner');
    const other = await registerAndLogin('other');

    const [gen1, gen2, matt1] = await Verse.create([
      {
        verseOrder: 1,
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning...',
        characters: 19,
        words: 3,
      },
      {
        verseOrder: 2,
        book: 'Genesis',
        chapter: 1,
        verse: 2,
        text: 'The earth was formless...',
        characters: 25,
        words: 4,
      },
      {
        verseOrder: 40000,
        book: 'Matthew',
        chapter: 1,
        verse: 1,
        text: 'The book of the genealogy...',
        characters: 28,
        words: 5,
      },
    ]);

    await Result.create([
      // 2025-12-31 21:00 EST in America/New_York, 2026-01-01 02:00 UTC
      {
        user: owner.userId,
        verse: gen1._id,
        verseOrder: 1,
        startTime: new Date('2026-01-01T02:00:00.000Z'),
        endTime: new Date('2026-01-01T02:00:10.000Z'),
        duration: 10000,
        wpm: 40,
        cps: 4,
        accuracy: 90,
        incorrectCharacters: 2,
        totalCharacters: 19,
      },
      {
        user: owner.userId,
        verse: gen2._id,
        verseOrder: 2,
        startTime: new Date('2026-06-15T15:00:00.000Z'),
        endTime: new Date('2026-06-15T15:00:10.000Z'),
        duration: 10000,
        wpm: 60,
        cps: 5,
        accuracy: 100,
        incorrectCharacters: 0,
        totalCharacters: 25,
      },
      {
        user: owner.userId,
        verse: matt1._id,
        verseOrder: 40000,
        startTime: new Date('2026-06-15T18:00:00.000Z'),
        endTime: new Date('2026-06-15T18:00:10.000Z'),
        duration: 10000,
        wpm: 80,
        cps: 6,
        accuracy: 96,
        incorrectCharacters: 1,
        totalCharacters: 28,
      },
      // Other user's result should never be included
      {
        user: other.userId,
        verse: gen1._id,
        verseOrder: 1,
        startTime: new Date('2026-06-15T19:00:00.000Z'),
        endTime: new Date('2026-06-15T19:00:10.000Z'),
        duration: 10000,
        wpm: 120,
        cps: 10,
        accuracy: 100,
        incorrectCharacters: 0,
        totalCharacters: 19,
      },
    ]);

    await Progress.create([
      {
        user: owner.userId,
        verse: gen1._id,
        verseOrder: 1,
        completed: true,
        attempts: 1,
        bestWPM: 40,
        bestAccuracy: 90,
      },
      {
        user: owner.userId,
        verse: gen2._id,
        verseOrder: 2,
        completed: false, // incomplete should not count toward coverage
        attempts: 1,
        bestWPM: 60,
        bestAccuracy: 100,
      },
      {
        user: owner.userId,
        verse: matt1._id,
        verseOrder: 40000,
        completed: true,
        attempts: 1,
        bestWPM: 80,
        bestAccuracy: 96,
      },
      {
        user: other.userId,
        verse: gen2._id,
        verseOrder: 2,
        completed: true,
        attempts: 1,
        bestWPM: 120,
        bestAccuracy: 100,
      },
    ]);

    const trendRes = await request(app)
      .get('/api/stats/trend?range=all&tz=America/New_York')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(trendRes.body).toEqual({
      success: true,
      data: [
        { date: '2025-12-31', avgWpm: 40, avgAccuracy: 90, attempts: 1 },
        { date: '2026-06-15', avgWpm: 70, avgAccuracy: 98, attempts: 2 },
      ],
    });

    const activity2025 = await request(app)
      .get('/api/stats/activity?year=2025&tz=America/New_York')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(activity2025.body).toEqual({
      success: true,
      data: [{ date: '2025-12-31', attempts: 1 }],
    });

    const activity2026Utc = await request(app)
      .get('/api/stats/activity?year=2026&tz=UTC')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(activity2026Utc.body).toEqual({
      success: true,
      data: [
        { date: '2026-01-01', attempts: 1 },
        { date: '2026-06-15', attempts: 2 },
      ],
    });

    const coverageRes = await request(app)
      .get('/api/stats/coverage')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(coverageRes.body.success).toBe(true);
    expect(coverageRes.body.data.overall).toEqual({
      totalVerses: 3,
      completedVerses: 2,
      percentage: 66.7,
    });
    expect(coverageRes.body.data.testaments).toEqual([
      { testament: 'Old Testament', totalVerses: 2, completedVerses: 1, percentage: 50 },
      { testament: 'New Testament', totalVerses: 1, completedVerses: 1, percentage: 100 },
    ]);
    expect(coverageRes.body.data.books).toHaveLength(73);
    expect(coverageRes.body.data.books.map((b: any) => b.book)).toEqual(CANONICAL_BOOK_ORDER);
    expect(coverageRes.body.data.books[0]).toEqual({
      book: 'Genesis',
      testament: 'Old Testament',
      totalVerses: 2,
      completedVerses: 1,
      percentage: 50,
    });
  });

  it('responds in under 1 second at 10,000 Result documents (NFR-1)', async () => {
    const owner = await registerAndLogin('perf');
    const verse = await Verse.create({
      verseOrder: 1,
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
      characters: 56,
      words: 10,
    });

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const bulkResults = Array.from({ length: 10000 }, (_, i) => {
      const startTime = new Date(now - (i % 300) * dayMs);
      return {
        user: owner.userId,
        verse: verse._id,
        verseOrder: 1,
        startTime,
        endTime: new Date(startTime.getTime() + 10000),
        duration: 10000,
        wpm: 50 + (i % 40),
        cps: 5,
        accuracy: 92 + (i % 9),
        incorrectCharacters: 1,
        totalCharacters: 56,
      };
    });
    await Result.insertMany(bulkResults, { ordered: false });
    await Progress.create({
      user: owner.userId,
      verse: verse._id,
      verseOrder: 1,
      completed: true,
      attempts: 10000,
      bestWPM: 89,
      bestAccuracy: 100,
    });

    const t1 = performance.now();
    const trendRes = await request(app)
      .get('/api/stats/trend?range=all&tz=America/New_York')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    const trendMs = performance.now() - t1;

    const currentYear = new Date().getUTCFullYear();
    const t2 = performance.now();
    const activityRes = await request(app)
      .get(`/api/stats/activity?year=${currentYear}&tz=UTC`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    const activityMs = performance.now() - t2;

    const t3 = performance.now();
    const coverageRes = await request(app)
      .get('/api/stats/coverage')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    const coverageMs = performance.now() - t3;

    expect(trendMs).toBeLessThan(1000);
    expect(activityMs).toBeLessThan(1000);
    expect(coverageMs).toBeLessThan(1000);

    const trendAttempts = trendRes.body.data.reduce(
      (sum: number, p: { attempts: number }) => sum + p.attempts,
      0
    );
    expect(trendAttempts).toBe(10000);
    expect(activityRes.body.data.length).toBeGreaterThan(0);
    expect(coverageRes.body.data.overall.completedVerses).toBe(1);
  });
});
