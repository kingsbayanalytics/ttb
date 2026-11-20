import path from 'path';
import { connectTestDB, disconnectTestDB } from './test-setup';
import { CompanionEntry } from '../models';
import {
  RawCompanionBundle,
  assertPrivatePathSafety,
  importCompanionBundle,
  normalizeLens,
  pruneCompanionSource,
  validateAndNormalizeBundle,
} from '../utils/importCompanion';

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function makeTestBundle(overrides: Partial<RawCompanionBundle> = {}): RawCompanionBundle {
  return {
    schemaVersion: '1.0',
    profile: 'test-pd-source',
    workId: 'web-bible',
    visibility: 'public-domain',
    source: {
      sourceId: 'test-pd-source',
      title: 'Test PD Commentary',
      author: 'Classic Author',
      year: 1859,
    },
    entryCount: 3,
    entries: [
      {
        book: 'Psalms',
        chapter: null,
        entryType: 'book-introduction',
        lens: 'historical-classic',
        title: 'Psalms Intro',
        summary: 'Overview of the Psalter',
        body: 'Intro body.',
        dailySchedule: [{ slot: 'Sunday morning', psalm: 92 }],
      },
      {
        book: 'Psalms',
        chapter: 23,
        entryType: 'chapter-companion',
        lens: 'historical-classic',
        title: 'Psalm 23 Commentary',
        summary: 'The Shepherd Psalm',
        body: 'Detailed public domain notes.',
        ritualTags: ['Shepherd', 'Peace'],
        citedVerses: ['1-6'],
      },
      {
        book: 'Genesis',
        chapter: 1,
        entryType: 'chapter-companion',
        lens: 'hoodoo_folk', // legacy alias normalized -> hoodoo-folk
        title: 'Genesis 1 Folk Note',
        summary: 'Dawn prayer motif',
        body: 'Folkloric context.',
        purposes: [
          {
            title: 'Morning Blessing',
            body: 'Read at dawn for clear beginnings.',
            citedVerses: ['1-3'],
            ritualTags: ['Morning Practice'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('Story 9.2: Idempotent Companion Ingestion CLI & Cosmos Retry', () => {
  beforeAll(async () => {
    await connectTestDB();
    await CompanionEntry.createIndexes();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await CompanionEntry.deleteMany({});
    jest.clearAllMocks();
  });

  it('normalizes legacy lens aliases cleanly', () => {
    expect(normalizeLens('hoodoo-folk')).toBe('hoodoo-folk');
    expect(normalizeLens('hoodoo_folk')).toBe('hoodoo-folk');
    expect(normalizeLens('historical_classic')).toBe('historical-classic');
    expect(normalizeLens('community_reddit')).toBe('community');
    expect(normalizeLens('community-notes')).toBe('community');
    expect(() => normalizeLens('bogus-lens')).toThrow(/Unsupported companion lens/i);
  });

  it('imports a bundle idempotently (second run yields upsertedCount=0 and identical doc count)', async () => {
    const bundle = makeTestBundle();

    const first = await importCompanionBundle({
      bundle,
      batchSize: 2,
      logger: silentLogger,
    });
    expect(first.dryRun).toBe(false);
    expect(first.upsertedCount).toBe(3);
    expect(first.batches).toBe(2);
    expect(await CompanionEntry.countDocuments()).toBe(3);

    const second = await importCompanionBundle({
      bundle,
      batchSize: 2,
      logger: silentLogger,
    });
    expect(second.upsertedCount).toBe(0);
    expect(second.matchedCount).toBe(3);
    expect(await CompanionEntry.countDocuments()).toBe(3);

    const gen1 = await CompanionEntry.findOne({ book: 'Genesis', chapter: 1 }).lean();
    expect(gen1?.lens).toBe('hoodoo-folk');
    expect(gen1?.sectionKey).toBe('GEN');
    expect(gen1?.ritualTags).toContain('Morning Practice');
    expect(gen1?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('supports --dry-run without mutating the database', async () => {
    const summary = await importCompanionBundle({
      bundle: makeTestBundle(),
      dryRun: true,
      logger: silentLogger,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.stats.importedCount).toBe(3);
    expect(summary.stats.byBook).toEqual({ Psalms: 2, Genesis: 1 });
    expect(summary.stats.dailyScheduleCount).toBe(1);
    expect(await CompanionEntry.countDocuments()).toBe(0);
  });

  it('skips draft entries by default and imports them with includeDrafts=true', async () => {
    const bundle = makeTestBundle({
      entries: [
        ...(makeTestBundle().entries ?? []),
        {
          book: 'Genesis',
          chapter: 2,
          entryType: 'chapter-companion',
          lens: 'historical-classic',
          status: 'draft',
          title: 'Draft Genesis 2',
          summary: 'WIP',
          body: 'Draft text',
        },
      ],
    });

    const skippedRes = await importCompanionBundle({
      bundle,
      logger: silentLogger,
    });
    expect(skippedRes.stats.skippedDrafts).toBe(1);
    expect(skippedRes.upsertedCount).toBe(3);

    const includedRes = await importCompanionBundle({
      bundle,
      includeDrafts: true,
      logger: silentLogger,
    });
    expect(includedRes.stats.skippedDrafts).toBe(0);
    expect(includedRes.upsertedCount).toBe(1);
    expect(await CompanionEntry.countDocuments()).toBe(4);
  });

  it('retries Cosmos DB 16500 / 429 throttling with partial-batch narrowing and converges cleanly', async () => {
    const bundle = makeTestBundle();
    const sleeps: number[] = [];
    let attempt = 0;

    const mockBulkWrite = jest.fn(async (ops: any[]) => {
      attempt += 1;
      if (attempt === 1) {
        // Partial batch failure: op 0 succeeded, ops 1 and 2 throttled with 16500
        const err: any = new Error('RequestRateTooLarge RetryAfterMs=25');
        err.code = 16500;
        err.writeErrors = [
          { index: 1, code: 16500, errmsg: '16500 RetryAfterMs=25' },
          { index: 2, code: 429, errmsg: '429 TooManyRequests' },
        ];
        err.result = { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        throw err;
      }
      // Second call must receive only the 2 narrowed failed ops
      expect(ops).toHaveLength(2);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 2 };
    });

    const summary = await importCompanionBundle({
      bundle,
      batchSize: 50,
      bulkWriteFn: mockBulkWrite,
      baseDelayMs: 10,
      maxDelayMs: 500,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      logger: silentLogger,
    });

    expect(mockBulkWrite).toHaveBeenCalledTimes(2);
    expect(summary.retries).toBe(1);
    expect(summary.upsertedCount).toBe(3);
    expect(sleeps).toEqual([25]);
  });

  it('prunes only entries belonging to --prune-source and archives missing entries with --archive-missing-for-source', async () => {
    const b1 = makeTestBundle();
    const b2 = makeTestBundle({
      profile: 'other-source',
      source: { sourceId: 'other-source', title: 'Other Source' },
      entries: [
        {
          book: 'Genesis',
          chapter: 12,
          entryType: 'chapter-companion',
          lens: 'historical-classic',
          title: 'Other Genesis 12',
          summary: 'Summary',
          body: 'Body',
        },
      ],
    });

    await importCompanionBundle({ bundle: b1, logger: silentLogger });
    await importCompanionBundle({ bundle: b2, logger: silentLogger });
    expect(await CompanionEntry.countDocuments()).toBe(4);

    // Re-import b1 with Genesis 1 removed + archiveMissingForSource
    const b1Trimmed = makeTestBundle({
      entries: (b1.entries ?? []).filter((e) => e.book === 'Psalms'),
    });
    const archiveRes = await importCompanionBundle({
      bundle: b1Trimmed,
      archiveMissingForSource: 'test-pd-source',
      logger: silentLogger,
    });
    expect(archiveRes.archivedCount).toBe(1);

    const archivedGen1 = await CompanionEntry.findOne({
      'source.sourceId': 'test-pd-source',
      book: 'Genesis',
      chapter: 1,
    }).lean();
    expect(archivedGen1?.status).toBe('archived');

    // Prune test-pd-source -> leaves other-source untouched
    const pruned = await pruneCompanionSource('test-pd-source', silentLogger);
    expect(pruned.deletedCount).toBe(3);
    expect(await CompanionEntry.countDocuments()).toBe(1);
    const remaining = await CompanionEntry.findOne().lean();
    expect(remaining?.source.sourceId).toBe('other-source');
  });

  it('rejects out-of-range canonical chapters, duplicate upsertKeys, and tracked-path private-owner files', () => {
    // Out-of-range chapter (Genesis 51)
    expect(() =>
      validateAndNormalizeBundle(
        makeTestBundle({
          entries: [
            {
              book: 'Genesis',
              chapter: 51,
              entryType: 'chapter-companion',
              lens: 'historical-classic',
              title: 'Invalid Chapter',
              summary: 'S',
              body: 'B',
            },
          ],
        })
      )
    ).toThrow(/out of canonical range/i);

    // Duplicate upsertKey inside same bundle
    expect(() =>
      validateAndNormalizeBundle(
        makeTestBundle({
          entries: [
            {
              book: 'Psalms',
              chapter: 23,
              entryType: 'chapter-companion',
              lens: 'historical-classic',
              title: 'First',
              summary: 'S',
              body: 'B',
            },
            {
              book: 'Psalms',
              chapter: 23,
              entryType: 'chapter-companion',
              lens: 'historical-classic',
              title: 'Duplicate',
              summary: 'S',
              body: 'B',
            },
          ],
        })
      )
    ).toThrow(/duplicate upsertKey/i);

    // Git-safety check for private-owner inside tracked repo folder
    const fakeRepo = '/tmp/fake-ttb-repo';
    expect(() =>
      assertPrivatePathSafety(
        path.join(fakeRepo, 'data/companion-seeds/private.json'),
        [{ visibility: 'private-owner' }],
        { repoRoot: fakeRepo }
      )
    ).toThrow(/Refusing to import visibility="private-owner"/i);

    // Allowed when inside data/private-sources/
    expect(() =>
      assertPrivatePathSafety(
        path.join(fakeRepo, 'data/private-sources/extracted/book.json'),
        [{ visibility: 'private-owner' }],
        { repoRoot: fakeRepo }
      )
    ).not.toThrow();

    // Allowed when explicitly overridden
    expect(() =>
      assertPrivatePathSafety(
        path.join(fakeRepo, 'data/companion-seeds/private.json'),
        [{ visibility: 'private-owner' }],
        { repoRoot: fakeRepo, allowNonstandardPrivatePath: true }
      )
    ).not.toThrow();
  });

  it('validates and idempotently imports the shipped Phase 1 PD seed bundle (Genesis + Psalms)', async () => {
    const seedPath = path.resolve(
      __dirname,
      '../../../data/companion-seeds/phase1-pd-genesis-psalms.json'
    );

    const run1 = await importCompanionBundle({
      filePath: seedPath,
      logger: silentLogger,
    });
    expect(run1.stats.importedCount).toBeGreaterThanOrEqual(30);
    expect(run1.stats.byVisibility).toEqual({ 'public-domain': run1.stats.importedCount });
    expect(run1.stats.byBook.Genesis).toBeGreaterThanOrEqual(8);
    expect(run1.stats.byBook.Psalms).toBeGreaterThanOrEqual(15);
    expect(run1.upsertedCount).toBe(run1.stats.importedCount);

    const run2 = await importCompanionBundle({
      filePath: seedPath,
      logger: silentLogger,
    });
    expect(run2.upsertedCount).toBe(0);
    expect(await CompanionEntry.countDocuments()).toBe(run1.stats.importedCount);
  });
});
