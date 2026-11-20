/**
 * Typing the Bible v3 — 73-Book Canonical Biome Registry & Trail Leg/Clearing Definitions
 *
 * Mirrors `server/src/services/trail/biomeCatalog.ts` 1:1 across all 9 canonical
 * regions and all 73 World English Bible (Catholic Edition) books (1,328 chapters).
 *
 * Phase 1 active playable books:
 *   - Genesis (50 chapters) — 5 Story-Arc Trail Legs of 10 chapters
 *   - Psalms (150 chapters) — 5 Classical Books of the Psalter subdivided into
 *     14 scenic clearings (8–14 flush river flagstones each) so every 16-bit
 *     story-arc diorama stays crisp, uncrowded, and keyboard-navigable.
 */

export type BiomePhase = 1 | 2 | 3;

export type Phase1KeeperPrefix =
  | 'genesis-root-keeper'
  | 'psalms-twilight-psalmist';

export interface TrailClearingDefinition {
  readonly clearingId: string;
  readonly legId: string;
  readonly legLabel: string;
  readonly storyTitle: string;
  readonly storyMotif: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly startChapter: number;
  readonly endChapter: number;
  readonly clearingIndex: number;
  readonly totalClearingsInLeg: number;
}

export interface TrailLegDefinition {
  readonly legId: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly storyTitle: string;
  readonly storyMotif: string;
  readonly startChapter: number;
  readonly endChapter: number;
  readonly clearings: readonly TrailClearingDefinition[];
}

export interface BiomeBookDefinition {
  readonly book: string;
  readonly sectionKey: string;
  readonly biomeId: string;
  readonly landmarkName: string;
  readonly phase1Active: boolean;
  readonly canonicalChapters: number;
}

export interface BiomeDefinition {
  readonly biomeId: string;
  readonly order: number;
  readonly name: string;
  readonly shortName: string;
  readonly phase: BiomePhase;
  readonly motif: string;
  readonly keeperName?: string;
  readonly keeperFramePrefix?: Phase1KeeperPrefix;
  readonly books: readonly BiomeBookDefinition[];
}

export const PHASE1_ACTIVE_BOOKS: ReadonlySet<string> = new Set(['Genesis', 'Psalms']);

const CANONICAL_BOOK_TO_USFM: Readonly<Record<string, string>> = {
  Genesis: 'GEN',
  Exodus: 'EXO',
  Leviticus: 'LEV',
  Numbers: 'NUM',
  Deuteronomy: 'DEU',
  Joshua: 'JOS',
  Judges: 'JDG',
  Ruth: 'RUT',
  '1 Samuel': '1SA',
  '2 Samuel': '2SA',
  '1 Kings': '1KI',
  '2 Kings': '2KI',
  '1 Chronicles': '1CH',
  '2 Chronicles': '2CH',
  Ezra: 'EZR',
  Nehemiah: 'NEH',
  Job: 'JOB',
  Psalms: 'PSA',
  Proverbs: 'PRO',
  Ecclesiastes: 'ECC',
  'Song of Solomon': 'SNG',
  Isaiah: 'ISA',
  Jeremiah: 'JER',
  Lamentations: 'LAM',
  Ezekiel: 'EZK',
  Hosea: 'HOS',
  Joel: 'JOL',
  Amos: 'AMO',
  Obadiah: 'OBA',
  Jonah: 'JON',
  Micah: 'MIC',
  Nahum: 'NAM',
  Habakkuk: 'HAB',
  Zephaniah: 'ZEP',
  Haggai: 'HAG',
  Zechariah: 'ZEC',
  Malachi: 'MAL',
  Tobit: 'TOB',
  Judith: 'JDT',
  Esther: 'ESG',
  Wisdom: 'WIS',
  Sirach: 'SIR',
  Baruch: 'BAR',
  '1 Maccabees': '1MA',
  '2 Maccabees': '2MA',
  Daniel: 'DAG',
  Matthew: 'MAT',
  Mark: 'MRK',
  Luke: 'LUK',
  John: 'JHN',
  Acts: 'ACT',
  Romans: 'ROM',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  Galatians: 'GAL',
  Ephesians: 'EPH',
  Philippians: 'PHP',
  Colossians: 'COL',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  Titus: 'TIT',
  Philemon: 'PHM',
  Hebrews: 'HEB',
  James: 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JN',
  '2 John': '2JN',
  '3 John': '3JN',
  Jude: 'JUD',
  Revelation: 'REV',
};

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
  readonly biomeId: string;
  readonly order: number;
  readonly name: string;
  readonly shortName: string;
  readonly phase: BiomePhase;
  readonly motif: string;
  readonly keeperName?: string;
  readonly keeperFramePrefix?: Phase1KeeperPrefix;
  readonly books: readonly string[];
}

