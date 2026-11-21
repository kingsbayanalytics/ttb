import {
  CANONICAL_CHAPTER_COUNTS,
  PHASE1_ACTIVE_BOOKS,
  findClearingForChapter,
  getBiomeForBook,
} from '../../data/trailBiomes';
import { ChapterJustUnlocked, TrailYardPropWakeEvent } from '../../types';

export function formatChapterLabel(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

export interface ChapterTrailStepSummary {
  readonly chapterLabel: string;
  readonly arcTitle: string;
  readonly kicker: string;
  readonly iconPath: string;
  readonly nextChapter: number | null;
  readonly stepCopy: string;
  readonly propNote: string | null;
  readonly propAwakened: boolean;
  readonly trailHref: string;
}

const PROP_ICON_PATHS: Readonly<Record<TrailYardPropWakeEvent, string>> = {
  'bottle-tree': '/assets/trail/hd/badges/badge-trail-bottle-tree.png',
  'herb-rack': '/assets/trail/hd/badges/badge-trail-herb-rack.png',
  'river-cairn': '/assets/trail/hd/prop-river-cairn-hd.png',
  'elder-keeper': '/assets/trail/hd/badges/badge-trail-clearing-complete.png',
};

const DEFAULT_BLOOM_ICON_PATH = '/assets/trail/hd/badges/badge-trail-first-bloom.png';

const AWAKENED_PROP_NOTES: Readonly<Record<TrailYardPropWakeEvent, string>> = {
  'bottle-tree': '✦ Hoodoo Bottle Tree awakened in this clearing!',
  'herb-rack': '✦ Sanctuary Herb Rack awakened in this clearing!',
  'river-cairn': '✦ Anointed River Cairn awakened in this clearing!',
  'elder-keeper': '✦ Clearing complete — the Elder Keeper steps onto the porch!',
};

export function buildChapterTrailStepSummary(
  unlock: ChapterJustUnlocked
): ChapterTrailStepSummary {
  const isPhase1 = PHASE1_ACTIVE_BOOKS.has(unlock.book);
  const canonicalTotal = CANONICAL_CHAPTER_COUNTS[unlock.book];
  const clearing = isPhase1
    ? findClearingForChapter(unlock.book, unlock.chapter, canonicalTotal)
    : undefined;
  const biome = getBiomeForBook(unlock.book);

  const chapterLabel = formatChapterLabel(unlock.book, unlock.chapter);
  const arcTitle = clearing ? clearing.storyTitle : biome?.shortName ?? unlock.book;
  const kicker = `✦ NEW TRAIL STEP · ${arcTitle}`;

  const trailStep = unlock.trailStep;
  const propJustAwakened = trailStep?.propJustAwakened ?? null;
  const iconPath = propJustAwakened
    ? PROP_ICON_PATHS[propJustAwakened]
    : DEFAULT_BLOOM_ICON_PATH;

  const nextChapter =
    trailStep !== undefined
      ? trailStep.nextChapter
      : canonicalTotal && unlock.chapter < canonicalTotal
      ? unlock.chapter + 1
      : null;

  const prefix =
    trailStep && trailStep.clearingTotal > 0
      ? `Flagstone ${trailStep.clearingBloomed}/${trailStep.clearingTotal} lit`
      : `Flagstone lit (${unlock.totalVerses} ${unlock.totalVerses === 1 ? 'verse' : 'verses'})`;
  const suffix = nextChapter
    ? `Michael steps to ${formatChapterLabel(unlock.book, nextChapter)}`
    : `${unlock.book} journey complete`;
  const stepCopy = `${prefix} · ${suffix}`;

  let propNote: string | null = null;
  let propAwakened = false;

  if (propJustAwakened) {
    propNote = AWAKENED_PROP_NOTES[propJustAwakened];
    propAwakened = true;
  } else if (trailStep && trailStep.clearingBloomed > 0 && trailStep.clearingTotal > 0) {
    const { clearingBloomed, clearingTotal } = trailStep;
    if (clearingBloomed < 8) {
      propNote = `✦ Bottle Tree: ${clearingBloomed} ${
        clearingBloomed === 1 ? 'sun-bottle' : 'sun-bottles'
      } lit`;
    } else if (clearingBloomed < clearingTotal) {
      const remaining = clearingTotal - clearingBloomed;
      propNote = `✦ ${remaining} more ${
        remaining === 1 ? 'flagstone' : 'flagstones'
      } until the Elder Keeper steps out`;
    } else {
      propNote = '✦ Clearing sanctuary fully lit';
    }
  }

  const trailHref = isPhase1
    ? `/trail?book=${encodeURIComponent(unlock.book)}&chapter=${unlock.chapter}`
    : `/trail?book=${encodeURIComponent(unlock.book)}`;

  return {
    chapterLabel,
    arcTitle,
    kicker,
    iconPath,
    nextChapter,
    stepCopy,
    propNote,
    propAwakened,
    trailHref,
  };
}
