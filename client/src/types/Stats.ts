import { Verse } from './Verse';

export type TrendRange = '30' | '90' | '365' | 'all';

export interface TrendPoint {
  date: string;
  avgWpm: number;
  avgAccuracy: number;
  attempts: number;
}

export interface ActivityPoint {
  date: string;
  attempts: number;
}

export type Testament = 'Old Testament' | 'New Testament';

export interface CoverageSummary {
  totalVerses: number;
  completedVerses: number;
  percentage: number;
}

export interface TestamentCoverage extends CoverageSummary {
  testament: Testament;
}

export interface BookCoverage extends CoverageSummary {
  book: string;
  testament: Testament;
}

export interface CoverageData {
  overall: CoverageSummary;
  testaments: TestamentCoverage[];
  books: BookCoverage[];
}

export interface NextVerseResult {
  complete: boolean;
  verse: Verse | null;
}

export interface WeaknessCharacterStat {
  char: string;
  label: string;
  count: number;
}

export interface WeaknessWordStat {
  word: string;
  count: number;
}

export interface WeaknessReport {
  topCharacters: WeaknessCharacterStat[];
  topWords: WeaknessWordStat[];
  totalTrackedAttempts: number;
  suggestedDrillText: string;
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
  bloomedChaptersCount?: number;
  completedClearingsCount?: number;
}

export type BadgeCategory =
  | 'consistency'
  | 'velocity'
  | 'precision'
  | 'canon'
  | 'trail';

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
