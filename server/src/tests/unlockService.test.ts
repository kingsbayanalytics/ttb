import request from 'supertest';
import { connectTestDB, disconnectTestDB, setupTestApp } from './test-setup';
import { CompanionEntry, Progress, Result, User, Verse } from '../models';
import {
  computePropJustAwakened,
  getBookChaptersStatus,
  getChapterStatus,
  resetChapterManifestCache,
} from '../services/companion/unlockService';

describe('Story 9.4: Derived Chapter Unlock Service & chapterJustUnlocked Hook', () => {
  const app = setupTestApp({ authMode: 'local' });
  let authToken = '';
  let userId = '';

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

    const regRes = await request(app)
      .post('/api/users')
      .send({
        username: 'mike',
        email: 'mike@example.com',
        password: 'password123',
      })
      .expect(201);

    authToken = regRes.body.data.token;
    userId = regRes.body.data._id;
  });

  async function seedPsalm23AndCompanion() {
    const verses = await Verse.insertMany([
      {
        verseOrder: 14001,
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'Yahweh is my shepherd: I shall lack nothing.',
        characters: 44,
        words: 8,
      },
      {
        verseOrder: 14002,
        book: 'Psalms',
        chapter: 23,
        verse: 2,
        text: 'He makes me lie down in green pastures.',
        characters: 39,
        words: 7,
      },
      {
        verseOrder: 14003,
        book: 'Psalms',
        chapter: 23,
        verse: 3,
        text: 'He restores my soul.',
        characters: 20,
        words: 4,
      },
    ]);

    await CompanionEntry.insertMany([
      {
        upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:src-a:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Hoodoo Note',
        summary: 'Summary',
        body: 'Body',
        source: { sourceId: 'src-a', title: 'Source A' },
        contentHash: 'h1',
      },
      {
        upsertKey: 'web-bible:Psalms:23:chapter-companion:historical-classic:src-b:0',
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'historical-classic',
        visibility: 'public-domain',
        status: 'published',
        sortOrder: 0,
        title: 'Historical Note',
        summary: 'Summary',
        body: 'Body',
        source: { sourceId: 'src-b', title: 'Source B' },
        contentHash: 'h2',
      },
    ]);

    return verses;
  }

  function submitPayload(verse: any, wpm = 72, accuracy = 98) {
    const now = new Date();
    return {
      verseOrder: verse.verseOrder,
      startTime: new Date(now.getTime() - 5000).toISOString(),
      endTime: now.toISOString(),
      duration: 5000,
      wpm,
      cps: 6,
      accuracy,
      incorrectCharacters: 1,
      totalCharacters: verse.characters,
    };
  }

  it('transitions chapter dormant -> in_progress -> bloomed, emits chapterJustUnlocked ONLY once, and reverts on result delete', async () => {
    const verses = await seedPsalm23AndCompanion();

    // Initially dormant
    const initial = await getChapterStatus(userId, 'Psalms', 23);
    expect(initial).toMatchObject({
      book: 'Psalms',
      chapter: 23,
      totalVerses: 3,
      completedVerses: 0,
      state: 'dormant',
      unlocked: false,
      unlockedAt: null,
    });

    // Submit verse 1 -> in_progress, chapterJustUnlocked = null
    const res1 = await request(app)
      .post(`/api/progress/result/${verses[0]._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(submitPayload(verses[0], 68, 97))
      .expect(201);
    expect(res1.body.data.chapterJustUnlocked).toBeNull();

    const mid = await getChapterStatus(userId, 'Psalms', 23);
    expect(mid.state).toBe('in_progress');
    expect(mid.completedVerses).toBe(1);
    expect(mid.unlocked).toBe(false);

    // Submit verse 2 -> still in_progress
    const res2 = await request(app)
      .post(`/api/progress/result/${verses[1]._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(submitPayload(verses[1], 75, 99))
      .expect(201);
    expect(res2.body.data.chapterJustUnlocked).toBeNull();

    // Submit final verse 3 -> chapterJustUnlocked fires!
    const res3 = await request(app)
      .post(`/api/progress/result/${verses[2]._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(submitPayload(verses[2], 82, 100))
      .expect(201);

    expect(res3.body.data.chapterJustUnlocked).toMatchObject({
      workId: 'web-bible',
      book: 'Psalms',
      chapter: 23,
      totalVerses: 3,
      companionCount: 2,
      availableLenses: ['hoodoo-folk', 'historical-classic'],
    });
    expect(typeof res3.body.data.chapterJustUnlocked.unlockedAt).toBe('string');

    const bloomed = await getChapterStatus(userId, 'Psalms', 23);
    expect(bloomed).toMatchObject({
      state: 'bloomed',
      unlocked: true,
      completedVerses: 3,
      totalVerses: 3,
      bestWPM: 82,
      bestAccuracy: 100,
    });
    expect(bloomed.unlockedAt).not.toBeNull();

    // Re-typing verse 3 -> fast path returns chapterJustUnlocked=null with 0 Progress.countDocuments calls!
    const countSpy = jest.spyOn(Progress, 'countDocuments');
    const retypeRes = await request(app)
      .post(`/api/progress/result/${verses[2]._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(submitPayload(verses[2], 90, 100))
      .expect(201);
    expect(retypeRes.body.data.chapterJustUnlocked).toBeNull();
    expect(countSpy).not.toHaveBeenCalled();
    countSpy.mockRestore();

    // Delete the only Result for verse 1 -> recomputeVerseProgress() immediately reverts chapter to in_progress
    const result1Id = res1.body.data.result._id;
    await request(app)
      .delete(`/api/progress/result/${result1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const reverted = await getChapterStatus(userId, 'Psalms', 23);
    expect(reverted.state).toBe('in_progress');
    expect(reverted.unlocked).toBe(false);
    expect(reverted.completedVerses).toBe(2);
    expect(reverted.unlockedAt).toBeNull();
  });

  it('derives all chapters for a book in ascending order via a single indexed scan', async () => {
    await Verse.insertMany([
      { verseOrder: 1, book: 'Genesis', chapter: 1, verse: 1, text: 'Gen 1:1', characters: 7, words: 2 },
      { verseOrder: 2, book: 'Genesis', chapter: 1, verse: 2, text: 'Gen 1:2', characters: 7, words: 2 },
      { verseOrder: 3, book: 'Genesis', chapter: 2, verse: 1, text: 'Gen 2:1', characters: 7, words: 2 },
      { verseOrder: 4, book: 'Genesis', chapter: 3, verse: 1, text: 'Gen 3:1', characters: 7, words: 2 },
    ]);

    const verses = await Verse.find({ book: 'Genesis' }).sort({ verseOrder: 1 });
    await Progress.create([
      { user: userId, verse: verses[0]._id, verseOrder: 1, completed: true, attempts: 1, bestWPM: 60, bestAccuracy: 98, lastAttemptDate: new Date() },
      { user: userId, verse: verses[2]._id, verseOrder: 3, completed: true, attempts: 1, bestWPM: 70, bestAccuracy: 99, lastAttemptDate: new Date() },
    ]);

    const chapters = await getBookChaptersStatus(userId, 'Genesis');
    expect(chapters.map((c) => ({ ch: c.chapter, state: c.state }))).toEqual([
      { ch: 1, state: 'in_progress' },
      { ch: 2, state: 'bloomed' },
      { ch: 3, state: 'dormant' },
    ]);
  });

  it('computes waking yard prop transitions across thresholds via computePropJustAwakened', () => {
    expect(computePropJustAwakened(1, 14)).toBe('bottle-tree');
    expect(computePropJustAwakened(2, 14)).toBe('herb-rack');
    expect(computePropJustAwakened(3, 14)).toBeNull();
    expect(computePropJustAwakened(4, 14)).toBe('river-cairn');
    expect(computePropJustAwakened(10, 10)).toBe('elder-keeper');
    expect(computePropJustAwakened(14, 14)).toBe('elder-keeper');
  });

  it('attaches trailStep telemetry with clearing progress and propJustAwakened on Phase 1 blooms', async () => {
    const psalmVerses = await Verse.insertMany([
      { verseOrder: 14101, book: 'Psalms', chapter: 1, verse: 1, text: 'Psalm 1:1', characters: 9, words: 2 },
      { verseOrder: 14201, book: 'Psalms', chapter: 2, verse: 1, text: 'Psalm 2:1', characters: 9, words: 2 },
      { verseOrder: 14301, book: 'Psalms', chapter: 3, verse: 1, text: 'Psalm 3:1', characters: 9, words: 2 },
      { verseOrder: 14401, book: 'Psalms', chapter: 4, verse: 1, text: 'Psalm 4:1', characters: 9, words: 2 },
    ]);

    const expectedProps: Array<string | null> = [
      'bottle-tree',
      'herb-rack',
      null,
      'river-cairn',
    ];

    for (let i = 0; i < psalmVerses.length; i += 1) {
      const v = psalmVerses[i];
      const res = await request(app)
        .post(`/api/progress/result/${v._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(submitPayload(v, 76, 99))
        .expect(201);

      expect(res.body.data.chapterJustUnlocked).toMatchObject({
        book: 'Psalms',
        chapter: i + 1,
        trailStep: {
          clearingId: 'psa-book-1-c1',
          clearingBloomed: i + 1,
          clearingTotal: 14,
          nextChapter: i + 2,
          propJustAwakened: expectedProps[i],
        },
      });
    }
  });
});
