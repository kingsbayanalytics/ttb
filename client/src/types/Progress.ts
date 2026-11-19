export interface Progress {
  _id: string;
  user: string;
  verse: string;
  verseOrder: number;
  completed: boolean;
  attempts: number;
  bestWPM: number;
  bestAccuracy: number;
  lastAttemptDate: string;
}

export interface BookChapterProgress {
  book: string;
  chapter: number;
  chapterCompleted: number;
  chapterTotal: number;
  chapterPercentage: number;
  bookCompleted: number;
  bookTotal: number;
  bookPercentage: number;
}