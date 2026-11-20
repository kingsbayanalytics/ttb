import mongoose from 'mongoose';
import { DEFAULT_WORK_ID } from '../utils/companionWorks';

export type CompanionLens =
  | 'hoodoo-folk'
  | 'historical-classic'
  | 'community'
  | 'personal-note';

export const COMPANION_LENSES: readonly CompanionLens[] = [
  'hoodoo-folk',
  'historical-classic',
  'community',
  'personal-note',
];

export const PRIMARY_COMPANION_LENSES = [
  'hoodoo-folk',
  'historical-classic',
  'community',
] as const;

export type PrimaryCompanionLens = (typeof PRIMARY_COMPANION_LENSES)[number];

export type CompanionEntryType =
  | 'chapter-companion'
  | 'book-introduction'
  | 'bonus-meditations'
  | 'daily-schedule';

export const COMPANION_ENTRY_TYPES: readonly CompanionEntryType[] = [
  'chapter-companion',
  'book-introduction',
  'bonus-meditations',
  'daily-schedule',
];

export type CompanionVisibility = 'public-domain' | 'private-owner';
export const COMPANION_VISIBILITIES: readonly CompanionVisibility[] = [
  'public-domain',
  'private-owner',
];

export type CompanionStatus = 'published' | 'draft' | 'archived';
export const COMPANION_STATUSES: readonly CompanionStatus[] = [
  'published',
  'draft',
  'archived',
];

export type CompanionNumberingSystem = 'masoretic-web' | 'vulgate-dr' | 'native';
export type CompanionLicense =
  | 'public-domain'
  | 'private-owner-pdf'
  | 'fair-use-excerpt'
  | 'owner-authored';

export interface ICompanionPurpose {
  title: string;
  body: string;
  page?: number;
  citedVerses: string[];
  ritualTags: string[];
  octave?: string;
  verseRange?: string;
}

export interface ICompanionIndexPurpose {
  purpose: string;
  source: string;
  verseRange?: string | null;
}

export interface ICompanionDailyScheduleSlot {
  slot: string;
  psalm: number;
  book?: string;
  chapter?: number;
}

export interface ICompanionSource {
  sourceId: string;
  title: string;
  author?: string;
  year?: number;
  publisher?: string;
  isbn?: string;
  edition?: string;
  pages?: number[];
  numberingSystem?: CompanionNumberingSystem;
  originalRef?: string;
  license?: CompanionLicense;
  subreddit?: string;
  authorHandle?: string;
  retrievedAt?: Date;
}

export interface ICompanionEntry {
  upsertKey: string;
  workId: string;
  sectionKey: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  visibility: CompanionVisibility;
  status: CompanionStatus;
  sortOrder: number;
  title: string;
  summary: string;
  body: string;
  quoteExcerpt?: string;
  purposes: ICompanionPurpose[];
  indexPurposes: ICompanionIndexPurpose[];
  ritualTags: string[];
  citedVerses: string[];
  dailySchedule: ICompanionDailyScheduleSlot[];
  source: ICompanionSource;
  externalUrl?: string;
  contentHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const HTTPS_URL_REGEX = /^https:\/\/\S+$/i;

export function buildCompanionUpsertKey(parts: {
  workId: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  sourceId: string;
  sortOrder?: number;
}): string {
  const chapterSegment = parts.chapter === null ? 'book' : String(parts.chapter);
  const sortOrder = parts.sortOrder ?? 0;
  return `${parts.workId}:${parts.book}:${chapterSegment}:${parts.entryType}:${parts.lens}:${parts.sourceId}:${sortOrder}`;
}

const purposeSchema = new mongoose.Schema<ICompanionPurpose>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    page: { type: Number },
    citedVerses: { type: [String], default: [] },
    ritualTags: { type: [String], default: [] },
    octave: { type: String, trim: true },
    verseRange: { type: String, trim: true },
  },
  { _id: false }
);

const indexPurposeSchema = new mongoose.Schema<ICompanionIndexPurpose>(
  {
    purpose: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true, default: 'powers-index' },
    verseRange: { type: String, default: null },
  },
  { _id: false }
);

