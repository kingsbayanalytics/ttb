import mongoose from 'mongoose';
import { CompanionEntry } from '../../models';
import {
  CompanionEntryType,
  CompanionLens,
  CompanionVisibility,
  ICompanionDailyScheduleSlot,
  ICompanionEntry,
  ICompanionIndexPurpose,
  ICompanionPurpose,
  ICompanionSource,
  PRIMARY_COMPANION_LENSES,
  PrimaryCompanionLens,
} from '../../models/CompanionEntry';
import { DEFAULT_WORK_ID, getCanonicalChapterCount } from '../../utils/companionWorks';
import {
  ChapterBloomState,
  LensCountMap,
  createEmptyLensCounts,
  getBookChaptersStatus,
  getChapterStatus,
  getUserBloomedChapters,
} from '../trail/trailService';

export interface CompanionEntryDTO {
  id: string;
  upsertKey: string;
  workId: string;
  sectionKey: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  visibility: CompanionVisibility;
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
}

export type CompanionLensesGrouped = Record<PrimaryCompanionLens, CompanionEntryDTO[]>;

export interface LockedChapterCompanionDTO {
  workId: string;
  book: string;
  chapter: number;
  unlocked: false;
  progress: {
    completedVerses: number;
    totalVerses: number;
    state: ChapterBloomState;
  };
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export interface UnlockedChapterCompanionDTO {
  workId: string;
  book: string;
  chapter: number;
  unlocked: true;
  progress: {
    completedVerses: number;
    totalVerses: number;
    state: ChapterBloomState;
    bestWPM: number;
    bestAccuracy: number;
    unlockedAt: string | null;
  };
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export type ChapterCompanionResponseDTO =
  | LockedChapterCompanionDTO
  | UnlockedChapterCompanionDTO;

export interface EnrichedDailyScheduleSlotDTO {
  slot: string;
  psalm: number;
  book: string;
  chapter: number;
  state: ChapterBloomState;
  unlocked: boolean;
}

export interface BookGuideResponseDTO {
  workId: string;
  book: string;
  bookProgress: {
    bloomedChapters: number;
    completedChapters: number;
    totalChapters: number;
    completedVerses: number;
    totalVerses: number;
    bookMastered: boolean;
  };
  introductions: CompanionEntryDTO[];
  dailySchedule: EnrichedDailyScheduleSlotDTO[];
  bonusMeditations: CompanionEntryDTO[];
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
}

export interface CompanionSearchHitDTO {
  id: string;
  workId: string;
  book: string;
  chapter: number | null;
  entryType: CompanionEntryType;
  lens: CompanionLens;
  title: string;
  summary: string;
  ritualTags: string[];
  sourceTitle: string;
  sourceAuthor?: string;
}

export interface CompanionSearchResponseDTO {
  items: CompanionSearchHitDTO[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

function createEmptyGroupedLenses(): CompanionLensesGrouped {
  return {
    'hoodoo-folk': [],
    'historical-classic': [],
    community: [],
  };
}

export function toCompanionEntryDTO(doc: ICompanionEntry & { _id?: any }): CompanionEntryDTO {
  return {
    id: doc._id ? String(doc._id) : doc.upsertKey,
    upsertKey: doc.upsertKey,
    workId: doc.workId,
    sectionKey: doc.sectionKey,
    book: doc.book,
    chapter: doc.chapter ?? null,
    entryType: doc.entryType,
    lens: doc.lens,
    visibility: doc.visibility,
    sortOrder: doc.sortOrder ?? 0,
    title: doc.title,
    summary: doc.summary ?? '',
    body: doc.body ?? '',
    ...(doc.quoteExcerpt ? { quoteExcerpt: doc.quoteExcerpt } : {}),
    purposes: doc.purposes ?? [],
    indexPurposes: doc.indexPurposes ?? [],
    ritualTags: doc.ritualTags ?? [],
    citedVerses: doc.citedVerses ?? [],
    dailySchedule: doc.dailySchedule ?? [],
    source: doc.source,
    ...(doc.externalUrl ? { externalUrl: doc.externalUrl } : {}),
  };
}

export function groupEntriesByLens(entries: CompanionEntryDTO[]): {
  lensCounts: LensCountMap;
  lenses: CompanionLensesGrouped;
} {
  const lensCounts = createEmptyLensCounts();
  const lenses = createEmptyGroupedLenses();

  for (const entry of entries) {
    if ((PRIMARY_COMPANION_LENSES as readonly string[]).includes(entry.lens)) {
      const key = entry.lens as PrimaryCompanionLens;
      lenses[key].push(entry);
      lensCounts[key] += 1;
    }
  }

  return { lensCounts, lenses };
}

/**
 * Fetches chapter companion entries with strict server-side lock enforcement (AD-12).
 * When locked, only lens counts and progress metadata are returned—zero body, purposes,
 * indexPurposes, quoteExcerpt, or source.pages are ever selected or serialized.
 */
export async function getChapterCompanion(params: {
  userId: mongoose.Types.ObjectId | string;
  book: string;
  chapter: number;
  workId?: string;
  lens?: PrimaryCompanionLens;
}): Promise<ChapterCompanionResponseDTO> {
  const { userId, book, chapter, workId = DEFAULT_WORK_ID, lens } = params;

  const status = await getChapterStatus(userId, book, chapter);

  const baseFilter: Record<string, any> = {
    workId,
    book,
    chapter,
    entryType: 'chapter-companion',
    status: 'published',
  };
  if (lens) {
    baseFilter.lens = lens;
  }

  if (!status.unlocked) {
    // Teaser counts ONLY — never select prose, purposes, quotes, or pages!
    const lensDocs = await CompanionEntry.find(baseFilter)
      .select('lens')
      .limit(50)
      .lean<Array<{ lens: CompanionLens }>>();

    const lensCounts = createEmptyLensCounts();
    for (const d of lensDocs) {
      if ((PRIMARY_COMPANION_LENSES as readonly string[]).includes(d.lens)) {
        lensCounts[d.lens as PrimaryCompanionLens] += 1;
      }
    }

    return {
      workId,
      book,
      chapter,
      unlocked: false,
      progress: {
        completedVerses: status.completedVerses,
        totalVerses: status.totalVerses,
        state: status.state,
      },
      lensCounts,
      lenses: createEmptyGroupedLenses(),
    };
  }

  const docs = await CompanionEntry.find(baseFilter)
    .sort({ sortOrder: 1, 'source.title': 1 })
    .limit(50)
    .lean<Array<ICompanionEntry & { _id: mongoose.Types.ObjectId }>>();

  const dtos = docs.map(toCompanionEntryDTO);
  const { lensCounts, lenses } = groupEntriesByLens(dtos);

  return {
    workId,
    book,
    chapter,
    unlocked: true,
    progress: {
      completedVerses: status.completedVerses,
      totalVerses: status.totalVerses,
      state: status.state,
      bestWPM: status.bestWPM,
      bestAccuracy: status.bestAccuracy,
      unlockedAt: status.unlockedAt,
    },
    lensCounts,
    lenses,
  };
}

/**
 * Fetches book-level guides (book-introduction with enriched dailySchedule[], bonus-meditations)
 * accessible to the authenticated owner without requiring full-book completion (PD-1).
 */
export async function getBookGuide(params: {
  userId: mongoose.Types.ObjectId | string;
  book: string;
  workId?: string;
}): Promise<BookGuideResponseDTO> {
  const { userId, book, workId = DEFAULT_WORK_ID } = params;

  const [guideDocs, chapterStatuses] = await Promise.all([
    CompanionEntry.find({
      workId,
      book,
      chapter: null,
      entryType: { $in: ['book-introduction', 'bonus-meditations', 'daily-schedule'] },
      status: 'published',
    })
      .sort({ sortOrder: 1, 'source.title': 1 })
      .limit(50)
      .lean<Array<ICompanionEntry & { _id: mongoose.Types.ObjectId }>>(),
    getBookChaptersStatus(userId, book),
  ]);

  const dtos = guideDocs.map(toCompanionEntryDTO);
  const { lensCounts, lenses } = groupEntriesByLens(dtos);

  const introductions = dtos.filter((d) => d.entryType === 'book-introduction');
  const bonusMeditations = dtos.filter((d) => d.entryType === 'bonus-meditations');

  const statusByChapter = new Map(chapterStatuses.map((s) => [s.chapter, s]));
  const totalChapters = getCanonicalChapterCount(book) ?? chapterStatuses.length;
  const bloomedChapters = chapterStatuses.filter((s) => s.state === 'bloomed').length;
  const completedVerses = chapterStatuses.reduce((sum, s) => sum + s.completedVerses, 0);
  const totalVerses = chapterStatuses.reduce((sum, s) => sum + s.totalVerses, 0);
  const bookMastered =
    totalChapters > 0 && totalVerses > 0 && bloomedChapters >= totalChapters;

  const rawScheduleSlots = dtos.flatMap((d) => d.dailySchedule ?? []);
  const dailySchedule: EnrichedDailyScheduleSlotDTO[] = rawScheduleSlots.map((slot) => {
    const targetBook = slot.book ?? book;
    const targetChapter = slot.chapter ?? slot.psalm;
    const chStatus = targetBook === book ? statusByChapter.get(targetChapter) : undefined;
    const state: ChapterBloomState = chStatus?.state ?? 'dormant';
    return {
      slot: slot.slot,
      psalm: slot.psalm,
      book: targetBook,
      chapter: targetChapter,
      state,
      unlocked: state === 'bloomed',
    };
  });

  return {
    workId,
    book,
    bookProgress: {
      bloomedChapters,
      completedChapters: bloomedChapters,
      totalChapters,
      completedVerses,
      totalVerses,
      bookMastered,
    },
    introductions,
    dailySchedule,
    bonusMeditations,
    lensCounts,
    lenses,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SearchCompanionParams {
  userId: mongoose.Types.ObjectId | string;
  workId?: string;
  book?: string;
  lens?: PrimaryCompanionLens;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

/**
 * Unlocked-only companion search (AD-12 / Architecture Spine §2.3).
 * Computes the user's bloomed (book, chapter) set first so locked chapter commentary
 * is NEVER matched or leaked via search.
 */
export async function searchUnlockedCompanion(
  params: SearchCompanionParams
): Promise<CompanionSearchResponseDTO> {
  const {
    userId,
    workId = DEFAULT_WORK_ID,
    book,
    lens,
    tag,
    q,
    page = 1,
    limit = 20,
  } = params;

  const bloomedChapters = await getUserBloomedChapters(userId, book);

  // Restrict strictly to bloomed chapters (for chapter-companion) OR book-level guides (chapter: null)
  const accessConditions: Record<string, any>[] = [
    {
      chapter: null,
      entryType: { $in: ['book-introduction', 'bonus-meditations', 'daily-schedule'] },
    },
  ];

  if (bloomedChapters.length > 0) {
    // Group bloomed chapters by book for compact Cosmos-friendly $or clauses
    const chaptersByBook = new Map<string, number[]>();
    for (const pair of bloomedChapters) {
      let arr = chaptersByBook.get(pair.book);
      if (!arr) {
        arr = [];
        chaptersByBook.set(pair.book, arr);
      }
      arr.push(pair.chapter);
    }
    for (const [b, chs] of chaptersByBook.entries()) {
      accessConditions.push({
        book: b,
        entryType: 'chapter-companion',
        chapter: { $in: chs },
      });
    }
  }

  const andClauses: Record<string, any>[] = [
    { workId, status: 'published' },
    { $or: accessConditions },
  ];

  if (book) {
    andClauses.push({ book });
  }
  if (lens) {
    andClauses.push({ lens });
  }
  if (tag) {
    andClauses.push({ ritualTags: tag });
  }

  if (q && q.trim().length > 0) {
    const safeRegex = new RegExp(escapeRegex(q.trim().slice(0, 80)), 'i');
    // Match indexed/short metadata fields only (never unbounded regex scan over full body)
    andClauses.push({
      $or: [
        { title: safeRegex },
        { summary: safeRegex },
        { ritualTags: safeRegex },
        { 'purposes.title': safeRegex },
        { 'indexPurposes.purpose': safeRegex },
      ],
    });
  }

  const filter = { $and: andClauses };
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    CompanionEntry.find(filter)
      .select('workId book chapter entryType lens title summary ritualTags source.title source.author sortOrder')
      .sort({ book: 1, chapter: 1, sortOrder: 1 })
      .skip(skip)
      .limit(limit)
      .lean<Array<ICompanionEntry & { _id: mongoose.Types.ObjectId }>>(),
    CompanionEntry.countDocuments(filter),
  ]);

  const items: CompanionSearchHitDTO[] = docs.map((d) => ({
    id: String(d._id),
    workId: d.workId,
    book: d.book,
    chapter: d.chapter ?? null,
    entryType: d.entryType,
    lens: d.lens,
    title: d.title,
    summary: d.summary ?? '',
    ritualTags: d.ritualTags ?? [],
    sourceTitle: d.source?.title ?? '',
    ...(d.source?.author ? { sourceAuthor: d.source.author } : {}),
  }));

  return {
    items,
    page,
    limit,
    total,
    hasMore: skip + items.length < total,
  };
}
