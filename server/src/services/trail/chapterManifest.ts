import { config } from '../../config';
import { Verse } from '../../models';

export interface ChapterRangeMeta {
  book: string;
  chapter: number;
  totalVerses: number;
  minVerseOrder: number;
  maxVerseOrder: number;
}

export interface BookRangeMeta {
  book: string;
  totalChapters: number;
  totalVerses: number;
  minVerseOrder: number;
  maxVerseOrder: number;
  chapters: ChapterRangeMeta[]; // sorted ascending by chapter
}

export interface ChapterManifest {
  totalVerseDocs: number;
  newestVerseId: string | null;
  books: Map<string, BookRangeMeta>;
  chaptersByBook: Map<string, Map<number, ChapterRangeMeta>>;
  sortedIntervals: ChapterRangeMeta[]; // sorted ascending by minVerseOrder for O(log C) lookup
}

interface AggregateChapterRow {
  _id: {
    book: string;
    chapter: number;
  };
  totalVerses: number;
  minVerseOrder: number;
  maxVerseOrder: number;
}

let cachedManifest: ChapterManifest | null = null;
let inflightBuild: Promise<ChapterManifest> | null = null;

export function resetChapterManifestCache(): void {
  cachedManifest = null;
  inflightBuild = null;
}

export function buildManifestFromRows(
  rows: AggregateChapterRow[],
  newestVerseId: string | null = null
): ChapterManifest {
  const books = new Map<string, BookRangeMeta>();
  const chaptersByBook = new Map<string, Map<number, ChapterRangeMeta>>();
  const sortedIntervals: ChapterRangeMeta[] = [];
  let totalVerseDocs = 0;

  for (const row of rows) {
    const book = row._id.book;
    const chapter = row._id.chapter;
    const entry: ChapterRangeMeta = {
      book,
      chapter,
      totalVerses: row.totalVerses,
      minVerseOrder: row.minVerseOrder,
      maxVerseOrder: row.maxVerseOrder,
    };
    totalVerseDocs += row.totalVerses;
    sortedIntervals.push(entry);

    let chMap = chaptersByBook.get(book);
    if (!chMap) {
      chMap = new Map<number, ChapterRangeMeta>();
      chaptersByBook.set(book, chMap);
    }
    chMap.set(chapter, entry);
  }

  for (const [book, chMap] of chaptersByBook.entries()) {
    const chapters = Array.from(chMap.values()).sort((a, b) => a.chapter - b.chapter);
    let totalVerses = 0;
    let minVerseOrder = Number.POSITIVE_INFINITY;
    let maxVerseOrder = Number.NEGATIVE_INFINITY;
    for (const ch of chapters) {
      totalVerses += ch.totalVerses;
      if (ch.minVerseOrder < minVerseOrder) minVerseOrder = ch.minVerseOrder;
      if (ch.maxVerseOrder > maxVerseOrder) maxVerseOrder = ch.maxVerseOrder;
    }
    books.set(book, {
      book,
      totalChapters: chapters.length,
      totalVerses,
      minVerseOrder: Number.isFinite(minVerseOrder) ? minVerseOrder : 0,
      maxVerseOrder: Number.isFinite(maxVerseOrder) ? maxVerseOrder : 0,
      chapters,
    });
  }

  sortedIntervals.sort((a, b) => a.minVerseOrder - b.minVerseOrder);

  return {
    totalVerseDocs,
    newestVerseId,
    books,
    chaptersByBook,
    sortedIntervals,
  };
}

/**
 * Resolves a verseOrder to its containing ChapterRangeMeta in O(log C) time.
 */
export function findChapterForVerseOrder(
  manifest: ChapterManifest,
  verseOrder: number
): ChapterRangeMeta | undefined {
  const arr = manifest.sortedIntervals;
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const item = arr[mid];
    if (verseOrder < item.minVerseOrder) {
      hi = mid - 1;
    } else if (verseOrder > item.maxVerseOrder) {
      lo = mid + 1;
    } else {
      return item;
    }
  }
  return undefined;
}

async function queryAndBuildManifest(): Promise<ChapterManifest> {
  const [rows, newest] = await Promise.all([
    Verse.aggregate<AggregateChapterRow>([
      {
        $group: {
          _id: { book: '$book', chapter: '$chapter' },
          totalVerses: { $sum: 1 },
          minVerseOrder: { $min: '$verseOrder' },
          maxVerseOrder: { $max: '$verseOrder' },
        },
      },
    ]),
    config.isTest
      ? Verse.findOne({}, { _id: 1 }).sort({ _id: -1 }).lean()
      : Promise.resolve(null),
  ]);

  const newestId = newest?._id ? String(newest._id) : null;
  const manifest = buildManifestFromRows(rows, newestId);
  cachedManifest = manifest;
  return manifest;
}

export async function getChapterManifest(options: {
  forceRefresh?: boolean;
} = {}): Promise<ChapterManifest> {
  if (!options.forceRefresh && cachedManifest) {
    if (!config.isTest && cachedManifest.totalVerseDocs > 0) {
      return cachedManifest;
    }
    if (config.isTest) {
      // Lightweight freshness check so tests seeding/resetting verses in beforeEach never see stale ranges
      const [count, newest] = await Promise.all([
        Verse.countDocuments(),
        Verse.findOne({}, { _id: 1 }).sort({ _id: -1 }).lean(),
      ]);
      const newestId = newest?._id ? String(newest._id) : null;
      if (
        count === cachedManifest.totalVerseDocs &&
        newestId === cachedManifest.newestVerseId
      ) {
        return cachedManifest;
      }
    }
  }

  if (inflightBuild && !options.forceRefresh) {
    return inflightBuild;
  }

  inflightBuild = queryAndBuildManifest().finally(() => {
    inflightBuild = null;
  });

  return inflightBuild;
}
