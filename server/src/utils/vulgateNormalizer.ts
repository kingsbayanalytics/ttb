import { isCanonicalBook } from './bookMapping';
import { getCanonicalChapterCount } from './companionWorks';

/**
 * Legacy Douay-Rheims / Vulgate book names mapped 1:1 to canonical WEB names
 * in `server/src/utils/bookMapping.ts`.
 */
const DOUAY_RHEIMS_BOOK_ALIASES: Readonly<Record<string, string>> = {
  // Samuel & Kings (Vulgate 1-4 Kings)
  '1 kings': '1 Samuel',
  '1 kings (dr)': '1 Samuel',
  'i kings': '1 Samuel',
  '1 samuel': '1 Samuel',
  '2 kings': '2 Samuel',
  '2 kings (dr)': '2 Samuel',
  'ii kings': '2 Samuel',
  '2 samuel': '2 Samuel',
  '3 kings': '1 Kings',
  '3 kings (dr)': '1 Kings',
  'iii kings': '1 Kings',
  '4 kings': '2 Kings',
  '4 kings (dr)': '2 Kings',
  'iv kings': '2 Kings',

  // Chronicles (Paralipomenon)
  '1 paralipomenon': '1 Chronicles',
  '2 paralipomenon': '2 Chronicles',
  'i paralipomenon': '1 Chronicles',
  'ii paralipomenon': '2 Chronicles',
  'paralipomenon 1': '1 Chronicles',
  'paralipomenon 2': '2 Chronicles',

  // Ezra & Nehemiah (1-2 Esdras in Vulgate/DR)
  '1 esdras': 'Ezra',
  'i esdras': 'Ezra',
  esdras: 'Ezra',
  '2 esdras': 'Nehemiah',
  'ii esdras': 'Nehemiah',
  nehemias: 'Nehemiah',

  // Historical / Deuterocanonical
  josue: 'Joshua',
  tobias: 'Tobit',
  judith: 'Judith',
  esther: 'Esther',
  '1 machabees': '1 Maccabees',
  '2 machabees': '2 Maccabees',
  'i machabees': '1 Maccabees',
  'ii machabees': '2 Maccabees',

  // Wisdom / Poetry
  psalm: 'Psalms',
  psalms: 'Psalms',
  'canticle of canticles': 'Song of Solomon',
  canticles: 'Song of Solomon',
  'song of songs': 'Song of Solomon',
  'book of wisdom': 'Wisdom',
  ecclesiasticus: 'Sirach',
  'ben sira': 'Sirach',

  // Major Prophets
  isaias: 'Isaiah',
  jeremias: 'Jeremiah',
  lamentations: 'Lamentations',
  baruch: 'Baruch',
  ezechiel: 'Ezekiel',
  daniel: 'Daniel',

  // Minor Prophets
  osee: 'Hosea',
  joel: 'Joel',
  amos: 'Amos',
  abdias: 'Obadiah',
  jonas: 'Jonah',
  micheas: 'Micah',
  nahum: 'Nahum',
  habacuc: 'Habakkuk',
  sophonias: 'Zephaniah',
  aggeus: 'Haggai',
  zacharias: 'Zechariah',
  malachias: 'Malachi',

  // New Testament
  'acts of the apostles': 'Acts',
  apocalypse: 'Revelation',
  'apocalypse of st. john': 'Revelation',
  'apocalypse of saint john': 'Revelation',
};

/**
 * Normalizes a Douay-Rheims / Vulgate book name (or canonical WEB book name)
 * to its exact canonical name in `server/src/utils/bookMapping.ts`.
 *
 * Note: For Douay-Rheims sources where `1 Kings` = `1 Samuel` and `2 Kings` = `2 Samuel`,
 * this function intentionally applies the Vulgate 1-4 Kings convention (use `sourceSystem: 'web'`
 * if normalizing a non-Vulgate name).
 */
export function normalizeDouayBookName(
  raw: string,
  options: { strictVulgateKings?: boolean } = {}
): string {
  const strictVulgateKings = options.strictVulgateKings ?? true;
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new Error('Book name must be a non-empty string');
  }

  const lower = trimmed.toLowerCase();

  // In Vulgate/Douay-Rheims, "1 Kings" and "2 Kings" refer to 1 & 2 Samuel.
  if (strictVulgateKings && (lower === '1 kings' || lower === '2 kings')) {
    return DOUAY_RHEIMS_BOOK_ALIASES[lower];
  }

  if (isCanonicalBook(trimmed)) {
    return trimmed;
  }

  const mapped = DOUAY_RHEIMS_BOOK_ALIASES[lower];
  if (mapped) {
    return mapped;
  }

  // Case-insensitive match against canonical WEB names
  for (const canonical of Object.values(DOUAY_RHEIMS_BOOK_ALIASES)) {
    if (canonical.toLowerCase() === lower) {
      return canonical;
    }
  }

  throw new Error(`Unknown Douay-Rheims / canonical book name: "${raw}"`);
}

