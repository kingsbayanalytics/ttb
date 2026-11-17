import { performance } from 'perf_hooks';
import mongoose from 'mongoose';
import { config } from '../config';
import { Progress, Result, User, Verse } from '../models';
import { isRetryableWriteError, extractRetryAfterMs } from '../utils/importData';

export interface BenchmarkStepResult {
  name: string;
  durationMs: number;
  rowCount: number;
  passedLatency: boolean;
  passedCorrectness: boolean;
  details?: string;
}

export interface SpikeReport {
  verseCount: number;
  seededResults: number;
  seededProgress: number;
  indexEnsureMs: number;
  seedMs: number;
  cleanupMs: number;
  benchmarks: BenchmarkStepResult[];
  ad3FetchMs: {
    resultsFind10kMs: number;
    progressFindCompletedMs: number;
  };
  overallPass: boolean;
}

const DEFAULT_LATENCY_BUDGET_MS = 1000;

export interface RunAzureSpikeOptions {
  latencyBudgetMs?: number;
}

function formatDayInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function approxEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}

async function insertBatchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error: any) {
      if (!isRetryableWriteError(error) || attempt >= maxRetries) {
        throw error;
      }
      const retryAfterMs = extractRetryAfterMs(error) ?? 200 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfterMs, 100)));
    }
  }
}

