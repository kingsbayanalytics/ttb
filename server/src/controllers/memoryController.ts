import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MemoryItem, MemoryStageNumber, Verse } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';
import { getCuratedPlanById } from '../utils/curatedCatalog';

const VERSE_POPULATE_FIELDS = 'book chapter verse text verseOrder characters words';

function isValidStage(value: unknown): value is MemoryStageNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * @desc    Get user's Memory Deck items
 * @route   GET /api/memory
 * @access  Private
 */
export const getMemoryDeck = asyncHandler(async (req: Request, res: Response) => {
  const items = await MemoryItem.find({ user: req.user._id })
    .sort({ verseOrder: 1 })
    .populate('verse', VERSE_POPULATE_FIELDS);

  res.json({
    success: true,
    count: items.length,
    data: items,
  });
});

/**
 * @desc    Save or upsert a verse into the user's Memory Deck
 * @route   POST /api/memory
 * @access  Private
 */
export const addMemoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { verseId, book, chapter, verse, packId } = req.body;

  let verseDoc = null;
  if (verseId) {
    if (!mongoose.Types.ObjectId.isValid(verseId)) {
      throw new ApiError('Invalid verse ID', 400);
    }
    verseDoc = await Verse.findById(verseId);
  } else if (book && chapter !== undefined && verse !== undefined) {
    verseDoc = await Verse.findOne({
      book: String(book).trim(),
      chapter: Number(chapter),
      verse: Number(verse),
    });
  } else {
    throw new ApiError('Please provide verseId or book, chapter, and verse', 400);
  }

  if (!verseDoc) {
    throw new ApiError('Verse not found', 404);
  }

  const updateDoc: Record<string, unknown> = {
    $setOnInsert: {
      user: req.user._id,
      verse: verseDoc._id,
      verseOrder: verseDoc.verseOrder,
      book: verseDoc.book,
      chapter: verseDoc.chapter,
      verseNum: verseDoc.verse,
      stage: 1,
      stageCompletions: 0,
    },
  };

  if (packId && typeof packId === 'string') {
    updateDoc.$set = { packId };
  }

  const item = await MemoryItem.findOneAndUpdate(
    { user: req.user._id, verse: verseDoc._id },
    updateDoc,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('verse', VERSE_POPULATE_FIELDS);

  res.status(201).json({
    success: true,
    data: item,
  });
});

/**
 * @desc    Bulk-add all available verses from a curated pack into the user's Memory Deck
 * @route   POST /api/memory/pack/:packId
 * @access  Private
 */
export const addCuratedPackToMemory = asyncHandler(async (req: Request, res: Response) => {
  const { packId } = req.params;
  const plan = getCuratedPlanById(packId);
  if (!plan) {
    throw new ApiError(`Curated pack "${packId}" not found`, 404);
  }

  const verseFilters = plan.verses.map((ref) => ({
    book: ref.book,
    chapter: ref.chapter,
    verse: ref.verse,
  }));

  const resolvedVerses = await Verse.find({ $or: verseFilters }).sort({ verseOrder: 1 });

  if (resolvedVerses.length > 0) {
    const bulkOps = resolvedVerses.map((v) => ({
      updateOne: {
        filter: { user: req.user._id, verse: v._id },
        update: {
          $setOnInsert: {
            user: req.user._id,
            verse: v._id,
            verseOrder: v.verseOrder,
            book: v.book,
            chapter: v.chapter,
            verseNum: v.verse,
            stage: 1,
            stageCompletions: 0,
            packId: plan.id,
          },
        },
        upsert: true,
      },
    }));

    await MemoryItem.bulkWrite(bulkOps);
  }

  const deck = await MemoryItem.find({ user: req.user._id })
    .sort({ verseOrder: 1 })
    .populate('verse', VERSE_POPULATE_FIELDS);

  res.status(201).json({
    success: true,
    packId: plan.id,
    resolvedCount: resolvedVerses.length,
    data: deck,
  });
});

/**
 * @desc    Record a stage practice completion and auto-promote stage when accuracy >= 95%
 * @route   POST /api/memory/:id/practice
 * @access  Private
 */
export const recordMemoryPractice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid memory item ID', 400);
  }

  const { accuracy, stage, advance } = req.body;
  if (typeof accuracy !== 'number' || Number.isNaN(accuracy) || accuracy < 0 || accuracy > 100) {
    throw new ApiError('accuracy must be a number between 0 and 100', 400);
  }

  const item = await MemoryItem.findOne({ _id: id, user: req.user._id });
  if (!item) {
    throw new ApiError('Memory item not found', 404);
  }

  const practicedStage: MemoryStageNumber = isValidStage(stage) ? stage : item.stage;
  const shouldAdvance = advance !== false && accuracy >= 95;
  const nextStage: MemoryStageNumber = shouldAdvance
    ? (Math.min(5, Math.max(item.stage, practicedStage + 1)) as MemoryStageNumber)
    : item.stage;

  item.stage = nextStage;
  item.stageCompletions = (item.stageCompletions || 0) + 1;
  item.lastPracticedAt = new Date();
  await item.save();

  const populated = await MemoryItem.findById(item._id).populate('verse', VERSE_POPULATE_FIELDS);

  res.json({
    success: true,
    data: populated,
  });
});

/**
 * @desc    Manually set the stage (1..5) for a Memory Deck item
 * @route   PATCH /api/memory/:id
 * @access  Private
 */
export const updateMemoryItemStage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid memory item ID', 400);
  }

  const { stage } = req.body;
  if (!isValidStage(stage)) {
    throw new ApiError('Stage must be an integer between 1 and 5', 400);
  }

  const item = await MemoryItem.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { $set: { stage } },
    { new: true }
  ).populate('verse', VERSE_POPULATE_FIELDS);

  if (!item) {
    throw new ApiError('Memory item not found', 404);
  }

  res.json({
    success: true,
    data: item,
  });
});

/**
 * @desc    Remove a verse from the user's Memory Deck
 * @route   DELETE /api/memory/:id
 * @access  Private
 */
export const deleteMemoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid memory item ID', 400);
  }

  const deleted = await MemoryItem.findOneAndDelete({ _id: id, user: req.user._id });
  if (!deleted) {
    throw new ApiError('Memory item not found', 404);
  }

  res.json({
    success: true,
    data: { _id: id },
  });
});
