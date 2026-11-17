/**
 * Canonical English book names for all 73 USFM book codes present in
 * data/WEB_Catholic_Version_for_game_updated.csv (World English Bible Catholic Edition).
 */
export const USFM_TO_CANONICAL_BOOK: Readonly<Record<string, string>> = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  EZK: 'Ezekiel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  TOB: 'Tobit',
  JDT: 'Judith',
  ESG: 'Esther',
  WIS: 'Wisdom',
  SIR: 'Sirach',
  BAR: 'Baruch',
  '1MA': '1 Maccabees',
  '2MA': '2 Maccabees',
  DAG: 'Daniel',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
};

export const CANONICAL_BOOK_ORDER: readonly string[] = Object.values(USFM_TO_CANONICAL_BOOK);

export type Testament = 'Old Testament' | 'New Testament';

const NEW_TESTAMENT_START_INDEX = CANONICAL_BOOK_ORDER.indexOf('Matthew');

export const OLD_TESTAMENT_BOOKS: readonly string[] = CANONICAL_BOOK_ORDER.slice(
  0,
  NEW_TESTAMENT_START_INDEX
);

export const NEW_TESTAMENT_BOOKS: readonly string[] = CANONICAL_BOOK_ORDER.slice(
  NEW_TESTAMENT_START_INDEX
);

export const BOOK_TO_TESTAMENT: Readonly<Record<string, Testament>> = Object.fromEntries([
  ...OLD_TESTAMENT_BOOKS.map((book) => [book, 'Old Testament' as const]),
  ...NEW_TESTAMENT_BOOKS.map((book) => [book, 'New Testament' as const]),
]);

export function getBookTestament(book: string): Testament | undefined {
  return BOOK_TO_TESTAMENT[book];
}

export function isCanonicalBook(book: string): boolean {
  return Object.prototype.hasOwnProperty.call(BOOK_TO_TESTAMENT, book);
}

/**
 * Maps a 3-character USFM book code from the WEB Catholic CSV to its canonical English name.
 */
export function mapUsfmBookCode(code: string | undefined): string {
  const normalized = (code ?? '').trim().toUpperCase();
  const mapped = USFM_TO_CANONICAL_BOOK[normalized];
  if (!mapped) {
    throw new Error(`Unknown USFM book code: "${code ?? ''}"`);
  }
  return mapped;
}
