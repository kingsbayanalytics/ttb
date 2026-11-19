export interface MissedCharMetric {
  char: string;
  count: number;
}

export interface MissedWordMetric {
  word: string;
  count: number;
}

export interface ResultVerseSummary {
  _id: string;
  book: string;
  chapter: number;
  verse: number;
  verseOrder?: number;
  text?: string;
}

export interface Result {
  _id: string;
  user: string;
  verse: string;
  verseOrder: number;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
  wpm: number;
  cps: number; // characters per second
  accuracy: number; // percentage
  incorrectCharacters: number;
  totalCharacters: number;
  missedChars?: MissedCharMetric[];
  missedWords?: MissedWordMetric[];
}

export interface ResultHistoryItem extends Omit<Result, 'verse'> {
  verse: string | ResultVerseSummary;
}