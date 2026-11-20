/**
 * Copyright-safe mock fixtures for Companion Reading Room & Living Trail (Story 11.1 / AD-12).
 *
 * Contains EXCLUSIVELY public-domain and synthetic placeholder study copy.
 * Never place private-owner vault text or scraped Reddit text in this file.
 */
import {
  BookGuideResponse,
  ChapterCompanionResponse,
  CompanionEntry,
  CompanionSearchParams,
  CompanionSearchResponse,
  EnrichedDailyScheduleSlot,
  TrailBookResponse,
  TrailChapterWaypoint,
  TrailOverviewResponse,
} from '../types';

const DEFAULT_WORK_ID = 'web-bible';

const MOCK_PSALM_23_ENTRIES: Record<
  'hoodoo-folk' | 'historical-classic' | 'community',
  CompanionEntry[]
> = {
  'hoodoo-folk': [
    {
      id: 'mock-ps-23-folk',
      upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:mock-pd-folk:0',
      workId: DEFAULT_WORK_ID,
      sectionKey: 'PSA',
      book: 'Psalms',
      chapter: 23,
      entryType: 'chapter-companion',
      lens: 'hoodoo-folk',
      visibility: 'public-domain',
      sortOrder: 0,
      title: 'Shepherd Guidance & Peaceful Crossing (Public-Domain Sample)',
      summary:
        'Synthetic placeholder overview illustrating how folkloric and contemplative Psalm study notes appear in the Reading Room.',
      body: '### Contemplative Tradition\nIn historic folk devotional practice, Psalm 23 is recited slowly at dawn or dusk to settle the spirit before a difficult journey or decision.\n\n- Read aloud beside quiet water or a steady candle.\n- Pause after verse 4 to recall moments of steadiness and shelter.',
      purposes: [
        {
          title: 'For Calm Clarity & Safe Passage',
          body: 'Recite the six verses slowly with an unhurried breath, letting the shepherd imagery anchor your focus before beginning the day.',
          citedVerses: ['1-4', '6'],
          ritualTags: ['Morning Recitation', 'Peaceful Home', 'Quiet Reflection'],
        },
      ],
      indexPurposes: [
        { purpose: 'Guidance in uncertain seasons', source: 'sample-index', verseRange: '1-3' },
        { purpose: 'Peaceful rest and restoration', source: 'sample-index', verseRange: '4-6' },
      ],
      ritualTags: ['Morning Recitation', 'Peaceful Home', 'Quiet Reflection'],
      citedVerses: ['1-4', '6'],
      dailySchedule: [],
      source: {
        sourceId: 'mock-pd-folk',
        title: 'Typing the Bible Public-Domain Demo Companion',
        author: 'Public-Domain Folkloric Summary',
        year: 1923,
        numberingSystem: 'masoretic-web',
        license: 'public-domain',
      },
    },
  ],
  'historical-classic': [
    {
      id: 'mock-ps-23-classic',
      upsertKey: 'web-bible:Psalms:23:chapter-companion:historical-classic:haydock-1859:0',
      workId: DEFAULT_WORK_ID,
      sectionKey: 'PSA',
      book: 'Psalms',
      chapter: 23,
      entryType: 'chapter-companion',
      lens: 'historical-classic',
      visibility: 'public-domain',
      sortOrder: 0,
      title: 'The Shepherd & Host Motif in Ancient Near Eastern Lyric',
      summary:
        'Public-domain historical commentary noting the dual imagery of pastoral care (vv. 1–4) and royal hospitality (vv. 5–6).',
      body: '### Literary Structure\nPsalm 23 moves from the sunlit meadow of the Judean hills to the shaded ravine and finally into the banquet house.\n\n### Canonical Numbering Note\nIn the Latin Vulgate and Douay-Rheims tradition, this psalm appears as Psalm 22 and is aligned here to World English Bible Psalm 23.',
      purposes: [],
      indexPurposes: [],
      ritualTags: ['Pastoral Imagery', 'Hospitality'],
      citedVerses: ['1-6'],
      dailySchedule: [],
      source: {
        sourceId: 'haydock-1859',
        title: 'Catholic Bible Commentary (Public-Domain Sample)',
        author: 'George Leo Haydock',
        year: 1859,
        numberingSystem: 'vulgate-dr',
        originalRef: 'Douay-Rheims Psalm 22',
        license: 'public-domain',
      },
    },
  ],
  community: [
    {
      id: 'mock-ps-23-community',
      upsertKey: 'web-bible:Psalms:23:chapter-companion:community:mock-community:0',
      workId: DEFAULT_WORK_ID,
      sectionKey: 'PSA',
      book: 'Psalms',
      chapter: 23,
      entryType: 'chapter-companion',
      lens: 'community',
      visibility: 'public-domain',
      sortOrder: 0,
      title: 'Placeholder Community Study Discussion',
      summary:
        'Synthetic sample card demonstrating how offline-curated discussion notes render when imported locally.',
      body: '### Discussion Theme\nReaders frequently compare the pastoral metaphor of the rod and staff with the shift from third-person speech ("He") to direct address ("You") in verse 4.',
      quoteExcerpt:
        'Notice how the psalm shifts from talking about the Shepherd to speaking directly to You inside the valley.',
      purposes: [],
      indexPurposes: [],
      ritualTags: ['Literary Shift', 'Close Reading'],
      citedVerses: ['4'],
      dailySchedule: [],
      source: {
        sourceId: 'mock-community',
        title: 'Offline Curated Study Archive (Demo)',
        authorHandle: 'u/demo_reader',
        subreddit: 'r/Bible',
        license: 'public-domain',
        retrievedAt: '2026-11-20T00:00:00.000Z',
      },
      externalUrl: 'https://www.reddit.com/r/Bible/',
    },
  ],
};

