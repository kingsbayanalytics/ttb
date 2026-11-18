import { Request, Response } from 'express';
import { MemoryItem, Progress, Verse } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';
import {
  CURATED_PLANS,
  CuratedPlanDefinition,
  getCuratedPlanById,
} from '../utils/curatedCatalog';

function makeRefKey(book: string, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`;
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
