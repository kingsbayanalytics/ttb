import {
  CANONICAL_BOOK_ORDER,
  USFM_TO_CANONICAL_BOOK,
  isCanonicalBook,
} from './bookMapping';

export const DEFAULT_WORK_ID = 'web-bible';

/**
 * Canonical chapter counts for all 73 books in the World English Bible Catholic Edition
 * (`data/WEB_Catholic_Version_for_game_updated.csv`), totaling 1,328 chapters.
 */
export const CANONICAL_CHAPTER_COUNTS: Readonly<Record<string, number>> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  '1 Samuel': 31,
  '2 Samuel': 24,
  '1 Kings': 22,
  '2 Kings': 25,
  '1 Chronicles': 29,
  '2 Chronicles': 36,
  Ezra: 10,
  Nehemiah: 13,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  'Song of Solomon': 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Tobit: 14,
  Judith: 16,
  Esther: 10,
  Wisdom: 19,
  Sirach: 51,
  Baruch: 6,
  '1 Maccabees': 16,
  '2 Maccabees': 15,
  Daniel: 14,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  '1 Thessalonians': 5,
  '2 Thessalonians': 3,
  '1 Timothy': 6,
  '2 Timothy': 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  '1 Peter': 5,
  '2 Peter': 3,
  '1 John': 5,
  '2 John': 1,
  '3 John': 1,
  Jude: 1,
  Revelation: 22,
};

export const CANONICAL_TOTAL_BOOKS = CANONICAL_BOOK_ORDER.length; // 73
export const CANONICAL_TOTAL_CHAPTERS = Object.values(CANONICAL_CHAPTER_COUNTS).reduce(
  (sum, count) => sum + count,
  0
); // 1328

export const CANONICAL_BOOK_TO_USFM: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(USFM_TO_CANONICAL_BOOK).map(([code, book]) => [book, code])
);

export interface CompanionWorkMeta {
  workId: string;
  title: string;
  totalSections: number;
  totalUnits: number;
  isBible: boolean;
}

const WORK_REGISTRY: Record<string, CompanionWorkMeta> = {
  [DEFAULT_WORK_ID]: {
    workId: DEFAULT_WORK_ID,
    title: 'World English Bible (Catholic)',
    totalSections: CANONICAL_TOTAL_BOOKS,
    totalUnits: CANONICAL_TOTAL_CHAPTERS,
    isBible: true,
  },
};

export function getWorkMeta(workId: string): CompanionWorkMeta | undefined {
  return WORK_REGISTRY[workId];
}

export function isAllowedWorkId(workId: string): boolean {
  return Object.prototype.hasOwnProperty.call(WORK_REGISTRY, workId);
}

export function listRegisteredWorks(): CompanionWorkMeta[] {
  return Object.values(WORK_REGISTRY);
}

export function canonicalBookToUsfm(book: string): string {
  const code = CANONICAL_BOOK_TO_USFM[book];
  if (!code) {
    throw new Error(`Unknown canonical WEB book: "${book}"`);
  }
  return code;
}

export function usfmToCanonicalBook(code: string): string {
  const normalized = code.trim().toUpperCase();
  const book = USFM_TO_CANONICAL_BOOK[normalized];
  if (!book) {
    throw new Error(`Unknown USFM section code: "${code}"`);
  }
  return book;
}

export function getCanonicalChapterCount(book: string): number | undefined {
  if (!isCanonicalBook(book)) {
    return undefined;
  }
  return CANONICAL_CHAPTER_COUNTS[book];
}

export function isValidCanonicalChapter(book: string, chapter: number): boolean {
  const maxChapter = getCanonicalChapterCount(book);
  if (maxChapter === undefined) {
    return false;
  }
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= maxChapter;
}

export function resolveSectionKeyForWork(
  workId: string,
  book: string,
  explicitSectionKey?: string
): string {
  if (workId === DEFAULT_WORK_ID) {
    return canonicalBookToUsfm(book);
  }
  const trimmed = (explicitSectionKey ?? '').trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return book
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}
