import mongoose from 'mongoose';
import { CompanionEntry, Progress } from '../../models';
import {
  CompanionLens,
  PRIMARY_COMPANION_LENSES,
  PrimaryCompanionLens,
} from '../../models/CompanionEntry';
import {
  CANONICAL_TOTAL_BOOKS,
  CANONICAL_TOTAL_CHAPTERS,
  DEFAULT_WORK_ID,
} from '../../utils/companionWorks';
import {
  TRAIL_BIOME_CATALOG,
  getBiomeBookMeta,
  getTrailLegsForBook,
} from './biomeCatalog';
import {
  ChapterManifest,
  ChapterRangeMeta,
  findChapterForVerseOrder,
  getChapterManifest,
} from './chapterManifest';

export type ChapterBloomState = 'dormant' | 'in_progress' | 'bloomed';

export type LensCountMap = Record<PrimaryCompanionLens, number>;

export function createEmptyLensCounts(): LensCountMap {
  return {
    'hoodoo-folk': 0,
    'historical-classic': 0,
    community: 0,
  };
}

export interface ProgressLeafRow {
  verseOrder: number;
  bestWPM: number;
  bestAccuracy: number;
  lastAttemptDate: Date | string;
}

export interface ChapterStatusRecord {
  book: string;
  chapter: number;
  totalVerses: number;
  completedVerses: number;
  state: ChapterBloomState;
  unlocked: boolean;
  bestWPM: number;
  bestAccuracy: number;
  unlockedAt: string | null;
}

export interface TrailChapterWaypointDTO {
  chapter: number;
  totalVerses: number;
  completedVerses: number;
  state: ChapterBloomState;
  bestWPM: number;
  bestAccuracy: number;
  unlockedAt: string | null;
  hasCompanion: boolean;
  lensCounts: LensCountMap;
}

export interface TrailLegProgressDTO {
  legId: string;
  label: string;
  startChapter: number;
  endChapter: number;
  bloomedCount: number;
  totalCount: number;
}

export interface TrailBookOverviewDTO {
  book: string;
  sectionKey: string;
  landmarkName: string;
  phase1Active: boolean;
  totalChapters: number;
  bloomedChapters: number;
  inProgressChapters: number;
  totalVerses: number;
  completedVerses: number;
  state: ChapterBloomState;
  bookMastered: boolean;
  companionChapterCount: number;
}

export interface TrailBiomeOverviewDTO {
  biomeId: string;
  order: number;
  name: string;
  phase: 1 | 2 | 3;
  books: TrailBookOverviewDTO[];
}

export interface ActiveTravelerPointerDTO {
  biomeId: string;
  book: string;
  chapter: number;
}

export interface TrailOverviewDTO {
  workId: string;
  totalBooks: number;
  totalChapters: number;
  bloomedChapters: number;
  inProgressChapters: number;
  activeTraveler: ActiveTravelerPointerDTO | null;
  biomes: TrailBiomeOverviewDTO[];
}

export interface TrailBookDetailDTO {
  workId: string;
  book: string;
  sectionKey: string;
  biomeId: string;
  landmarkName: string;
  phase1Active: boolean;
  state: ChapterBloomState;
  bookMastered: boolean;
  totalChapters: number;
  bloomedChapters: number;
  totalVerses: number;
  completedVerses: number;
  hasBookGuide: boolean;
  activeChapter: number;
  legs: TrailLegProgressDTO[];
  chapters: TrailChapterWaypointDTO[];
}

export interface ChapterJustUnlockedPayload {
  workId: string;
  book: string;
  chapter: number;
  totalVerses: number;
  unlockedAt: string;
  companionCount: number;
  availableLenses: CompanionLens[];
}

/**
 * Pure state machine for chapter & book bloom status.
 */
export function computeChapterState(
  completedVerses: number,
  totalVerses: number
): ChapterBloomState {
  if (totalVerses > 0 && completedVerses >= totalVerses) {
    return 'bloomed';
  }
  if (completedVerses > 0) {
    return 'in_progress';
  }
  return 'dormant';
}

interface ChapterAccumulator {
  completedVerses: number;
  bestWPM: number;
  bestAccuracy: number;
  latestAttemptMs: number;
}