const RAW_BIOME_SEEDS: readonly RawBiomeSeed[] = [
  {
    biomeId: 'eden-root-garden',
    order: 1,
    name: 'Eden Root-Garden & Covenant Plains',
    shortName: 'Eden Root-Garden',
    phase: 1,
    motif: 'Red-clay garden paths, cedar herb beds, fig & root trees, brass watering can',
    keeperName: 'The Garden Root-Keeper',
    keeperFramePrefix: 'genesis-root-keeper',
    books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  },
  {
    biomeId: 'red-clay-kingdoms',
    order: 2,
    name: 'Red-Clay Kingdoms & Watchtowers',
    shortName: 'Red-Clay Kingdoms',
    phase: 2,
    motif: 'Terracotta masonry, timber gates, harvest fields, hearth smoke',
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
    shortName: "Shepherd's Sanctuary",
    phase: 1,
    motif:
      'Mossy stone pasture, cedar apothecary porch, hanging drying herbs, brass porch lanterns, still creek',
    keeperName: 'The Twilight Psalmist',
    keeperFramePrefix: 'psalms-twilight-psalmist',
    books: ['Psalms'],
  },
  {
    biomeId: 'elders-timber-study',
    order: 4,
    name: "Elder's Timber Study & Spice Market",
    shortName: "Elder's Study",
    phase: 2,
    motif: 'Warm cedar bookshelves, brass scales, spice jars, candlelit porch',
    books: ['Job', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Wisdom', 'Sirach'],
  },
  {
    biomeId: 'watchmans-ridge',
    order: 5,
    name: "Watchman's Ridge & Ember Hills",
    shortName: "Watchman's Ridge",
    phase: 2,
    motif: 'Ochre mesas, signal braziers, weathered stone scrolls',
    books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Baruch', 'Daniel'],
  },
  {
    biomeId: 'crossroads-lanterns',
    order: 6,
    name: 'Crossroads Lanterns',
    shortName: 'Crossroads Lanterns',
    phase: 2,
    motif: 'Winding crossroads signs, iron lanterns, wildflower verge',
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
    shortName: 'Lantern Groves',
    phase: 2,
    motif: 'Olive groves, braided rivers, courtyard lamps, crimson textiles',
    books: ['Tobit', 'Judith', 'Esther', '1 Maccabees', '2 Maccabees'],
  },
  {
    biomeId: 'galilean-harbor',
    order: 8,
    name: 'Galilean Harbor & Cypress Roads',
    shortName: 'Galilean Harbor',
    phase: 3,
    motif: 'Slate-blue harbor water, wooden boats, limestone docks, coastal olive trees',
    books: ['Matthew', 'Mark', 'Luke', 'John', 'Acts'],
  },
  {
    biomeId: 'epistle-post-roads',
    order: 9,
    name: 'Epistle Post-Roads & Starlit City',
    shortName: 'Epistle Post-Roads',
    phase: 3,
    motif: 'Lantern-lit cobbled post-roads, cedar writing desks, golden starlit pavilion',
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
  shortName: seed.shortName,
  phase: seed.phase,
  motif: seed.motif,
  keeperName: seed.keeperName,
  keeperFramePrefix: seed.keeperFramePrefix,
  books: seed.books.map((book) => ({
    book,
    sectionKey: CANONICAL_BOOK_TO_USFM[book],
    biomeId: seed.biomeId,
    landmarkName: BOOK_LANDMARK_NAMES[book] ?? `${book} Waypoint`,
    phase1Active: PHASE1_ACTIVE_BOOKS.has(book),
    canonicalChapters: CANONICAL_CHAPTER_COUNTS[book],
  })),
}));

export const CANONICAL_TOTAL_BOOKS = TRAIL_BIOME_CATALOG.reduce(
  (sum, biome) => sum + biome.books.length,
  0
); // 73

