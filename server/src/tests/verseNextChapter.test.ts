import request from 'supertest';
import { connectTestDB, disconnectTestDB, setupTestApp } from './test-setup';
import { Progress, User, Verse } from '../models';

const OWNER_OID = '11111111-2222-3333-4444-555555555555';

describe('Story 10.3 (Server): GET /api/verses/next?book=&chapter=', () => {
  const localApp = setupTestApp({ authMode: 'local' });
  const entraApp = setupTestApp({
    authMode: 'entra',
    ownerOid: OWNER_OID,
    websiteAuthEnabled: true,
  });

  let token = '';
  let userId = '';

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
      Progress.deleteMany({}),
    ]);

    const regRes = await request(localApp)
      .post('/api/users')
      .send({
        username: 'mike',
        email: 'mike@example.com',
        password: 'password123',
      })
      .expect(201);

    token = regRes.body.data.token;
    userId = regRes.body.data._id;

    await Verse.insertMany([
      { verseOrder: 14001, book: 'Psalms', chapter: 23, verse: 1, text: 'Psalm 23:1', characters: 10, words: 2 },
      { verseOrder: 14002, book: 'Psalms', chapter: 23, verse: 2, text: 'Psalm 23:2', characters: 10, words: 2 },
      { verseOrder: 14003, book: 'Psalms', chapter: 23, verse: 3, text: 'Psalm 23:3', characters: 10, words: 2 },
      { verseOrder: 14004, book: 'Psalms', chapter: 23, verse: 4, text: 'Psalm 23:4', characters: 10, words: 2 },
      { verseOrder: 14010, book: 'Psalms', chapter: 24, verse: 1, text: 'Psalm 24:1', characters: 10, words: 2 },
    ]);
  });

  it('returns the lowest untyped verse inside the requested chapter', async () => {
    const ps23 = await Verse.find({ book: 'Psalms', chapter: 23 }).sort({ verseOrder: 1 });
    await Progress.insertMany(
      ps23.slice(0, 3).map((v) => ({
        user: userId,
        verse: v._id,
        verseOrder: v.verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 70,
        bestAccuracy: 98,
        lastAttemptDate: new Date(),
      }))
    );

    const res = await request(localApp)
      .get('/api/verses/next?book=Psalms&chapter=23')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.complete).toBe(false);
    expect(res.body.data.chapterComplete).toBe(false);
    expect(res.body.data.verse.chapter).toBe(23);
    expect(res.body.data.verse.verse).toBe(4);
  });

  it('returns verse 1 with chapterComplete=true when all verses in the chapter are already completed', async () => {
    const ps23 = await Verse.find({ book: 'Psalms', chapter: 23 }).sort({ verseOrder: 1 });
    await Progress.insertMany(
      ps23.map((v) => ({
        user: userId,
        verse: v._id,
        verseOrder: v.verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 75,
        bestAccuracy: 99,
        lastAttemptDate: new Date(),
      }))
    );

    const res = await request(localApp)
      .get('/api/verses/next?book=Psalms&chapter=23')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.complete).toBe(false);
    expect(res.body.data.chapterComplete).toBe(true);
    expect(res.body.data.verse.chapter).toBe(23);
    expect(res.body.data.verse.verse).toBe(1);
  });

  it('returns 400 on invalid, non-numeric, missing-book, or out-of-range chapter params', async () => {
    await request(localApp)
      .get('/api/verses/next?book=Psalms&chapter=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(localApp)
      .get('/api/verses/next?book=Psalms&chapter=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(localApp)
      .get('/api/verses/next?book=Psalms&chapter=999')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(localApp)
      .get('/api/verses/next?chapter=23')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('preserves existing book-only behavior when chapter is omitted and enforces Entra auth', async () => {
    const ps23 = await Verse.find({ book: 'Psalms', chapter: 23 }).sort({ verseOrder: 1 });
    await Progress.insertMany(
      ps23.map((v) => ({
        user: userId,
        verse: v._id,
        verseOrder: v.verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 75,
        bestAccuracy: 99,
        lastAttemptDate: new Date(),
      }))
    );

    // Without ?chapter=, advances to Psalm 24:1 and does not set chapterComplete
    const res = await request(localApp)
      .get('/api/verses/next?book=Psalms')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.complete).toBe(false);
    expect(res.body.data.chapterComplete).toBeUndefined();
    expect(res.body.data.verse.chapter).toBe(24);
    expect(res.body.data.verse.verse).toBe(1);

    // Entra auth check
    await request(entraApp).get('/api/verses/next?book=Psalms&chapter=23').expect(401);
    const entraRes = await request(entraApp)
      .get('/api/verses/next?book=Psalms&chapter=23')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'Mike')
      .expect(200);
    expect(entraRes.body.data.verse.chapter).toBe(23);
    expect(entraRes.body.data.verse.verse).toBe(1);
  });
});
