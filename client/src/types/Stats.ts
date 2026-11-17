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
