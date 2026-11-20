import request from 'supertest';
import { connectTestDB, disconnectTestDB, setupTestApp } from './test-setup';
import { CompanionEntry, Progress, User, Verse } from '../models';
import {
  GENESIS_TRAIL_LEGS,
  PSALMS_TRAIL_LEGS,
  TRAIL_BIOME_CATALOG,
} from '../services/trail/biomeCatalog';
import { resetChapterManifestCache } from '../services/trail/chapterManifest';
import { CANONICAL_BOOK_ORDER } from '../utils/bookMapping';

const OWNER_OID = '11111111-2222-3333-4444-555555555555';
const OTHER_OID = '99999999-8888-7777-6666-555555555555';

describe('Story 10.2: Living Trail API (/api/trail/*) & 73-Book Biome Catalog', () => {
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

  describe('biomeCatalog invariants', () => {
    it('encodes exactly 9 biomes and all 73 canonical WEB books with 0 duplicates/omissions', () => {
      expect(TRAIL_BIOME_CATALOG).toHaveLength(9);

      const allBooks = TRAIL_BIOME_CATALOG.flatMap((b) => b.books.map((bk) => bk.book));
      expect(allBooks).toHaveLength(73);
      expect(new Set(allBooks).size).toBe(73);

      // Exact set equality with CANONICAL_BOOK_ORDER
      for (const canonicalBook of CANONICAL_BOOK_ORDER) {
        expect(allBooks).toContain(canonicalBook);
      }

      // Only Genesis and Psalms are phase1Active
      const activeBooks = TRAIL_BIOME_CATALOG.flatMap((b) =>
        b.books.filter((bk) => bk.phase1Active).map((bk) => bk.book)
      );
      expect(activeBooks).toEqual(['Genesis', 'Psalms']);

      // Genesis 5 legs covering 1..50; Psalms 5 Psalter Books covering 1..150
      expect(GENESIS_TRAIL_LEGS).toHaveLength(5);
      expect(GENESIS_TRAIL_LEGS[0]).toMatchObject({ startChapter: 1, endChapter: 10 });
      expect(GENESIS_TRAIL_LEGS[4]).toMatchObject({ startChapter: 41, endChapter: 50 });

      expect(PSALMS_TRAIL_LEGS).toHaveLength(5);
      expect(PSALMS_TRAIL_LEGS.map((l) => [l.startChapter, l.endChapter])).toEqual([
        [1, 41],
        [42, 72],
        [73, 89],
        [90, 106],
        [107, 150],
      ]);
    });
  });

  it('enforces auth (401/403) in local and entra modes on /api/trail/*', async () => {
    await request(localApp).get('/api/trail/overview').expect(401);
    await request(localApp).get('/api/trail/books/Psalms').expect(401);

    await request(entraApp).get('/api/trail/overview').expect(401);
    await request(entraApp)
      .get('/api/trail/overview')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OTHER_OID)
      .expect(403);

    const okRes = await request(entraApp)
      .get('/api/trail/overview')
      .set('X-MS-CLIENT-PRINCIPAL-ID', OWNER_OID)
      .set('X-MS-CLIENT-PRINCIPAL-NAME', 'Mike')
      .expect(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.data.biomes).toHaveLength(9);
  });

  it('returns accurate overview and per-book waypoint/leg states and responds < 1s for 150 Psalms', async () => {
    // Seed all 150 Psalms (2 verses per chapter = 300 verses) + Genesis ch. 1-2
    const verseDocs: any[] = [];
    let order = 1;
    for (let ch = 1; ch <= 2; ch += 1) {
      verseDocs.push({
        verseOrder: order++,
        book: 'Genesis',
        chapter: ch,
        verse: 1,
        text: `Genesis ${ch}:1`,
        characters: 11,
        words: 2,
      });
    }
    order = 13774;
    for (let ch = 1; ch <= 150; ch += 1) {
      for (let v = 1; v <= 2; v += 1) {
        verseDocs.push({
          verseOrder: order++,
          book: 'Psalms',
          chapter: ch,
          verse: v,
          text: `Psalm ${ch}:${v}`,
          characters: 10,
          words: 2,
        });
      }
    }
    const inserted = await Verse.insertMany(verseDocs);

    // Bloom Psalm 23 (both verses), put Psalm 24 in_progress (1 of 2 verses)
    const ps23Verses = inserted.filter((v) => v.book === 'Psalms' && v.chapter === 23);
    const ps24Verses = inserted.filter((v) => v.book === 'Psalms' && v.chapter === 24);
    const now = new Date();

    await Progress.insertMany([
      {
        user: localUserId,
        verse: ps23Verses[0]._id,
        verseOrder: ps23Verses[0].verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 71,
        bestAccuracy: 98,
        lastAttemptDate: new Date(now.getTime() - 2000),
      },
      {
        user: localUserId,
        verse: ps23Verses[1]._id,
        verseOrder: ps23Verses[1].verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 80,
        bestAccuracy: 99,
        lastAttemptDate: new Date(now.getTime() - 1000),
      },
      {
        user: localUserId,
        verse: ps24Verses[0]._id,
        verseOrder: ps24Verses[0].verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: 65,
        bestAccuracy: 95,
        lastAttemptDate: now,
      },
    ]);

    // Seed companion entries for Psalm 23 + book-introduction for Psalms
    await CompanionEntry.insertMany([
      {
        upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:src:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 23 HF',
        summary: 'S',
        body: 'B',
        source: { sourceId: 'src', title: 'Src' },
        contentHash: 'c1',
      },
      {
        upsertKey: 'web-bible:Psalms:book:book-introduction:historical-classic:ce:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: null,
        entryType: 'book-introduction',
        lens: 'historical-classic',
        visibility: 'public-domain',
        status: 'published',
        sortOrder: 0,
        title: 'Psalms Intro',
        summary: 'S',
        body: 'B',
        source: { sourceId: 'ce', title: 'CE' },
        contentHash: 'c2',
      },
    ]);

    const t0 = Date.now();
    const overviewRes = await request(localApp)
      .get('/api/trail/overview')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    const overviewMs = Date.now() - t0;

    expect(overviewMs).toBeLessThan(1000);
    expect(overviewRes.body.data).toMatchObject({
      workId: 'web-bible',
      totalBooks: 73,
      totalChapters: 1328,
      bloomedChapters: 1,
      inProgressChapters: 1,
      activeTraveler: {
        biomeId: 'twilight-shepherds-sanctuary',
        book: 'Psalms',
        chapter: 24,
      },
    });

    const psalmsBiome = overviewRes.body.data.biomes.find(
      (b: any) => b.biomeId === 'twilight-shepherds-sanctuary'
    );
    expect(psalmsBiome.books[0]).toMatchObject({
      book: 'Psalms',
      sectionKey: 'PSA',
      phase1Active: true,
      totalChapters: 150,
      bloomedChapters: 1,
      inProgressChapters: 1,
      companionChapterCount: 1,
      state: 'in_progress',
      bookMastered: false,
    });

    const t1 = Date.now();
    const bookRes = await request(localApp)
      .get('/api/trail/books/Psalms')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);
    const bookMs = Date.now() - t1;

    expect(bookMs).toBeLessThan(1000);
    const data = bookRes.body.data;
    expect(data).toMatchObject({
      workId: 'web-bible',
      book: 'Psalms',
      sectionKey: 'PSA',
      biomeId: 'twilight-shepherds-sanctuary',
      phase1Active: true,
      bookMastered: false,
      totalChapters: 150,
      bloomedChapters: 1,
      hasBookGuide: true,
      activeChapter: 24,
    });
    expect(data.legs).toHaveLength(5);
    expect(data.legs[0]).toMatchObject({
      legId: 'psa-book-1',
      startChapter: 1,
      endChapter: 41,
      bloomedCount: 1,
      totalCount: 41,
    });
    expect(data.chapters).toHaveLength(150);
    expect(data.chapters[22]).toMatchObject({
      chapter: 23,
      totalVerses: 2,
      completedVerses: 2,
      state: 'bloomed',
      bestWPM: 80,
      bestAccuracy: 99,
      hasCompanion: true,
      lensCounts: { 'hoodoo-folk': 1, 'historical-classic': 0, community: 0 },
    });
    expect(data.chapters[23]).toMatchObject({
      chapter: 24,
      totalVerses: 2,
      completedVerses: 1,
      state: 'in_progress',
      hasCompanion: false,
    });
  });

  it('returns 400 for unknown book or invalid workId', async () => {
    await request(localApp)
      .get('/api/trail/books/NotABook')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);

    await request(localApp)
      .get('/api/trail/overview?workId=invalid-work')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(400);
  });
});