function accumulateProgressByChapter(
  manifest: ChapterManifest,
  progressRows: ProgressLeafRow[]
): {
  byBookChapter: Map<string, Map<number, ChapterAccumulator>>;
  mostRecentPhase1: { book: string; chapter: number; ms: number } | null;
  mostRecentAny: { book: string; chapter: number; ms: number } | null;
} {
  const byBookChapter = new Map<string, Map<number, ChapterAccumulator>>();
  let mostRecentPhase1: { book: string; chapter: number; ms: number } | null = null;
  let mostRecentAny: { book: string; chapter: number; ms: number } | null = null;

  for (const row of progressRows) {
    const chMeta = findChapterForVerseOrder(manifest, row.verseOrder);
    if (!chMeta) continue;

    let bookMap = byBookChapter.get(chMeta.book);
    if (!bookMap) {
      bookMap = new Map<number, ChapterAccumulator>();
      byBookChapter.set(chMeta.book, bookMap);
    }

    const attemptMs = row.lastAttemptDate
      ? new Date(row.lastAttemptDate).getTime()
      : 0;
    const safeMs = Number.isFinite(attemptMs) ? attemptMs : 0;

    let acc = bookMap.get(chMeta.chapter);
    if (!acc) {
      acc = {
        completedVerses: 0,
        bestWPM: 0,
        bestAccuracy: 0,
        latestAttemptMs: 0,
      };
      bookMap.set(chMeta.chapter, acc);
    }
    acc.completedVerses += 1;
    if ((row.bestWPM ?? 0) > acc.bestWPM) {
      acc.bestWPM = row.bestWPM;
    }
    if ((row.bestAccuracy ?? 0) > acc.bestAccuracy) {
      acc.bestAccuracy = row.bestAccuracy;
    }
    if (safeMs > acc.latestAttemptMs) {
      acc.latestAttemptMs = safeMs;
    }

    if (!mostRecentAny || safeMs > mostRecentAny.ms) {
      mostRecentAny = { book: chMeta.book, chapter: chMeta.chapter, ms: safeMs };
    }
    const bookDef = getBiomeBookMeta(chMeta.book);
    if (bookDef?.phase1Active && (!mostRecentPhase1 || safeMs > mostRecentPhase1.ms)) {
      mostRecentPhase1 = { book: chMeta.book, chapter: chMeta.chapter, ms: safeMs };
    }
  }

  return { byBookChapter, mostRecentPhase1, mostRecentAny };
}

/**
 * Pure fold over a single book's chapters, returning ordered chapter status records.
 */
export function buildChapterStatusesForBook(
  book: string,
  chapterMetas: ChapterRangeMeta[],
  progressRows: ProgressLeafRow[],
  manifest: ChapterManifest
): ChapterStatusRecord[] {
  const { byBookChapter } = accumulateProgressByChapter(manifest, progressRows);
  const bookMap = byBookChapter.get(book);

  return chapterMetas.map((ch) => {
    const acc = bookMap?.get(ch.chapter);
    const completedVerses = acc?.completedVerses ?? 0;
    const state = computeChapterState(completedVerses, ch.totalVerses);
    const unlocked = state === 'bloomed';
    return {
      book,
      chapter: ch.chapter,
      totalVerses: ch.totalVerses,
      completedVerses,
      state,
      unlocked,
      bestWPM: acc ? Math.round(acc.bestWPM * 10) / 10 : 0,
      bestAccuracy: acc ? Math.round(acc.bestAccuracy * 10) / 10 : 0,
      unlockedAt:
        unlocked && acc && acc.latestAttemptMs > 0
          ? new Date(acc.latestAttemptMs).toISOString()
          : null,
    };
  });
}

/**
 * Pure builder for GET /api/trail/overview.
 */
