import {
  createDayFormatter,
  subtractCalendarDays,
  toValidDate,
} from './timezone';

export interface AchievementsResultInput {
  startTime: Date | string;
  wpm: number;
  accuracy: number;
  incorrectCharacters?: number;
}

export interface StreakSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string | null;
  activeToday: boolean;
}

export interface MilestonesSummary {
  totalAttempts: number;
  bestWpm: number;
  flawlessCount: number;
  uniqueVersesCompleted: number;
  psalmsCompletedCount: number;
  bloomedChaptersCount: number;
  completedClearingsCount: number;
}

export type BadgeCategory = 'consistency' | 'velocity' | 'precision' | 'canon' | 'trail';

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
}

export interface AchievementsData {
  streak: StreakSummary;
  milestones: MilestonesSummary;
  badges: BadgeItem[];
}

export interface BuildStreaksAndBadgesOptions {
  results: ReadonlyArray<AchievementsResultInput>;
  completedProgressCount: number;
  psalmsCompletedCount: number;
  bloomedChaptersCount?: number;
  maxClearingBloomedCount?: number;
  bestClearingBloomed?: number;
  bestClearingTotal?: number;
  completedClearingsCount?: number;
  timezone?: string;
  now?: Date;
}

function calendarDaysBetween(earlierYmd: string, laterYmd: string): number {
  const [y1, m1, d1] = earlierYmd.split('-').map(Number);
  const [y2, m2, d2] = laterYmd.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (24 * 60 * 60 * 1000));
}

function buildBadge(
  id: string,
  title: string,
  description: string,
  category: BadgeCategory,
  progressCurrent: number,
  progressTarget: number
): BadgeItem {
  const safeCurrent = Math.max(0, Math.round(progressCurrent));
  const safeTarget = Math.max(1, Math.round(progressTarget));
  const unlocked = safeCurrent >= safeTarget;
  const progressPct = unlocked
    ? 100
    : Math.min(99, Math.round((safeCurrent / safeTarget) * 100));

  return {
    id,
    title,
    description,
    category,
    unlocked,
    progressCurrent: safeCurrent,
    progressTarget: safeTarget,
    progressPct,
  };
}

/**
 * Computes timezone-aware daily streaks, personal milestones, and 14 Living Trail / editorial badges.
 */
