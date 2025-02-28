import mongoose from 'mongoose';

/**
 * Verse Schema
 * Represents a Bible verse in the database
 */
export interface IVerse {
  verseOrder: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  characters: number;
  words: number;
}

const verseSchema = new mongoose.Schema<IVerse>(
  {
    verseOrder: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    book: {
      type: String,
      required: true,
      index: true
    },
    chapter: {
      type: Number,
      required: true,
      index: true
    },
    verse: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    characters: {
      type: Number,
      required: true
    },
    words: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for book, chapter, verse
verseSchema.index({ book: 1, chapter: 1, verse: 1 }, { unique: true });

const Verse = mongoose.model<IVerse>('Verse', verseSchema);

export default Verse; 