export function buildTrailOverview(params: {
  workId: string;
  manifest: ChapterManifest;
  progressRows: ProgressLeafRow[];
  companionChapterCountsByBook: Map<string, number>;
}): TrailOverviewDTO {
  const { workId, manifest, progressRows, companionChapterCountsByBook } = params;
  const { byBookChapter, mostRecentPhase1, mostRecentAny } = accumulateProgressByChapter(
    manifest,
    progressRows
  );

  let totalBloomedChapters = 0;
  let totalInProgressChapters = 0;

  const biomes: TrailBiomeOverviewDTO[] = TRAIL_BIOME_CATALOG.map((biomeDef) => {
    const books: TrailBookOverviewDTO[] = biomeDef.books.map((bookDef) => {
      const bookManifest = manifest.books.get(bookDef.book);
      const bookProgress = byBookChapter.get(bookDef.book);

      const totalChapters = bookDef.canonicalChapters;
      const totalVerses = bookManifest?.totalVerses ?? 0;

      let bloomedChapters = 0;
      let inProgressChapters = 0;
      let completedVerses = 0;

      if (bookManifest && bookProgress) {
        for (const ch of bookManifest.chapters) {
          const acc = bookProgress.get(ch.chapter);
          if (!acc) continue;
          completedVerses += acc.completedVerses;
          const st = computeChapterState(acc.completedVerses, ch.totalVerses);
          if (st === 'bloomed') {
            bloomedChapters += 1;
          } else if (st === 'in_progress') {
            inProgressChapters += 1;
          }
        }
      }

      totalBloomedChapters += bloomedChapters;
      totalInProgressChapters += inProgressChapters;

      const bookMastered =
        bookManifest !== undefined &&
        bookManifest.totalChapters > 0 &&
        bloomedChapters >= bookManifest.totalChapters &&
        bloomedChapters >= totalChapters;

      const state: ChapterBloomState = bookMastered
        ? 'bloomed'
        : completedVerses > 0
          ? 'in_progress'
          : 'dormant';

      return {
        book: bookDef.book,
        sectionKey: bookDef.sectionKey,
        landmarkName: bookDef.landmarkName,
        phase1Active: bookDef.phase1Active,
        totalChapters,
        bloomedChapters,
        inProgressChapters,
        totalVerses,
        completedVerses,
        state,
        bookMastered,
        companionChapterCount: companionChapterCountsByBook.get(bookDef.book) ?? 0,
      };
    });

    return {
      biomeId: biomeDef.biomeId,
      order: biomeDef.order,
      name: biomeDef.name,
      phase: biomeDef.phase,
      books,
    };
  });

  // Active traveler defaults to most recently practiced Phase 1 chapter,
  // falling back to most recent overall chapter, or Genesis chapter 1.
  let activeTraveler: ActiveTravelerPointerDTO = {
    biomeId: 'eden-root-garden',
    book: 'Genesis',
    chapter: 1,
  };
  const chosen = mostRecentPhase1 ?? mostRecentAny;
  if (chosen) {
    const meta = getBiomeBookMeta(chosen.book);
    if (meta) {
      activeTraveler = {
        biomeId: meta.biomeId,
        book: chosen.book,
        chapter: chosen.chapter,
      };
    }
  }

  return {
    workId,
    totalBooks: CANONICAL_TOTAL_BOOKS,
    totalChapters: CANONICAL_TOTAL_CHAPTERS,
    bloomedChapters: totalBloomedChapters,
    inProgressChapters: totalInProgressChapters,
    activeTraveler,
    biomes,
  };
}

/**
 * Pure builder for GET /api/trail/books/:book.
 */