export const CANONICAL_TOTAL_CHAPTERS = TRAIL_BIOME_CATALOG.reduce(
  (sum, biome) => sum + biome.books.reduce((bSum, b) => bSum + b.canonicalChapters, 0),
  0
); // 1328

const BIOME_BY_ID = new Map<string, BiomeDefinition>();
const BOOK_META_INDEX = new Map<string, BiomeBookDefinition>();
const BOOK_TO_BIOME = new Map<string, BiomeDefinition>();

for (const biome of TRAIL_BIOME_CATALOG) {
  BIOME_BY_ID.set(biome.biomeId, biome);
  for (const bookDef of biome.books) {
    BOOK_META_INDEX.set(bookDef.book, bookDef);
    BOOK_TO_BIOME.set(bookDef.book, biome);
  }
}

function buildLegClearings(
  legId: string,
  legLabel: string,
  storyTitle: string,
  storyMotif: string,
  ranges: readonly (readonly [number, number])[],
  chapterPrefix: string
): readonly TrailClearingDefinition[] {
  const total = ranges.length;
  return ranges.map(([startChapter, endChapter], idx) => {
    const rangeLabel =
      startChapter === endChapter
        ? `${chapterPrefix} ${startChapter}`
        : `${chapterPrefix} ${startChapter}–${endChapter}`;
    return {
      clearingId: total === 1 ? legId : `${legId}-c${idx + 1}`,
      legId,
      legLabel,
      storyTitle,
      storyMotif,
      label: total === 1 ? legLabel : `${legLabel} · ${rangeLabel}`,
      shortLabel: rangeLabel,
      startChapter,
      endChapter,
      clearingIndex: idx,
      totalClearingsInLeg: total,
    };
  });
}

/**
 * 5 Story-Arc Trail Legs for Genesis (Ch. 1–10, 11–20, 21–30, 31–40, 41–50).
 * Each leg opens a distinct 16-bit HD story-arc scene with flush river flagstones.
 */
export const GENESIS_TRAIL_LEGS: readonly TrailLegDefinition[] = [
  {
    legId: 'gen-leg-1',
    label: 'Ch. 1–10',
    shortLabel: 'Ch. 1–10',
    storyTitle: 'Eden Root-Garden & Four Rivers',
    storyMotif: 'Four-river crossroads, raised cedar herb beds, braided sweetgrass & rainbow prism',
    startChapter: 1,
    endChapter: 10,
    clearings: buildLegClearings(
      'gen-leg-1',
      'Ch. 1–10',
      'Eden Root-Garden & Four Rivers',
      'Four-river crossroads, raised cedar herb beds, braided sweetgrass & rainbow prism',
      [[1, 10]],
      'Ch.'
    ),
  },
  {
    legId: 'gen-leg-2',
    label: 'Ch. 11–20',
    shortLabel: 'Ch. 11–20',
    storyTitle: "Abraham's Live-Oaks & Hearth",
    storyMotif: 'Spanish-moss live oaks beside a glowing covenant stone hearth at twilight',
    startChapter: 11,
    endChapter: 20,
    clearings: buildLegClearings(
      'gen-leg-2',
      'Ch. 11–20',
      "Abraham's Live-Oaks & Hearth",
      'Spanish-moss live oaks beside a glowing covenant stone hearth at twilight',
      [[11, 20]],
      'Ch.'
    ),
  },
  {
    legId: 'gen-leg-3',
    label: 'Ch. 21–30',
    shortLabel: 'Ch. 21–30',
    storyTitle: "Bethel's Well & Starry Ladder",
    storyMotif: 'Homestead porch under live oak, mossy stone well & starry stairway rising into dusk',
    startChapter: 21,
    endChapter: 30,
    clearings: buildLegClearings(
      'gen-leg-3',
      'Ch. 21–30',
      "Bethel's Well & Starry Ladder",
      'Homestead porch under live oak, mossy stone well & starry stairway rising into dusk',
      [[21, 30]],
      'Ch.'
    ),
  },
  {
    legId: 'gen-leg-4',
    label: 'Ch. 31–40',
    shortLabel: 'Ch. 31–40',
    storyTitle: 'Woven Coat & Amber Granary',
    storyMotif: 'Terraced wheat & sweetgrass ridge leading to an amber granary porch & woven coat',
    startChapter: 31,
    endChapter: 40,
    clearings: buildLegClearings(
      'gen-leg-4',
      'Ch. 31–40',
      'Woven Coat & Amber Granary',
      'Terraced wheat & sweetgrass ridge leading to an amber granary porch & woven coat',
      [[31, 40]],
      'Ch.'
    ),
  },
  {
    legId: 'gen-leg-5',
    label: 'Ch. 41–50',
    shortLabel: 'Ch. 41–50',
    storyTitle: 'Goshen River Reunion Porch',
    storyMotif: 'Serene sunset delta waters framed by cypresses, willows & a welcoming river porch',
    startChapter: 41,
    endChapter: 50,
    clearings: buildLegClearings(
      'gen-leg-5',
      'Ch. 41–50',
      'Goshen River Reunion Porch',
      'Serene sunset delta waters framed by cypresses, willows & a welcoming river porch',
      [[41, 50]],
      'Ch.'
    ),
  },
];

