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