const MOCK_GENESIS_1_ENTRIES: Record<
  'hoodoo-folk' | 'historical-classic' | 'community',
  CompanionEntry[]
> = {
  'hoodoo-folk': [
    {
      id: 'mock-gen-1-folk',
      upsertKey: 'web-bible:Genesis:1:chapter-companion:hoodoo-folk:mock-pd-gen:0',
      workId: DEFAULT_WORK_ID,
      sectionKey: 'GEN',
      book: 'Genesis',
      chapter: 1,
      entryType: 'chapter-companion',
      lens: 'hoodoo-folk',
      visibility: 'public-domain',
      sortOrder: 0,
      title: 'Creation Cadence & Dawn Beginnings (Public-Domain Sample)',
      summary:
        'Public-domain folkloric overview celebrating Genesis 1 as a spoken rhythm of order, light, and seed-bearing earth.',
      body: '### Spoken Word & Renewal\nAcross Southern spirituals and pre-1931 folklore collections, the opening verses of Genesis frame dawn prayer and the blessing of newly planted soil.',
      purposes: [
        {
          title: 'For Fresh Beginnings & Ordering a New Work',
          body: 'Read verses 1–5 aloud at sunrise when starting a new chapter of study or tending a garden plot.',
          citedVerses: ['1-5', '11-12'],
          ritualTags: ['New Beginnings', 'Dawn Study', 'Seed & Soil'],
        },
      ],
      indexPurposes: [
        { purpose: 'Opening a new season with clarity', source: 'sample-index', verseRange: '1-5' },
      ],
      ritualTags: ['New Beginnings', 'Dawn Study', 'Seed & Soil'],
      citedVerses: ['1-5', '11-12'],
      dailySchedule: [],
      source: {
        sourceId: 'mock-pd-gen',
        title: 'Early Southern Folkloric Study Notes (Public-Domain Sample)',
        author: 'Public-Domain Compilation',
        year: 1926,
        numberingSystem: 'masoretic-web',
        license: 'public-domain',
      },
    },
  ],
  'historical-classic': [
    {
      id: 'mock-gen-1-classic',
      upsertKey: 'web-bible:Genesis:1:chapter-companion:historical-classic:ce-1913:0',
      workId: DEFAULT_WORK_ID,
      sectionKey: 'GEN',
      book: 'Genesis',
      chapter: 1,
      entryType: 'chapter-companion',
      lens: 'historical-classic',
      visibility: 'public-domain',
      sortOrder: 0,
      title: 'Six Days of Forming & Filling (Public-Domain Sample)',
      summary:
        'Classic literary symmetry pairing Days 1–3 (realms formed) with Days 4–6 (inhabitants filling each realm).',
      body: '### Architectural Symmetry\n- **Day 1 / Day 4:** Light separated from darkness; sun, moon, and stars set in the expanse.\n- **Day 2 / Day 5:** Sky and seas divided; birds and sea creatures fill them.\n- **Day 3 / Day 6:** Dry land and vegetation emerge; land animals and humanity inhabit the earth.',
      purposes: [],
      indexPurposes: [],
      ritualTags: ['Creation', 'Literary Symmetry'],
      citedVerses: ['1-31'],
      dailySchedule: [],
      source: {
        sourceId: 'ce-1913',
        title: 'Catholic Encyclopedia (1913, Public-Domain Sample)',
        author: 'Public-Domain Reference',
        year: 1913,
        numberingSystem: 'masoretic-web',
        license: 'public-domain',
      },
    },
  ],
  community: [],
};