export function buildBookTrail(params: {
  workId: string;
  book: string;
  manifest: ChapterManifest;
  progressRows: ProgressLeafRow[];
  lensCountsByChapter: Map<number, LensCountMap>;
  hasBookGuide: boolean;
}): TrailBookDetailDTO {
  const { workId, book, manifest, progressRows, lensCountsByChapter, hasBookGuide } = params;
  const bookDef = getBiomeBookMeta(book);
  if (!bookDef) {
    throw new Error(`Unknown canonical book "${book}"`);
  }

  const bookManifest = manifest.books.get(book);
  const { byBookChapter } = accumulateProgressByChapter(manifest, progressRows);
  const bookMap = byBookChapter.get(book);

  const canonicalCount = bookDef.canonicalChapters;
  const chapterMetaMap = manifest.chaptersByBook.get(book);

  const chapters: TrailChapterWaypointDTO[] = [];
  let bloomedChapters = 0;
  let completedVerses = 0;
  let mostRecentChapter: { chapter: number; ms: number } | null = null;
  let firstInProgressChapter: number | null = null;
  let firstDormantChapter: number | null = null;

  for (let chNum = 1; chNum <= canonicalCount; chNum += 1) {
    const chMeta = chapterMetaMap?.get(chNum);
    const totalVerses = chMeta?.totalVerses ?? 0;
    const acc = bookMap?.get(chNum);
    const chCompleted = acc?.completedVerses ?? 0;
    const state = computeChapterState(chCompleted, totalVerses);

    if (state === 'bloomed') {
      bloomedChapters += 1;
    } else if (state === 'in_progress' && firstInProgressChapter === null) {
      firstInProgressChapter = chNum;
    } else if (state === 'dormant' && firstDormantChapter === null) {
      firstDormantChapter = chNum;
    }

    if (acc && acc.latestAttemptMs > 0) {
      if (!mostRecentChapter || acc.latestAttemptMs > mostRecentChapter.ms) {
        mostRecentChapter = { chapter: chNum, ms: acc.latestAttemptMs };
      }
    }

    completedVerses += chCompleted;

    const lensCounts = lensCountsByChapter.get(chNum) ?? createEmptyLensCounts();
    const hasCompanion =
      lensCounts['hoodoo-folk'] + lensCounts['historical-classic'] + lensCounts.community > 0;

    chapters.push({
      chapter: chNum,
      totalVerses,
      completedVerses: chCompleted,
      state,
      bestWPM: acc ? Math.round(acc.bestWPM * 10) / 10 : 0,
      bestAccuracy: acc ? Math.round(acc.bestAccuracy * 10) / 10 : 0,
      unlockedAt:
        state === 'bloomed' && acc && acc.latestAttemptMs > 0
          ? new Date(acc.latestAttemptMs).toISOString()
          : null,
      hasCompanion,
      lensCounts,
    });
  }

  const totalVerses = bookManifest?.totalVerses ?? 0;
  const bookMastered =
    canonicalCount > 0 && totalVerses > 0 && bloomedChapters >= canonicalCount;
  const state: ChapterBloomState = bookMastered
    ? 'bloomed'
    : completedVerses > 0
      ? 'in_progress'
      : 'dormant';

  const activeChapter =
    firstInProgressChapter ?? mostRecentChapter?.chapter ?? firstDormantChapter ?? 1;

  const legDefs = getTrailLegsForBook(book, canonicalCount);
  const legs: TrailLegProgressDTO[] = legDefs.map((leg) => {
    let legBloomed = 0;
    for (let ch = leg.startChapter; ch <= leg.endChapter; ch += 1) {
      if (chapters[ch - 1]?.state === 'bloomed') {
        legBloomed += 1;
      }
    }
    return {
      legId: leg.legId,
      label: leg.label,
      startChapter: leg.startChapter,
      endChapter: leg.endChapter,
      bloomedCount: legBloomed,
      totalCount: leg.endChapter - leg.startChapter + 1,
    };
  });

  return {
    workId,
    book,
    sectionKey: bookDef.sectionKey,
    biomeId: bookDef.biomeId,
    landmarkName: bookDef.landmarkName,
    phase1Active: bookDef.phase1Active,
    state,
    bookMastered,
    totalChapters: canonicalCount,
    bloomedChapters,
    totalVerses,
    completedVerses,
    hasBookGuide,
    activeChapter,
    legs,
    chapters,
  };
}

/**
 * DB-backed single chapter unlock status (uses cached manifest + indexed Progress range scan).
 */
