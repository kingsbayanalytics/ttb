import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomPlan, ICustomPlanVerseRef, MemoryItem, Progress, Verse } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';
import {
  CURATED_PLANS,
  CuratedPlanDefinition,
  getCuratedPlanById,
} from '../utils/curatedCatalog';

const MAX_CUSTOM_PLAN_VERSES = 100;

function makeRefKey(book: string, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`;
}

function normalizeVerseRefs(input: unknown): ICustomPlanVerseRef[] {
  if (!Array.isArray(input)) {
    throw new ApiError('verses must be an array of { book, chapter, verse } references', 400);
  }
  if (input.length > MAX_CUSTOM_PLAN_VERSES) {
    throw new ApiError(`A custom playlist can contain at most ${MAX_CUSTOM_PLAN_VERSES} verses`, 400);
  }

  const seen = new Set<string>();
  const normalized: ICustomPlanVerseRef[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      throw new ApiError('Each verse reference must be an object with book, chapter, and verse', 400);
    }
    const rawBook = (item as Record<string, unknown>).book;
    const rawChapter = Number((item as Record<string, unknown>).chapter);
    const rawVerse = Number((item as Record<string, unknown>).verse);

    if (typeof rawBook !== 'string' || !rawBook.trim()) {
      throw new ApiError('Each verse reference requires a non-empty book name', 400);
    }
    if (!Number.isInteger(rawChapter) || rawChapter < 1) {
      throw new ApiError('Each verse reference requires a positive integer chapter', 400);
    }
    if (!Number.isInteger(rawVerse) || rawVerse < 1) {
      throw new ApiError('Each verse reference requires a positive integer verse', 400);
    }

    const cleanBook = rawBook.trim();
    const key = makeRefKey(cleanBook, rawChapter, rawVerse);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push({ book: cleanBook, chapter: rawChapter, verse: rawVerse });
    }
  }

  return normalized;
}

async function resolveVerseRefsMap(refs: ICustomPlanVerseRef[]) {
  if (refs.length === 0) {
    return new Map<string, any>();
  }
  const uniqueMap = new Map<string, ICustomPlanVerseRef>();
  for (const ref of refs) {
    uniqueMap.set(makeRefKey(ref.book, ref.chapter, ref.verse), ref);
  }
  const docs = await Verse.find({ $or: Array.from(uniqueMap.values()) }).lean();
  const byKey = new Map<string, (typeof docs)[number]>();
  for (const doc of docs) {
    byKey.set(makeRefKey(doc.book, doc.chapter, doc.verse), doc);
  }
  return byKey;
}

async function summarizeCustomPlansForUser(userId: unknown, plans: Array<any>) {
  const allRefs = plans.flatMap((p) => p.verses || []);
  const [verseByKey, completedProgress, memoryItems] = await Promise.all([
    resolveVerseRefsMap(allRefs),
    Progress.find({ user: userId, completed: true }).select('verse').lean(),
    MemoryItem.find({ user: userId }).select('verse book chapter verseNum').lean(),
  ]);

  const completedVerseIds = new Set(completedProgress.map((p) => String(p.verse)));
  const memoryVerseKeys = new Set(
    memoryItems.map((m) => makeRefKey(m.book, m.chapter, m.verseNum))
  );

  const summarize = (plan: any) => {
    const refs: ICustomPlanVerseRef[] = Array.isArray(plan.verses) ? plan.verses : [];
    let completedCount = 0;
    let inMemoryDeckCount = 0;

    for (const ref of refs) {
      const key = makeRefKey(ref.book, ref.chapter, ref.verse);
      const doc = verseByKey.get(key);
      if (doc && completedVerseIds.has(String(doc._id))) {
        completedCount += 1;
      }
      if (memoryVerseKeys.has(key)) {
        inMemoryDeckCount += 1;
      }
    }

    return {
      _id: String(plan._id),
      title: plan.title,
      description: plan.description || '',
      totalVerses: refs.length,
      completedVerses: completedCount,
      inMemoryDeckCount,
      verseRefs: refs,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  };

  return {
    verseByKey,
    completedVerseIds,
    summarize,
  };
}

async function buildPlanSummariesForUser(userId: unknown) {
  const allRefs = CURATED_PLANS.flatMap((plan) => plan.verses);
  const uniqueRefMap = new Map<string, { book: string; chapter: number; verse: number }>();
  for (const ref of allRefs) {
    uniqueRefMap.set(makeRefKey(ref.book, ref.chapter, ref.verse), ref);
  }

  const verseDocs = await Verse.find({
    $or: Array.from(uniqueRefMap.values()),
  }).lean();

  const verseByKey = new Map<string, (typeof verseDocs)[number]>();
  for (const doc of verseDocs) {
    verseByKey.set(makeRefKey(doc.book, doc.chapter, doc.verse), doc);
  }

  const [completedProgress, memoryItems] = await Promise.all([
    Progress.find({ user: userId, completed: true }).select('verse').lean(),
    MemoryItem.find({ user: userId }).select('verse book chapter verseNum').lean(),
  ]);

  const completedVerseIds = new Set(completedProgress.map((p) => String(p.verse)));
  const memoryVerseKeys = new Set(
    memoryItems.map((m) => makeRefKey(m.book, m.chapter, m.verseNum))
  );

  return {
    verseByKey,
    completedVerseIds,
    memoryVerseKeys,
    summaries: CURATED_PLANS.map((plan) => {
      let completedCount = 0;
      let inMemoryDeckCount = 0;

      for (const ref of plan.verses) {
        const key = makeRefKey(ref.book, ref.chapter, ref.verse);
        const doc = verseByKey.get(key);
        if (doc && completedVerseIds.has(String(doc._id))) {
          completedCount += 1;
        }
        if (memoryVerseKeys.has(key)) {
          inMemoryDeckCount += 1;
        }
      }

      return {
        id: plan.id,
        title: plan.title,
        subtitle: plan.subtitle,
        category: plan.category,
        description: plan.description,
        contextNote: plan.contextNote,
        totalVerses: plan.verses.length,
        completedVerses: completedCount,
        inMemoryDeckCount,
        verseRefs: plan.verses,
      };
    }),
  };
}

function buildPlanDetail(
  plan: CuratedPlanDefinition,
  summariesResult: Awaited<ReturnType<typeof buildPlanSummariesForUser>>
) {
  const summary = summariesResult.summaries.find((s) => s.id === plan.id)!;
  const resolvedVerses = [];
  const planCompletedVerseIds: string[] = [];

  for (const ref of plan.verses) {
    const key = makeRefKey(ref.book, ref.chapter, ref.verse);
    const doc = summariesResult.verseByKey.get(key);
    if (doc) {
      resolvedVerses.push(doc);
      if (summariesResult.completedVerseIds.has(String(doc._id))) {
        planCompletedVerseIds.push(String(doc._id));
      }
    }
  }

  return {
    ...summary,
    verses: resolvedVerses,
    completedVerseIds: planCompletedVerseIds,
  };
}

/**
 * @desc    Get all curated study & mantra plans (or single plan if ?planId= is passed)
 * @route   GET /api/plans
 * @access  Private
 */
export const getCuratedPlans = asyncHandler(async (req: Request, res: Response) => {
  const queryPlanId =
    typeof req.query.planId === 'string' ? req.query.planId.trim() : undefined;

  const summariesResult = await buildPlanSummariesForUser(req.user._id);

  if (queryPlanId) {
    const plan = getCuratedPlanById(queryPlanId);
    if (!plan) {
      throw new ApiError(`Curated plan "${queryPlanId}" not found`, 404);
    }
    return res.json({
      success: true,
      data: buildPlanDetail(plan, summariesResult),
    });
  }

  res.json({
    success: true,
    count: summariesResult.summaries.length,
    data: summariesResult.summaries,
  });
});

/**
 * @desc    Get a single curated study or mantra plan with resolved Verse documents
 * @route   GET /api/plans/:planId
 * @access  Private
 */
export const getCuratedPlanDetail = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  const plan = getCuratedPlanById(planId);
  if (!plan) {
    throw new ApiError(`Curated plan "${planId}" not found`, 404);
  }

  const summariesResult = await buildPlanSummariesForUser(req.user._id);

  res.json({
    success: true,
    data: buildPlanDetail(plan, summariesResult),
  });
});

/**
 * @desc    Get all custom playlists created by the authenticated user
 * @route   GET /api/plans/custom
 * @access  Private
 */
export const getCustomPlans = asyncHandler(async (req: Request, res: Response) => {
  const customPlans = await CustomPlan.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  const { summarize } = await summarizeCustomPlansForUser(req.user._id, customPlans);
  const data = customPlans.map(summarize);

  res.json({
    success: true,
    count: data.length,
    data,
  });
});

/**
 * @desc    Create a new custom study/mantra playlist
 * @route   POST /api/plans/custom
 * @access  Private
 */
export const createCustomPlan = asyncHandler(async (req: Request, res: Response) => {
  const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const rawDescription =
    typeof req.body?.description === 'string' ? req.body.description.trim() : '';

  if (!rawTitle) {
    throw new ApiError('Playlist title is required', 400);
  }
  if (rawTitle.length > 100) {
    throw new ApiError('Playlist title must be 100 characters or fewer', 400);
  }
  if (rawDescription.length > 300) {
    throw new ApiError('Playlist description must be 300 characters or fewer', 400);
  }

  const verses = req.body?.verses !== undefined ? normalizeVerseRefs(req.body.verses) : [];

  if (verses.length > 0) {
    const resolved = await resolveVerseRefsMap(verses);
    const missing = verses.filter((ref) => !resolved.has(makeRefKey(ref.book, ref.chapter, ref.verse)));
    if (missing.length > 0) {
      const sample = missing[0];
      throw new ApiError(
        `Verse not found in catalog: ${sample.book} ${sample.chapter}:${sample.verse}`,
        400
      );
    }
  }

  const created = await CustomPlan.create({
    user: req.user._id,
    title: rawTitle,
    description: rawDescription,
    verses,
  });

  const createdObj = created.toObject();
  const { summarize } = await summarizeCustomPlansForUser(req.user._id, [createdObj]);

  res.status(201).json({
    success: true,
    data: summarize(createdObj),
  });
});

/**
 * @desc    Get a single custom playlist with resolved Verse documents
 * @route   GET /api/plans/custom/:planId
 * @access  Private
 */
export const getCustomPlanDetail = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new ApiError('Invalid custom playlist ID', 400);
  }

  const plan = await CustomPlan.findOne({ _id: planId, user: req.user._id }).lean();
  if (!plan) {
    throw new ApiError('Custom playlist not found', 404);
  }

  const { verseByKey, completedVerseIds, summarize } = await summarizeCustomPlansForUser(
    req.user._id,
    [plan]
  );

  const resolvedVerses = [];
  const planCompletedVerseIds: string[] = [];

  for (const ref of plan.verses || []) {
    const doc = verseByKey.get(makeRefKey(ref.book, ref.chapter, ref.verse));
    if (doc) {
      resolvedVerses.push(doc);
      if (completedVerseIds.has(String(doc._id))) {
        planCompletedVerseIds.push(String(doc._id));
      }
    }
  }

  res.json({
    success: true,
    data: {
      ...summarize(plan),
      verses: resolvedVerses,
      completedVerseIds: planCompletedVerseIds,
    },
  });
});

/**
 * @desc    Update a custom playlist (title, description, verses, or addVerse/removeVerse)
 * @route   PATCH /api/plans/custom/:planId
 * @access  Private
 */
export const updateCustomPlan = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new ApiError('Invalid custom playlist ID', 400);
  }

  const plan = await CustomPlan.findOne({ _id: planId, user: req.user._id });
  if (!plan) {
    throw new ApiError('Custom playlist not found', 404);
  }

  if (req.body?.title !== undefined) {
    const nextTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!nextTitle) {
      throw new ApiError('Playlist title cannot be empty', 400);
    }
    if (nextTitle.length > 100) {
      throw new ApiError('Playlist title must be 100 characters or fewer', 400);
    }
    plan.title = nextTitle;
  }

  if (req.body?.description !== undefined) {
    const nextDesc = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (nextDesc.length > 300) {
      throw new ApiError('Playlist description must be 300 characters or fewer', 400);
    }
    plan.description = nextDesc;
  }

  if (req.body?.verses !== undefined) {
    const nextVerses = normalizeVerseRefs(req.body.verses);
    if (nextVerses.length > 0) {
      const resolved = await resolveVerseRefsMap(nextVerses);
      const missing = nextVerses.filter(
        (ref) => !resolved.has(makeRefKey(ref.book, ref.chapter, ref.verse))
      );
      if (missing.length > 0) {
        const sample = missing[0];
        throw new ApiError(
          `Verse not found in catalog: ${sample.book} ${sample.chapter}:${sample.verse}`,
          400
        );
      }
    }
    plan.verses = nextVerses;
  }

  if (req.body?.addVerse !== undefined) {
    const [toAdd] = normalizeVerseRefs([req.body.addVerse]);
    const resolved = await resolveVerseRefsMap([toAdd]);
    const key = makeRefKey(toAdd.book, toAdd.chapter, toAdd.verse);
    if (!resolved.has(key)) {
      throw new ApiError(
        `Verse not found in catalog: ${toAdd.book} ${toAdd.chapter}:${toAdd.verse}`,
        400
      );
    }
    const alreadyExists = plan.verses.some(
      (v) => makeRefKey(v.book, v.chapter, v.verse) === key
    );
    if (!alreadyExists) {
      if (plan.verses.length >= MAX_CUSTOM_PLAN_VERSES) {
        throw new ApiError(
          `A custom playlist can contain at most ${MAX_CUSTOM_PLAN_VERSES} verses`,
          400
        );
      }
      plan.verses.push(toAdd);
    }
  }

  if (req.body?.removeVerse !== undefined) {
    const [toRemove] = normalizeVerseRefs([req.body.removeVerse]);
    const key = makeRefKey(toRemove.book, toRemove.chapter, toRemove.verse);
    plan.verses = plan.verses.filter(
      (v) => makeRefKey(v.book, v.chapter, v.verse) !== key
    );
  }

  await plan.save();
  const updatedObj = plan.toObject();
  const { summarize } = await summarizeCustomPlansForUser(req.user._id, [updatedObj]);

  res.json({
    success: true,
    data: summarize(updatedObj),
  });
});

/**
 * @desc    Delete a custom playlist
 * @route   DELETE /api/plans/custom/:planId
 * @access  Private
 */
export const deleteCustomPlan = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new ApiError('Invalid custom playlist ID', 400);
  }

  const deleted = await CustomPlan.findOneAndDelete({ _id: planId, user: req.user._id });
  if (!deleted) {
    throw new ApiError('Custom playlist not found', 404);
  }

  res.json({
    success: true,
    data: { deletedPlanId: planId },
  });
});

/**
 * @desc    Add all verses from a custom playlist into the user's Memory Deck
 * @route   POST /api/plans/custom/:planId/add-to-memory
 * @access  Private
 */
export const addCustomPlanToMemory = asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new ApiError('Invalid custom playlist ID', 400);
  }

  const plan = await CustomPlan.findOne({ _id: planId, user: req.user._id }).lean();
  if (!plan) {
    throw new ApiError('Custom playlist not found', 404);
  }

  const verseByKey = await resolveVerseRefsMap(plan.verses || []);
  let addedCount = 0;

  for (const ref of plan.verses || []) {
    const doc = verseByKey.get(makeRefKey(ref.book, ref.chapter, ref.verse));
    if (!doc) continue;

    const existing = await MemoryItem.findOne({ user: req.user._id, verse: doc._id }).lean();
    if (!existing) {
      await MemoryItem.create({
        user: req.user._id,
        verse: doc._id,
        verseOrder: doc.verseOrder,
        book: doc.book,
        chapter: doc.chapter,
        verseNum: doc.verse,
        stage: 1,
        stageCompletions: 0,
      });
      addedCount += 1;
    }
  }

  const deck = await MemoryItem.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('verse', 'verseOrder book chapter verse text characters words')
    .lean();

  res.json({
    success: true,
    addedCount,
    totalInDeck: deck.length,
    data: deck,
  });
});