const MOCK_PSALMS_SCHEDULE: EnrichedDailyScheduleSlot[] = [
  { slot: 'Sunday morning', psalm: 1, book: 'Psalms', chapter: 1, state: 'bloomed', unlocked: true },
  { slot: 'Sunday evening', psalm: 23, book: 'Psalms', chapter: 23, state: 'bloomed', unlocked: true },
  { slot: 'Monday morning', psalm: 5, book: 'Psalms', chapter: 5, state: 'dormant', unlocked: false },
  { slot: 'Monday evening', psalm: 19, book: 'Psalms', chapter: 19, state: 'dormant', unlocked: false },
  { slot: 'Tuesday morning', psalm: 27, book: 'Psalms', chapter: 27, state: 'in_progress', unlocked: false },
  { slot: 'Tuesday evening', psalm: 34, book: 'Psalms', chapter: 34, state: 'dormant', unlocked: false },
  { slot: 'Wednesday morning', psalm: 46, book: 'Psalms', chapter: 46, state: 'dormant', unlocked: false },
  { slot: 'Wednesday evening', psalm: 51, book: 'Psalms', chapter: 51, state: 'dormant', unlocked: false },
  { slot: 'Thursday morning', psalm: 63, book: 'Psalms', chapter: 63, state: 'dormant', unlocked: false },
  { slot: 'Thursday evening', psalm: 90, book: 'Psalms', chapter: 90, state: 'dormant', unlocked: false },
  { slot: 'Friday morning', psalm: 91, book: 'Psalms', chapter: 91, state: 'dormant', unlocked: false },
  { slot: 'Friday evening', psalm: 103, book: 'Psalms', chapter: 103, state: 'dormant', unlocked: false },
  { slot: 'Saturday morning', psalm: 121, book: 'Psalms', chapter: 121, state: 'dormant', unlocked: false },
  { slot: 'Saturday evening', psalm: 150, book: 'Psalms', chapter: 150, state: 'dormant', unlocked: false },
];

export function getMockChapterCompanion(
  book: string,
  chapter: number,
  workId = DEFAULT_WORK_ID
): ChapterCompanionResponse {
  const normalizedBook = book.trim().toLowerCase();

  if (normalizedBook === 'psalms' && chapter === 23) {
    return {
      workId,
      book: 'Psalms',
      chapter: 23,
      unlocked: true,
      progress: {
        completedVerses: 6,
        totalVerses: 6,
        state: 'bloomed',
        bestWPM: 72,
        bestAccuracy: 99,
        unlockedAt: '2026-11-20T00:00:00.000Z',
      },
      lensCounts: {
        'hoodoo-folk': MOCK_PSALM_23_ENTRIES['hoodoo-folk'].length,
        'historical-classic': MOCK_PSALM_23_ENTRIES['historical-classic'].length,
        community: MOCK_PSALM_23_ENTRIES.community.length,
      },
      lenses: MOCK_PSALM_23_ENTRIES,
    };
  }

  if (normalizedBook === 'genesis' && chapter === 1) {
    return {
      workId,
      book: 'Genesis',
      chapter: 1,
      unlocked: true,
      progress: {
        completedVerses: 31,
        totalVerses: 31,
        state: 'bloomed',
        bestWPM: 68,
        bestAccuracy: 98,
        unlockedAt: '2026-11-20T00:00:00.000Z',
      },
      lensCounts: {
        'hoodoo-folk': MOCK_GENESIS_1_ENTRIES['hoodoo-folk'].length,
        'historical-classic': MOCK_GENESIS_1_ENTRIES['historical-classic'].length,
        community: 0,
      },
      lenses: MOCK_GENESIS_1_ENTRIES,
    };
  }

  return {
    workId,
    book,
    chapter,
    unlocked: false,
    progress: {
      completedVerses: 0,
      totalVerses: 20,
      state: 'dormant',
    },
    lensCounts: {
      'hoodoo-folk': normalizedBook === 'psalms' || normalizedBook === 'genesis' ? 1 : 0,
      'historical-classic': 1,
      community: 0,
    },
    lenses: {
      'hoodoo-folk': [],
      'historical-classic': [],
      community: [],
    },
  };
}