export async function getChapterStatus(
  userId: mongoose.Types.ObjectId | string,
  book: string,
  chapter: number
): Promise<ChapterStatusRecord> {
  const manifest = await getChapterManifest();
  const chMeta = manifest.chaptersByBook.get(book)?.get(chapter);

  if (!chMeta) {
    return {
      book,
      chapter,
      totalVerses: 0,
      completedVerses: 0,
      state: 'dormant',
      unlocked: false,
      bestWPM: 0,
      bestAccuracy: 0,
      unlockedAt: null,
    };
  }

  const rows = await Progress.find({
    user: userId,
    completed: true,
    verseOrder: { $gte: chMeta.minVerseOrder, $lte: chMeta.maxVerseOrder },
  })
    .select('verseOrder bestWPM bestAccuracy lastAttemptDate')
    .lean<ProgressLeafRow[]>();

  const statuses = buildChapterStatusesForBook(book, [chMeta], rows, manifest);
  return statuses[0];
}

/**
 * DB-backed all-chapters status for a book (1 indexed range scan on Progress).
 */
export async function getBookChaptersStatus(
  userId: mongoose.Types.ObjectId | string,
  book: string
): Promise<ChapterStatusRecord[]> {
  const manifest = await getChapterManifest();
  const bookMeta = manifest.books.get(book);
  if (!bookMeta) {
    return [];
  }

  const rows = await Progress.find({
    user: userId,
    completed: true,
    verseOrder: { $gte: bookMeta.minVerseOrder, $lte: bookMeta.maxVerseOrder },
  })
    .select('verseOrder bestWPM bestAccuracy lastAttemptDate')
    .lean<ProgressLeafRow[]>();

  return buildChapterStatusesForBook(book, bookMeta.chapters, rows, manifest);
}

/**
 * Computes the set of bloomed (book, chapter) pairs for a user in 1 indexed Progress scan.
 * Used by GET /api/companion/search to strictly prevent locked-chapter leakage.
 */
export async function getUserBloomedChapters(
  userId: mongoose.Types.ObjectId | string,
  bookFilter?: string
): Promise<Array<{ book: string; chapter: number }>> {
  const manifest = await getChapterManifest();
  const query: Record<string, any> = { user: userId, completed: true };

  if (bookFilter) {
    const bookMeta = manifest.books.get(bookFilter);
    if (!bookMeta) return [];
    query.verseOrder = { $gte: bookMeta.minVerseOrder, $lte: bookMeta.maxVerseOrder };
  }

  const rows = await Progress.find(query)
    .select('verseOrder bestWPM bestAccuracy lastAttemptDate')
    .lean<ProgressLeafRow[]>();

  const { byBookChapter } = accumulateProgressByChapter(manifest, rows);
  const bloomed: Array<{ book: string; chapter: number }> = [];

  for (const [book, chMap] of byBookChapter.entries()) {
    const manifestChapters = manifest.chaptersByBook.get(book);
    if (!manifestChapters) continue;
    for (const [chapter, acc] of chMap.entries()) {
      const chMeta = manifestChapters.get(chapter);
      if (chMeta && computeChapterState(acc.completedVerses, chMeta.totalVerses) === 'bloomed') {
        bloomed.push({ book, chapter });
      }
    }
  }

  return bloomed;
}

/**
 * DB-backed GET /api/trail/overview handler service.
 */
export async function getTrailOverview(
  userId: mongoose.Types.ObjectId | string,
  workId: string = DEFAULT_WORK_ID
): Promise<TrailOverviewDTO> {
  const [manifest, progressRows, companionAgg] = await Promise.all([
    getChapterManifest(),
    Progress.find({ user: userId, completed: true })
      .select('verseOrder bestWPM bestAccuracy lastAttemptDate')
      .lean<ProgressLeafRow[]>(),
    CompanionEntry.aggregate<{ _id: string; chapters: number[] }>([
      {
        $match: {
          workId,
          entryType: 'chapter-companion',
          status: 'published',
          chapter: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$book',
          chapters: { $addToSet: '$chapter' },
        },
      },
    ]),
  ]);

  const companionChapterCountsByBook = new Map<string, number>();
  for (const row of companionAgg) {
    companionChapterCountsByBook.set(row._id, row.chapters.length);
  }

  return buildTrailOverview({
    workId,
    manifest,
    progressRows,
    companionChapterCountsByBook,
  });
}

/**
 * DB-backed GET /api/trail/books/:book handler service.
 */
