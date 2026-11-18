import {
  BOOK_TO_TESTAMENT,
  CANONICAL_BOOK_ORDER,
  Testament,
} from '../../utils/bookMapping';
import {
  createDayFormatter,
  isValidTimeZone,
  subtractCalendarDays,
  toValidDate,
} from './timezone';

export { isValidTimeZone };
export {
  buildWeaknessReport,
  describeCharacterLabel,
  WeaknessCharacterStat,
  WeaknessReport,
  WeaknessWordStat,
  WeakResultInput,
} from './weakness';
export {
  AchievementsData,
  AchievementsResultInput,
  BadgeCategory,
  BadgeItem,
  BuildStreaksAndBadgesOptions,
  buildStreaksAndBadges,
  MilestonesSummary,
  StreakSummary,
} from './streaksAndBadges';

export type TrendRange = '30' | '90' | '365' | 'all';

export const VALID_TREND_RANGES: readonly TrendRange[] = ['30', '90', '365', 'all'];

export interface TrendInputRow {
  startTime: Date | string;
  wpm: number;
  accuracy: number;
}

export interface ActivityInputRow {
  startTime: Date | string;
}

export interface TrendPoint {
  date: string;
  avgWpm: number;
  avgAccuracy: number;
  attempts: number;
}

export interface ActivityPoint {
  date: string;
  attempts: number;
}

export interface VerseBookEntry {
  _id: string | { toString(): string };
  book: string;
}

export interface BookCountMap {
  totalByBook: Record<string, number> | ReadonlyMap<string, number>;
  verseToBook: Record<string, string> | ReadonlyMap<string, string>;
}

export type BookCountsInput = readonly VerseBookEntry[] | BookCountMap;

export interface CoverageSummary {
  totalVerses: number;
  completedVerses: number;
  percentage: number;
}

export interface TestamentCoverage extends CoverageSummary {
  testament: Testament;
}

export interface BookCoverage extends CoverageSummary {
  book: string;
  testament: Testament;
}

export interface CoverageData {
  overall: CoverageSummary;
  testaments: TestamentCoverage[];
  books: BookCoverage[];
}

export function isValidTrendRange(value: string): value is TrendRange {
  return (VALID_TREND_RANGES as readonly string[]).includes(value);
}

/**
 * Aggregates result rows into daily WPM/accuracy averages in the caller's IANA timezone.
 */
export function buildTrend(
  rows: readonly TrendInputRow[],
  tz = 'UTC',
  range: TrendRange = '30',
  now: Date = new Date()
): TrendPoint[] {
  const formatter = createDayFormatter(tz);
  if (!isValidTrendRange(range)) {
    throw new Error(`Invalid trend range: "${range}"`);
  }

  let cutoffDate: string | null = null;
  if (range !== 'all') {
    const days = Number(range);
    const todayInTz = formatter.format(toValidDate(now));
    cutoffDate = subtractCalendarDays(todayInTz, days - 1);
  }

  const buckets = new Map<
    string,
    { wpmSum: number; accuracySum: number; attempts: number }
  >();

  for (const row of rows) {
    const date = formatter.format(toValidDate(row.startTime));
    if (cutoffDate !== null && date < cutoffDate) {
      continue;
    }

    const current = buckets.get(date) ?? { wpmSum: 0, accuracySum: 0, attempts: 0 };
    current.wpmSum += row.wpm;
    current.accuracySum += row.accuracy;
    current.attempts += 1;
    buckets.set(date, current);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({
      date,
      avgWpm: agg.wpmSum / agg.attempts,
      avgAccuracy: agg.accuracySum / agg.attempts,
      attempts: agg.attempts,
    }));
}

/**
 * Aggregates result rows into per-day attempt counts for a given calendar year in `tz`.
 */
export function buildActivity(
  rows: readonly ActivityInputRow[],
  tz = 'UTC',
  year?: number
): ActivityPoint[] {
  const formatter = createDayFormatter(tz);
  const resolvedYear = year ?? Number(formatter.format(new Date()).slice(0, 4));
  if (!Number.isInteger(resolvedYear) || resolvedYear < 1970 || resolvedYear > 2100) {
    throw new Error(`Invalid activity year: "${String(year)}"`);
  }

  const yearPrefix = `${resolvedYear}-`;
  const counts = new Map<string, number>();

  for (const row of rows) {
    const date = formatter.format(toValidDate(row.startTime));
    if (!date.startsWith(yearPrefix)) {
      continue;
    }
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, attempts]) => ({ date, attempts }));
}

