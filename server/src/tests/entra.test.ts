import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestApp, connectTestDB, disconnectTestDB } from './test-setup';
import { User, Verse, Progress, Result } from '../models';

const OWNER_OID = '11111111-2222-3333-4444-555555555555';
const OTHER_OID = '99999999-8888-7777-6666-555555555555';

describe('Entra Auth Mode & /api/auth/mode', () => {
  const localApp = setupTestApp({ authMode: 'local' });
  const entraApp = setupTestApp({
    authMode: 'entra',
    ownerOid: OWNER_OID,
    websiteAuthEnabled: true,
  });

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
      Result.deleteMany({}),
    ]);
  });

  it('exposes GET /api/auth/mode publicly for local and entra modes', async () => {
    const localRes = await request(localApp).get('/api/auth/mode').expect(200);
    expect(localRes.body).toEqual({
      success: true,
      data: { mode: 'local', user: null },
    });

    const unauthEntraRes = await request(entraApp).get('/api/auth/mode').expect(200);
    expect(unauthEntraRes.body).toEqual({
      success: true,
      data: { mode: 'entra', user: null },
    });

    const ownerEntraRes = await request(entraApp)
      .get('/api/auth/mode')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'Mike Warren')
      .expect(200);

    expect(ownerEntraRes.body.success).toBe(true);
    expect(ownerEntraRes.body.data.mode).toBe('entra');
    expect(ownerEntraRes.body.data.user).toMatchObject({
      username: 'Mike Warren',
      isAdmin: false,
    });
  });

  it('enforces Easy Auth headers, owner OID check, and ignores Authorization headers in entra mode', async () => {
    const localUser = await User.create({
      username: 'localuser',
      email: 'local@example.com',
      password: 'password123',
    });
    const localToken = jwt.sign({ id: localUser._id.toString() }, 'test-jwt-secret');

    // Missing principal header -> 401 (even with valid local Bearer token)
    await request(entraApp).get('/api/progress').expect(401);
    await request(entraApp)
      .get('/api/progress')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(401);

    // Non-owner principal -> 403 (even with valid local Bearer token)
    await request(entraApp)
      .get('/api/progress')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OTHER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'stranger@example.com')
      .expect(403);
    await request(entraApp)
      .get('/api/progress')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OTHER_OID)
      .set('Authorization', `Bearer ${localToken}`)
      .expect(403);

    // Owner principal succeeds even when Authorization header carries garbage
    const okRes = await request(entraApp)
      .get('/api/users/profile')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'owner@kingsbayanalytics.com')
      .set('Authorization', 'Bearer invalid-ignored-token')
      .expect(200);

    expect(okRes.body.success).toBe(true);
    expect(okRes.body.data.entraOid).toBe(OWNER_OID);
    expect(okRes.body.data.email).toBe('owner@kingsbayanalytics.com');

    // Subsequent request reuses the same User record (no duplicate created)
    await request(entraApp)
      .get('/api/users/profile')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'owner@kingsbayanalytics.com')
      .expect(200);

    const entraUsers = await User.find({ entraOid: OWNER_OID });
    expect(entraUsers).toHaveLength(1);
    expect(entraUsers[0].password).toBeUndefined();
  });

  it('returns 404 for registration and login routes in entra mode', async () => {
    await request(entraApp)
      .post('/api/users')
      .send({ username: 'a', email: 'a@b.com', password: 'password123' })
      .expect(404);

    await request(entraApp)
      .post('/api/users/login')
      .send({ email: 'a@b.com', password: 'password123' })
      .expect(404);
  });

  it('completes full loop in entra mode: header identity -> submit result -> progress shown', async () => {
    const verse = await Verse.create({
      verseOrder: 100,
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
      characters: 56,
      words: 10,
    });

    const verseRes = await request(entraApp)
      .get(`/api/verses/order/${verse.verseOrder}`)
      .expect(200);
    const fetchedVerseId = verseRes.body.data._id;

    const startTime = new Date(Date.now() - 20000);
    const endTime = new Date(startTime.getTime() + 20000);

    const submitRes = await request(entraApp)
      .post(`/api/progress/result/${fetchedVerseId}`)
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'Owner')
      .send({
        verseOrder: verse.verseOrder,
        startTime,
        endTime,
        duration: 20000,
        wpm: 68,
        cps: 2.8,
        accuracy: 96,
        incorrectCharacters: 2,
        totalCharacters: 56,
      })
      .expect(201);

    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.progress.bestWPM).toBe(68);

    const progressRes = await request(entraApp)
      .get('/api/progress')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .expect(200);

    expect(progressRes.body.success).toBe(true);
    expect(progressRes.body.data).toHaveLength(1);
    expect(progressRes.body.data[0].bestWPM).toBe(68);
    expect(progressRes.body.data[0].verse._id).toBe(fetchedVerseId);

    const summaryRes = await request(entraApp)
      .get('/api/progress/summary')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .expect(200);

    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data.completedVerses).toBe(1);
    expect(summaryRes.body.data.averageWPM).toBe(68);
    expect(summaryRes.body.data.totalTests).toBe(1);
  });
});
