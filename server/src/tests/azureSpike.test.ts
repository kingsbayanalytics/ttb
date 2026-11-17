import { connectTestDB, disconnectTestDB } from './test-setup';
import { Progress, Result, User, Verse } from '../models';
import { runAzureSpike } from '../scripts/azureSpike';

const silentLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

describe('azureSpike', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Verse.deleteMany({}),
      Result.deleteMany({}),
      Progress.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it('fails fast when no verses exist in the database', async () => {
    await expect(runAzureSpike(silentLogger)).rejects.toThrow(/No Verse documents found/);
  });

  it('seeds 10k results, validates aggregation pipelines against JS totals, and cleans up spike data', async () => {
    const sampleVerses = Array.from({ length: 10 }, (_, i) => ({
      verseOrder: i + 1,
      book: i < 5 ? 'Genesis' : '1 Corinthians',
      chapter: 1,
      verse: i + 1,
      text: `Sample verse text ${i + 1}.`,
      characters: 20,
      words: 4,
    }));
    await Verse.insertMany(sampleVerses);

    const report = await runAzureSpike(silentLogger, { latencyBudgetMs: 10000 });

    expect(report.verseCount).toBe(10);
    expect(report.seededResults).toBe(10000);
    expect(report.seededProgress).toBe(10);
    expect(report.overallPass).toBe(true);
    expect(report.benchmarks).toHaveLength(3);
    for (const bench of report.benchmarks) {
      expect(bench.passedCorrectness).toBe(true);
      expect(bench.passedLatency).toBe(true);
    }

    // Synthetic data cleaned up; verses intact
    expect(await Verse.countDocuments()).toBe(10);
    expect(await Result.countDocuments()).toBe(0);
    expect(await Progress.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
  });
});
