import mongoose from 'mongoose';

/**
 * Progress Schema
 * Represents a user's typing progress for a specific verse
 */
export interface IProgress {
  user: mongoose.Types.ObjectId;
  verse: mongoose.Types.ObjectId;
  verseOrder: number;
  completed: boolean;
  attempts: number;
  bestWPM: number;
  bestAccuracy: number;
  lastAttemptDate: Date;
}

const progressSchema = new mongoose.Schema<IProgress>(
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
    completed: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
    },
    bestWPM: {
      type: Number,
      default: 0
    },
    bestAccuracy: {
      type: Number,
      default: 0
    },
    lastAttemptDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for user and verse
progressSchema.index({ user: 1, verse: 1 }, { unique: true });
progressSchema.index({ user: 1, verseOrder: 1 }, { unique: true });

const Progress = mongoose.model<IProgress>('Progress', progressSchema);

export default Progress; 