import mongoose from 'mongoose';

/**
 * Result Schema
 * Represents a single typing test result
 */
export interface IResult {
  user: mongoose.Types.ObjectId;
  verse: mongoose.Types.ObjectId;
  verseOrder: number;
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
  wpm: number;
  cps: number; // characters per second
  accuracy: number; // percentage
  incorrectCharacters: number;
  totalCharacters: number;
}

const resultSchema = new mongoose.Schema<IResult>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    verse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verse',
      required: true
    },
    verseOrder: {
      type: Number,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    wpm: {
      type: Number,
      required: true
    },
    cps: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      required: true
    },
    incorrectCharacters: {
      type: Number,
      required: true
    },
    totalCharacters: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for querying
resultSchema.index({ user: 1, startTime: -1 });
resultSchema.index({ user: 1, verse: 1 });
resultSchema.index({ user: 1, wpm: -1 });

const Result = mongoose.model<IResult>('Result', resultSchema);

export default Result; 