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