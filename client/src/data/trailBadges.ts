import { AchievementsData, BadgeCategory, BadgeItem } from '../types';

export interface TrailBadgeMeta {
  readonly iconPath: string;
  readonly ribbonLabel: string;
  readonly flavor: string;
}

export interface BadgeCategoryMeta {
  readonly key: 'all' | BadgeCategory;
  readonly label: string;
}

export const BADGE_CATEGORY_META: ReadonlyArray<BadgeCategoryMeta> = [
  { key: 'all', label: 'All Medallions' },
  { key: 'trail', label: 'Living Trail' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'precision', label: 'Precision' },
  { key: 'canon', label: 'Canon' },
];

export const TRAIL_BADGE_META: Readonly<Record<string, TrailBadgeMeta>> = {
  'trail-first-bloom': {
    iconPath: '/assets/trail/hd/badges/badge-trail-first-bloom.png',
    ribbonLabel: 'Waypoint I',
    flavor: 'Every river flagstone waits patiently under parchment mist until its last verse is typed.',
  },
  'trail-bottle-tree': {
    iconPath: '/assets/trail/hd/badges/badge-trail-bottle-tree.png',
    ribbonLabel: 'Yard Charm',
    flavor: 'Cobalt and amber sun-bottles chime in the yard breeze to guard each budding clearing.',
  },
  'trail-herb-rack': {
    iconPath: '/assets/trail/hd/badges/badge-trail-herb-rack.png',
    ribbonLabel: 'Apothecary',
    flavor: 'Fragrant hyssop, lavender, and garden sage hang to cure beside the winding clay path.',
  },
  'trail-clearing-complete': {
    iconPath: '/assets/trail/hd/badges/badge-trail-clearing-complete.png',
    ribbonLabel: 'Sanctuary',
    flavor: 'When every flagstone in an arc shines gold, the Biome Keeper steps onto the porch.',
  },
  'first-scribe': {
    iconPath: '/assets/trail/hd/badges/badge-first-scribe.png',
    ribbonLabel: 'First Ink',
    flavor: 'A single faithful verse opens the long pilgrimage road through scripture.',
  },
  'streak-3': {
    iconPath: '/assets/trail/hd/badges/badge-streak-3.png',
    ribbonLabel: '3-Day Knot',
    flavor: 'Three threads twisted together hold fast through ordinary mornings.',
  },
  'streak-7': {
    iconPath: '/assets/trail/hd/badges/badge-streak-7.png',
    ribbonLabel: 'Sabbath Oil',
    flavor: 'Seven trimmed wicks keep the porch lantern steady from Sunday to Sunday.',
  },
  'streak-30': {
    iconPath: '/assets/trail/hd/badges/badge-streak-30.png',
    ribbonLabel: '30-Day Seal',
    flavor: 'Thirty pages clasped in leather—a habit woven deep into muscle memory.',
  },
  'speed-60': {
    iconPath: '/assets/trail/hd/badges/badge-speed-60.png',
    ribbonLabel: '60 WPM',
    flavor: 'Warm ochre sparks fly off a feather pen moving at clean cadence.',
  },
  'speed-80': {
    iconPath: '/assets/trail/hd/badges/badge-speed-80.png',
    ribbonLabel: '80 WPM',
    flavor: 'Paired brass and steel nibs cross smoothly without losing a syllable.',
  },
  'speed-100': {
    iconPath: '/assets/trail/hd/badges/badge-speed-100.png',
    ribbonLabel: '100 WPM',
    flavor: 'Spoked chariot brass ablaze with practiced fluency across the verse.',
  },
  'precision-100': {
    iconPath: '/assets/trail/hd/badges/badge-precision-100.png',
    ribbonLabel: 'Chamomile',
    flavor: 'Tested by the brass plumb-bob and crowned with unblemished white petals.',
  },
  'psalms-mantra': {
    iconPath: '/assets/trail/hd/badges/badge-psalms-mantra.png',
    ribbonLabel: 'Psalter',
    flavor: 'Carved cedar strings hum beneath sprigs of twilight hyssop and lavender.',
  },
  'explorer-50': {
    iconPath: '/assets/trail/hd/badges/badge-explorer-50.png',
    ribbonLabel: '50 Verses',
    flavor: 'Pocket brass compass set true across scrolls of the sixty-six plus seven.',
  },
};

export function getBadgeMedallionPath(badgeId: string): string {
  return (
    TRAIL_BADGE_META[badgeId]?.iconPath ??
    '/assets/trail/hd/badges/badge-first-scribe.png'
  );
}

