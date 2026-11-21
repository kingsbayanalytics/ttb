export type PrimaryCompanionLens = 'hoodoo-folk' | 'historical-classic' | 'community';

export type CompanionLens = PrimaryCompanionLens | 'personal-note';

export type CompanionEntryType =
  | 'chapter-companion'
  | 'book-introduction'
  | 'bonus-meditations'
  | 'daily-schedule';

export type CompanionVisibility = 'public-domain' | 'private-owner';

export type ChapterBloomState = 'dormant' | 'in_progress' | 'bloomed';

export type LensCountMap = Record<PrimaryCompanionLens, number>;

export interface CompanionPurpose {
  title: string;
  body: string;
  page?: number;
  citedVerses: string[];
  ritualTags: string[];
  octave?: string;
  verseRange?: string;
}

export interface CompanionIndexPurpose {
  purpose: string;
  source: string;
  verseRange?: string | null;
}

export interface CompanionDailyScheduleSlot {
  slot: string;
  psalm: number;
  book?: string;
  chapter?: number;
}

export interface CompanionSource {
  sourceId: string;
  title: string;
  author?: string;
  year?: number;
  publisher?: string;
  isbn?: string;
  edition?: string;
  pages?: number[];
  numberingSystem?: 'masoretic-web' | 'vulgate-dr' | 'native';
  originalRef?: string;
  license?: 'public-domain' | 'private-owner-pdf' | 'fair-use-excerpt' | 'owner-authored';
  subreddit?: string;
  authorHandle?: string;
  retrievedAt?: string;
}

export interface CompanionEntry {
  id: string;
  upsertKey: string;
  workId: string;
  sectionKey: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  visibility: CompanionVisibility;
  sortOrder: number;
  title: string;
  summary: string;
  body: string;
  quoteExcerpt?: string;
  purposes: CompanionPurpose[];
  indexPurposes: CompanionIndexPurpose[];
  ritualTags: string[];
  citedVerses: string[];
  dailySchedule: CompanionDailyScheduleSlot[];
  source: CompanionSource;
  externalUrl?: string;
}

export type CompanionLensesGrouped = Record<PrimaryCompanionLens, CompanionEntry[]>;

export interface LockedChapterCompanionResponse {
  workId: string;
  book: string;
  chapter: number;
  unlocked: false;
  progress: {
    completedVerses: number;
    totalVerses: number;
    state: ChapterBloomState;
  };
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export interface UnlockedChapterCompanionResponse {
  workId: string;
  book: string;
  chapter: number;
  unlocked: true;
  progress: {
    completedVerses: number;
    totalVerses: number;
    state: ChapterBloomState;
    bestWPM: number;
    bestAccuracy: number;
    unlockedAt: string | null;
  };
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export type ChapterCompanionResponse =
  | LockedChapterCompanionResponse
  | UnlockedChapterCompanionResponse;

export interface EnrichedDailyScheduleSlot {
  slot: string;
  psalm: number;
  book: string;
  chapter: number;
  state: ChapterBloomState;
  unlocked: boolean;
}

export interface BookGuideResponse {
  workId: string;
  book: string;
  bookProgress: {
    bloomedChapters: number;
    completedChapters: number;
    totalChapters: number;
    completedVerses: number;
    totalVerses: number;
    bookMastered: boolean;
  };
  introductions: CompanionEntry[];
  dailySchedule: EnrichedDailyScheduleSlot[];
  bonusMeditations: CompanionEntry[];
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export interface CompanionSearchParams {
  workId?: string;
  book?: string;
  lens?: PrimaryCompanionLens;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CompanionSearchHit {
  id: string;
  workId: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  title: string;
  summary: string;
  ritualTags: string[];
  sourceTitle: string;
  sourceAuthor?: string;
}

export interface CompanionSearchResponse {
  items: CompanionSearchHit[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface TrailChapterWaypoint {
  chapter: number;
  totalVerses: number;
  completedVerses: number;
  state: ChapterBloomState;
  bestWPM: number;
  bestAccuracy: number;
  unlockedAt: string | null;
  hasCompanion: boolean;
  lensCounts: LensCountMap;
}

export interface TrailLegProgress {
  legId: string;
  label: string;
  startChapter: number;
  endChapter: number;
  bloomedCount: number;
  totalCount: number;
}

export interface TrailBookOverview {
  book: string;
  sectionKey: string;
  landmarkName: string;
  phase1Active: boolean;
  totalChapters: number;
  bloomedChapters: number;
  inProgressChapters: number;
  totalVerses: number;
  completedVerses: number;
  state: ChapterBloomState;
  bookMastered: boolean;
  companionChapterCount: number;
}

export interface TrailBiomeOverview {
  biomeId: string;
  order: number;
  name: string;
  phase: 1 | 2 | 3;
  books: TrailBookOverview[];
}

export interface ActiveTravelerPointer {
  biomeId: string;
  book: string;
  chapter: number;
}

export interface TrailOverviewResponse {
  workId: string;
  totalBooks: number;
  totalChapters: number;
  bloomedChapters: number;
  inProgressChapters: number;
  activeTraveler: ActiveTravelerPointer | null;
  biomes: TrailBiomeOverview[];
}

export interface TrailBookResponse {
  workId: string;
  book: string;
  sectionKey: string;
  biomeId: string;
  landmarkName: string;
  phase1Active: boolean;
  state: ChapterBloomState;
  bookMastered: boolean;
  totalChapters: number;
  bloomedChapters: number;
  totalVerses: number;
  completedVerses: number;
  hasBookGuide: boolean;
  activeChapter: number;
  legs: TrailLegProgress[];
  chapters: TrailChapterWaypoint[];
}

export type TrailYardPropWakeEvent =
  | 'bottle-tree'
  | 'herb-rack'
  | 'river-cairn'
  | 'elder-keeper';

export interface ChapterTrailStepPayload {
  clearingId: string | null;
  clearingBloomed: number;
  clearingTotal: number;
  nextChapter: number | null;
  propJustAwakened: TrailYardPropWakeEvent | null;
}

export interface ChapterJustUnlocked {
  workId: string;
  book: string;
  chapter: number;
  totalVerses: number;
  unlockedAt: string;
  companionCount: number;
  availableLenses: CompanionLens[];
  trailStep?: ChapterTrailStepPayload;
}