export async function runAzureSpike(
  logger: Pick<Console, 'log' | 'error'> = console,
  options: RunAzureSpikeOptions = {}
): Promise<SpikeReport> {
  const latencyBudgetMs = options.latencyBudgetMs ?? DEFAULT_LATENCY_BUDGET_MS;
  const indexStart = performance.now();
  await Promise.all([
    Verse.createIndexes(),
    User.createIndexes(),
    Result.createIndexes(),
    Progress.createIndexes(),
  ]);
  const indexEnsureMs = Math.round(performance.now() - indexStart);

  const verseDocs = await Verse.find({}, { _id: 1, verseOrder: 1, book: 1 })
    .sort({ verseOrder: 1 })
    .lean();

  if (verseDocs.length === 0) {
    throw new Error('No Verse documents found in database. Run "npm run import-data" first.');
  }

  // Pick up to 1,000 verses evenly spaced across the canon so all books are represented
  const targetProgressCount = Math.min(1000, verseDocs.length);
  const sampledVerses: typeof verseDocs = [];
  for (let i = 0; i < targetProgressCount; i += 1) {
    const idx = Math.floor((i * verseDocs.length) / targetProgressCount);
    sampledVerses.push(verseDocs[idx]);
  }

  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const spikeUser = await User.create({
    username: `azure-spike-${uniqueSuffix}`,
    email: `azure-spike-${uniqueSuffix}@spike.local`,
    password: 'SpikeTempPassword123!',
  });

  const seedStart = performance.now();
  const seededResultCount = 10000;
  const anchorEnd = new Date('2026-11-15T23:00:00.000Z');
  const dayMs = 24 * 60 * 60 * 1000;

  interface SeededResultPlain {
    user: mongoose.Types.ObjectId;
    verse: mongoose.Types.ObjectId;
    verseOrder: number;
    startTime: Date;
    endTime: Date;
    duration: number;
    wpm: number;
    cps: number;
    accuracy: number;
    incorrectCharacters: number;
    totalCharacters: number;
  }

  const allResults: SeededResultPlain[] = [];
  for (let i = 0; i < seededResultCount; i += 1) {
    const verse = sampledVerses[i % sampledVerses.length];
    // Spread across 365 days, including timestamps near UTC midnight (23:30 UTC vs 04:30 UTC)
    const daysAgo = i % 365;
    const hourOffsetMs = ((i * 7) % 24) * 60 * 60 * 1000;
    const startTime = new Date(anchorEnd.getTime() - daysAgo * dayMs - hourOffsetMs);
    const duration = 12000 + (i % 40) * 500;
    const endTime = new Date(startTime.getTime() + duration);
    const wpm = 45 + (i % 55); // 45..99
    const accuracy = 90 + (i % 11); // 90..100
    const totalCharacters = 80 + (i % 60);
    const incorrectCharacters = Math.round(((100 - accuracy) / 100) * totalCharacters);

    allResults.push({
      user: spikeUser._id,
      verse: verse._id as mongoose.Types.ObjectId,
      verseOrder: verse.verseOrder,
      startTime,
      endTime,
      duration,
      wpm,
      cps: Number((totalCharacters / (duration / 1000)).toFixed(2)),
      accuracy,
      incorrectCharacters,
      totalCharacters,
    });
  }

  const progressDocs = sampledVerses.map((v, i) => ({
    user: spikeUser._id,
    verse: v._id as mongoose.Types.ObjectId,
    verseOrder: v.verseOrder,
    completed: i % 5 !== 0, // 80% completed, 20% incomplete
    attempts: 1 + (i % 10),
    bestWPM: 50 + (i % 50),
    bestAccuracy: 92 + (i % 9),
    lastAttemptDate: new Date(anchorEnd.getTime() - (i % 365) * dayMs),
  }));

  let cleanupMs = 0;
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    const cleanStart = performance.now();
    await insertBatchWithRetry(() =>
      Promise.all([
        Result.deleteMany({ user: spikeUser._id }),
        Progress.deleteMany({ user: spikeUser._id }),
        User.deleteOne({ _id: spikeUser._id }),
      ])
    );
    cleanedUp = true;
    cleanupMs = Math.round(performance.now() - cleanStart);
    logger.log(`Cleanup complete in ${cleanupMs}ms (spike user/results/progress removed).`);
  };

  try {
    const batchSize = 1000;
    for (let i = 0; i < allResults.length; i += batchSize) {
      const batch = allResults.slice(i, i + batchSize);
      await insertBatchWithRetry(() => Result.insertMany(batch, { ordered: false }));
    }
    await insertBatchWithRetry(() => Progress.insertMany(progressDocs, { ordered: false }));
    const seedMs = Math.round(performance.now() - seedStart);

    const benchmarks: BenchmarkStepResult[] = [];

    // 1. Trend pipeline ($match -> $project($dateToString tz) -> $group -> $sort -> $limit -> $project)
    const trendCutoff = new Date(anchorEnd.getTime() - 90 * dayMs);
    const trendTz = 'America/New_York';
    const t1Start = performance.now();
    const trendAgg = await Result.aggregate<{
      date: string;
      avgWpm: number;
      avgAccuracy: number;
      attempts: number;
    }>([
      { $match: { user: spikeUser._id, startTime: { $gte: trendCutoff } } },
      {
        $project: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: trendTz } },
          wpm: 1,
          accuracy: 1,
        },
      },
      {
        $group: {
          _id: '$day',
          avgWpm: { $avg: '$wpm' },
          avgAccuracy: { $avg: '$accuracy' },
          attempts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 365 },
      { $project: { _id: 0, date: '$_id', avgWpm: 1, avgAccuracy: 1, attempts: 1 } },
    ]);
    const trendMs = Math.round(performance.now() - t1Start);

    // JS ground truth for Trend
    const trendMap = new Map<string, { wpmSum: number; accSum: number; attempts: number }>();
    for (const r of allResults) {
      if (r.startTime >= trendCutoff) {
        const day = formatDayInTimezone(r.startTime, trendTz);
        const cur = trendMap.get(day) ?? { wpmSum: 0, accSum: 0, attempts: 0 };
        cur.wpmSum += r.wpm;
        cur.accSum += r.accuracy;
        cur.attempts += 1;
        trendMap.set(day, cur);
      }
    }
    const trendExpected = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 365)
      .map(([date, agg]) => ({
        date,
        avgWpm: agg.wpmSum / agg.attempts,
        avgAccuracy: agg.accSum / agg.attempts,
        attempts: agg.attempts,
      }));

    const trendMatches =
      trendAgg.length === trendExpected.length &&
      trendAgg.every((row, idx) => {
        const exp = trendExpected[idx];
        return (
          row.date === exp.date &&
          row.attempts === exp.attempts &&
          approxEqual(row.avgWpm, exp.avgWpm) &&
          approxEqual(row.avgAccuracy, exp.avgAccuracy)
        );
      });

    benchmarks.push({
      name: 'Trend (90d, America/New_York $match/$project/$group/$sort/$limit)',
      durationMs: trendMs,
      rowCount: trendAgg.length,
      passedLatency: trendMs < latencyBudgetMs,
      passedCorrectness: trendMatches,
      details: `days=${trendAgg.length}, expected=${trendExpected.length}`,
    });

    // 2. Activity pipeline over all 10k Results ($match -> $group -> $sort -> $project)
    const activityStart = new Date(anchorEnd.getTime() - 366 * dayMs);
    const t2Start = performance.now();
    const activityAgg = await Result.aggregate<{ date: string; attempts: number }>([
      { $match: { user: spikeUser._id, startTime: { $gte: activityStart, $lte: anchorEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: 'UTC' } },
          attempts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', attempts: 1 } },
    ]);
    const activityMs = Math.round(performance.now() - t2Start);

    const activityMap = new Map<string, number>();
    for (const r of allResults) {
      if (r.startTime >= activityStart && r.startTime <= anchorEnd) {
        const day = formatDayInTimezone(r.startTime, 'UTC');
        activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
      }
    }
    const activityExpected = Array.from(activityMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, attempts]) => ({ date, attempts }));

    const totalAggAttempts = activityAgg.reduce((acc, r) => acc + r.attempts, 0);
    const activityMatches =
      totalAggAttempts === seededResultCount &&
      activityAgg.length === activityExpected.length &&
      activityAgg.every(
        (row, idx) =>
          row.date === activityExpected[idx].date && row.attempts === activityExpected[idx].attempts
      );

    benchmarks.push({
      name: 'Activity (10k docs, UTC $match/$group/$sort/$project)',
      durationMs: activityMs,
      rowCount: activityAgg.length,
      passedLatency: activityMs < latencyBudgetMs,
      passedCorrectness: activityMatches,
      details: `days=${activityAgg.length}, totalAttempts=${totalAggAttempts}`,
    });

    // 3. Coverage pipeline ($match -> $lookup -> $project -> $group -> $sort -> $limit)
    const t3Start = performance.now();
    const coverageAgg = await Progress.aggregate<{
      book: string;
      completedVerses: number;
      avgBestWpm: number;
      avgBestAccuracy: number;
    }>([
      { $match: { user: spikeUser._id, completed: true } },
      {
        $lookup: {
          from: Verse.collection.name,
          localField: 'verse',
          foreignField: '_id',
          as: 'verseDoc',
        },
      },
      {
        $project: {
          book: { $arrayElemAt: ['$verseDoc.book', 0] },
          bestWPM: 1,
          bestAccuracy: 1,
        },
      },
      {
        $group: {
          _id: '$book',
          completedVerses: { $sum: 1 },
          avgBestWpm: { $avg: '$bestWPM' },
          avgBestAccuracy: { $avg: '$bestAccuracy' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 0,
          book: '$_id',
          completedVerses: 1,
          avgBestWpm: 1,
          avgBestAccuracy: 1,
        },
      },
    ]);
    const coverageMs = Math.round(performance.now() - t3Start);

    const verseBookById = new Map<string, string>(
      sampledVerses.map((v) => [v._id.toString(), v.book])
    );
    const coverageMap = new Map<
      string,
      { count: number; wpmSum: number; accSum: number }
    >();
    for (const p of progressDocs) {
      if (!p.completed) continue;
      const book = verseBookById.get(p.verse.toString())!;
      const cur = coverageMap.get(book) ?? { count: 0, wpmSum: 0, accSum: 0 };
      cur.count += 1;
      cur.wpmSum += p.bestWPM;
      cur.accSum += p.bestAccuracy;
      coverageMap.set(book, cur);
    }
    const coverageExpected = Array.from(coverageMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 100)
      .map(([book, agg]) => ({
        book,
        completedVerses: agg.count,
        avgBestWpm: agg.wpmSum / agg.count,
        avgBestAccuracy: agg.accSum / agg.count,
      }));

    const coverageMatches =
      coverageAgg.length === coverageExpected.length &&
      coverageAgg.every((row, idx) => {
        const exp = coverageExpected[idx];
        return (
          row.book === exp.book &&
          row.completedVerses === exp.completedVerses &&
          approxEqual(row.avgBestWpm, exp.avgBestWpm) &&
          approxEqual(row.avgBestAccuracy, exp.avgBestAccuracy)
        );
      });

    benchmarks.push({
      name: 'Coverage ($match/$lookup/$project/$group/$sort/$limit)',
      durationMs: coverageMs,
      rowCount: coverageAgg.length,
      passedLatency: coverageMs < latencyBudgetMs,
      passedCorrectness: coverageMatches,
      details: `books=${coverageAgg.length}, completed=${coverageAgg.reduce((s, r) => s + r.completedVerses, 0)}`,
    });

    // 4. AD-3 Plain-row lean fetch timings (for Epic 2 reference)
    const f1Start = performance.now();
    const leanResults = await Result.find({ user: spikeUser._id })
      .select('startTime wpm accuracy')
      .lean();
    const resultsFind10kMs = Math.round(performance.now() - f1Start);
    if (leanResults.length !== seededResultCount) {
      throw new Error(`Expected ${seededResultCount} lean results, got ${leanResults.length}`);
    }

    const f2Start = performance.now();
    const leanProgress = await Progress.find({ user: spikeUser._id, completed: true })
      .select('verse verseOrder')
      .lean();
    const progressFindCompletedMs = Math.round(performance.now() - f2Start);
    if (leanProgress.length !== progressDocs.filter((p) => p.completed).length) {
      throw new Error(`Unexpected completed progress count: ${leanProgress.length}`);
    }

    const overallPass = benchmarks.every((b) => b.passedLatency && b.passedCorrectness);

    await cleanup();

    const report: SpikeReport = {
      verseCount: verseDocs.length,
      seededResults: seededResultCount,
      seededProgress: progressDocs.length,
      indexEnsureMs,
      seedMs,
      cleanupMs,
      benchmarks,
      ad3FetchMs: {
        resultsFind10kMs,
        progressFindCompletedMs,
      },
      overallPass,
    };

    logger.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    await cleanup();
  }
}

async function main(): Promise<void> {
  const uri = config.mongodbUri;
  if (!uri) {
    console.error('Azure spike error: MONGODB_URI is required');
    process.exitCode = 1;
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    const report = await runAzureSpike(console);
    if (!report.overallPass) {
      console.error('Azure spike FAILED one or more latency/correctness checks.');
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error(`Azure spike error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  main();
}