export function buildStreaksAndBadges(
  options: BuildStreaksAndBadgesOptions
): AchievementsData {
  const tz = options.timezone ?? 'UTC';
  const now = options.now ?? new Date();
  const formatter = createDayFormatter(tz);
  const todayInTz = formatter.format(toValidDate(now));
  const yesterdayInTz = subtractCalendarDays(todayInTz, 1);

  const uniqueDatesSet = new Set<string>();
  let bestWpm = 0;
  let flawlessCount = 0;

  for (const row of options.results) {
    const dateStr = formatter.format(toValidDate(row.startTime));
    uniqueDatesSet.add(dateStr);

    if (typeof row.wpm === 'number' && Number.isFinite(row.wpm) && row.wpm > bestWpm) {
      bestWpm = Math.round(row.wpm);
    }

    const isFlawless =
      row.accuracy >= 100 &&
      (row.incorrectCharacters === undefined || row.incorrectCharacters === 0);
    if (isFlawless) {
      flawlessCount += 1;
    }
  }

  const sortedDates = Array.from(uniqueDatesSet).sort((a, b) => a.localeCompare(b));
  const lastActiveDate =
    sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const activeToday = uniqueDatesSet.has(todayInTz);

  let longestStreakDays = 0;
  let runningStreak = 0;

  for (let i = 0; i < sortedDates.length; i += 1) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const diff = calendarDaysBetween(sortedDates[i - 1], sortedDates[i]);
      runningStreak = diff === 1 ? runningStreak + 1 : 1;
    }
    if (runningStreak > longestStreakDays) {
      longestStreakDays = runningStreak;
    }
  }

  let currentStreakDays = 0;
  if (uniqueDatesSet.has(todayInTz) || uniqueDatesSet.has(yesterdayInTz)) {
    let cursor = uniqueDatesSet.has(todayInTz) ? todayInTz : yesterdayInTz;
    while (uniqueDatesSet.has(cursor)) {
      currentStreakDays += 1;
      cursor = subtractCalendarDays(cursor, 1);
    }
  }

  const totalAttempts = options.results.length;
  const uniqueVersesCompleted = Math.max(0, options.completedProgressCount);
  const psalmsCompletedCount = Math.max(0, options.psalmsCompletedCount);
  const bloomedChaptersCount = Math.max(0, Math.round(options.bloomedChaptersCount ?? 0));
  const maxClearingBloomedCount = Math.max(
    0,
    Math.round(options.maxClearingBloomedCount ?? 0)
  );
  const completedClearingsCount = Math.max(
    0,
    Math.round(options.completedClearingsCount ?? 0)
  );
  const bestClearingTotal = Math.max(1, Math.round(options.bestClearingTotal ?? 10));
  const bestClearingBloomed = Math.max(0, Math.round(options.bestClearingBloomed ?? 0));

  const streak: StreakSummary = {
    currentStreakDays,
    longestStreakDays,
    lastActiveDate,
    activeToday,
  };

  const milestones: MilestonesSummary = {
    totalAttempts,
    bestWpm,
    flawlessCount,
    uniqueVersesCompleted,
    psalmsCompletedCount,
    bloomedChaptersCount,
    completedClearingsCount,
  };

  const bestStreakForBadges = Math.max(currentStreakDays, longestStreakDays);

  const badges: BadgeItem[] = [
    buildBadge(
      'first-scribe',
      'First Scribe',
      'Complete your first scripture typing transcription.',
      'consistency',
      totalAttempts,
      1
    ),
    buildBadge(
      'streak-3',
      'Threefold Cord',
      'Maintain a 3-day daily scripture typing streak.',
      'consistency',
      bestStreakForBadges,
      3
    ),
    buildBadge(
      'streak-7',
      'Sabbath Rhythm',
      'Maintain a 7-day daily scripture typing streak.',
      'consistency',
      bestStreakForBadges,
      7
    ),
    buildBadge(
      'streak-30',
      'Steadfast Scribe',
      'Maintain a 30-day daily scripture typing streak.',
      'consistency',
      bestStreakForBadges,
      30
    ),
    buildBadge(
      'speed-60',
      'Swift Pen (60 WPM)',
      'Reach 60 WPM or higher on any verse.',
      'velocity',
      bestWpm,
      60
    ),
    buildBadge(
      'speed-80',
      'Ready Scribe (80 WPM)',
      'Reach 80 WPM or higher on any verse.',
      'velocity',
      bestWpm,
      80
    ),
    buildBadge(
      'speed-100',
      'Chariot of Fire (100 WPM)',
      'Reach 100 WPM or higher on any verse.',
      'velocity',
      bestWpm,
      100
    ),
    buildBadge(
      'precision-100',
      'Unblemished Text',
      'Transcribe 10 verses with 100% flawless accuracy.',
      'precision',
      flawlessCount,
      10
    ),
    buildBadge(
      'psalms-mantra',
      'Psalter Keeper',
      'Complete 10 unique verses from the Book of Psalms.',
      'canon',
      psalmsCompletedCount,
      10
    ),
    buildBadge(
      'explorer-50',
      'Codex Explorer',
      'Complete 50 unique verses across the canon.',
      'canon',
      uniqueVersesCompleted,
      50
    ),
    buildBadge(
      'trail-first-bloom',
      'First Bloom',
      'Bloom your first complete scripture chapter on the Living Trail.',
      'trail',
      bloomedChaptersCount,
      1
    ),
    buildBadge(
      'trail-bottle-tree',
      'Bottle Tree Lit',
      "Awaken a clearing's Hoodoo Bottle Tree by blooming a chapter in Genesis or Psalms.",
      'trail',
      maxClearingBloomedCount,
      1
    ),
    buildBadge(
      'trail-herb-rack',
      'Herb Rack Awake',
      'Awaken the Rootwork & Sanctuary Herb Rack by blooming 2 chapters in a single clearing.',
      'trail',
      maxClearingBloomedCount,
      2
    ),
    buildBadge(
      'trail-clearing-complete',
      'Clearing Complete',
      'Bloom every river flagstone in a Story-Arc clearing so the Elder Keeper steps out.',
      'trail',
      completedClearingsCount >= 1 ? bestClearingTotal : bestClearingBloomed,
      bestClearingTotal
    ),
  ];

  return {
    streak,
    milestones,
    badges,
  };
}
