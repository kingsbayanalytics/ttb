import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Progress, Verse, Result } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';

async function recomputeVerseProgress(
  userId: mongoose.Types.ObjectId | string,
  verseId: mongoose.Types.ObjectId | string
) {
  const remainingResults = await Result.find({ user: userId, verse: verseId })
    .sort({ endTime: -1, startTime: -1 })
    .lean();

  if (remainingResults.length === 0) {
    await Progress.deleteOne({ user: userId, verse: verseId });
    return null;
  }

  const bestWPM = Math.max(...remainingResults.map((r) => Number(r.wpm) || 0));
  const bestAccuracy = Math.max(...remainingResults.map((r) => Number(r.accuracy) || 0));
  const latest = remainingResults[0];
  const lastAttemptDate = latest.endTime || latest.startTime || new Date();

  const updated = await Progress.findOneAndUpdate(
    { user: userId, verse: verseId },
    {
      attempts: remainingResults.length,
      bestWPM,
      bestAccuracy,
      lastAttemptDate,
      completed: true,
    },
    { new: true }
  ).populate('verse', 'book chapter verse text');

  return updated;
}

/**
 * @desc    Get user progress
 * @route   GET /api/progress
 * @access  Private
 */
export const getUserProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await Progress.find({ user: req.user._id })
    .sort({ verseOrder: 1 })
    .populate('verse', 'book chapter verse text');

  res.json({
    success: true,
    count: progress.length,
    data: progress
  });
});

/**
 * @desc    Get user progress for a specific verse
 * @route   GET /api/progress/verse/:verseId
 * @access  Private
 */
export const getVerseProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    verse: req.params.verseId
  }).populate('verse', 'book chapter verse text');

  if (!progress) {
    return res.json({
      success: true,
      data: null
    });
  }

  res.json({
    success: true,
    data: progress
  });
});

/**
 * @desc    Get user progress summary
 * @route   GET /api/progress/summary
 * @access  Private
 */
export const getProgressSummary = asyncHandler(async (req: Request, res: Response) => {
  const totalVerses = await Verse.countDocuments();
  const completedVerses = await Progress.countDocuments({
    user: req.user._id,
    completed: true
  });
  
  const attemptedVerses = await Progress.countDocuments({
    user: req.user._id
  });

  const averageWPM = await Result.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, avgWPM: { $avg: '$wpm' } } }
  ]);

  const bestWPM = await Result.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, maxWPM: { $max: '$wpm' } } }
  ]);

  const averageAccuracy = await Result.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, avgAccuracy: { $avg: '$accuracy' } } }
  ]);

  const totalTests = await Result.countDocuments({ user: req.user._id });

  res.json({
    success: true,
    data: {
      totalVerses,
      completedVerses,
      attemptedVerses,
      percentageCompleted: totalVerses > 0 ? (completedVerses / totalVerses) * 100 : 0,
      averageWPM: averageWPM.length > 0 ? averageWPM[0].avgWPM : 0,
      bestWPM: bestWPM.length > 0 ? bestWPM[0].maxWPM : 0,
      averageAccuracy: averageAccuracy.length > 0 ? averageAccuracy[0].avgAccuracy : 0,
      totalTests
    }
  });
});

/**
 * @desc    Submit a typing test result
 * @route   POST /api/progress/result
 * @access  Private
 */
export const submitResult = asyncHandler(async (req: Request, res: Response) => {
  const verseId = req.params.verseId || req.body.verse;
  const {
    verseOrder,
    startTime,
    endTime,
    duration,
    wpm,
    cps,
    accuracy,
    incorrectCharacters,
    totalCharacters,
    missedChars,
    missedWords,
  } = req.body;

  // Validate the verse exists
  let verse;
  try {
    verse = await Verse.findById(verseId);
  } catch (error) {
    console.error('Error finding verse:', error);
    throw new ApiError('Invalid verse ID', 400);
  }
  if (!verse) {
    throw new ApiError('Verse not found', 404);
  }

  const sanitizedMissedChars = Array.isArray(missedChars)
    ? missedChars
        .filter(
          (item: any) =>
            item &&
            typeof item.char === 'string' &&
            item.char.length > 0 &&
            typeof item.count === 'number' &&
            item.count > 0
        )
        .slice(0, 64)
        .map((item: { char: string; count: number }) => ({
          char: item.char.slice(0, 4),
          count: Math.floor(item.count),
        }))
    : [];

  const sanitizedMissedWords = Array.isArray(missedWords)
    ? missedWords
        .filter(
          (item: any) =>
            item &&
            typeof item.word === 'string' &&
            item.word.trim().length > 0 &&
            typeof item.count === 'number' &&
            item.count > 0
        )
        .slice(0, 64)
        .map((item: { word: string; count: number }) => ({
          word: item.word.trim().slice(0, 64),
          count: Math.floor(item.count),
        }))
    : [];

  // Create the result
  const result = await Result.create({
    user: req.user._id,
    verse: verseId,
    verseOrder,
    startTime,
    endTime,
    duration,
    wpm,
    cps,
    accuracy,
    incorrectCharacters,
    totalCharacters,
    missedChars: sanitizedMissedChars,
    missedWords: sanitizedMissedWords,
  });

  // Update or create progress record
  let progress = await Progress.findOne({
    user: req.user._id,
    verse: verseId
  });

  if (progress) {
    // Update existing progress
    progress.attempts += 1;
    progress.completed = true;
    progress.lastAttemptDate = new Date();
    
    // Update best WPM if current is better
    if (wpm > progress.bestWPM) {
      progress.bestWPM = wpm;
    }
    
    // Update best accuracy if current is better
    if (accuracy > progress.bestAccuracy) {
      progress.bestAccuracy = accuracy;
    }
    
    await progress.save();
    progress = await Progress.findById(progress._id).populate('verse', 'book chapter verse text');
  } else {
    // Create new progress record
    progress = await Progress.create({
      user: req.user._id,
      verse: verseId,
      verseOrder,
      completed: true,
      attempts: 1,
      bestWPM: wpm,
      bestAccuracy: accuracy,
      lastAttemptDate: new Date()
    });
    progress = await Progress.findById(progress._id).populate('verse', 'book chapter verse text');
  }

  res.status(201).json({
    success: true,
    data: {
      result,
      progress
    }
  });
});

