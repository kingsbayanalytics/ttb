import mongoose from 'mongoose';

export interface ICustomPlanVerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface ICustomPlan {
  user: mongoose.Types.ObjectId;
  title: string;
  description: string;
  verses: ICustomPlanVerseRef[];
}

const customPlanVerseRefSchema = new mongoose.Schema<ICustomPlanVerseRef>(
  {
    book: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: Number,
      required: true,
      min: 1,
    },
    verse: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const customPlanSchema = new mongoose.Schema<ICustomPlan>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    verses: {
      type: [customPlanVerseRefSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

customPlanSchema.index({ user: 1, updatedAt: -1 });

const CustomPlan = mongoose.model<ICustomPlan>('CustomPlan', customPlanSchema);

export default CustomPlan;
