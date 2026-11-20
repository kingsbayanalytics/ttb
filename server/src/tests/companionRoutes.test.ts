import request from 'supertest';
import { connectTestDB, disconnectTestDB, setupTestApp } from './test-setup';
import { CompanionEntry, Progress, Result, User, Verse } from '../models';
import { resetChapterManifestCache } from '../services/trail/chapterManifest';

const OWNER_OID = '11111111-2222-3333-4444-555555555555';
const OTHER_OID = '99999999-8888-7777-6666-555555555555';

describe('Story 10.1: Protected Companion API (/api/companion/*)', () => {
  const localApp = setupTestApp({ authMode: 'local' });
  const entraApp = setupTestApp({
    authMode: 'entra',
    ownerOid: OWNER_OID,
    websiteAuthEnabled: true,
  });

  let localToken = '';
  let localUserId = '';

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    resetChapterManifestCache();
    await Promise.all([
      User.deleteMany({}),
      Verse.deleteMany({}),
      Progress.deleteMany({}),
      Result.deleteMany({}),
      CompanionEntry.deleteMany({}),
    ]);

    const regRes = await request(localApp)
      .post('/api/users')
      .send({
        username: 'mike',
        email: 'mike@example.com',
        password: 'password123',
      })
      .expect(201);

    localToken = regRes.body.data.token;
    localUserId = regRes.body.data._id;
  });

  async function seedPsalmsFixtures() {
    const verses = await Verse.insertMany([
      // Psalm 23 (2 verses)
      { verseOrder: 14001, book: 'Psalms', chapter: 23, verse: 1, text: 'Psalm 23:1', characters: 10, words: 2 },
      { verseOrder: 14002, book: 'Psalms', chapter: 23, verse: 2, text: 'Psalm 23:2', characters: 10, words: 2 },
      // Psalm 24 (1 verse - stays locked)
      { verseOrder: 14003, book: 'Psalms', chapter: 24, verse: 1, text: 'Psalm 24:1', characters: 10, words: 2 },
      // Psalm 119 (1 verse - unlocked for octave test)
      { verseOrder: 15500, book: 'Psalms', chapter: 119, verse: 1, text: 'Psalm 119:1', characters: 11, words: 2 },
    ]);

    await CompanionEntry.insertMany([
      {
        upsertKey: 'web-bible:Psalms:book:book-introduction:hoodoo-folk:psalter-guide:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: null,
        entryType: 'book-introduction',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalms Weekly Prayer Schedule',
        summary: 'Morning and evening devotional rhythm.',
        body: 'Book introduction body.',
        dailySchedule: [
          { slot: 'Sunday morning', psalm: 23, book: 'Psalms', chapter: 23 },
          { slot: 'Sunday evening', psalm: 24, book: 'Psalms', chapter: 24 },
        ],
        source: { sourceId: 'psalter-guide', title: 'Private Psalter Guide', year: 1982 },
        contentHash: 'h-intro',
      },
      {
        upsertKey: 'web-bible:Psalms:book:bonus-meditations:hoodoo-folk:psalter-guide:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: null,
        entryType: 'bonus-meditations',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 1,
        title: 'Closing Meditations',
        summary: 'Short closing reflections.',
        body: 'Bonus meditations body.',
        source: { sourceId: 'psalter-guide', title: 'Private Psalter Guide', year: 1982 },
        contentHash: 'h-bonus',
      },
      {
        upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:psalter-guide:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 23 — Shepherd Working',
        summary: 'Peaceful guidance and protection.',
        body: 'SECRET_PSALM_23_PROSE_BODY',
        purposes: [
          {
            title: 'FOR PEACEFUL GUIDANCE',
            body: 'SECRET_PSALM_23_PURPOSE_BODY',
            page: 37,
            citedVerses: ['1-4'],
            ritualTags: ['Olive Oil', 'White Candle'],
          },
        ],
        indexPurposes: [{ purpose: 'Guidance in dreams', source: 'powers-index', verseRange: null }],
        ritualTags: ['Olive Oil', 'White Candle'],
        citedVerses: ['1-4'],
        source: { sourceId: 'psalter-guide', title: 'Private Psalter Guide', year: 1982, pages: [37, 38] },
        contentHash: 'h-ps23-hf',
      },
      {
        upsertKey: 'web-bible:Psalms:23:chapter-companion:historical-classic:haydock-1859:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'historical-classic',
        visibility: 'public-domain',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 23 — Haydock Commentary',
        summary: 'Classic Shepherd commentary.',
        body: 'Haydock historical commentary on DR Psalm 22.',
        ritualTags: ['Shepherd'],
        source: {
          sourceId: 'haydock-1859',
          title: 'Haydock 1859',
          numberingSystem: 'vulgate-dr',
          originalRef: 'Douay-Rheims Psalm 22',
        },
        contentHash: 'h-ps23-hc',
      },
      {
        upsertKey: 'web-bible:Psalms:24:chapter-companion:community:reddit-rbible-xyz:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 24,
        entryType: 'chapter-companion',
        lens: 'community',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 24 — Locked Secret Thread',
        summary: 'LOCKED_PSALM_24_SUMMARY',
        body: 'LOCKED_PSALM_24_SECRET_BODY',
        quoteExcerpt: 'LOCKED_PSALM_24_EXCERPT',
        ritualTags: ['LockedOnlyTag'],
        externalUrl: 'https://www.reddit.com/r/Bible/comments/xyz/psalm_24/',
        source: {
          sourceId: 'reddit-rbible-xyz',
          title: 'Locked Thread',
          subreddit: 'r/Bible',
          authorHandle: 'u/reader',
          retrievedAt: new Date('2026-11-20T00:00:00.000Z'),
          pages: [99],
        },
        contentHash: 'h-ps24-com',
      },
      {
        upsertKey: 'web-bible:Psalms:119:chapter-companion:hoodoo-folk:psalter-guide:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 119,
        entryType: 'chapter-companion',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 119 — 22 Hebrew Octaves',
        summary: 'ALEPH through TAU.',
        body: 'Psalm 119 octave overview.',
        purposes: [
          { title: 'ALEPH', body: 'Aleph body', octave: 'ALEPH', verseRange: '1-8', citedVerses: ['1-8'], ritualTags: ['Memory'] },
          { title: 'TAU', body: 'Tau body', octave: 'TAU', verseRange: '169-176', citedVerses: ['169-176'], ritualTags: ['Completion'] },
        ],
        ritualTags: ['Memory', 'Completion'],
        source: { sourceId: 'psalter-guide', title: 'Private Psalter Guide', year: 1982 },
        contentHash: 'h-ps119',
      },
    ]);

    return verses;
  }

  it('enforces local JWT and Entra OWNER_OID auth across all /api/companion/* endpoints (401/403)', async () => {
    await seedPsalmsFixtures();

    // Unauthenticated local -> 401
    await request(localApp).get('/api/companion/Psalms/23').expect(401);
    await request(localApp).get('/api/companion/Psalms/guide').expect(401);
    await request(localApp).get('/api/companion/search?q=Shepherd').expect(401);

    // Entra without principal -> 401
    await request(entraApp).get('/api/companion/Psalms/23').expect(401);
    await request(entraApp)
      .get('/api/companion/Psalms/23')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(401);

    // Entra wrong OID -> 403
    await request(entraApp)
      .get('/api/companion/Psalms/23')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OTHER_OID)
      .expect(403);
    await request(entraApp)
      .get('/api/companion/Psalms/guide')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OTHER_OID)
      .expect(403);

    // Entra valid OWNER_OID -> 200 (even with garbage Authorization header)
    const okRes = await request(entraApp)
      .get('/api/companion/Psalms/guide')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'Mike Warren')
      .set('Authorization', 'Bearer garbage-ignored')
      .expect(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.data.book).toBe('Psalms');
  });

  it('enforces server-side lock gate on locked chapters and returns full multi-lens payload when unlocked', async () => {
    const verses = await seedPsalmsFixtures();

    // Complete only 1 of 2 verses of Psalm 23 -> still locked!
    await Progress.create({
      user: localUserId,
      verse: verses[0]._id,
      verseOrder: 14001,
      completed: true,
      attempts: 1,
      bestWPM: 70,
      bestAccuracy: 98,
      lastAttemptDate: new Date(),
    });

    const lockedRes = await request(localApp)
      .get('/api/companion/Psalms/23')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);

    expect(lockedRes.body.data).toEqual({
      workId: 'web-bible',
      book: 'Psalms',
      chapter: 23,
      unlocked: false,
      progress: {
        completedVerses: 1,
        totalVerses: 2,
        state: 'in_progress',
      },
      lensCounts: {
        'hoodoo-folk': 1,
        'historical-classic': 1,
        community: 0,
      },
      lenses: {
        'hoodoo-folk': [],
        'historical-classic': [],
        community: [],
      },
    });
    // Guarantee ZERO leakage of body, purposes, quoteExcerpt, or source pages
    const rawLockedJson = JSON.stringify(lockedRes.body);
    expect(rawLockedJson).not.toContain('SECRET_PSALM_23_PROSE_BODY');
    expect(rawLockedJson).not.toContain('SECRET_PSALM_23_PURPOSE_BODY');
    expect(rawLockedJson).not.toContain('Guidance in dreams');

    // Complete verse 2 of Psalm 23 -> now unlocked!
    await Progress.create({
      user: localUserId,
      verse: verses[1]._id,
      verseOrder: 14002,
      completed: true,
      attempts: 1,
      bestWPM: 84,
      bestAccuracy: 99,
      lastAttemptDate: new Date(),
    });

    const unlockedRes = await request(localApp)
      .get('/api/companion/Psalms/23')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);

    expect(unlockedRes.body.data.unlocked).toBe(true);
    expect(unlockedRes.body.data.progress).toMatchObject({
      completedVerses: 2,
      totalVerses: 2,
      state: 'bloomed',
      bestWPM: 84,
      bestAccuracy: 99,
    });
    expect(unlockedRes.body.data.lenses['hoodoo-folk']).toHaveLength(1);
    expect(unlockedRes.body.data.lenses['hoodoo-folk'][0].purposes[0].title).toBe(
      'FOR PEACEFUL GUIDANCE'
    );
    expect(unlockedRes.body.data.lenses['historical-classic']).toHaveLength(1);
    expect(unlockedRes.body.data.lenses['historical-classic'][0].source.originalRef).toBe(
      'Douay-Rheims Psalm 22'
    );

    // Psalm 119 octave payload preservation when unlocked
    await Progress.create({
      user: localUserId,
      verse: verses[3]._id,
      verseOrder: 15500,
      completed: true,
      attempts: 1,
      bestWPM: 65,
      bestAccuracy: 95,
      lastAttemptDate: new Date(),
    });

    const ps119Res = await request(localApp)
      .get('/api/companion/Psalms/119')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    expect(ps119Res.body.data.unlocked).toBe(true);
    expect(ps119Res.body.data.lenses['hoodoo-folk'][0].purposes).toHaveLength(2);
    expect(ps119Res.body.data.lenses['hoodoo-folk'][0].purposes[0].octave).toBe('ALEPH');
    expect(ps119Res.body.data.lenses['hoodoo-folk'][0].purposes[1].octave).toBe('TAU');
  });

  it('serves GET /api/companion/:book/guide with live dailySchedule status before full-book completion', async () => {
    const verses = await seedPsalmsFixtures();
    // Unlock Psalm 23 only (Psalm 24 stays dormant)
    await Progress.create([
      { user: localUserId, verse: verses[0]._id, verseOrder: 14001, completed: true, attempts: 1, bestWPM: 70, bestAccuracy: 98, lastAttemptDate: new Date() },
      { user: localUserId, verse: verses[1]._id, verseOrder: 14002, completed: true, attempts: 1, bestWPM: 72, bestAccuracy: 99, lastAttemptDate: new Date() },
    ]);

    const guideRes = await request(localApp)
      .get('/api/companion/Psalms/guide')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);

    expect(guideRes.body.data.introductions).toHaveLength(1);
    expect(guideRes.body.data.bonusMeditations).toHaveLength(1);
    expect(guideRes.body.data.dailySchedule).toEqual([
      { slot: 'Sunday morning', psalm: 23, book: 'Psalms', chapter: 23, state: 'bloomed', unlocked: true },
      { slot: 'Sunday evening', psalm: 24, book: 'Psalms', chapter: 24, state: 'dormant', unlocked: false },
    ]);
    expect(guideRes.body.data.bookProgress.bloomedChapters).toBe(1);
    expect(guideRes.body.data.bookProgress.bookMastered).toBe(false);
  });

  it('restricts GET /api/companion/search strictly to unlocked chapters & book guides (zero locked leakage)', async () => {
    const verses = await seedPsalmsFixtures();
    // Unlock Psalm 23, keep Psalm 24 locked
    await Progress.create([
      { user: localUserId, verse: verses[0]._id, verseOrder: 14001, completed: true, attempts: 1, bestWPM: 70, bestAccuracy: 98, lastAttemptDate: new Date() },
      { user: localUserId, verse: verses[1]._id, verseOrder: 14002, completed: true, attempts: 1, bestWPM: 72, bestAccuracy: 99, lastAttemptDate: new Date() },
    ]);

    // Searching for locked Psalm 24 title/tag returns 0 items!
    const lockedSearch = await request(localApp)
      .get('/api/companion/search?q=Locked')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    expect(lockedSearch.body.data.items).toEqual([]);
    expect(JSON.stringify(lockedSearch.body)).not.toContain('LOCKED_PSALM_24');

    const lockedTagSearch = await request(localApp)
      .get('/api/companion/search?tag=LockedOnlyTag')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    expect(lockedTagSearch.body.data.items).toEqual([]);

    // Searching for unlocked Psalm 23 purpose / tag succeeds!
    const unlockedSearch = await request(localApp)
      .get('/api/companion/search?q=Guidance&lens=hoodoo-folk')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    expect(unlockedSearch.body.data.items).toHaveLength(1);
    expect(unlockedSearch.body.data.items[0].chapter).toBe(23);
  });

  it('returns 400 for invalid book, out-of-range chapter, unsupported workId, or invalid lens', async () => {
    await request(localApp)
      .get('/api/companion/NotABook/1')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/companion/Genesis/51')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/companion/Psalms/0')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/companion/Psalms/abc')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/companion/Psalms/23?workId=unknown-work')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/companion/Psalms/23?lens=invalid-lens')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);
  });
});
