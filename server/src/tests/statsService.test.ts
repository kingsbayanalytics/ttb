import {
  buildActivity,
  buildCoverage,
  buildStreaksAndBadges,
  buildTrend,
  buildWeaknessReport,
  isValidTimeZone,
  isValidTrendRange,
} from '../services/stats';
import {
  CANONICAL_BOOK_ORDER,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  getBookTestament,
} from '../utils/bookMapping';

describe('stats service (Story 2.1 pure functions)', () => {
  describe('bookMapping Testament metadata', () => {
    it('partitions all 73 canonical books into 46 Old Testament and 27 New Testament books', () => {
      expect(CANONICAL_BOOK_ORDER).toHaveLength(73);
      expect(OLD_TESTAMENT_BOOKS).toHaveLength(46);
      expect(NEW_TESTAMENT_BOOKS).toHaveLength(27);
      expect(OLD_TESTAMENT_BOOKS[0]).toBe('Genesis');
      expect(OLD_TESTAMENT_BOOKS[45]).toBe('Daniel');
      expect(NEW_TESTAMENT_BOOKS[0]).toBe('Matthew');
      expect(NEW_TESTAMENT_BOOKS[26]).toBe('Revelation');
      expect(getBookTestament('Tobit')).toBe('Old Testament');
      expect(getBookTestament('1 John')).toBe('New Testament');
      expect(getBookTestament('Unknown')).toBeUndefined();
    });
  });

  describe('validation helpers', () => {
    it('validates IANA timezones and trend ranges', () => {
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('America/New_York')).toBe(true);
      expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone('Invalid/Zone')).toBe(false);

      expect(isValidTrendRange('30')).toBe(true);
      expect(isValidTrendRange('90')).toBe(true);
      expect(isValidTrendRange('365')).toBe(true);
      expect(isValidTrendRange('all')).toBe(true);
      expect(isValidTrendRange('7')).toBe(false);
    });
  });

  describe('buildTrend', () => {
    it('buckets near-midnight and DST spring-forward timestamps in America/New_York matching hand computation', () => {
      // 2026-03-08 is US DST spring forward (EST -05:00 -> EDT -04:00 at 02:00 local / 07:00 UTC)
      const rows = [
        // 2026-03-07 23:59:59 EST (still Mar 7 in NY, Mar 8 in UTC)
        { startTime: '2026-03-08T04:59:59.000Z', wpm: 40, accuracy: 90 },
        // 2026-03-07 12:00:00 EST
        { startTime: '2026-03-07T17:00:00.000Z', wpm: 60, accuracy: 100 },
        // 2026-03-08 00:00:00 EST (first second of Mar 8 in NY)
        { startTime: '2026-03-08T05:00:00.000Z', wpm: 50, accuracy: 94 },
        // 2026-03-08 23:59:59 EDT (only 23h in this local day! 2026-03-09T03:59:59Z)
        { startTime: '2026-03-09T03:59:59.000Z', wpm: 70, accuracy: 98 },
        // 2026-03-09 00:00:00 EDT (2026-03-09T04:00:00Z)
        { startTime: '2026-03-09T04:00:00.000Z', wpm: 80, accuracy: 99 },
      ];

      const nyTrend = buildTrend(
        rows,
        'America/New_York',
        '30',
        new Date('2026-03-10T12:00:00.000Z')
      );

      expect(nyTrend).toEqual([
        { date: '2026-03-07', avgWpm: 50, avgAccuracy: 95, attempts: 2 },
        { date: '2026-03-08', avgWpm: 60, avgAccuracy: 96, attempts: 2 },
        { date: '2026-03-09', avgWpm: 80, avgAccuracy: 99, attempts: 1 },
      ]);

      // In UTC, 2026-03-08T04:59:59Z and 2026-03-08T05:00:00Z both land on 2026-03-08
      const utcTrend = buildTrend(rows, 'UTC', '30', new Date('2026-03-10T12:00:00.000Z'));
      expect(utcTrend).toEqual([
        { date: '2026-03-07', avgWpm: 60, avgAccuracy: 100, attempts: 1 },
        { date: '2026-03-08', avgWpm: 45, avgAccuracy: 92, attempts: 2 },
        { date: '2026-03-09', avgWpm: 75, avgAccuracy: 98.5, attempts: 2 },
      ]);
    });

    it('buckets DST fall-back 25-hour day correctly in America/New_York', () => {
      // 2026-11-01 is US DST fall back (EDT -04:00 -> EST -05:00 at 06:00 UTC)
      const rows = [
        { startTime: '2026-11-01T04:30:00.000Z', wpm: 50, accuracy: 92 }, // 00:30 EDT Nov 1
        { startTime: '2026-11-02T04:30:00.000Z', wpm: 70, accuracy: 96 }, // 23:30 EST Nov 1
        { startTime: '2026-11-02T05:00:00.000Z', wpm: 90, accuracy: 100 }, // 00:00 EST Nov 2
      ];

      const trend = buildTrend(
        rows,
        'America/New_York',
        '30',
        new Date('2026-11-03T12:00:00.000Z')
      );

      expect(trend).toEqual([
        { date: '2026-11-01', avgWpm: 60, avgAccuracy: 94, attempts: 2 },
        { date: '2026-11-02', avgWpm: 90, avgAccuracy: 100, attempts: 1 },
      ]);
    });

    it('filters by range (30 / 90 / 365 / all) relative to now in target timezone', () => {
      const now = new Date('2026-11-17T15:00:00.000Z');
      const rows = [
        { startTime: '2025-01-01T12:00:00.000Z', wpm: 30, accuracy: 80 }, // > 365 days ago
        { startTime: '2026-01-01T12:00:00.000Z', wpm: 40, accuracy: 85 }, // within 365
        { startTime: '2026-09-01T12:00:00.000Z', wpm: 50, accuracy: 90 }, // within 90
        { startTime: '2026-10-19T12:00:00.000Z', wpm: 60, accuracy: 95 }, // 30th day inclusive (Nov 17 - 29d = Oct 19)
        { startTime: '2026-10-18T12:00:00.000Z', wpm: 55, accuracy: 92 }, // 31 days ago (excluded from 30)
      ];

      expect(buildTrend(rows, 'UTC', '30', now).map((p) => p.date)).toEqual(['2026-10-19']);
      expect(buildTrend(rows, 'UTC', '90', now).map((p) => p.date)).toEqual([
        '2026-09-01',
        '2026-10-18',
        '2026-10-19',
      ]);
      expect(buildTrend(rows, 'UTC', '365', now).map((p) => p.date)).toEqual([
        '2026-01-01',
        '2026-09-01',
        '2026-10-18',
        '2026-10-19',
      ]);
      expect(buildTrend(rows, 'UTC', 'all', now).map((p) => p.date)).toEqual([
        '2025-01-01',
        '2026-01-01',
        '2026-09-01',
        '2026-10-18',
        '2026-10-19',
      ]);
    });

    it('throws on invalid timezone or range', () => {
      expect(() => buildTrend([], 'Mars/Olympus', '30')).toThrow();
      expect(() => buildTrend([], 'UTC', '7' as any)).toThrow();
    });
  });

  describe('buildActivity', () => {
    it('returns active days only for the requested year in the supplied timezone', () => {
      const rows = [
        // 2025-12-31 21:00 EST in NY -> 2026-01-01 02:00 UTC
        { startTime: '2026-01-01T02:00:00.000Z' },
        { startTime: '2026-01-01T15:00:00.000Z' }, // 2026-01-01 in both
        { startTime: '2026-06-15T20:00:00.000Z' },
        { startTime: '2026-06-15T21:00:00.000Z' },
      ];

      expect(buildActivity(rows, 'America/New_York', 2025)).toEqual([
        { date: '2025-12-31', attempts: 1 },
      ]);
      expect(buildActivity(rows, 'America/New_York', 2026)).toEqual([
        { date: '2026-01-01', attempts: 1 },
        { date: '2026-06-15', attempts: 2 },
      ]);
      expect(buildActivity(rows, 'UTC', 2026)).toEqual([
        { date: '2026-01-01', attempts: 2 },
        { date: '2026-06-15', attempts: 2 },
      ]);
    });

    it('throws on invalid year or timezone', () => {
      expect(() => buildActivity([], 'UTC', 1800)).toThrow();
      expect(() => buildActivity([], 'Invalid/Zone', 2026)).toThrow();
    });
  });

  describe('buildCoverage', () => {
    it('computes overall, Testament, and canonical 73-book coverage from verse index', () => {
      const verseIndex = [
        { _id: 'v1', book: 'Genesis' },
        { _id: 'v2', book: 'Genesis' },
        { _id: 'v3', book: 'Genesis' },
        { _id: 'v4', book: 'Tobit' },
        { _id: 'v5', book: 'Matthew' },
        { _id: 'v6', book: 'Revelation' },
      ];

      // Duplicate 'v1' and unknown 'missing' should be deduplicated / ignored safely
      const coverage = buildCoverage(['v1', 'v1', 'v2', 'v5', 'missing'], verseIndex);

      expect(coverage.overall).toEqual({
        totalVerses: 6,
        completedVerses: 3,
        percentage: 50,
      });

      expect(coverage.testaments).toEqual([
        {
          testament: 'Old Testament',
          totalVerses: 4,
          completedVerses: 2,
          percentage: 50,
        },
        {
          testament: 'New Testament',
          totalVerses: 2,
          completedVerses: 1,
          percentage: 50,
        },
      ]);

      expect(coverage.books).toHaveLength(73);
      expect(coverage.books.map((b) => b.book)).toEqual(CANONICAL_BOOK_ORDER);
      expect(coverage.books[0]).toEqual({
        book: 'Genesis',
        testament: 'Old Testament',
        totalVerses: 3,
        completedVerses: 2,
        percentage: 66.7,
      });
      expect(coverage.books.find((b) => b.book === 'Tobit')).toEqual({
        book: 'Tobit',
        testament: 'Old Testament',
        totalVerses: 1,
        completedVerses: 0,
        percentage: 0,
      });
      expect(coverage.books.find((b) => b.book === 'Matthew')).toEqual({
        book: 'Matthew',
        testament: 'New Testament',
        totalVerses: 1,
        completedVerses: 1,
        percentage: 100,
      });
    });

    it('supports pre-aggregated totalByBook + verseToBook maps', () => {
      const coverage = buildCoverage(['v1', 'v2'], {
        totalByBook: { Genesis: 4, Psalms: 2, John: 4 },
        verseToBook: { v1: 'Genesis', v2: 'John' },
      });

      expect(coverage.overall).toEqual({
        totalVerses: 10,
        completedVerses: 2,
        percentage: 20,
      });
      expect(coverage.testaments[0]).toEqual({
        testament: 'Old Testament',
        totalVerses: 6,
        completedVerses: 1,
        percentage: 16.7,
      });
      expect(coverage.testaments[1]).toEqual({
        testament: 'New Testament',
        totalVerses: 4,
        completedVerses: 1,
        percentage: 25,
      });
    });
  });

  describe('buildWeaknessReport (Epic 6)', () => {
    it('aggregates top missed characters/punctuation and words and builds a suggested drill', () => {
      const report = buildWeaknessReport([
        {
          missedChars: [
            { char: ';', count: 3 },
            { char: "'", count: 2 },
          ],
          missedWords: [
            { word: 'righteousness', count: 2 },
            { word: "doesn't", count: 1 },
          ],
        },
        {
          missedChars: [
            { char: ';', count: 2 },
            { char: 'e', count: 4 },
          ],
          missedWords: [
            { word: 'righteousness', count: 3 },
            { word: 'counsel', count: 2 },
          ],
        },
        {
          missedChars: [],
          missedWords: [],
        },
      ]);

      expect(report.totalTrackedAttempts).toBe(2);
      expect(report.topCharacters).toEqual([
        { char: ';', label: 'Semicolon (;)', count: 5 },
        { char: 'e', label: 'e', count: 4 },
        { char: "'", label: "Apostrophe (')", count: 2 },
      ]);
      expect(report.topWords).toEqual([
        { word: 'righteousness', count: 5 },
        { word: 'counsel', count: 2 },
        { word: "doesn't", count: 1 },
      ]);
      expect(report.suggestedDrillText).toBe(
        "righteousness counsel doesn't righteousness counsel doesn't"
      );
    });

    it('returns empty collections when no error telemetry exists', () => {
      const empty = buildWeaknessReport([]);
      expect(empty).toEqual({
        topCharacters: [],
        topWords: [],
        totalTrackedAttempts: 0,
        suggestedDrillText: '',
      });
    });
  });

  describe('buildStreaksAndBadges (Epic 8)', () => {
    it('computes timezone-aware current and longest streaks (keeping streak alive if practiced yesterday) and unlocks badges', () => {
      const now = new Date('2026-11-18T14:00:00.000Z'); // 2026-11-18 in America/New_York
      const results = [
        // 4-day historical streak in October
        { startTime: '2026-10-01T15:00:00.000Z', wpm: 55, accuracy: 96, incorrectCharacters: 1 },
        { startTime: '2026-10-02T15:00:00.000Z', wpm: 62, accuracy: 100, incorrectCharacters: 0 },
        { startTime: '2026-10-03T15:00:00.000Z', wpm: 68, accuracy: 98, incorrectCharacters: 1 },
        { startTime: '2026-10-04T15:00:00.000Z', wpm: 84, accuracy: 100, incorrectCharacters: 0 },
        // Current 3-day streak ending yesterday (Nov 15, 16, 17 in NY)
        { startTime: '2026-11-15T16:00:00.000Z', wpm: 70, accuracy: 99, incorrectCharacters: 1 },
        { startTime: '2026-11-16T16:00:00.000Z', wpm: 75, accuracy: 100, incorrectCharacters: 0 },
        { startTime: '2026-11-18T03:30:00.000Z', wpm: 81, accuracy: 100, incorrectCharacters: 0 }, // 22:30 EST on Nov 17
      ];

      const achievements = buildStreaksAndBadges({
        results,
        completedProgressCount: 15,
        psalmsCompletedCount: 10,
        timezone: 'America/New_York',
        now,
      });

      expect(achievements.streak).toEqual({
        currentStreakDays: 3,
        longestStreakDays: 4,
        lastActiveDate: '2026-11-17',
        activeToday: false,
      });

      expect(achievements.milestones).toEqual({
        totalAttempts: 7,
        bestWpm: 84,
        flawlessCount: 4,
        uniqueVersesCompleted: 15,
        psalmsCompletedCount: 10,
        bloomedChaptersCount: 0,
        completedClearingsCount: 0,
      });

      expect(achievements.badges).toHaveLength(14);
      const byId = Object.fromEntries(achievements.badges.map((b) => [b.id, b]));
      expect(byId['first-scribe'].unlocked).toBe(true);
      expect(byId['streak-3'].unlocked).toBe(true);
      expect(byId['streak-7'].unlocked).toBe(false);
      expect(byId['streak-7'].progressCurrent).toBe(4);
      expect(byId['speed-60'].unlocked).toBe(true);
      expect(byId['speed-80'].unlocked).toBe(true);
      expect(byId['speed-100'].unlocked).toBe(false);
      expect(byId['psalms-mantra'].unlocked).toBe(true);
      expect(byId['explorer-50'].unlocked).toBe(false);
      expect(byId['explorer-50'].progressPct).toBe(30);
      expect(byId['trail-first-bloom'].unlocked).toBe(false);
    });

    it('tracks Living Trail milestones across partial (2/10) and completed (10/10) clearings', () => {
      const now = new Date('2026-11-20T18:00:00.000Z');
      const partial = buildStreaksAndBadges({
        results: [{ startTime: now, wpm: 72, accuracy: 99, incorrectCharacters: 0 }],
        completedProgressCount: 56,
        psalmsCompletedCount: 0,
        bloomedChaptersCount: 2,
        maxClearingBloomedCount: 2,
        bestClearingBloomed: 2,
        bestClearingTotal: 10,
        completedClearingsCount: 0,
        timezone: 'UTC',
        now,
      });

      expect(partial.milestones.bloomedChaptersCount).toBe(2);
      expect(partial.milestones.completedClearingsCount).toBe(0);
      const partialMap = Object.fromEntries(partial.badges.map((b) => [b.id, b]));
      expect(partialMap['trail-first-bloom'].unlocked).toBe(true);
      expect(partialMap['trail-bottle-tree'].unlocked).toBe(true);
      expect(partialMap['trail-herb-rack'].unlocked).toBe(true);
      expect(partialMap['trail-clearing-complete']).toMatchObject({
        category: 'trail',
        unlocked: false,
        progressCurrent: 2,
        progressTarget: 10,
        progressPct: 20,
      });

      const cleared = buildStreaksAndBadges({
        results: [{ startTime: now, wpm: 72, accuracy: 99, incorrectCharacters: 0 }],
        completedProgressCount: 250,
        psalmsCompletedCount: 0,
        bloomedChaptersCount: 10,
        maxClearingBloomedCount: 10,
        bestClearingBloomed: 10,
        bestClearingTotal: 10,
        completedClearingsCount: 1,
        timezone: 'UTC',
        now,
      });
      expect(cleared.milestones.completedClearingsCount).toBe(1);
      const clearedMap = Object.fromEntries(cleared.badges.map((b) => [b.id, b]));
      expect(clearedMap['trail-clearing-complete']).toMatchObject({
        unlocked: true,
        progressCurrent: 10,
        progressTarget: 10,
        progressPct: 100,
      });
    });

    it('resets currentStreakDays to 0 when the last practice was 2 or more days ago', () => {
      const now = new Date('2026-11-18T14:00:00.000Z');
      const achievements = buildStreaksAndBadges({
        results: [
          { startTime: '2026-11-14T12:00:00.000Z', wpm: 50, accuracy: 95 },
          { startTime: '2026-11-15T12:00:00.000Z', wpm: 55, accuracy: 97 },
        ],
        completedProgressCount: 2,
        psalmsCompletedCount: 0,
        timezone: 'UTC',
        now,
      });

      expect(achievements.streak.currentStreakDays).toBe(0);
      expect(achievements.streak.longestStreakDays).toBe(2);
      expect(achievements.streak.lastActiveDate).toBe('2026-11-15');
    });
  });
});
