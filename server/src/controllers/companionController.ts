import { Request, Response } from 'express';
import { PRIMARY_COMPANION_LENSES, PrimaryCompanionLens } from '../models/CompanionEntry';
import {
  getBookGuide,
  getChapterCompanion,
  searchUnlockedCompanion,
} from '../services/companion/companionService';
import { isCanonicalBook } from '../utils/bookMapping';
import {
  DEFAULT_WORK_ID,
  getCanonicalChapterCount,
  isAllowedWorkId,
  isValidCanonicalChapter,
} from '../utils/companionWorks';
import { ApiError, asyncHandler } from '../utils/errorHandler';

function parseWorkId(raw: unknown): string {
  if (raw === undefined) {
    return DEFAULT_WORK_ID;
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ApiError('Invalid workId parameter', 400);
  }
  const workId = raw.trim();
  if (!isAllowedWorkId(workId)) {
    throw new ApiError(`Unsupported workId: "${workId}"`, 400);
  }
  return workId;
}

function parseOptionalLens(raw: unknown): PrimaryCompanionLens | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new ApiError('Invalid lens parameter', 400);
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!(PRIMARY_COMPANION_LENSES as readonly string[]).includes(trimmed)) {
    throw new ApiError(
      `Invalid lens "${trimmed}". Allowed lenses: ${PRIMARY_COMPANION_LENSES.join(', ')}`,
      400
    );
  }
  return trimmed as PrimaryCompanionLens;
}

function parseCanonicalBookParam(rawBook: string | undefined): string {
  const book = (rawBook ?? '').trim();
  if (!book || !isCanonicalBook(book)) {
    throw new ApiError(`Unknown canonical book: "${book}"`, 400);
  }
  return book;
}

/**
 * @desc    Search unlocked companion entries (and book-level guides) by metadata/tags/query
 * @route   GET /api/companion/search
 * @access  Private
 */
export const searchCompanionHandler = asyncHandler(async (req: Request, res: Response) => {
  const workId = parseWorkId(req.query.workId);
  const lens = parseOptionalLens(req.query.lens);

  let book: string | undefined;
  if (req.query.book !== undefined) {
    if (typeof req.query.book !== 'string') {
      throw new ApiError('Invalid book parameter', 400);
    }
    const trimmedBook = req.query.book.trim();
    if (trimmedBook) {
      book = parseCanonicalBookParam(trimmedBook);
    }
  }

  let tag: string | undefined;
  if (req.query.tag !== undefined) {
    if (typeof req.query.tag !== 'string') {
      throw new ApiError('Invalid tag parameter', 400);
    }
    const trimmedTag = req.query.tag.trim();
    if (trimmedTag) {
      tag = trimmedTag.slice(0, 80);
    }
  }

  let q: string | undefined;
  if (req.query.q !== undefined) {
    if (typeof req.query.q !== 'string') {
      throw new ApiError('Invalid q parameter', 400);
    }
    const trimmedQ = req.query.q.trim();
    if (trimmedQ) {
      q = trimmedQ.slice(0, 80);
    }
  }

  let page = 1;
  if (req.query.page !== undefined) {
    if (typeof req.query.page !== 'string' || !/^\d+$/.test(req.query.page.trim())) {
      throw new ApiError('Invalid page parameter; must be a positive integer', 400);
    }
    page = Number(req.query.page.trim());
    if (page < 1) {
      throw new ApiError('Invalid page parameter; must be >= 1', 400);
    }
  }

  let limit = 20;
  if (req.query.limit !== undefined) {
    if (typeof req.query.limit !== 'string' || !/^\d+$/.test(req.query.limit.trim())) {
      throw new ApiError('Invalid limit parameter; must be a positive integer', 400);
    }
    const parsedLimit = Number(req.query.limit.trim());
    if (parsedLimit < 1) {
      throw new ApiError('Invalid limit parameter; must be >= 1', 400);
    }
    limit = Math.min(50, parsedLimit);
  }

  const data = await searchUnlockedCompanion({
    userId: req.user._id,
    workId,
    book,
    lens,
    tag,
    q,
    page,
    limit,
  });

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get book-level companion guide (introductions, dailySchedule, bonusMeditations)
 * @route   GET /api/companion/:book/guide
 * @access  Private
 */
export const getCompanionBookGuideHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workId = parseWorkId(req.query.workId);
    const book = parseCanonicalBookParam(req.params.book);

    const data = await getBookGuide({
      userId: req.user._id,
      book,
      workId,
    });

    res.json({
      success: true,
      data,
    });
  }
);

/**
 * @desc    Get chapter companion entries (server-enforced lock gate)
 * @route   GET /api/companion/:book/:chapter
 * @access  Private
 */
export const getChapterCompanionHandler = asyncHandler(async (req: Request, res: Response) => {
  const workId = parseWorkId(req.query.workId);
  const lens = parseOptionalLens(req.query.lens);
  const book = parseCanonicalBookParam(req.params.book);

  const rawChapter = (req.params.chapter ?? '').trim();
  if (!/^\d+$/.test(rawChapter)) {
    throw new ApiError(`Invalid chapter number: "${rawChapter}"`, 400);
  }
  const chapter = Number(rawChapter);
  if (!isValidCanonicalChapter(book, chapter)) {
    const maxCh = getCanonicalChapterCount(book);
    throw new ApiError(
      `Chapter ${chapter} is out of canonical range for ${book} (1..${maxCh})`,
      400
    );
  }

  const data = await getChapterCompanion({
    userId: req.user._id,
    book,
    chapter,
    workId,
    lens,
  });

  res.json({
    success: true,
    data,
  });
});
