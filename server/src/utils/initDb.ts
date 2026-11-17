import { performance } from 'perf_hooks';
import mongoose from 'mongoose';
import { config } from '../config';
import { Progress, Result, User, Verse } from '../models';

export interface InitDbSummary {
  collectionsInitialized: string[];
  indexCounts: Record<string, number>;
  verseCount: number;
  durationMs: number;
}

export async function initializeDatabase(
  logger: Pick<Console, 'log' | 'error'> = console
): Promise<InitDbSummary> {
  const start = performance.now();

  await Promise.all([
    Verse.createIndexes(),
    User.createIndexes(),
    Result.createIndexes(),
    Progress.createIndexes(),
  ]);

  const [verseIndexes, userIndexes, resultIndexes, progressIndexes, verseCount] =
    await Promise.all([
      Verse.collection.indexes(),
      User.collection.indexes(),
      Result.collection.indexes(),
      Progress.collection.indexes(),
      Verse.countDocuments(),
    ]);

  const indexCounts: Record<string, number> = {
    verses: verseIndexes.length,
    users: userIndexes.length,
    results: resultIndexes.length,
    progress: progressIndexes.length,
  };

  const durationMs = Math.round(performance.now() - start);
  logger.log(
    `Database initialized in ${durationMs}ms: indexes=${JSON.stringify(indexCounts)}, verses=${verseCount}`
  );

  return {
    collectionsInitialized: ['verses', 'users', 'results', 'progress'],
    indexCounts,
    verseCount,
    durationMs,
  };
}

async function runCli(): Promise<void> {
  const uri = config.mongodbUri;
  if (!uri) {
    console.error('Error initializing database: MONGODB_URI is required');
    process.exitCode = 1;
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await initializeDatabase();
  } catch (error: any) {
    console.error(`Error initializing database: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (disconnectError: any) {
        console.error(`Error disconnecting MongoDB: ${disconnectError.message}`);
      }
    }
  }
}

if (require.main === module) {
  runCli();
}
