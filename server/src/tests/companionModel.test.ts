import { connectTestDB, disconnectTestDB } from './test-setup';
import { CompanionEntry } from '../models';
import { buildCompanionUpsertKey } from '../models/CompanionEntry';
import {
  CANONICAL_BOOK_ORDER,
  USFM_TO_CANONICAL_BOOK,
} from '../utils/bookMapping';
import {
  CANONICAL_CHAPTER_COUNTS,
  CANONICAL_TOTAL_BOOKS,
  CANONICAL_TOTAL_CHAPTERS,
  DEFAULT_WORK_ID,
  canonicalBookToUsfm,
  getCanonicalChapterCount,
  getWorkMeta,
  isAllowedWorkId,
  isValidCanonicalChapter,
  usfmToCanonicalBook,
} from '../utils/companionWorks';

describe('Story 9.1: CompanionEntry model & companionWorks registry', () => {
  beforeAll(async () => {
    await connectTestDB();
    await CompanionEntry.createIndexes();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await CompanionEntry.deleteMany({});
  });

  describe('companionWorks registry', () => {
    it('exposes exact WEB Catholic metadata (73 books, 1,328 chapters) and bidirectional USFM mapping', () => {
      const meta = getWorkMeta(DEFAULT_WORK_ID);
      expect(meta).toEqual({
        workId: 'web-bible',
        title: 'World English Bible (Catholic)',
        totalSections: 73,
        totalUnits: 1328,
        isBible: true,
      });
      expect(CANONICAL_TOTAL_BOOKS).toBe(73);
      expect(CANONICAL_TOTAL_CHAPTERS).toBe(1328);
      expect(isAllowedWorkId('web-bible')).toBe(true);
      expect(isAllowedWorkId('unknown-work')).toBe(false);

      expect(canonicalBookToUsfm('Genesis')).toBe('GEN');
      expect(canonicalBookToUsfm('Psalms')).toBe('PSA');
      expect(usfmToCanonicalBook('PSA')).toBe('Psalms');
      expect(usfmToCanonicalBook('esg')).toBe('Esther');
      expect(usfmToCanonicalBook('dag')).toBe('Daniel');

      // Every canonical book in bookMapping.ts has a valid chapter count
      for (const book of CANONICAL_BOOK_ORDER) {
        expect(CANONICAL_CHAPTER_COUNTS[book]).toBeGreaterThanOrEqual(1);
        const code = canonicalBookToUsfm(book);
        expect(USFM_TO_CANONICAL_BOOK[code]).toBe(book);
      }

      expect(getCanonicalChapterCount('Genesis')).toBe(50);
      expect(getCanonicalChapterCount('Psalms')).toBe(150);
      expect(getCanonicalChapterCount('Esther')).toBe(10);
      expect(getCanonicalChapterCount('Daniel')).toBe(14);
      expect(isValidCanonicalChapter('Genesis', 50)).toBe(true);
      expect(isValidCanonicalChapter('Genesis', 51)).toBe(false);
      expect(isValidCanonicalChapter('Psalms', 150)).toBe(true);
      expect(isValidCanonicalChapter('Psalms', 0)).toBe(false);
    });
  });

  describe('CompanionEntry schema & indexes', () => {
    it('syncs the 4 expected Cosmos-safe indexes on companionentries', async () => {
      const indexes = await CompanionEntry.collection.indexes();
      const indexNames = indexes.map((i) => JSON.stringify(i.key));
      expect(indexNames).toContain(JSON.stringify({ upsertKey: 1 }));
      expect(indexNames).toContain(
        JSON.stringify({
          workId: 1,
          book: 1,
          chapter: 1,
          status: 1,
          lens: 1,
          sortOrder: 1,
        })
      );
      expect(indexNames).toContain(
        JSON.stringify({
          workId: 1,
          book: 1,
          entryType: 1,
          status: 1,
        })
      );
      expect(indexNames).toContain(
        JSON.stringify({
          workId: 1,
          status: 1,
          lens: 1,
          ritualTags: 1,
        })
      );
    });

    it('persists chapter-companion (with Psalm 119 octaves), book-introduction (chapter: null + dailySchedule), and non-Bible workId', async () => {
      const octaves = [
        { octave: 'ALEPH', verseRange: '1-8' },
        { octave: 'BETH', verseRange: '9-16' },
        { octave: 'TAU', verseRange: '169-176' },
      ];

      const ps119 = await CompanionEntry.create({
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 119,
        entryType: 'chapter-companion',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        status: 'published',
        sortOrder: 0,
        title: 'Psalm 119 — Alphabetical Meditations',
        summary: 'Twenty-two Hebrew letter octaves for steady craft.',
        body: 'Structured meditation across the 22 Hebrew octaves.',
        purposes: octaves.map((o) => ({
          title: `${o.octave} Meditation`,
          body: `Commentary for ${o.octave} (${o.verseRange}).`,
          page: 90,
          citedVerses: [o.verseRange],
          ritualTags: ['White Candle'],
          octave: o.octave,
          verseRange: o.verseRange,
        })),
        indexPurposes: [
          { purpose: 'Steadfast memory', source: 'powers-index', verseRange: '1-8' },
        ],
        ritualTags: ['White Candle'],
        citedVerses: ['1-8', '9-16', '169-176'],
        source: {
          sourceId: 'test-psalter',
          title: 'Test Psalter Guide',
          author: 'Test Author',
          year: 1982,
          pages: [90, 91],
        },
        contentHash: 'hash-ps119',
      });

      expect(ps119.upsertKey).toBe(
        buildCompanionUpsertKey({
          workId: 'web-bible',
          book: 'Psalms',
          chapter: 119,
          entryType: 'chapter-companion',
          lens: 'hoodoo-folk',
          sourceId: 'test-psalter',
          sortOrder: 0,
        })
      );
      expect(ps119.purposes).toHaveLength(3);
      expect(ps119.purposes[0].octave).toBe('ALEPH');
      expect((ps119.purposes[0] as any)._id).toBeUndefined();

      const intro = await CompanionEntry.create({
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: null,
        entryType: 'book-introduction',
        lens: 'hoodoo-folk',
        visibility: 'private-owner',
        title: 'Book of Psalms Introduction & Weekly Prayer Schedule',
        summary: 'Fourteen morning and evening slots across the week.',
        body: 'Weekly morning and evening devotional schedule.',
        dailySchedule: [
          { slot: 'Sunday morning', psalm: 92, book: 'Psalms', chapter: 92 },
          { slot: 'Sunday evening', psalm: 23, book: 'Psalms', chapter: 23 },
        ],
        source: {
          sourceId: 'test-psalter',
          title: 'Test Psalter Guide',
        },
        contentHash: 'hash-intro',
      });

      expect(intro.chapter).toBeNull();
      expect(intro.dailySchedule).toHaveLength(2);
      expect(intro.upsertKey).toContain(':book:book-introduction:');

      const nonBible = await CompanionEntry.create({
        workId: 'du-bois-souls-1903',
        sectionKey: 'ch-01',
        book: 'Of Our Spiritual Strivings',
        chapter: 1,
        entryType: 'chapter-companion',
        lens: 'historical-classic',
        visibility: 'public-domain',
        title: 'Double-Consciousness and the Veil',
        summary: 'Historical context for Chapter I of The Souls of Black Folk (1903).',
        body: 'Public-domain historical notes.',
        source: {
          sourceId: 'dubois-1903-notes',
          title: 'Public Domain Literary Notes',
          year: 1903,
        },
        contentHash: 'hash-dubois',
      });

      expect(nonBible.workId).toBe('du-bois-souls-1903');
      expect(nonBible.sectionKey).toBe('ch-01');
    });

    it('rejects duplicate upsertKey values', async () => {
      const base = {
        workId: 'web-bible',
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion' as const,
        lens: 'historical-classic' as const,
        visibility: 'public-domain' as const,
        title: 'Psalm 23 Classic',
        summary: 'Summary',
        body: 'Body',
        source: { sourceId: 'haydock-1859', title: 'Haydock' },
        contentHash: 'hash-1',
      };

      await CompanionEntry.create(base);
      await expect(CompanionEntry.create({ ...base, contentHash: 'hash-2' })).rejects.toThrow(
        /E11000|duplicate/i
      );
    });

    it('enforces chapter nullability rules, externalUrl https:// validation, and quoteExcerpt <= 400 chars', async () => {
      const common = {
        workId: 'web-bible',
        sectionKey: 'GEN',
        book: 'Genesis',
        lens: 'historical-classic' as const,
        visibility: 'public-domain' as const,
        title: 'Test',
        summary: 'Summary',
        body: 'Body',
        source: { sourceId: 'test-src', title: 'Test Source' },
        contentHash: 'hash-x',
      };

      // chapter-companion with null chapter -> rejected
      await expect(
        CompanionEntry.create({
          ...common,
          entryType: 'chapter-companion',
          chapter: null,
        })
      ).rejects.toThrow(/chapter must be a positive integer/i);

      // book-introduction with non-null chapter -> rejected
      await expect(
        CompanionEntry.create({
          ...common,
          entryType: 'book-introduction',
          chapter: 1,
        })
      ).rejects.toThrow(/chapter must be null/i);

      // non-https externalUrl -> rejected
      await expect(
        CompanionEntry.create({
          ...common,
          entryType: 'chapter-companion',
          chapter: 1,
          externalUrl: 'javascript:alert(1)',
        })
      ).rejects.toThrow(/https:\/\//i);

      await expect(
        CompanionEntry.create({
          ...common,
          entryType: 'chapter-companion',
          chapter: 1,
          externalUrl: 'http://example.com',
        })
      ).rejects.toThrow(/https:\/\//i);

      // quoteExcerpt > 400 chars -> rejected
      await expect(
        CompanionEntry.create({
          ...common,
          entryType: 'chapter-companion',
          chapter: 1,
          quoteExcerpt: 'x'.repeat(401),
        })
      ).rejects.toThrow(/400/i);
    });
  });
});