export function getBadgeFlavor(badge: BadgeItem): string {
  return TRAIL_BADGE_META[badge.id]?.flavor ?? badge.description;
}

export function getBadgeRibbonLabel(badge: BadgeItem): string {
  return TRAIL_BADGE_META[badge.id]?.ribbonLabel ?? badge.category;
}

export function createMockAchievementsData(options?: {
  bloomedChaptersCount?: number;
  maxClearingBloomedCount?: number;
  bestClearingTotal?: number;
}): AchievementsData {
  const bloomed = options?.bloomedChaptersCount ?? 0;
  const maxClearing = options?.maxClearingBloomedCount ?? 0;
  const clearingTarget = options?.bestClearingTotal ?? 10;

  const make = (
    id: string,
    title: string,
    description: string,
    category: BadgeCategory,
    progressCurrent: number,
    progressTarget: number
  ): BadgeItem => {
    const safeCurrent = Math.max(0, Math.round(progressCurrent));
    const safeTarget = Math.max(1, Math.round(progressTarget));
    const unlocked = safeCurrent >= safeTarget;
    return {
      id,
      title,
      description,
      category,
      unlocked,
      progressCurrent: safeCurrent,
      progressTarget: safeTarget,
      progressPct: unlocked ? 100 : Math.min(99, Math.round((safeCurrent / safeTarget) * 100)),
    };
  };

  return {
    streak: {
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: null,
      activeToday: false,
    },
    milestones: {
      totalAttempts: 0,
      bestWpm: 0,
      flawlessCount: 0,
      uniqueVersesCompleted: 0,
      psalmsCompletedCount: 0,
      bloomedChaptersCount: bloomed,
      completedClearingsCount: maxClearing >= clearingTarget ? 1 : 0,
    },
    badges: [
      make(
        'first-scribe',
        'First Scribe',
        'Complete your first scripture typing transcription.',
        'consistency',
        0,
        1
      ),
      make(
        'streak-3',
        'Threefold Cord',
        'Maintain a 3-day daily scripture typing streak.',
        'consistency',
        0,
        3
      ),
      make(
        'streak-7',
        'Sabbath Rhythm',
        'Maintain a 7-day daily scripture typing streak.',
        'consistency',
        0,
        7
      ),
      make(
        'streak-30',
        'Steadfast Scribe',
        'Maintain a 30-day daily scripture typing streak.',
        'consistency',
        0,
        30
      ),
      make(
        'speed-60',
        'Swift Pen (60 WPM)',
        'Reach 60 WPM or higher on any verse.',
        'velocity',
        0,
        60
      ),
      make(
        'speed-80',
        'Ready Scribe (80 WPM)',
        'Reach 80 WPM or higher on any verse.',
        'velocity',
        0,
        80
      ),
      make(
        'speed-100',
        'Chariot of Fire (100 WPM)',
        'Reach 100 WPM or higher on any verse.',
        'velocity',
        0,
        100
      ),
      make(
        'precision-100',
        'Unblemished Text',
        'Transcribe 10 verses with 100% flawless accuracy.',
        'precision',
        0,
        10
      ),
      make(
        'psalms-mantra',
        'Psalter Keeper',
        'Complete 10 unique verses from the Book of Psalms.',
        'canon',
        0,
        10
      ),
      make(
        'explorer-50',
        'Codex Explorer',
        'Complete 50 unique verses across the canon.',
        'canon',
        0,
        50
      ),
      make(
        'trail-first-bloom',
        'First Bloom',
        'Bloom your first complete scripture chapter on the Living Trail.',
        'trail',
        bloomed,
        1
      ),
      make(
        'trail-bottle-tree',
        'Bottle Tree Lit',
        "Awaken a clearing's Hoodoo Bottle Tree by blooming a chapter in Genesis or Psalms.",
        'trail',
        maxClearing,
        1
      ),
      make(
        'trail-herb-rack',
        'Herb Rack Awake',
        'Awaken the Rootwork & Sanctuary Herb Rack by blooming 2 chapters in a single clearing.',
        'trail',
        maxClearing,
        2
      ),
      make(
        'trail-clearing-complete',
        'Clearing Complete',
        'Bloom every river flagstone in a Story-Arc clearing so the Elder Keeper steps out.',
        'trail',
        maxClearing,
        clearingTarget
      ),
    ],
  };
}
