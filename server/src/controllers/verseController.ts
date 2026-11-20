import { Request, Response } from 'express';
import { Progress, Verse } from '../models';
import { isCanonicalBook } from '../utils/bookMapping';
import {
  getCanonicalChapterCount,
  isValidCanonicalChapter,
} from '../utils/companionWorks';
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
 * @desc    Get next untyped verse (lowest verseOrder without completed Progress), overall, by book, or by book+chapter
 * @route   GET /api/verses/next?book=&chapter=
 * @access  Private
 */
export const getNextVerse = asyncHandler(async (req: Request, res: Response) => {
  const rawBook = req.query.book;
  if (rawBook !== undefined && typeof rawBook !== 'string') {
    throw new ApiError('Invalid book parameter', 400);
  }

  const rawChapter = req.query.chapter;
  if (rawChapter !== undefined && typeof rawChapter !== 'string') {
    throw new ApiError('Invalid chapter parameter', 400);
  }

  const book = typeof rawBook === 'string' ? rawBook.trim() : '';
  const chapterStr = typeof rawChapter === 'string' ? rawChapter.trim() : '';
  const hasChapterParam = rawChapter !== undefined;

  let chapterNum: number | undefined;
  if (hasChapterParam) {
    if (!book) {
      throw new ApiError('Query parameter "book" is required when "chapter" is provided', 400);
    }
    if (!/^\d+$/.test(chapterStr)) {
      throw new ApiError(`Invalid chapter parameter: "${chapterStr}"`, 400);
    }
    chapterNum = Number(chapterStr);
    if (!Number.isSafeInteger(chapterNum) || chapterNum < 1) {
      throw new ApiError(`Invalid chapter parameter: "${chapterStr}"`, 400);
    }
    if (isCanonicalBook(book) && !isValidCanonicalChapter(book, chapterNum)) {
      const maxCh = getCanonicalChapterCount(book);
      throw new ApiError(
        `Chapter ${chapterNum} is out of canonical range for ${book} (1..${maxCh})`,
        400
      );
    }
  }

  const verseFilter: Record<string, any> = book ? { book } : {};
  if (chapterNum !== undefined) {
    verseFilter.chapter = chapterNum;
  }

  const orderedVerses = await Verse.find(verseFilter, { _id: 1, verseOrder: 1 })
    .sort({ verseOrder: 1 })
    .lean();

  if (chapterNum !== undefined) {
    if (orderedVerses.length === 0) {
      if (!isCanonicalBook(book)) {
        throw new ApiError(`Unknown book "${book}" or out-of-range chapter ${chapterNum}`, 400);
      }
      throw new ApiError(`No verses found for ${book} chapter ${chapterNum}`, 404);
    }

    const completedProgress = await Progress.find({
      user: req.user._id,
      completed: true,
      verse: { $in: orderedVerses.map((v) => v._id) },
    })
      .select('verse')
      .lean();
    const completedVerseIds = new Set(completedProgress.map((p) => p.verse.toString()));

    const rawAfter = req.query.afterVerseOrder;
    const afterVerseOrder =
      typeof rawAfter === 'string' && /^\d+$/.test(rawAfter) ? Number(rawAfter) : undefined;

    const nextMeta =
      (afterVerseOrder !== undefined
        ? orderedVerses.find(
            (v) => v.verseOrder > afterVerseOrder && !completedVerseIds.has(v._id.toString())
          )
        : undefined) ?? orderedVerses.find((v) => !completedVerseIds.has(v._id.toString()));

    if (!nextMeta) {
      // Chapter already complete: return verse 1 so "Re-type Chapter" starts cleanly at v.1
      const firstVerse = await Verse.findById(orderedVerses[0]._id).lean();
      return res.json({
        success: true,
        data: {
          complete: false,
          chapterComplete: true,
          verse: firstVerse,
        },
      });
    }

    const nextVerse = await Verse.findById(nextMeta._id).lean();
    return res.json({
      success: true,
      data: {
        complete: false,
        chapterComplete: false,
        verse: nextVerse,
      },
    });
  }

  if (book && orderedVerses.length === 0) {
    throw new ApiError('No verses found for this book', 404);
  }

  if (orderedVerses.length === 0) {
    return res.json({
      success: true,
      data: {
        complete: true,
        verse: null,
      },
    });
  }

  const progressFilter: Record<string, any> = {
    user: req.user._id,
    completed: true,
  };
  if (book) {
    progressFilter.verse = { $in: orderedVerses.map((v) => v._id) };
  }

  const completedProgress = await Progress.find(progressFilter).select('verse').lean();
  const completedVerseIds = new Set(completedProgress.map((p) => p.verse.toString()));

  const rawAfter = req.query.afterVerseOrder;
  const afterVerseOrder =
    typeof rawAfter === 'string' && /^\d+$/.test(rawAfter) ? Number(rawAfter) : undefined;

  const nextMeta =
    (afterVerseOrder !== undefined
      ? orderedVerses.find(
          (v) => v.verseOrder > afterVerseOrder && !completedVerseIds.has(v._id.toString())
        )
      : undefined) ?? orderedVerses.find((v) => !completedVerseIds.has(v._id.toString()));
  if (!nextMeta) {
    return res.json({
      success: true,
      data: {
        complete: true,
        verse: null,
      },
    });
  }

  const nextVerse = await Verse.findById(nextMeta._id).lean();
  res.json({
    success: true,
    data: {
      complete: false,
      verse: nextVerse,
    },
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

/**
 * @desc    Get chapter list and verse counts for a specific book
 * @route   GET /api/verses/book/:book/chapters
 * @access  Public
 */
export const getBookChapters = asyncHandler(async (req: Request, res: Response) => {
  const book = req.params.book;
  const rows = await Verse.find({ book }, { chapter: 1 }).lean();

  if (rows.length === 0) {
    throw new ApiError('No verses found for this book', 404);
  }

  const countsByChapter = new Map<number, number>();
  for (const row of rows) {
    countsByChapter.set(row.chapter, (countsByChapter.get(row.chapter) ?? 0) + 1);
  }

  const chapters = Array.from(countsByChapter.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, verseCount]) => ({ chapter, verseCount }));

  res.json({
    success: true,
    book,
    count: chapters.length,
    data: chapters,
  });
});

/**
 * @desc    Get immediate previous and next verses around a verseOrder for passage flow preview
 * @route   GET /api/verses/context/:verseOrder
 * @access  Public
 */
export const getVerseContext = asyncHandler(async (req: Request, res: Response) => {
  const verseOrder = parseInt(req.params.verseOrder, 10);

  if (isNaN(verseOrder) || verseOrder < 1) {
    throw new ApiError('Invalid verse order number', 400);
  }

  const neighbors = await Verse.find({
    verseOrder: { $in: [verseOrder - 1, verseOrder + 1] },
  })
    .select('verseOrder book chapter verse text')
    .lean();

  const prev = neighbors.find((v) => v.verseOrder === verseOrder - 1) ?? null;
  const next = neighbors.find((v) => v.verseOrder === verseOrder + 1) ?? null;

  res.json({
    success: true,
    data: {
      prev,
      next,
    },
  });
});