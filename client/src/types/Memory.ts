import { Verse } from './Verse';
import { CuratedPlanCategory, CuratedVerseRef } from '../data/curatedCatalog';

export type MemoryStage = 1 | 2 | 3 | 4 | 5;

export interface MemoryItem {
  _id: string;
  user: string;
  verse: Verse;
  verseOrder: number;
  book: string;
  chapter: number;
  verseNum: number;
  stage: MemoryStage;
  stageCompletions: number;
  packId?: string;
  lastPracticedAt?: string;
}

export interface CuratedPlanSummary {
  id: string;
  title: string;
  subtitle: string;
  category: CuratedPlanCategory;
  description: string;
  contextNote: string;
  totalVerses: number;
  completedVerses: number;
  inMemoryDeckCount: number;
  verseRefs: ReadonlyArray<CuratedVerseRef>;
}

export interface CuratedPlanDetail extends CuratedPlanSummary {
  verses: Verse[];
  completedVerseIds: string[];
}

export interface CustomPlanSummary {
  _id: string;
  title: string;
  description: string;
  totalVerses: number;
  completedVerses: number;
  inMemoryDeckCount: number;
  verseRefs: CuratedVerseRef[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomPlanDetail extends CustomPlanSummary {
  verses: Verse[];
  completedVerseIds: string[];
}
