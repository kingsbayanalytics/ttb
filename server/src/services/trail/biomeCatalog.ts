import {
  CANONICAL_BOOK_TO_USFM,
  CANONICAL_CHAPTER_COUNTS,
} from '../../utils/companionWorks';

export interface TrailLegDefinition {
  legId: string;
  label: string;
  startChapter: number;
  endChapter: number;
}

export interface BiomeBookDefinition {
  book: string;
  sectionKey: string;
  biomeId: string;
  landmarkName: string;
  phase1Active: boolean;
  canonicalChapters: number;
}

export interface BiomeDefinition {
  biomeId: string;
  order: number;
  name: string;
  phase: 1 | 2 | 3;
  books: BiomeBookDefinition[];
}

export const PHASE1_ACTIVE_BOOKS: ReadonlySet<string> = new Set(['Genesis', 'Psalms']);

const BOOK_LANDMARK_NAMES: Readonly<Record<string, string>> = {
  Genesis: 'Eden Tree of Roots',
  Exodus: 'Covenant Red-Clay Crossing',
  Leviticus: 'Cedar Altar Courtyard',
  Numbers: 'Wilderness Waypoint Camp',
  Deuteronomy: 'Plains of Promise Overlook',
  Joshua: 'Twelve-Stone Ford',
  Judges: 'Deborah Oak Watch',
  Ruth: 'Barley Harvest Field',
  '1 Samuel': 'Shiloh Lamp House',
  '2 Samuel': 'Zion Terracotta Gate',
  '1 Kings': 'Cedar Timber Court',
  '2 Kings': 'Elijah Hearth Ridge',
  '1 Chronicles': 'Chronicle Archive Hall',
  '2 Chronicles': 'Lampstand Porch',
  Ezra: 'Restored Scroll Gate',
  Nehemiah: 'Rebuilt Stone Wall',
  Psalms: "Shepherd's Sanctuary Porch",
  Job: 'Whirlwind Cedar Terrace',
  Proverbs: 'Elder Market Scales',
  Ecclesiastes: 'Sundial Study Porch',
  'Song of Solomon': 'Spice & Myrrh Arbor',
  Wisdom: 'Golden Lamp Study',
  Sirach: 'Scribe Timber Desk',
  Isaiah: 'Ember Brazier Summit',
  Jeremiah: 'Potter Clay Courtyard',
  Lamentations: 'Weeping Wall Lantern',
  Ezekiel: 'River Chebar Watchtower',
  Baruch: 'Exile Scroll Pavilion',
  Daniel: 'Lions Den Window',
  Hosea: 'Valley of Hope Crossroads',
  Joel: 'Early Rain Signpost',
  Amos: 'Sycamore Plumb-Line',
  Obadiah: 'Red-Rock Beacon',
  Jonah: 'Harbor Lantern Post',
  Micah: 'Vine & Fig Crossroads',
  Nahum: 'Stormwatch Iron Lamp',
  Habakkuk: 'Watchman Rampart',
  Zephaniah: 'Remnant Hearth Sign',
  Haggai: 'Cornerstone Timber Yard',
  Zechariah: 'Olive Lampstand Crossing',
  Malachi: 'Dawn Horizon Marker',
  Tobit: 'Tigris Braided River',
  Judith: 'Bethulia Cistern Gate',
  Esther: 'Susa Crimson Courtyard',
  '1 Maccabees': 'Modin Olive Grove',
  '2 Maccabees': 'Festival of Lights Altar',
  Matthew: 'Capernaum Stone Pier',
  Mark: 'Galilee Fishing Skiff',
  Luke: 'Emmaus Cypress Road',
  John: 'Cana Limestone Well',
  Acts: 'Upper Room Harbor',
  Romans: 'Appian Lantern Milestone',
  '1 Corinthians': 'Corinthian Port Market',
  '2 Corinthians': 'Earthen Vessel Desk',
  Galatians: 'Highland Post-Road',
  Ephesians: 'Ephesus Marble Way',
  Philippians: 'Riverside Prayer Gate',
  Colossians: 'Lycus Valley Waystation',
  '1 Thessalonians': 'Via Egnatia Lantern',
  '2 Thessalonians': 'Watchful Post Milestone',
  '1 Timothy': 'Cedar Epistle Desk',
  '2 Timothy': 'Parchment & Cloak Study',
  Titus: 'Cretan Harbor Road',
  Philemon: 'Open Doorway Hearth',
  Hebrews: 'Cloud of Witnesses Arch',
  James: 'Early Harvest Well',
  '1 Peter': 'Living Stone Cairn',
  '2 Peter': 'Morning Star Overlook',
  '1 John': 'Fellowship Lantern Porch',
  '2 John': 'Truth & Grace Letterbox',
  '3 John': 'Hospitality Post Inn',
  Jude: 'Mercy Crossroads Marker',
  Revelation: 'Starlit Crystal Pavilion',
};

