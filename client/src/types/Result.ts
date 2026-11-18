export interface MissedCharMetric {
  char: string;
  count: number;
}

export interface MissedWordMetric {
  word: string;
  count: number;
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