export function getMockBookGuide(book: string, workId = DEFAULT_WORK_ID): BookGuideResponse {
  const isPsalms = book.trim().toLowerCase() === 'psalms';
  const totalChapters = isPsalms ? 150 : 50;
  const introEntry: CompanionEntry = {
    id: `mock-guide-intro-${book.toLowerCase()}`,
    upsertKey: `${workId}:${book}:book:book-introduction:historical-classic:mock-guide:0`,
    workId,
    sectionKey: isPsalms ? 'PSA' : 'GEN',
    book,
    chapter: null,
    entryType: 'book-introduction',
    lens: 'historical-classic',
    visibility: 'public-domain',
    sortOrder: 0,
    title: isPsalms
      ? 'Introduction to the Five Books of the Psalter (Public-Domain Sample)'
      : `Introduction to ${book} (Public-Domain Sample)`,
    summary: isPsalms
      ? 'An overview of the 150 Psalms arranged across five classical books for morning and evening contemplation.'
      : `A public-domain editorial overview of ${book} and its place in the World English Bible canon.`,
    body: isPsalms
      ? '### The Five Books of the Psalter\nTraditionally divided into five books (Psalms 1–41, 42–72, 73–89, 90–106, and 107–150), the Psalter pairs lament, thanksgiving, wisdom, and royal praise.'
      : '### Structure & Themes\nGenesis traces the primeval history (chapters 1–11) and the ancestral narratives (chapters 12–50), grounding the rest of the Pentateuch.',
    purposes: [],
    indexPurposes: [],
    ritualTags: isPsalms ? ['Psalter', 'Daily Rhythm'] : ['Pentateuch', 'Origins'],
    citedVerses: [],
    dailySchedule: isPsalms
      ? MOCK_PSALMS_SCHEDULE.map(({ slot, psalm, book: b, chapter: c }) => ({
          slot,
          psalm,
          book: b,
          chapter: c,
        }))
      : [],
    source: {
      sourceId: 'mock-guide',
      title: 'Public-Domain Editorial Atlas Guide',
      author: 'Public-Domain Reference',
      year: 1913,
      numberingSystem: 'masoretic-web',
      license: 'public-domain',
    },
  };

  const bonusEntry: CompanionEntry | null = isPsalms
    ? {
        id: 'mock-guide-bonus-psalms',
        upsertKey: `${workId}:Psalms:book:bonus-meditations:hoodoo-folk:mock-guide:1`,
        workId,
        sectionKey: 'PSA',
        book: 'Psalms',
        chapter: null,
        entryType: 'bonus-meditations',
        lens: 'hoodoo-folk',
        visibility: 'public-domain',
        sortOrder: 1,
        title: 'Evening Stillness & Breath Cadence (Demo Meditation)',
        summary: 'Synthetic placeholder meditation demonstrating the closing meditations panel.',
        body: 'Pause after your final verse, review the chapter heading, and let the cadence of the psalm settle before closing your session.',
        purposes: [],
        indexPurposes: [],
        ritualTags: ['Evening Practice', 'Stillness'],
        citedVerses: [],
        dailySchedule: [],
        source: {
          sourceId: 'mock-guide',
          title: 'Public-Domain Editorial Atlas Guide',
          license: 'public-domain',
        },
      }
    : null;

  return {
    workId,
    book,
    bookProgress: {
      bloomedChapters: isPsalms ? 2 : 1,
      completedChapters: isPsalms ? 2 : 1,
      totalChapters,
      completedVerses: isPsalms ? 12 : 31,
      totalVerses: isPsalms ? 2461 : 1533,
      bookMastered: false,
    },
    introductions: [introEntry],
    dailySchedule: isPsalms ? MOCK_PSALMS_SCHEDULE : [],
    bonusMeditations: bonusEntry ? [bonusEntry] : [],
    lensCounts: {
      'hoodoo-folk': bonusEntry ? 1 : 0,
      'historical-classic': 1,
      community: 0,
    },
    lenses: {
      'hoodoo-folk': bonusEntry ? [bonusEntry] : [],
      'historical-classic': [introEntry],
      community: [],
    },
  };
}