export async function getTrailBook(
  userId: mongoose.Types.ObjectId | string,
  book: string,
  workId: string = DEFAULT_WORK_ID
): Promise<TrailBookDetailDTO> {
  const manifest = await getChapterManifest();
  const bookMeta = manifest.books.get(book);

  const [progressRows, chapterLensAgg, bookGuideCount] = await Promise.all([
    bookMeta
      ? Progress.find({
          user: userId,
          completed: true,
          verseOrder: { $gte: bookMeta.minVerseOrder, $lte: bookMeta.maxVerseOrder },
        })
          .select('verseOrder bestWPM bestAccuracy lastAttemptDate')
          .lean<ProgressLeafRow[]>()
      : Promise.resolve([] as ProgressLeafRow[]),
    CompanionEntry.aggregate<{ _id: { chapter: number; lens: string }; count: number }>([
      {
        $match: {
          workId,
          book,
          entryType: 'chapter-companion',
          status: 'published',
          chapter: { $ne: null },
        },
      },
      {
        $group: {
          _id: { chapter: '$chapter', lens: '$lens' },
          count: { $sum: 1 },
        },
      },
    ]),
    CompanionEntry.countDocuments({
      workId,
      book,
      entryType: { $in: ['book-introduction', 'bonus-meditations', 'daily-schedule'] },
      status: 'published',
    }),
  ]);

  const lensCountsByChapter = new Map<number, LensCountMap>();
  for (const row of chapterLensAgg) {
    const ch = row._id.chapter;
    const lens = row._id.lens as PrimaryCompanionLens;
    if (!(PRIMARY_COMPANION_LENSES as readonly string[]).includes(lens)) {
      continue;
    }
    let map = lensCountsByChapter.get(ch);
    if (!map) {
      map = createEmptyLensCounts();
      lensCountsByChapter.set(ch, map);
    }
    map[lens] = row.count;
  }

  return buildBookTrail({
    workId,
    book,
    manifest,
    progressRows,
    lensCountsByChapter,
    hasBookGuide: bookGuideCount > 0,
  });
}

/**
 * Detects whether submitting a verse caused its chapter to transition into `bloomed`.
 *
 * Fast path (AD-11): if `wasAlreadyCompleted` is true, returns `null` immediately
 * with ZERO extra database reads.
 */
export async function detectChapterJustUnlocked(params: {
  userId: mongoose.Types.ObjectId | string;
  verse: { book: string; chapter: number; verseOrder: number };
  wasAlreadyCompleted: boolean;
  unlockedAt?: Date;
  workId?: string;
}): Promise<ChapterJustUnlockedPayload | null> {
  const { userId, verse, wasAlreadyCompleted, unlockedAt, workId = DEFAULT_WORK_ID } = params;

  if (wasAlreadyCompleted) {
    return null;
  }

  const manifest = await getChapterManifest();
  const chMeta = manifest.chaptersByBook.get(verse.book)?.get(verse.chapter);
  if (!chMeta || chMeta.totalVerses <= 0) {
    return null;
  }

  const completedCount = await Progress.countDocuments({
    user: userId,
    completed: true,
    verseOrder: { $gte: chMeta.minVerseOrder, $lte: chMeta.maxVerseOrder },
  });

  if (completedCount < chMeta.totalVerses) {
    return null;
  }

  const companionDocs = await CompanionEntry.find({
    workId,
    book: verse.book,
    chapter: verse.chapter,
    entryType: 'chapter-companion',
    status: 'published',
  })
    .select('lens')
    .lean<Array<{ lens: CompanionLens }>>();

  const availableLensesSet = new Set<CompanionLens>();
  for (const doc of companionDocs) {
    availableLensesSet.add(doc.lens);
  }
  const orderedLenses = PRIMARY_COMPANION_LENSES.filter((l) => availableLensesSet.has(l));
  for (const l of availableLensesSet) {
    if (!(orderedLenses as readonly string[]).includes(l)) {
      orderedLenses.push(l as any);
    }
  }

  return {
    workId,
    book: verse.book,
    chapter: verse.chapter,
    totalVerses: chMeta.totalVerses,
    unlockedAt: (unlockedAt ?? new Date()).toISOString(),
    companionCount: companionDocs.length,
    availableLenses: orderedLenses,
  };
}