export function validateNormalizedBookChapter(book: string, chapter: number): boolean {
  const maxChapter = getCanonicalChapterCount(book);
  if (maxChapter === undefined) {
    return false;
  }
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= maxChapter;
}

export type VulgatePsalmTransformMode = 'exact' | 'shift' | 'split' | 'merge';

export interface VulgatePsalmMapping {
  drPsalm: number;
  webChapters: number[];
  webChapter: number | null; // Single resolved chapter (null only for unsplit DR 9 or DR 113 when verse is omitted)
  mode: VulgatePsalmTransformMode;
  originalRef: string;
  splitVerseBoundary?: number; // Inclusive last DR verse belonging to first WEB psalm (21 for DR 9, 8 for DR 113)
  mergePartnerDrPsalm?: number; // Partner DR psalm merged into same WEB chapter (114<->115, 146<->147)
}

/**
 * Deterministic Vulgate / Douay-Rheims -> WEB / Masoretic Psalm alignment:
 *  - DR 1..8       -> WEB 1..8 (exact)
 *  - DR 9          -> split: vv. 1..21 -> WEB 9, vv. 22..39 -> WEB 10
 *  - DR 10..112    -> WEB (n + 1) = 11..113 (shift +1)
 *  - DR 113        -> split: vv. 1..8 -> WEB 114, vv. 9..26 -> WEB 115
 *  - DR 114 + 115  -> merge into WEB 116
 *  - DR 116..145   -> WEB (n + 1) = 117..146 (shift +1)
 *  - DR 146 + 147  -> merge into WEB 147
 *  - DR 148..150   -> WEB 148..150 (exact)
 */
export function normalizeVulgatePsalm(drPsalm: number, verse?: number): VulgatePsalmMapping {
  if (!Number.isInteger(drPsalm) || drPsalm < 1 || drPsalm > 150) {
    throw new Error(`Douay-Rheims Psalm number must be an integer 1..150, got ${drPsalm}`);
  }
  if (verse !== undefined && (!Number.isInteger(verse) || verse < 1)) {
    throw new Error(`Verse number must be a positive integer when provided, got ${verse}`);
  }

  if (drPsalm >= 1 && drPsalm <= 8) {
    return {
      drPsalm,
      webChapters: [drPsalm],
      webChapter: drPsalm,
      mode: 'exact',
      originalRef: `Douay-Rheims Psalm ${drPsalm}`,
    };
  }

  if (drPsalm === 9) {
    if (verse !== undefined) {
      const target = verse <= 21 ? 9 : 10;
      const range = verse <= 21 ? 'vv. 1–21' : 'vv. 22–39';
      return {
        drPsalm,
        webChapters: [target],
        webChapter: target,
        mode: 'split',
        originalRef: `Douay-Rheims Psalm 9 (${range})`,
        splitVerseBoundary: 21,
      };
    }
    return {
      drPsalm,
      webChapters: [9, 10],
      webChapter: null,
      mode: 'split',
      originalRef: 'Douay-Rheims Psalm 9',
      splitVerseBoundary: 21,
    };
  }

  if (drPsalm >= 10 && drPsalm <= 112) {
    const target = drPsalm + 1;
    return {
      drPsalm,
      webChapters: [target],
      webChapter: target,
      mode: 'shift',
      originalRef: `Douay-Rheims Psalm ${drPsalm}`,
    };
  }

  if (drPsalm === 113) {
    if (verse !== undefined) {
      const target = verse <= 8 ? 114 : 115;
      const range = verse <= 8 ? 'vv. 1–8' : 'vv. 9–26';
      return {
        drPsalm,
        webChapters: [target],
        webChapter: target,
        mode: 'split',
        originalRef: `Douay-Rheims Psalm 113 (${range})`,
        splitVerseBoundary: 8,
      };
    }
    return {
      drPsalm,
      webChapters: [114, 115],
      webChapter: null,
      mode: 'split',
      originalRef: 'Douay-Rheims Psalm 113',
      splitVerseBoundary: 8,
    };
  }

  if (drPsalm === 114 || drPsalm === 115) {
    return {
      drPsalm,
      webChapters: [116],
      webChapter: 116,
      mode: 'merge',
      originalRef: 'Douay-Rheims Psalms 114–115',
      mergePartnerDrPsalm: drPsalm === 114 ? 115 : 114,
    };
  }

  if (drPsalm >= 116 && drPsalm <= 145) {
    const target = drPsalm + 1;
    return {
      drPsalm,
      webChapters: [target],
      webChapter: target,
      mode: 'shift',
      originalRef: `Douay-Rheims Psalm ${drPsalm}`,
    };
  }

  if (drPsalm === 146 || drPsalm === 147) {
    return {
      drPsalm,
      webChapters: [147],
      webChapter: 147,
      mode: 'merge',
      originalRef: 'Douay-Rheims Psalms 146–147',
      mergePartnerDrPsalm: drPsalm === 146 ? 147 : 146,
    };
  }

  // 148..150
  return {
    drPsalm,
    webChapters: [drPsalm],
    webChapter: drPsalm,
    mode: 'exact',
    originalRef: `Douay-Rheims Psalm ${drPsalm}`,
  };
}

