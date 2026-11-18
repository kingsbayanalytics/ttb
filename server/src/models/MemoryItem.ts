import mongoose from 'mongoose';

export type MemoryStageNumber = 1 | 2 | 3 | 4 | 5;

export interface IMemoryItem {
  user: mongoose.Types.ObjectId;
  verse: mongoose.Types.ObjectId;
  verseOrder: number;
  book: string;
  chapter: number;
  verseNum: number;
  stage: MemoryStageNumber;
  stageCompletions: number;
  packId?: string;
  lastPracticedAt?: Date;
}

const memoryItemSchema = new mongoose.Schema<IMemoryItem>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    verse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verse',
      required: true,
    },
    verseOrder: {
      type: Number,
      required: true,
    },
    book: {
      type: String,
      required: true,
    },
    chapter: {
      type: Number,
      required: true,
    },
    verseNum: {
      type: Number,
      required: true,
    },
    stage: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      default: 1,
    },
    stageCompletions: {
      type: Number,
      default: 0,
    },
    packId: {
      type: String,
    },
    lastPracticedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

memoryItemSchema.index({ user: 1, verse: 1 }, { unique: true });
memoryItemSchema.index({ user: 1, verseOrder: 1 });

const MemoryItem = mongoose.model<IMemoryItem>('MemoryItem', memoryItemSchema);

export default MemoryItem;
