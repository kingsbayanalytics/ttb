import { Request, Response } from 'express';
import { getTrailBook, getTrailOverview } from '../services/trail/trailService';
import { isCanonicalBook } from '../utils/bookMapping';
import { DEFAULT_WORK_ID, isAllowedWorkId } from '../utils/companionWorks';
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

/**
 * @desc    Get 9-biome / 73-book Living Trail overview with active traveler pointer
 * @route   GET /api/trail/overview
 * @access  Private
 */
export const getTrailOverviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const workId = parseWorkId(req.query.workId);
  const data = await getTrailOverview(req.user._id, workId);

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get chapter-level waypoint states and trail legs for a single canonical book
 * @route   GET /api/trail/books/:book
 * @access  Private
 */
export const getTrailBookHandler = asyncHandler(async (req: Request, res: Response) => {
  const workId = parseWorkId(req.query.workId);
  const book = (req.params.book ?? '').trim();

  if (!book || !isCanonicalBook(book)) {
    throw new ApiError(`Unknown canonical book: "${book}"`, 400);
  }

  const data = await getTrailBook(req.user._id, book, workId);

  res.json({
    success: true,
    data,
  });
});