interface RawBiomeSeed {
  biomeId: string;
  order: number;
  name: string;
  phase: 1 | 2 | 3;
  books: string[];
}

const RAW_BIOME_SEEDS: readonly RawBiomeSeed[] = [
  {
    biomeId: 'eden-root-garden',
    order: 1,
    name: 'Eden Root-Garden & Covenant Plains',
    phase: 1,
    books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  },
  {
    biomeId: 'red-clay-kingdoms',
    order: 2,
    name: 'Red-Clay Kingdoms & Watchtowers',
    phase: 2,
    books: [
      'Joshua',
      'Judges',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
      '2 Kings',
      '1 Chronicles',
      '2 Chronicles',
      'Ezra',
      'Nehemiah',
    ],
  },
  {
    biomeId: 'twilight-shepherds-sanctuary',
    order: 3,
    name: "Twilight Shepherd's Sanctuary",
    phase: 1,
    books: ['Psalms'],
  },
  {
    biomeId: 'elders-timber-study',
    order: 4,
    name: "Elder's Timber Study & Spice Market",
    phase: 2,
    books: ['Job', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Wisdom', 'Sirach'],
  },
  {
    biomeId: 'watchmans-ridge',
    order: 5,
    name: "Watchman's Ridge & Ember Hills",
    phase: 2,
    books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Baruch', 'Daniel'],
  },
  {
    biomeId: 'crossroads-lanterns',
    order: 6,
    name: 'Crossroads Lanterns',
    phase: 2,
    books: [
      'Hosea',
      'Joel',
      'Amos',
      'Obadiah',
      'Jonah',
      'Micah',
      'Nahum',
      'Habakkuk',
      'Zephaniah',
      'Haggai',
      'Zechariah',
      'Malachi',
    ],
  },
  {
    biomeId: 'deuterocanonical-groves',
    order: 7,
    name: 'Deuterocanonical Lantern Groves',
    phase: 2,
    books: ['Tobit', 'Judith', 'Esther', '1 Maccabees', '2 Maccabees'],
  },
  {
    biomeId: 'galilean-harbor',
    order: 8,
    name: 'Galilean Harbor & Cypress Roads',
    phase: 3,
    books: ['Matthew', 'Mark', 'Luke', 'John', 'Acts'],
  },
  {
    biomeId: 'epistle-post-roads',
    order: 9,
    name: 'Epistle Post-Roads & Starlit City',
    phase: 3,
    books: [
      'Romans',
      '1 Corinthians',
      '2 Corinthians',
      'Galatians',
      'Ephesians',
      'Philippians',
      'Colossians',
      '1 Thessalonians',
      '2 Thessalonians',
      '1 Timothy',
      '2 Timothy',
      'Titus',
      'Philemon',
      'Hebrews',
      'James',
      '1 Peter',
      '2 Peter',
      '1 John',
      '2 John',
      '3 John',
      'Jude',
      'Revelation',
    ],
  },
];

export const TRAIL_BIOME_CATALOG: readonly BiomeDefinition[] = RAW_BIOME_SEEDS.map((seed) => ({
  biomeId: seed.biomeId,
  order: seed.order,
  name: seed.name,
  phase: seed.phase,
  books: seed.books.map((book) => ({
    book,
    sectionKey: CANONICAL_BOOK_TO_USFM[book],
    biomeId: seed.biomeId,
    landmarkName: BOOK_LANDMARK_NAMES[book] ?? `${book} Waypoint`,
    phase1Active: PHASE1_ACTIVE_BOOKS.has(book),
    canonicalChapters: CANONICAL_CHAPTER_COUNTS[book],
  })),
}));

const BOOK_META_INDEX = new Map<string, BiomeBookDefinition>();
for (const biome of TRAIL_BIOME_CATALOG) {
  for (const bookDef of biome.books) {
    BOOK_META_INDEX.set(bookDef.book, bookDef);
  }
}

export interface Phase1ClearingRange {
  book: 'Genesis' | 'Psalms';
  clearingId: string;
  startChapter: number;
  endChapter: number;
}

export const PHASE1_CLEARING_RANGES: readonly Phase1ClearingRange[] = [
  { book: 'Genesis', clearingId: 'gen-leg-1', startChapter: 1, endChapter: 10 },
  { book: 'Genesis', clearingId: 'gen-leg-2', startChapter: 11, endChapter: 20 },
  { book: 'Genesis', clearingId: 'gen-leg-3', startChapter: 21, endChapter: 30 },
  { book: 'Genesis', clearingId: 'gen-leg-4', startChapter: 31, endChapter: 40 },
  { book: 'Genesis', clearingId: 'gen-leg-5', startChapter: 41, endChapter: 50 },
  { book: 'Psalms', clearingId: 'psa-book-1-c1', startChapter: 1, endChapter: 14 },
  { book: 'Psalms', clearingId: 'psa-book-1-c2', startChapter: 15, endChapter: 28 },
  { book: 'Psalms', clearingId: 'psa-book-1-c3', startChapter: 29, endChapter: 41 },
  { book: 'Psalms', clearingId: 'psa-book-2-c1', startChapter: 42, endChapter: 52 },
  { book: 'Psalms', clearingId: 'psa-book-2-c2', startChapter: 53, endChapter: 62 },
  { book: 'Psalms', clearingId: 'psa-book-2-c3', startChapter: 63, endChapter: 72 },
  { book: 'Psalms', clearingId: 'psa-book-3-c1', startChapter: 73, endChapter: 81 },
  { book: 'Psalms', clearingId: 'psa-book-3-c2', startChapter: 82, endChapter: 89 },
  { book: 'Psalms', clearingId: 'psa-book-4-c1', startChapter: 90, endChapter: 98 },
  { book: 'Psalms', clearingId: 'psa-book-4-c2', startChapter: 99, endChapter: 106 },
  { book: 'Psalms', clearingId: 'psa-book-5-c1', startChapter: 107, endChapter: 117 },
  { book: 'Psalms', clearingId: 'psa-book-5-c2', startChapter: 118, endChapter: 128 },
  { book: 'Psalms', clearingId: 'psa-book-5-c3', startChapter: 129, endChapter: 139 },
  { book: 'Psalms', clearingId: 'psa-book-5-c4', startChapter: 140, endChapter: 150 },
];

export const GENESIS_TRAIL_LEGS: readonly TrailLegDefinition[] = [
  { legId: 'gen-leg-1', label: 'Ch. 1–10', startChapter: 1, endChapter: 10 },
  { legId: 'gen-leg-2', label: 'Ch. 11–20', startChapter: 11, endChapter: 20 },
  { legId: 'gen-leg-3', label: 'Ch. 21–30', startChapter: 21, endChapter: 30 },
  { legId: 'gen-leg-4', label: 'Ch. 31–40', startChapter: 31, endChapter: 40 },
  { legId: 'gen-leg-5', label: 'Ch. 41–50', startChapter: 41, endChapter: 50 },
];

export const PSALMS_TRAIL_LEGS: readonly TrailLegDefinition[] = [
  { legId: 'psa-book-1', label: 'Book I · Psalms 1–41', startChapter: 1, endChapter: 41 },
  { legId: 'psa-book-2', label: 'Book II · Psalms 42–72', startChapter: 42, endChapter: 72 },
  { legId: 'psa-book-3', label: 'Book III · Psalms 73–89', startChapter: 73, endChapter: 89 },
  { legId: 'psa-book-4', label: 'Book IV · Psalms 90–106', startChapter: 90, endChapter: 106 },
  { legId: 'psa-book-5', label: 'Book V · Psalms 107–150', startChapter: 107, endChapter: 150 },
];

export function getBiomeBookMeta(book: string): BiomeBookDefinition | undefined {
  return BOOK_META_INDEX.get(book);
}

export function getTrailLegsForBook(book: string, totalChapters?: number): TrailLegDefinition[] {
  if (book === 'Genesis') {
    return [...GENESIS_TRAIL_LEGS];
  }
  if (book === 'Psalms') {
    return [...PSALMS_TRAIL_LEGS];
  }

  const maxCh = totalChapters ?? CANONICAL_CHAPTER_COUNTS[book] ?? 1;
  if (maxCh <= 15) {
    return [
      {
        legId: `${(CANONICAL_BOOK_TO_USFM[book] ?? 'book').toLowerCase()}-leg-1`,
        label: maxCh === 1 ? 'Ch. 1' : `Ch. 1–${maxCh}`,
        startChapter: 1,
        endChapter: maxCh,
      },
    ];
  }

  const prefix = (CANONICAL_BOOK_TO_USFM[book] ?? 'book').toLowerCase();
  const legs: TrailLegDefinition[] = [];
  let idx = 1;
  for (let start = 1; start <= maxCh; start += 10) {
    const end = Math.min(maxCh, start + 9);
    legs.push({
      legId: `${prefix}-leg-${idx}`,
      label: start === end ? `Ch. ${start}` : `Ch. ${start}–${end}`,
      startChapter: start,
      endChapter: end,
    });
    idx += 1;
  }
  return legs;
}
