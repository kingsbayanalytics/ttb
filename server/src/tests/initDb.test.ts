import { connectTestDB, disconnectTestDB } from './test-setup';
import { initializeDatabase } from '../utils/initDb';
import { Progress, Result, User, Verse } from '../models';

describe('initDb utility (Story 4.2)', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Verse.deleteMany({}),
      User.deleteMany({}),
      Result.deleteMany({}),
      Progress.deleteMany({}),
    ]);
  });

  it('creates indexes across all collections and is idempotent on re-run', async () => {
    const logs: string[] = [];
    const logger = {
      log: (msg: string) => logs.push(msg),
      error: (msg: string) => logs.push(msg),
    };

    const firstRun = await initializeDatabase(logger);
    expect(firstRun.collectionsInitialized).toEqual([
      'verses',
      'users',
      'results',
      'progress',
      'memoryitems',
      'companionentries',
    ]);
    expect(firstRun.indexCounts.verses).toBeGreaterThanOrEqual(3);
    expect(firstRun.indexCounts.users).toBeGreaterThanOrEqual(3);
    expect(firstRun.indexCounts.results).toBeGreaterThanOrEqual(2);
    expect(firstRun.indexCounts.progress).toBeGreaterThanOrEqual(2);
    expect(firstRun.indexCounts.memoryitems).toBeGreaterThanOrEqual(3);
    expect(firstRun.indexCounts.companionentries).toBeGreaterThanOrEqual(5);
    expect(firstRun.verseCount).toBe(0);

    const secondRun = await initializeDatabase(logger);
    expect(secondRun.indexCounts).toEqual(firstRun.indexCounts);
    expect(secondRun.verseCount).toBe(0);
    expect(logs.length).toBe(2);
  });
});