function calcPercentage(completedVerses: number, totalVerses: number): number {
  if (totalVerses <= 0) {
    return 0;
  }
  return Number(((completedVerses / totalVerses) * 100).toFixed(1));
}

function readMapOrRecord<V>(
  source: Record<string, V> | ReadonlyMap<string, V>,
  key: string
): V | undefined {
  if (source instanceof Map) {
    return source.get(key);
  }
  const record = source as Record<string, V>;
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * Builds overall, Testament, and canonical 73-book coverage rollups from completed verse IDs.
 */
export function buildCoverage(
  completedVerseIds: Iterable<string | { toString(): string }>,
  bookCounts: BookCountsInput
): CoverageData {
  const totalByBook = new Map<string, number>();
  const verseToBook = new Map<string, string>();

  if (Array.isArray(bookCounts)) {
    for (const entry of bookCounts as readonly VerseBookEntry[]) {
      const id = typeof entry._id === 'string' ? entry._id : entry._id.toString();
      verseToBook.set(id, entry.book);
      totalByBook.set(entry.book, (totalByBook.get(entry.book) ?? 0) + 1);
    }
  } else {
    const mapInput = bookCounts as BookCountMap;
    for (const book of CANONICAL_BOOK_ORDER) {
      const total = readMapOrRecord(mapInput.totalByBook, book);
      if (typeof total === 'number' && total > 0) {
        totalByBook.set(book, total);
      }
    }

    const uniqueIds = new Set<string>();
    for (const rawId of completedVerseIds) {
      const id = typeof rawId === 'string' ? rawId : rawId.toString();
      uniqueIds.add(id);
      const book = readMapOrRecord(mapInput.verseToBook, id);
      if (book) {
        verseToBook.set(id, book);
      }
    }

    return computeCoverageFromMaps(uniqueIds, totalByBook, verseToBook);
  }

  const uniqueIds = new Set<string>();
  for (const rawId of completedVerseIds) {
    uniqueIds.add(typeof rawId === 'string' ? rawId : rawId.toString());
  }

  return computeCoverageFromMaps(uniqueIds, totalByBook, verseToBook);
}

function computeCoverageFromMaps(
  uniqueCompletedIds: ReadonlySet<string>,
  totalByBook: ReadonlyMap<string, number>,
  verseToBook: ReadonlyMap<string, string>
): CoverageData {
  const completedByBook = new Map<string, number>();
  for (const id of uniqueCompletedIds) {
    const book = verseToBook.get(id);
    if (book) {
      completedByBook.set(book, (completedByBook.get(book) ?? 0) + 1);
    }
  }

  const testamentTotals: Record<Testament, { total: number; completed: number }> = {
    'Old Testament': { total: 0, completed: 0 },
    'New Testament': { total: 0, completed: 0 },
  };

  let overallTotal = 0;
  let overallCompleted = 0;

  const books: BookCoverage[] = CANONICAL_BOOK_ORDER.map((book) => {
    const testament = BOOK_TO_TESTAMENT[book];
    const totalVerses = totalByBook.get(book) ?? 0;
    const completedVerses =
      totalVerses > 0 ? Math.min(completedByBook.get(book) ?? 0, totalVerses) : 0;

    testamentTotals[testament].total += totalVerses;
    testamentTotals[testament].completed += completedVerses;
    overallTotal += totalVerses;
    overallCompleted += completedVerses;

    return {
      book,
      testament,
      totalVerses,
      completedVerses,
      percentage: calcPercentage(completedVerses, totalVerses),
    };
  });

  const testaments: TestamentCoverage[] = (['Old Testament', 'New Testament'] as const).map(
    (testament) => {
      const { total, completed } = testamentTotals[testament];
      return {
        testament,
        totalVerses: total,
        completedVerses: completed,
        percentage: calcPercentage(completed, total),
      };
    }
  );

  return {
    overall: {
      totalVerses: overallTotal,
      completedVerses: overallCompleted,
      percentage: calcPercentage(overallCompleted, overallTotal),
    },
    testaments,
    books,
  };
}
