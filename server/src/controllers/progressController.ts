import { Request, Response } from 'express';
import { Progress, Verse, Result } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';

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
  const {
    verseId,
    verseOrder,
    startTime,
    endTime,
    duration,
    wpm,
    cps,
    accuracy,
    incorrectCharacters,
    totalCharacters
  } = req.body;

  // Validate the verse exists
  const verse = await Verse.findById(verseId);
  if (!verse) {
    throw new ApiError('Verse not found', 404);
  }

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
    totalCharacters
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
  }

  res.status(201).json({
    success: true,
    data: {
      result,
      progress
    }
  });
}); 