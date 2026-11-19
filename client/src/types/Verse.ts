export interface Verse {
  _id: string;
  verseOrder: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  characters: number;
  words: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookChapterInfo {
  chapter: number;
  verseCount: number;
}

export interface VerseContextPreview {
  verseOrder: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface VerseContext {
  prev: VerseContextPreview | null;
  next: VerseContextPreview | null;
}