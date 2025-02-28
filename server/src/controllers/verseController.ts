import { Request, Response } from 'express';
import { Verse } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';

/**
 * @desc    Get all verses
 * @route   GET /api/verses
 * @access  Public
 */
export const getVerses = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const verses = await Verse.find({})
    .sort({ verseOrder: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Verse.countDocuments();

  res.json({
    success: true,
    count: verses.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: verses
  });
});

/**
 * @desc    Get a single verse by ID
 * @route   GET /api/verses/:id
 * @access  Public
 */
export const getVerseById = asyncHandler(async (req: Request, res: Response) => {
  const verse = await Verse.findById(req.params.id);

  if (!verse) {
    throw new ApiError('Verse not found', 404);
  }

  res.json({
    success: true,
    data: verse
  });
});

/**
 * @desc    Get a verse by its order number
 * @route   GET /api/verses/order/:verseOrder
 * @access  Public
 */
export const getVerseByOrder = asyncHandler(async (req: Request, res: Response) => {
  const verseOrder = parseInt(req.params.verseOrder);
  
  if (isNaN(verseOrder)) {
    throw new ApiError('Invalid verse order number', 400);
  }

  const verse = await Verse.findOne({ verseOrder });

  if (!verse) {
    throw new ApiError('Verse not found', 404);
  }

  res.json({
    success: true,
    data: verse
  });
});

/**
 * @desc    Get a random verse
 * @route   GET /api/verses/random
 * @access  Public
 */
export const getRandomVerse = asyncHandler(async (req: Request, res: Response) => {
  const count = await Verse.countDocuments();
  const random = Math.floor(Math.random() * count);
  
  const verse = await Verse.findOne().skip(random);

  if (!verse) {
    throw new ApiError('Verse not found', 404);
  }

  res.json({
    success: true,
    data: verse
  });
});

/**
 * @desc    Get verses by book
 * @route   GET /api/verses/book/:book
 * @access  Public
 */
export const getVersesByBook = asyncHandler(async (req: Request, res: Response) => {
  const book = req.params.book;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const verses = await Verse.find({ book })
    .sort({ verseOrder: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Verse.countDocuments({ book });

  if (verses.length === 0) {
    throw new ApiError('No verses found for this book', 404);
  }

  res.json({
    success: true,
    count: verses.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: verses
  });
});

/**
 * @desc    Get verses by book and chapter
 * @route   GET /api/verses/book/:book/chapter/:chapter
 * @access  Public
 */
export const getVersesByBookAndChapter = asyncHandler(async (req: Request, res: Response) => {
  const book = req.params.book;
  const chapter = parseInt(req.params.chapter);
  
  if (isNaN(chapter)) {
    throw new ApiError('Invalid chapter number', 400);
  }

  const verses = await Verse.find({ book, chapter }).sort({ verse: 1 });

  if (verses.length === 0) {
    throw new ApiError('No verses found for this book and chapter', 404);
  }

  res.json({
    success: true,
    count: verses.length,
    data: verses
  });
}); 