export interface DrPsalmVerseBlock {
  verse: number;
  text: string;
}

export interface DrPsalmInput {
  drPsalm: number;
  title: string;
  summary?: string;
  body: string;
  verseBlocks?: DrPsalmVerseBlock[];
}

export interface NormalizedWebPsalmEntry {
  book: 'Psalms';
  chapter: number;
  title: string;
  summary: string;
  body: string;
  source: {
    numberingSystem: 'vulgate-dr';
    originalRef: string;
  };
}

/**
 * Converts a full (or partial) set of Douay-Rheims Psalm entries into exact
 * Masoretic / WEB Psalm entries, performing splits (DR 9 -> 9 & 10, DR 113 -> 114 & 115)
 * and merges (DR 114 + 115 -> 116, DR 146 + 147 -> 147) with complete provenance.
 */
export function normalizeVulgatePsalmEntries(
  entries: DrPsalmInput[]
): NormalizedWebPsalmEntry[] {
  const byWebChapter = new Map<number, NormalizedWebPsalmEntry>();

  const upsertMerged = (
    webChapter: number,
    entry: NormalizedWebPsalmEntry,
    subHeading: string
  ) => {
    const existing = byWebChapter.get(webChapter);
    if (!existing) {
      byWebChapter.set(webChapter, {
        ...entry,
        body: `### ${subHeading}\n${entry.body}`,
      });
      return;
    }
    existing.body = `${existing.body}\n\n### ${subHeading}\n${entry.body}`;
    if (entry.summary && !existing.summary.includes(entry.summary)) {
      existing.summary = existing.summary
        ? `${existing.summary} ${entry.summary}`
        : entry.summary;
    }
  };

  for (const input of entries) {
    const mapping = normalizeVulgatePsalm(input.drPsalm);

    if (mapping.mode === 'split' && mapping.splitVerseBoundary !== undefined) {
      const boundary = mapping.splitVerseBoundary;
      const [firstWeb, secondWeb] = mapping.webChapters;

      const firstBlocks = (input.verseBlocks ?? []).filter((b) => b.verse <= boundary);
      const secondBlocks = (input.verseBlocks ?? []).filter((b) => b.verse > boundary);

      const firstRange = input.drPsalm === 9 ? 'vv. 1–21' : 'vv. 1–8';
      const secondRange = input.drPsalm === 9 ? 'vv. 22–39' : 'vv. 9–26';

      const firstBody =
        firstBlocks.length > 0
          ? firstBlocks.map((b) => `v.${b.verse}: ${b.text}`).join('\n\n')
          : input.body;
      const secondBody =
        secondBlocks.length > 0
          ? secondBlocks.map((b) => `v.${b.verse}: ${b.text}`).join('\n\n')
          : input.body;

      byWebChapter.set(firstWeb, {
        book: 'Psalms',
        chapter: firstWeb,
        title: input.title,
        summary: input.summary ?? input.title,
        body: firstBody,
        source: {
          numberingSystem: 'vulgate-dr',
          originalRef: `Douay-Rheims Psalm ${input.drPsalm} (${firstRange})`,
        },
      });

      byWebChapter.set(secondWeb, {
        book: 'Psalms',
        chapter: secondWeb,
        title: input.title,
        summary: input.summary ?? input.title,
        body: secondBody,
        source: {
          numberingSystem: 'vulgate-dr',
          originalRef: `Douay-Rheims Psalm ${input.drPsalm} (${secondRange})`,
        },
      });
      continue;
    }

    if (mapping.mode === 'merge' && mapping.webChapter !== null) {
      upsertMerged(
        mapping.webChapter,
        {
          book: 'Psalms',
          chapter: mapping.webChapter,
          title: `Psalm ${mapping.webChapter}`,
          summary: input.summary ?? input.title,
          body: input.body,
          source: {
            numberingSystem: 'vulgate-dr',
            originalRef: mapping.originalRef,
          },
        },
        `Douay-Rheims Psalm ${input.drPsalm}: ${input.title}`
      );
      continue;
    }

    if (mapping.webChapter !== null) {
      byWebChapter.set(mapping.webChapter, {
        book: 'Psalms',
        chapter: mapping.webChapter,
        title: input.title,
        summary: input.summary ?? input.title,
        body: input.body,
        source: {
          numberingSystem: 'vulgate-dr',
          originalRef: mapping.originalRef,
        },
      });
    }
  }

  return Array.from(byWebChapter.values()).sort((a, b) => a.chapter - b.chapter);
}
