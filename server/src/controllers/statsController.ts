import { Request, Response } from 'express';
import { Progress, Result, Verse } from '../models';
import {
  TrendRange,
  buildActivity,
  buildCoverage,
  buildTrend,
  isValidTimeZone,
  isValidTrendRange,
} from '../services/stats';
import { createDayFormatter } from '../services/stats/timezone';
import { ApiError, asyncHandler } from '../utils/errorHandler';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimezoneParam(raw: unknown): string {
  if (raw === undefined || raw === '') {
    return 'UTC';
  }
  if (typeof raw !== 'string' || !isValidTimeZone(raw)) {
    throw new ApiError('Invalid tz parameter: expected a valid IANA timezone', 400);
  }
  return raw;
}

function parseRangeParam(raw: unknown): TrendRange {
  if (raw === undefined || raw === '') {
    return '30';
  }
  if (typeof raw !== 'string' || !isValidTrendRange(raw)) {
    throw new ApiError('Invalid range parameter: expected 30, 90, 365, or all', 400);
  }
  return raw;
}

function parseYearParam(raw: unknown, tz: string): number {
  if (raw === undefined || raw === '') {
    return Number(createDayFormatter(tz).format(new Date()).slice(0, 4));
  }
  if (typeof raw !== 'string' || !/^\d{4}$/.test(raw)) {
    throw new ApiError('Invalid year parameter: expected a 4-digit year', 400);
  }
  const year = Number(raw);
  if (year < 1970 || year > 2100) {
    throw new ApiError('Invalid year parameter: year must be between 1970 and 2100', 400);
  }
  return year;
}

/**
 * @desc    Get daily WPM and accuracy trend
 * @route   GET /api/stats/trend?range=&tz=
 * @access  Private
 */
export const getTrendStats = asyncHandler(async (req: Request, res: Response) => {
  const range = parseRangeParam(req.query.range);
  const tz = parseTimezoneParam(req.query.tz);
  const now = new Date();

  const filter: Record<string, any> = { user: req.user._id };
  if (range !== 'all') {
    const days = Number(range);
    // Include a 2-day buffer so any IANA timezone offset (UTC-12..UTC+14) is covered
    filter.startTime = { $gte: new Date(now.getTime() - (days + 2) * DAY_MS) };
  }

  const rows = await Result.find(filter).select('startTime wpm accuracy').lean();
  const data = buildTrend(rows, tz, range, now);

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get daily activity attempt counts for a calendar year
 * @route   GET /api/stats/activity?year=&tz=
 * @access  Private
 */
export const getActivityStats = asyncHandler(async (req: Request, res: Response) => {
  const tz = parseTimezoneParam(req.query.tz);
  const year = parseYearParam(req.query.year, tz);

  // Buffer +/- 2 days around Jan 1 and Dec 31 UTC to cover any IANA timezone boundary
  const startBound = new Date(Date.UTC(year - 1, 11, 30));
  const endBound = new Date(Date.UTC(year + 1, 0, 3));

  const rows = await Result.find({
    user: req.user._id,
    startTime: { $gte: startBound, $lte: endBound },
  })
    .select('startTime')
    .lean();

  const data = buildActivity(rows, tz, year);

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get Bible coverage overall, by Testament, and per Book
 * @route   GET /api/stats/coverage
 * @access  Private
 */
export const getCoverageStats = asyncHandler(async (req: Request, res: Response) => {
  const [bookTotals, completedProgress] = await Promise.all([
    Verse.aggregate<{ _id: string; totalVerses: number }>([
      { $group: { _id: '$book', totalVerses: { $sum: 1 } } },
    ]),
    Progress.find({ user: req.user._id, completed: true }).select('verse').lean(),
  ]);

  const totalByBook = new Map<string, number>();
  for (const row of bookTotals) {
    totalByBook.set(row._id, row.totalVerses);
  }

  const completedIds = completedProgress.map((p) => p.verse.toString());
  const verseToBook = new Map<string, string>();
  if (completedIds.length > 0) {
    const completedVerses = await Verse.find({ _id: { $in: completedIds } })
      .select('book')
      .lean();
    for (const verse of completedVerses) {
      verseToBook.set(verse._id.toString(), verse.book);
    }
  }

  const data = buildCoverage(completedIds, { totalByBook, verseToBook });

  res.json({
    success: true,
    data,
  });
});