/**
 * @desc    Get individual typing test results for the authenticated user
 * @route   GET /api/progress/results
 * @access  Private
 */
export const getUserResults = asyncHandler(async (req: Request, res: Response) => {
  const results = await Result.find({ user: req.user._id })
    .sort({ startTime: -1, createdAt: -1 })
    .populate('verse', 'book chapter verse verseOrder text');

  res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

/**
 * @desc    Update an individual typing test result and recompute verse progress
 * @route   PATCH /api/progress/result/:resultId
 * @access  Private
 */
export const updateResult = asyncHandler(async (req: Request, res: Response) => {
  const { resultId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(resultId)) {
    throw new ApiError('Invalid result ID', 400);
  }

  const result = await Result.findOne({ _id: resultId, user: req.user._id });
  if (!result) {
    throw new ApiError('Result not found', 404);
  }

  const { wpm, accuracy, duration, incorrectCharacters } = req.body;

  if (wpm !== undefined) {
    const parsedWpm = Number(wpm);
    if (!Number.isFinite(parsedWpm) || parsedWpm < 0 || parsedWpm > 500) {
      throw new ApiError('WPM must be a number between 0 and 500', 400);
    }
    result.wpm = parsedWpm;
  }

  if (accuracy !== undefined) {
    const parsedAccuracy = Number(accuracy);
    if (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0 || parsedAccuracy > 100) {
      throw new ApiError('Accuracy must be a number between 0 and 100', 400);
    }
    result.accuracy = parsedAccuracy;
  }

  if (duration !== undefined) {
    const parsedDuration = Number(duration);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
      throw new ApiError('Duration must be a non-negative number in milliseconds', 400);
    }
    result.duration = parsedDuration;
    if (parsedDuration > 0 && result.totalCharacters > 0) {
      result.cps = Number((result.totalCharacters / (parsedDuration / 1000)).toFixed(2));
    }
  }

  if (incorrectCharacters !== undefined) {
    const parsedIncorrect = Number(incorrectCharacters);
    if (!Number.isFinite(parsedIncorrect) || parsedIncorrect < 0) {
      throw new ApiError('incorrectCharacters must be a non-negative integer', 400);
    }
    result.incorrectCharacters = Math.floor(parsedIncorrect);
  }

  await result.save();

  const populatedResult = await Result.findById(result._id).populate(
    'verse',
    'book chapter verse verseOrder text'
  );
  const progress = await recomputeVerseProgress(req.user._id, result.verse);

  res.json({
    success: true,
    data: {
      result: populatedResult,
      progress,
    },
  });
});

/**
 * @desc    Delete an individual typing test result and recompute/remove verse progress
 * @route   DELETE /api/progress/result/:resultId
 * @access  Private
 */
export const deleteResult = asyncHandler(async (req: Request, res: Response) => {
  const { resultId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(resultId)) {
    throw new ApiError('Invalid result ID', 400);
  }

  const deleted = await Result.findOneAndDelete({ _id: resultId, user: req.user._id });
  if (!deleted) {
    throw new ApiError('Result not found', 404);
  }

  const progress = await recomputeVerseProgress(req.user._id, deleted.verse);

  res.json({
    success: true,
    data: {
      deletedResultId: resultId,
      progress,
    },
  });
});

/**
 * @desc    Delete all results and progress for a specific verse
 * @route   DELETE /api/progress/verse/:verseId
 * @access  Private
 */
export const deleteVerseProgress = asyncHandler(async (req: Request, res: Response) => {
  const { verseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(verseId)) {
    throw new ApiError('Invalid verse ID', 400);
  }

  const [deletedResults, deletedProgress] = await Promise.all([
    Result.deleteMany({ user: req.user._id, verse: verseId }),
    Progress.deleteOne({ user: req.user._id, verse: verseId }),
  ]);

  if (deletedResults.deletedCount === 0 && deletedProgress.deletedCount === 0) {
    throw new ApiError('No progress found for this verse', 404);
  }

  res.json({
    success: true,
    data: {
      verseId,
      deletedResultsCount: deletedResults.deletedCount,
    },
  });
});