const dailyScheduleSlotSchema = new mongoose.Schema<ICompanionDailyScheduleSlot>(
  {
    slot: { type: String, required: true, trim: true },
    psalm: { type: Number, required: true, min: 1 },
    book: { type: String, trim: true },
    chapter: { type: Number, min: 1 },
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema<ICompanionSource>(
  {
    sourceId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, trim: true },
    year: { type: Number },
    publisher: { type: String, trim: true },
    isbn: { type: String, trim: true },
    edition: { type: String, trim: true },
    pages: { type: [Number], default: undefined },
    numberingSystem: {
      type: String,
      enum: ['masoretic-web', 'vulgate-dr', 'native'],
    },
    originalRef: { type: String, trim: true },
    license: {
      type: String,
      enum: ['public-domain', 'private-owner-pdf', 'fair-use-excerpt', 'owner-authored'],
    },
    subreddit: { type: String, trim: true },
    authorHandle: { type: String, trim: true },
    retrievedAt: { type: Date },
  },
  { _id: false }
);

const companionEntrySchema = new mongoose.Schema<ICompanionEntry>(
  {
    upsertKey: {
      type: String,
      required: true,
      trim: true,
    },
    workId: {
      type: String,
      required: true,
      default: DEFAULT_WORK_ID,
      trim: true,
    },
    sectionKey: {
      type: String,
      required: true,
      trim: true,
    },
    book: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: Number,
      default: null,
      validate: {
        validator(val: number | null) {
          if (val === null || val === undefined) {
            return true;
          }
          return Number.isInteger(val) && val >= 1;
        },
        message: 'chapter must be a positive integer or null',
      },
    },
    entryType: {
      type: String,
      required: true,
      enum: COMPANION_ENTRY_TYPES,
    },
    lens: {
      type: String,
      required: true,
      enum: COMPANION_LENSES,
    },
    visibility: {
      type: String,
      required: true,
      enum: COMPANION_VISIBILITIES,
    },
    status: {
      type: String,
      required: true,
      enum: COMPANION_STATUSES,
      default: 'published',
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      default: '',
    },
    body: {
      type: String,
      required: true,
      default: '',
    },
    quoteExcerpt: {
      type: String,
      maxlength: [400, 'quoteExcerpt must not exceed 400 characters'],
    },
    purposes: {
      type: [purposeSchema],
      default: [],
    },
    indexPurposes: {
      type: [indexPurposeSchema],
      default: [],
    },
    ritualTags: {
      type: [String],
      default: [],
    },
    citedVerses: {
      type: [String],
      default: [],
    },
    dailySchedule: {
      type: [dailyScheduleSlotSchema],
      default: [],
    },
    source: {
      type: sourceSchema,
      required: true,
    },
    externalUrl: {
      type: String,
      trim: true,
      validate: {
        validator(val: string | undefined) {
          if (val === undefined || val === '') {
            return true;
          }
          return HTTPS_URL_REGEX.test(val);
        },
        message: 'externalUrl must be a valid https:// URL',
      },
    },
    contentHash: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

companionEntrySchema.pre('validate', function (next) {
  if (this.chapter === undefined) {
    this.chapter = null;
  }

  if (this.entryType === 'chapter-companion') {
    if (this.chapter === null || !Number.isInteger(this.chapter) || this.chapter < 1) {
      this.invalidate(
        'chapter',
        'chapter must be a positive integer when entryType is "chapter-companion"'
      );
    }
  } else if (this.chapter !== null) {
    this.invalidate(
      'chapter',
      `chapter must be null when entryType is "${this.entryType}"`
    );
  }

  if (
    !this.upsertKey &&
    this.workId &&
    this.book &&
    this.entryType &&
    this.lens &&
    this.source?.sourceId
  ) {
    this.upsertKey = buildCompanionUpsertKey({
      workId: this.workId,
      book: this.book,
      chapter: this.chapter,
      entryType: this.entryType,
      lens: this.lens,
      sourceId: this.source.sourceId,
      sortOrder: this.sortOrder ?? 0,
    });
  }

  next();
});

// 1. Idempotent CLI upsert key (handles chapter: null cleanly on Cosmos DB vCore)
companionEntrySchema.index({ upsertKey: 1 }, { unique: true });

// 2. Primary Reading Room drawer lookup (book + chapter + published + grouped by lens)
companionEntrySchema.index({
  workId: 1,
  book: 1,
  chapter: 1,
  status: 1,
  lens: 1,
  sortOrder: 1,
});

// 3. Book overview & Trail companion-presence aggregation (entryType + book)
companionEntrySchema.index({
  workId: 1,
  book: 1,
  entryType: 1,
  status: 1,
});

// 4. Filtered tag/lens search inside Reading Room (multikey on ritualTags)
companionEntrySchema.index({
  workId: 1,
  status: 1,
  lens: 1,
  ritualTags: 1,
});

const CompanionEntry = mongoose.model<ICompanionEntry>(
  'CompanionEntry',
  companionEntrySchema
);

export default CompanionEntry;