/**
 * 5 Classical Books of the Psalter (matching `server/src/services/trail/biomeCatalog.ts`),
 * each paired with its own story-arc diorama and balanced clearings of 8–14 flush flagstones:
 *   - Book I   (1–41):   1–14 (14), 15–28 (14), 29–41 (13) — Green Pastures & Still Waters
 *   - Book II  (42–72):  42–52 (11), 53–62 (10), 63–72 (10) — Deer-Brook & Highland Cedars
 *   - Book III (73–89):  73–81 (9), 82–89 (8)               — Asaph's Watchfire & Harp
 *   - Book IV  (90–106): 90–98 (9), 99–106 (8)              — Ancient Hyssop Apothecary
 *   - Book V   (107–150): 107–117..140–150 (11 each)        — Starry Hallelujah Courtyard
 */
export const PSALMS_TRAIL_LEGS: readonly TrailLegDefinition[] = [
  {
    legId: 'psa-book-1',
    label: 'Book I · Psalms 1–41',
    shortLabel: 'Book I (1–41)',
    storyTitle: 'Green Pastures & Still Waters',
    storyMotif: 'Mossy twilight pasture, still slate-blue creek & hanging Anna Riva sanctuary herbs',
    startChapter: 1,
    endChapter: 41,
    clearings: buildLegClearings(
      'psa-book-1',
      'Book I · Psalms 1–41',
      'Green Pastures & Still Waters',
      'Mossy twilight pasture, still slate-blue creek & hanging Anna Riva sanctuary herbs',
      [
        [1, 14],
        [15, 28],
        [29, 41],
      ],
      'Ps.'
    ),
  },
  {
    legId: 'psa-book-2',
    label: 'Book II · Psalms 42–72',
    shortLabel: 'Book II (42–72)',
    storyTitle: 'Deer-Brook & Highland Cedars',
    storyMotif: 'Cascading mountain creek beneath tall fragrant cedars & distant misty ridges',
    startChapter: 42,
    endChapter: 72,
    clearings: buildLegClearings(
      'psa-book-2',
      'Book II · Psalms 42–72',
      'Deer-Brook & Highland Cedars',
      'Cascading mountain creek beneath tall fragrant cedars & distant misty ridges',
      [
        [42, 52],
        [53, 62],
        [63, 72],
      ],
      'Ps.'
    ),
  },
  {
    legId: 'psa-book-3',
    label: 'Book III · Psalms 73–89',
    shortLabel: 'Book III (73–89)',
    storyTitle: "Asaph's Watchfire & Harp",
    storyMotif: 'High fieldstone bluff terrace lit by a steady watchfire brazier & temple harp',
    startChapter: 73,
    endChapter: 89,
    clearings: buildLegClearings(
      'psa-book-3',
      'Book III · Psalms 73–89',
      "Asaph's Watchfire & Harp",
      'High fieldstone bluff terrace lit by a steady watchfire brazier & temple harp',
      [
        [73, 81],
        [82, 89],
      ],
      'Ps.'
    ),
  },
  {
    legId: 'psa-book-4',
    label: 'Book IV · Psalms 90–106',
    shortLabel: 'Book IV (90–106)',
    storyTitle: 'Ancient Hyssop Apothecary',
    storyMotif: 'Stone-and-cedar cottage garden of blooming hyssop, lavender, rosemary & sundial',
    startChapter: 90,
    endChapter: 106,
    clearings: buildLegClearings(
      'psa-book-4',
      'Book IV · Psalms 90–106',
      'Ancient Hyssop Apothecary',
      'Stone-and-cedar cottage garden of blooming hyssop, lavender, rosemary & sundial',
      [
        [90, 98],
        [99, 106],
      ],
      'Ps.'
    ),
  },
  {
    legId: 'psa-book-5',
    label: 'Book V · Psalms 107–150',
    shortLabel: 'Book V (107–150)',
    storyTitle: 'Starry Hallelujah Courtyard',
    storyMotif: 'Starlit olive grove & warm amber limestone sanctuary porch welcoming Psalm 150',
    startChapter: 107,
    endChapter: 150,
    clearings: buildLegClearings(
      'psa-book-5',
      'Book V · Psalms 107–150',
      'Starry Hallelujah Courtyard',
      'Starlit olive grove & warm amber limestone sanctuary porch welcoming Psalm 150',
      [
        [107, 117],
        [118, 128],
        [129, 139],
        [140, 150],
      ],
      'Ps.'
    ),
  },
];

