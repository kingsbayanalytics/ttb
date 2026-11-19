import request from 'supertest';
import { setupTestApp, connectTestDB, disconnectTestDB } from './test-setup';
import { User, Verse, Progress, MemoryItem, CustomPlan } from '../models';

describe('Memory Deck & Curated Study Plans API (Epics 5 & 7)', () => {
  const app = setupTestApp();
  let token: string;
  let userId: string;

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
      MemoryItem.deleteMany({}),
      CustomPlan.deleteMany({}),
    ]);

    const reg = await request(app)
      .post('/api/users')
      .send({
        username: 'scribe',
        email: 'scribe@example.com',
        password: 'password123',
      })
      .expect(201);

    token = reg.body.data.token;
    userId = reg.body.data._id;
  });

  it('requires authentication on /api/memory and /api/plans', async () => {
    await request(app).get('/api/memory').expect(401);
    await request(app).post('/api/memory').send({ verseId: '507f1f77bcf86cd799439011' }).expect(401);
    await request(app).get('/api/plans').expect(401);
    await request(app).get('/api/plans/psalms-mantras').expect(401);
  });

  it('saves a verse to the Memory Deck, advances stages on >=95% accuracy, allows manual PATCH stage, and deletes', async () => {
    const verse = await Verse.create({
      verseOrder: 13940,
      book: 'Psalms',
      chapter: 23,
      verse: 1,
      text: 'Yahweh is my shepherd: I shall lack nothing.',
      characters: 44,
      words: 8,
    });

    // Add to Memory Deck
    const createRes = await request(app)
      .post('/api/memory')
      .set('Authorization', `Bearer ${token}`)
      .send({ verseId: verse._id.toString() })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.stage).toBe(1);
    expect(createRes.body.data.stageCompletions).toBe(0);
    expect(createRes.body.data.verse.text).toBe(verse.text);

    const memoryId = createRes.body.data._id;

    // Duplicate POST is idempotent and preserves item
    const dupRes = await request(app)
      .post('/api/memory')
      .set('Authorization', `Bearer ${token}`)
      .send({ book: 'Psalms', chapter: 23, verse: 1 })
      .expect(201);
    expect(dupRes.body.data._id).toBe(memoryId);

    // Practice with accuracy < 95% does not advance stage
    const lowAccRes = await request(app)
      .post(`/api/memory/${memoryId}/practice`)
      .set('Authorization', `Bearer ${token}`)
      .send({ wpm: 48, accuracy: 90, stage: 1 })
      .expect(200);
    expect(lowAccRes.body.data.stage).toBe(1);
    expect(lowAccRes.body.data.stageCompletions).toBe(1);

    // Practice with accuracy >= 95% advances stage from 1 -> 2
    const promoteRes = await request(app)
      .post(`/api/memory/${memoryId}/practice`)
      .set('Authorization', `Bearer ${token}`)
      .send({ wpm: 62, accuracy: 98, stage: 1 })
      .expect(200);
    expect(promoteRes.body.data.stage).toBe(2);
    expect(promoteRes.body.data.stageCompletions).toBe(2);
    expect(promoteRes.body.data.lastPracticedAt).toBeDefined();

    // Manually PATCH stage to 5
    const patchRes = await request(app)
      .patch(`/api/memory/${memoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 5 })
      .expect(200);
    expect(patchRes.body.data.stage).toBe(5);

    // Practicing at Stage 5 caps at Stage 5
    const capRes = await request(app)
      .post(`/api/memory/${memoryId}/practice`)
      .set('Authorization', `Bearer ${token}`)
      .send({ wpm: 70, accuracy: 100, stage: 5 })
      .expect(200);
    expect(capRes.body.data.stage).toBe(5);

    // Invalid stage PATCH returns 400
    await request(app)
      .patch(`/api/memory/${memoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 9 })
      .expect(400);

    // GET /api/memory returns populated item
    const listRes = await request(app)
      .get('/api/memory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.count).toBe(1);
    expect(listRes.body.data[0].stage).toBe(5);

    // DELETE /api/memory/:id removes item
    await request(app)
      .delete(`/api/memory/${memoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const afterDeleteRes = await request(app)
      .get('/api/memory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterDeleteRes.body.count).toBe(0);
  });

  it('bulk-adds a curated pack into the Memory Deck and reports plan progress in /api/plans', async () => {
    const ps1 = await Verse.create({
      verseOrder: 13594,
      book: 'Psalms',
      chapter: 1,
      verse: 1,
      text: "Blessed is the man who doesn't walk in the counsel of the wicked,",
      characters: 65,
      words: 13,
    });
    const ps23 = await Verse.create({
      verseOrder: 13940,
      book: 'Psalms',
      chapter: 23,
      verse: 1,
      text: 'Yahweh is my shepherd: I shall lack nothing.',
      characters: 44,
      words: 8,
    });

    await Progress.create({
      user: userId,
      verse: ps1._id,
      verseOrder: ps1.verseOrder,
      completed: true,
      attempts: 1,
      bestWPM: 64,
      bestAccuracy: 100,
    });

    // Bulk-add psalms-mantras pack
    const packRes = await request(app)
      .post('/api/memory/pack/psalms-mantras')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(packRes.body.success).toBe(true);
    expect(packRes.body.packId).toBe('psalms-mantras');
    expect(packRes.body.resolvedCount).toBe(2);
    expect(packRes.body.data).toHaveLength(2);
    expect(packRes.body.data[0].verseOrder).toBe(13594);
    expect(packRes.body.data[1].verseOrder).toBe(13940);

    // GET /api/plans lists all 10 curated plans with completion & memory deck counts
    const plansRes = await request(app)
      .get('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(plansRes.body.success).toBe(true);
    expect(plansRes.body.data).toHaveLength(10);

    const psalmsPlan = plansRes.body.data.find((p: any) => p.id === 'psalms-mantras');
    expect(psalmsPlan).toBeDefined();
    expect(psalmsPlan.completedVerses).toBe(1);
    expect(psalmsPlan.inMemoryDeckCount).toBe(2);

    // GET /api/plans/:planId returns resolved verses and completedVerseIds
    const detailRes = await request(app)
      .get('/api/plans/psalms-mantras')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.id).toBe('psalms-mantras');
    expect(detailRes.body.data.verses).toHaveLength(2);
    expect(detailRes.body.data.completedVerseIds).toEqual([ps1._id.toString()]);

    // Unknown pack/plan returns 404
    await request(app)
      .post('/api/memory/pack/does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    await request(app)
      .get('/api/plans/does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('supports full Custom Playlist CRUD, user isolation, and add-to-memory', async () => {
    const [p23v1, p23v2, jhn316] = await Verse.create([
      {
        verseOrder: 13940,
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'Yahweh is my shepherd: I shall lack nothing.',
        characters: 44,
        words: 8,
      },
      {
        verseOrder: 13941,
        book: 'Psalms',
        chapter: 23,
        verse: 2,
        text: 'He makes me lie down in green pastures.',
        characters: 39,
        words: 8,
      },
      {
        verseOrder: 26137,
        book: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world...',
        characters: 29,
        words: 6,
      },
    ]);

    const otherReg = await request(app)
      .post('/api/users')
      .send({ username: 'other2', email: 'other2@example.com', password: 'password123' })
      .expect(201);
    const otherToken = otherReg.body.data.token;

    // Create custom playlist
    const createRes = await request(app)
      .post('/api/plans/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Morning Mantras',
        description: 'My daily anchor verses',
        verses: [{ book: 'Psalms', chapter: 23, verse: 1 }],
      })
      .expect(201);

    const planId = createRes.body.data._id;
    expect(createRes.body.data.title).toBe('Morning Mantras');
    expect(createRes.body.data.totalVerses).toBe(1);

    // Other user cannot view or modify
    await request(app)
      .get(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app)
      .patch(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked' })
      .expect(404);

    // Add a verse via PATCH addVerse
    const addRes = await request(app)
      .patch(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ addVerse: { book: 'John', chapter: 3, verse: 16 } })
      .expect(200);
    expect(addRes.body.data.totalVerses).toBe(2);

    // Mark p23v1 completed -> detail reflects completedVerseIds & resolved verses
    await Progress.create({
      user: userId,
      verse: p23v1._id,
      verseOrder: p23v1.verseOrder,
      completed: true,
      attempts: 1,
      bestWPM: 62,
      bestAccuracy: 99,
    });

    const detailRes = await request(app)
      .get(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detailRes.body.data.verses.map((v: any) => v._id)).toEqual([
      p23v1._id.toString(),
      jhn316._id.toString(),
    ]);
    expect(detailRes.body.data.completedVerseIds).toEqual([p23v1._id.toString()]);

    // Add custom playlist to Memory Deck
    const memRes = await request(app)
      .post(`/api/plans/custom/${planId}/add-to-memory`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(memRes.body.addedCount).toBe(2);
    expect(memRes.body.totalInDeck).toBe(2);

    // Replace verses & rename
    const patchRes = await request(app)
      .patch(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Evening Peace',
        verses: [{ book: 'Psalms', chapter: 23, verse: 2 }],
      })
      .expect(200);
    expect(patchRes.body.data.title).toBe('Evening Peace');
    expect(patchRes.body.data.totalVerses).toBe(1);
    expect(patchRes.body.data.verseRefs).toEqual([{ book: 'Psalms', chapter: 23, verse: 2 }]);
    expect(p23v2._id).toBeDefined();

    // Delete custom playlist
    await request(app)
      .delete(`/api/plans/custom/${planId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfter = await request(app)
      .get('/api/plans/custom')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listAfter.body.data).toHaveLength(0);
  });
});