export function getMockCompanionSearch(params: CompanionSearchParams = {}): CompanionSearchResponse {
  const allEntries = [
    ...MOCK_PSALM_23_ENTRIES['hoodoo-folk'],
    ...MOCK_PSALM_23_ENTRIES['historical-classic'],
    ...MOCK_PSALM_23_ENTRIES.community,
    ...MOCK_GENESIS_1_ENTRIES['hoodoo-folk'],
    ...MOCK_GENESIS_1_ENTRIES['historical-classic'],
  ];

  const q = params.q?.trim().toLowerCase() ?? '';
  const filtered = allEntries.filter((entry) => {
    if (params.book && entry.book.toLowerCase() !== params.book.toLowerCase()) return false;
    if (params.lens && entry.lens !== params.lens) return false;
    if (
      params.tag &&
      !entry.ritualTags.some((t) => t.toLowerCase() === params.tag!.toLowerCase())
    ) {
      return false;
    }
    if (
      q &&
      !`${entry.title} ${entry.summary} ${entry.ritualTags.join(' ')}`.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit).map((e) => ({
    id: e.id,
    workId: e.workId,
    book: e.book,
    chapter: e.chapter,
    entryType: e.entryType,
    lens: e.lens,
    title: e.title,
    summary: e.summary,
    ritualTags: e.ritualTags,
    sourceTitle: e.source.title,
    sourceAuthor: e.source.author,
  }));

  return {
    items,
    page,
    limit,
    total: filtered.length,
    hasMore: start + items.length < filtered.length,
  };
}

export function getMockTrailOverview(workId = DEFAULT_WORK_ID): TrailOverviewResponse {
  return {
    workId,
    totalBooks: 73,
    totalChapters: 1328,
    bloomedChapters: 8,
    inProgressChapters: 2,
    activeTraveler: {
      biomeId: 'twilight-shepherds-sanctuary',
      book: 'Psalms',
      chapter: 24,
    },
    biomes: [
      {
        biomeId: 'eden-root-garden',
        order: 1,
        name: 'Eden Root-Garden & Covenant Plains',
        phase: 1,
        books: [
          {
            book: 'Genesis',
            sectionKey: 'GEN',
            landmarkName: 'Eden Tree of Roots',
            phase1Active: true,
            totalChapters: 50,
            bloomedChapters: 2,
            inProgressChapters: 1,
            totalVerses: 1533,
            completedVerses: 66,
            state: 'in_progress',
            bookMastered: false,
            companionChapterCount: 15,
          },
        ],
      },
      {
        biomeId: 'twilight-shepherds-sanctuary',
        order: 3,
        name: "Twilight Shepherd's Sanctuary",
        phase: 1,
        books: [
          {
            book: 'Psalms',
            sectionKey: 'PSA',
            landmarkName: "Shepherd's Sanctuary Porch",
            phase1Active: true,
            totalChapters: 150,
            bloomedChapters: 6,
            inProgressChapters: 1,
            totalVerses: 2461,
            completedVerses: 52,
            state: 'in_progress',
            bookMastered: false,
            companionChapterCount: 150,
          },
        ],
      },
    ],
  };
}

export function getMockTrailBook(book: string, workId = DEFAULT_WORK_ID): TrailBookResponse {
  const isPsalms = book.trim().toLowerCase() === 'psalms';
  const totalChapters = isPsalms ? 150 : 50;
  const psalmsBloomedSet = new Set([1, 2, 15, 19, 22, 23]);
  const genesisBloomedSet = new Set([1, 2]);
  const chapters: TrailChapterWaypoint[] = Array.from({ length: totalChapters }, (_, idx) => {
    const ch = idx + 1;
    const isBloomed = isPsalms ? psalmsBloomedSet.has(ch) : genesisBloomedSet.has(ch);
    const isInProgress = isPsalms ? ch === 24 : ch === 3;
    const totalVerses = isPsalms ? (ch === 23 ? 6 : 12) : ch === 1 ? 31 : 25;
    const completedVerses = isBloomed ? totalVerses : isInProgress ? 4 : 0;
    return {
      chapter: ch,
      totalVerses,
      completedVerses,
      state: isBloomed ? 'bloomed' : isInProgress ? 'in_progress' : 'dormant',
      bestWPM: isBloomed ? 72 : isInProgress ? 64 : 0,
      bestAccuracy: isBloomed ? 99 : isInProgress ? 96 : 0,
      unlockedAt: isBloomed ? '2026-11-20T00:00:00.000Z' : null,
      hasCompanion: isPsalms || ch <= 15,
      lensCounts: {
        'hoodoo-folk': isPsalms || ch <= 2 ? 1 : 0,
        'historical-classic': ch === 1 || ch === 2 || ch === 23 ? 1 : 0,
        community: isPsalms && ch === 23 ? 1 : 0,
      },
    };
  });

  const legs = isPsalms
    ? [
        { legId: 'psa-book-1', label: 'Book I · Psalms 1–41', startChapter: 1, endChapter: 41, bloomedCount: 6, totalCount: 41 },
        { legId: 'psa-book-2', label: 'Book II · Psalms 42–72', startChapter: 42, endChapter: 72, bloomedCount: 0, totalCount: 31 },
        { legId: 'psa-book-3', label: 'Book III · Psalms 73–89', startChapter: 73, endChapter: 89, bloomedCount: 0, totalCount: 17 },
        { legId: 'psa-book-4', label: 'Book IV · Psalms 90–106', startChapter: 90, endChapter: 106, bloomedCount: 0, totalCount: 17 },
        { legId: 'psa-book-5', label: 'Book V · Psalms 107–150', startChapter: 107, endChapter: 150, bloomedCount: 0, totalCount: 44 },
      ]
    : [
        { legId: 'gen-leg-1', label: 'Ch. 1–10', startChapter: 1, endChapter: 10, bloomedCount: 2, totalCount: 10 },
        { legId: 'gen-leg-2', label: 'Ch. 11–20', startChapter: 11, endChapter: 20, bloomedCount: 0, totalCount: 10 },
        { legId: 'gen-leg-3', label: 'Ch. 21–30', startChapter: 21, endChapter: 30, bloomedCount: 0, totalCount: 10 },
        { legId: 'gen-leg-4', label: 'Ch. 31–40', startChapter: 31, endChapter: 40, bloomedCount: 0, totalCount: 10 },
        { legId: 'gen-leg-5', label: 'Ch. 41–50', startChapter: 41, endChapter: 50, bloomedCount: 0, totalCount: 10 },
      ];

  return {
    workId,
    book: isPsalms ? 'Psalms' : book,
    sectionKey: isPsalms ? 'PSA' : 'GEN',
    biomeId: isPsalms ? 'twilight-shepherds-sanctuary' : 'eden-root-garden',
    landmarkName: isPsalms ? "Shepherd's Sanctuary Porch" : 'Eden Tree of Roots',
    phase1Active: isPsalms || book.trim().toLowerCase() === 'genesis',
    state: 'in_progress',
    bookMastered: false,
    totalChapters,
    bloomedChapters: isPsalms ? 6 : 2,
    totalVerses: isPsalms ? 2461 : 1533,
    completedVerses: isPsalms ? 64 : 60,
    hasBookGuide: true,
    activeChapter: isPsalms ? 24 : 3,
    legs,
    chapters,
  };
}