export function getBiomeById(biomeId: string): BiomeDefinition | undefined {
  return BIOME_BY_ID.get(biomeId);
}

export function getBiomeForBook(book: string): BiomeDefinition | undefined {
  return BOOK_TO_BIOME.get(book);
}

export function getBiomeBookMeta(book: string): BiomeBookDefinition | undefined {
  return BOOK_META_INDEX.get(book);
}

export function getTrailLegsForBook(
  book: string,
  totalChapters?: number
): TrailLegDefinition[] {
  if (book === 'Genesis') {
    return [...GENESIS_TRAIL_LEGS];
  }
  if (book === 'Psalms') {
    return [...PSALMS_TRAIL_LEGS];
  }

  const maxCh = Math.max(1, totalChapters ?? CANONICAL_CHAPTER_COUNTS[book] ?? 1);
  const prefix = (CANONICAL_BOOK_TO_USFM[book] ?? 'book').toLowerCase();
  const motif = BOOK_LANDMARK_NAMES[book] ?? `${book} pilgrimage trail`;

  if (maxCh <= 15) {
    const label = maxCh === 1 ? 'Ch. 1' : `Ch. 1–${maxCh}`;
    const legId = `${prefix}-leg-1`;
    return [
      {
        legId,
        label,
        shortLabel: label,
        storyTitle: `${book} · ${motif}`,
        storyMotif: motif,
        startChapter: 1,
        endChapter: maxCh,
        clearings: buildLegClearings(legId, label, `${book} · ${motif}`, motif, [[1, maxCh]], 'Ch.'),
      },
    ];
  }

  const legs: TrailLegDefinition[] = [];
  let idx = 1;
  for (let start = 1; start <= maxCh; start += 10) {
    const end = Math.min(maxCh, start + 9);
    const label = start === end ? `Ch. ${start}` : `Ch. ${start}–${end}`;
    const legId = `${prefix}-leg-${idx}`;
    legs.push({
      legId,
      label,
      shortLabel: label,
      storyTitle: `${book} · ${motif}`,
      storyMotif: motif,
      startChapter: start,
      endChapter: end,
      clearings: buildLegClearings(legId, label, `${book} · ${motif}`, motif, [[start, end]], 'Ch.'),
    });
    idx += 1;
  }
  return legs;
}

export function getTrailClearingsForBook(
  book: string,
  totalChapters?: number
): TrailClearingDefinition[] {
  return getTrailLegsForBook(book, totalChapters).flatMap((leg) => [...leg.clearings]);
}

export function findLegForChapter(
  book: string,
  chapter: number,
  totalChapters?: number
): TrailLegDefinition {
  const legs = getTrailLegsForBook(book, totalChapters);
  return (
    legs.find((leg) => chapter >= leg.startChapter && chapter <= leg.endChapter) ?? legs[0]
  );
}

export function findClearingForChapter(
  book: string,
  chapter: number,
  totalChapters?: number
): TrailClearingDefinition {
  const clearings = getTrailClearingsForBook(book, totalChapters);
  return (
    clearings.find((c) => chapter >= c.startChapter && chapter <= c.endChapter) ??
    clearings[0]
  );
}
