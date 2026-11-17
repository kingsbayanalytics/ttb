import fs from 'fs';
import os from 'os';
import path from 'path';
import { connectTestDB, disconnectTestDB } from './test-setup';
import { Verse } from '../models';
import { USFM_TO_CANONICAL_BOOK, mapUsfmBookCode } from '../utils/bookMapping';
import {
  DEFAULT_CSV_PATH,
  extractRetryAfterMs,
  importVerses,
  isRetryableWriteError,
  loadVersesFromCsv,
  parseCsvRow,
} from '../utils/importData';

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('bookMapping & importData', () => {
  let tmpDir: string;

  beforeAll(async () => {
    await connectTestDB();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttb-import-test-'));
  });

  afterAll(async () => {
    await disconnectTestDB();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await Verse.deleteMany({});
  });

  describe('USFM book mapping & full CSV validation', () => {
    it('maps all 73 USFM book codes to distinct canonical English names', () => {
      const entries = Object.entries(USFM_TO_CANONICAL_BOOK);
      expect(entries).toHaveLength(73);
      expect(new Set(entries.map(([, name]) => name)).size).toBe(73);
      expect(mapUsfmBookCode('GEN')).toBe('Genesis');
      expect(mapUsfmBookCode('1CO')).toBe('1 Corinthians');
      expect(mapUsfmBookCode('ESG')).toBe('Esther');
      expect(mapUsfmBookCode('DAG')).toBe('Daniel');
      expect(() => mapUsfmBookCode('UNKNOWN')).toThrow(/Unknown USFM book code/);
    });

    it('parses all 35,379 verses and 73 books from the WEB Catholic CSV', async () => {
      const verses = await loadVersesFromCsv(DEFAULT_CSV_PATH);
      expect(verses).toHaveLength(35379);
      const uniqueBooks = new Set(verses.map((v) => v.book));
      expect(uniqueBooks.size).toBe(73);
      expect(verses[0]).toMatchObject({
        verseOrder: 1,
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning, God created the heavens and the earth.',
      });
    });
  });

  describe('fail-fast validation', () => {
    it('fails fast when CSV file is missing', async () => {
      await expect(
        importVerses({
          csvPath: path.join(tmpDir, 'does-not-exist.csv'),
          logger: silentLogger,
        })
      ).rejects.toThrow(/CSV file not found/);
    });

    it('fails fast on invalid CSV row values', () => {
      expect(() =>
        parseCsvRow(
          {
            Verse_Order: 'not-a-number',
            Book_Name: 'GEN',
            Chapter_Name: '1',
            'Verse_#': '1',
            Verse: 'Hello',
          },
          2
        )
      ).toThrow(/Invalid Verse_Order/);

      expect(() =>
        parseCsvRow(
          {
            Verse_Order: '1',
            Book_Name: 'XXX',
            Chapter_Name: '1',
            'Verse_#': '1',
            Verse: 'Hello',
          },
          2
        )
      ).toThrow(/Invalid Book_Name/);

      expect(() =>
        parseCsvRow(
          {
            Verse_Order: '1',
            Book_Name: 'GEN',
            Chapter_Name: '1',
            'Verse_#': '1',
            Verse: '   ',
          },
          2
        )
      ).toThrow(/Empty Verse text/);
    });

    it('rejects cleanly on readStream errors and aborts buffered rows after a bad row', async () => {
      const dirAsFile = fs.mkdtempSync(path.join(tmpDir, 'dir-as-csv-'));
      await expect(loadVersesFromCsv(dirAsFile)).rejects.toThrow(/EISDIR|illegal operation/i);

      const badMidStreamCsv = path.join(tmpDir, 'bad-midstream.csv');
      const header = 'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse';
      const lines = [
        header,
        '1,GEN,1,1,"Valid first verse."',
        '2,BAD,1,2,"Invalid book code."',
        ...Array.from({ length: 20 }, (_, i) => `${i + 3},GEN,1,${i + 3},"Trailing verse ${i + 3}."`),
      ];
      fs.writeFileSync(badMidStreamCsv, lines.join('\n'), 'utf8');

      await expect(loadVersesFromCsv(badMidStreamCsv)).rejects.toThrow(/Invalid Book_Name/);
    });

    it('rejects empty CSV, header-only CSV, duplicate Verse_Order, and duplicate (book, chapter, verse)', async () => {
      const emptyCsv = path.join(tmpDir, 'empty.csv');
      fs.writeFileSync(emptyCsv, '', 'utf8');
      await expect(loadVersesFromCsv(emptyCsv)).rejects.toThrow(/CSV file contains no verse rows/);

      const headerOnlyCsv = path.join(tmpDir, 'header-only.csv');
      fs.writeFileSync(headerOnlyCsv, 'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse\n', 'utf8');
      await expect(loadVersesFromCsv(headerOnlyCsv)).rejects.toThrow(/CSV file contains no verse rows/);

      const dupOrderCsv = path.join(tmpDir, 'dup-order.csv');
      fs.writeFileSync(
        dupOrderCsv,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
          '1,GEN,1,2,"Verse two."',
        ].join('\n'),
        'utf8'
      );
      await expect(loadVersesFromCsv(dupOrderCsv)).rejects.toThrow(/Duplicate Verse_Order 1/);

      const dupLocationCsv = path.join(tmpDir, 'dup-location.csv');
      fs.writeFileSync(
        dupLocationCsv,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
          '2,GEN,1,1,"Duplicate book/chapter/verse."',
        ].join('\n'),
        'utf8'
      );
      await expect(loadVersesFromCsv(dupLocationCsv)).rejects.toThrow(
        /Duplicate \(book, chapter, verse\) Genesis 1:1/
      );
    });

    it('parses BOM-prefixed CSV headers cleanly', async () => {
      const bomCsv = path.join(tmpDir, 'bom.csv');
      fs.writeFileSync(
        bomCsv,
        '\uFEFFVerse_Order,Book_Name,Chapter_Name,Verse_#,Verse\n1,GEN,1,1,"In the beginning."\n',
        'utf8'
      );
      const verses = await loadVersesFromCsv(bomCsv);
      expect(verses).toHaveLength(1);
      expect(verses[0]).toMatchObject({
        verseOrder: 1,
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning.',
      });
    });
  });

  describe('idempotent bulkWrite upsert', () => {
    it('upserts on run 1, reports 0 inserted/modified on run 2, and updates in-place on text change', async () => {
      const csvPath = path.join(tmpDir, 'sample.csv');
      const header = 'Verse_Order,Book_Order,Book_Name,Chapter_Name,Book_and_Chapter,Chapter_Order,Verse_#,Verse';
      const rows = [
        '1,1,GEN,1,GEN 1,1,1,"In the beginning, God created the heavens and the earth."',
        '2,1,GEN,1,GEN 1,1,2,"The earth was formless and empty."',
        '3,75,1CO,13,1CO 13,1,4,"Love is patient and is kind."',
      ];
      fs.writeFileSync(csvPath, [header, ...rows].join('\n'), 'utf8');

      const run1 = await importVerses({ csvPath, batchSize: 2, logger: silentLogger });
      expect(run1.totalRows).toBe(3);
      expect(run1.batches).toBe(2);
      expect(run1.upsertedCount).toBe(3);
      expect(run1.modifiedCount).toBe(0);
      expect(run1.matchedCount).toBe(0);

      const persistedV3 = await Verse.findOne({ verseOrder: 3 }).lean();
      expect(persistedV3).toMatchObject({
        verseOrder: 3,
        book: '1 Corinthians',
        chapter: 13,
        verse: 4,
        text: 'Love is patient and is kind.',
        characters: 'Love is patient and is kind.'.length,
        words: 6,
      });

      const firstId = (await Verse.findOne({ verseOrder: 1 }))?._id.toString();
      const thirdId = persistedV3?._id.toString();
      expect(firstId).toBeDefined();
      expect(thirdId).toBeDefined();

      const run2 = await importVerses({ csvPath, batchSize: 2, logger: silentLogger });
      expect(run2.totalRows).toBe(3);
      expect(run2.upsertedCount).toBe(0);
      expect(run2.modifiedCount).toBe(0);
      expect(run2.matchedCount).toBe(3);

      // Update one verse's text in place via $set without recreating _id
      const updatedText = 'Love is patient and kind, always.';
      const updatedRows = [
        rows[0],
        rows[1],
        `3,75,1CO,13,1CO 13,1,4,"${updatedText}"`,
      ];
      fs.writeFileSync(csvPath, [header, ...updatedRows].join('\n'), 'utf8');

      const run3 = await importVerses({ csvPath, batchSize: 2, logger: silentLogger });
      expect(run3.upsertedCount).toBe(0);
      expect(run3.modifiedCount).toBe(1);
      expect(run3.matchedCount).toBe(3);

      const updatedV3 = await Verse.findOne({ verseOrder: 3 }).lean();
      expect(updatedV3?._id.toString()).toBe(thirdId);
      expect(updatedV3).toMatchObject({
        text: updatedText,
        characters: updatedText.length,
        words: 6,
      });

      // Existing _id must remain preserved (no deleteMany)
      const secondRunId = (await Verse.findOne({ verseOrder: 1 }))?._id.toString();
      expect(secondRunId).toBe(firstId);
      expect(await Verse.countDocuments()).toBe(3);
    });

    it('imports >500 rows across multiple batches using default batchSize and real bulkWrite', async () => {
      const csvPath = path.join(tmpDir, 'multi-batch.csv');
      const header = 'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse';
      const rows = Array.from(
        { length: 600 },
        (_, i) => `${i + 1},GEN,1,${i + 1},"Verse text number ${i + 1}."`
      );
      fs.writeFileSync(csvPath, [header, ...rows].join('\n'), 'utf8');

      const run1 = await importVerses({ csvPath, logger: silentLogger });
      expect(run1.totalRows).toBe(600);
      expect(run1.batches).toBe(2);
      expect(run1.upsertedCount).toBe(600);
      expect(run1.modifiedCount).toBe(0);

      const run2 = await importVerses({ csvPath, logger: silentLogger });
      expect(run2.upsertedCount).toBe(0);
      expect(run2.modifiedCount).toBe(0);
      expect(run2.matchedCount).toBe(600);
      expect(await Verse.countDocuments()).toBe(600);
    });
  });

  describe('throttling retry & backoff', () => {
    it('detects Cosmos 16500 / 429 throttling, string codes, labels, and rejects mixed writeErrors', () => {
      const cosmosErr = Object.assign(
        new Error('Error=16500, RetryAfterMs=42, Details=Request rate is large'),
        { code: 16500 }
      );
      expect(isRetryableWriteError(cosmosErr)).toBe(true);
      expect(extractRetryAfterMs(cosmosErr)).toBe(42);
      expect(isRetryableWriteError({ code: '16500', message: 'throttled' })).toBe(true);
      expect(isRetryableWriteError({ errorLabels: ['RetryableWriteError'] })).toBe(true);
      expect(
        isRetryableWriteError({ hasErrorLabel: (label: string) => label === 'RetryableWriteError' })
      ).toBe(true);
      expect(isRetryableWriteError({ code: 11000, message: 'E11000 duplicate key' })).toBe(false);

      // Mixed retryable + fatal writeErrors must NOT retry even if top-level code/message looks retryable
      expect(
        isRetryableWriteError({
          code: 16500,
          message: 'Error=16500, RetryAfterMs=10',
          writeErrors: [
            { index: 0, code: 16500, errmsg: 'RequestRateTooLarge' },
            { index: 1, code: 11000, errmsg: 'E11000 duplicate key' },
          ],
        })
      ).toBe(false);

      // extractRetryAfterMs must return the maximum across all writeErrors
      expect(
        extractRetryAfterMs({
          message: 'RetryAfterMs=15',
          writeErrors: [
            { index: 0, code: 16500, errmsg: 'RetryAfterMs=25' },
            { index: 1, code: 429, errmsg: 'RetryAfterMs=80' },
          ],
        })
      ).toBe(80);
    });

    it('uses exponential backoff capped at maxDelayMs without RetryAfterMs and avoids double-counting non-narrowed batches', async () => {
      const csvPath = path.join(tmpDir, 'exp-backoff.csv');
      fs.writeFileSync(
        csvPath,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
          '2,GEN,1,2,"Verse two."',
        ].join('\n'),
        'utf8'
      );

      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 25ms
      const sleepDelays: number[] = [];
      let callCount = 0;

      try {
        const bulkWriteFn = jest.fn(async (ops) => {
          callCount += 1;
          if (callCount <= 3) {
            // All ops failed (not narrowed); error.result must NOT be double-counted
            throw Object.assign(new Error('All ops throttled'), {
              result: { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 },
              writeErrors: [
                { index: 0, code: 16500, errmsg: 'RequestRateTooLarge' },
                { index: 1, code: 16500, errmsg: 'RequestRateTooLarge' },
              ],
            });
          }
          expect(ops).toHaveLength(2);
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 2 };
        });

        const summary = await importVerses({
          csvPath,
          batchSize: 10,
          bulkWriteFn,
          maxRetries: 4,
          baseDelayMs: 50,
          maxDelayMs: 120,
          sleep: async (ms) => {
            sleepDelays.push(ms);
          },
          logger: silentLogger,
        });

        expect(callCount).toBe(4);
        expect(summary.retries).toBe(3);
        expect(summary.upsertedCount).toBe(2);
        // attempt 0: min(120, 50 + 25) = 75
        // attempt 1: min(120, 100 + 25) = 120
        // attempt 2: min(120, 120 + 25) = 120
        expect(sleepDelays).toEqual([75, 120, 120]);
      } finally {
        randomSpy.mockRestore();
      }
    });

    it('caps RetryAfterMs at maxDelayMs and keeps ops when writeErrors indices are out of range', async () => {
      const csvPath = path.join(tmpDir, 'cap-and-bounds.csv');
      fs.writeFileSync(
        csvPath,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
          '2,GEN,1,2,"Verse two."',
        ].join('\n'),
        'utf8'
      );

      const sleepDelays: number[] = [];
      let callCount = 0;
      const bulkWriteFn = jest.fn(async (ops) => {
        callCount += 1;
        if (callCount === 1) {
          throw Object.assign(new Error('Bulk write out-of-range index'), {
            writeErrors: [{ index: 99, code: 429, errmsg: 'TooManyRequests RetryAfterMs=50000' }],
          });
        }
        expect(ops).toHaveLength(2);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 2 };
      });

      const summary = await importVerses({
        csvPath,
        batchSize: 10,
        bulkWriteFn,
        baseDelayMs: 10,
        maxDelayMs: 250,
        sleep: async (ms) => {
          sleepDelays.push(ms);
        },
        logger: silentLogger,
      });

      expect(callCount).toBe(2);
      expect(summary.upsertedCount).toBe(2);
      expect(sleepDelays).toEqual([250]);
    });

    it('retries Cosmos 16500 and partial bulkWrite errors and succeeds', async () => {
      const csvPath = path.join(tmpDir, 'retry.csv');
      fs.writeFileSync(
        csvPath,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
          '2,GEN,1,2,"Verse two."',
        ].join('\n'),
        'utf8'
      );

      const sleepDelays: number[] = [];
      let callCount = 0;
      const bulkWriteFn = jest.fn(async (ops) => {
        callCount += 1;
        if (callCount === 1) {
          throw Object.assign(new Error('RequestRateTooLarge RetryAfterMs=35'), { code: 16500 });
        }
        if (callCount === 2) {
          // Partial bulkWrite failure: op 0 succeeded, op 1 throttled with 429
          throw Object.assign(new Error('Bulk write partial throttle'), {
            result: { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 },
            writeErrors: [{ index: 1, code: 429, errmsg: 'TooManyRequests RetryAfterMs=20' }],
          });
        }
        // Only the 1 failed op should be retried
        expect(ops).toHaveLength(1);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      });

      const summary = await importVerses({
        csvPath,
        batchSize: 10,
        bulkWriteFn,
        maxRetries: 4,
        baseDelayMs: 10,
        sleep: async (ms) => {
          sleepDelays.push(ms);
        },
        logger: silentLogger,
      });

      expect(callCount).toBe(3);
      expect(summary.retries).toBe(2);
      expect(summary.upsertedCount).toBe(2);
      expect(sleepDelays).toEqual([35, 20]);
    });

    it('throws immediately on non-retryable errors and after maxRetries on persistent throttling', async () => {
      const csvPath = path.join(tmpDir, 'fail.csv');
      fs.writeFileSync(
        csvPath,
        [
          'Verse_Order,Book_Name,Chapter_Name,Verse_#,Verse',
          '1,GEN,1,1,"Verse one."',
        ].join('\n'),
        'utf8'
      );

      const nonRetryableFn = jest.fn(async () => {
        throw Object.assign(new Error('Validation error'), { code: 121 });
      });

      await expect(
        importVerses({
          csvPath,
          bulkWriteFn: nonRetryableFn,
          sleep: async () => undefined,
          logger: silentLogger,
        })
      ).rejects.toThrow(/Validation error/);
      expect(nonRetryableFn).toHaveBeenCalledTimes(1);

      const alwaysThrottleFn = jest.fn(async () => {
        throw Object.assign(new Error('RequestRateTooLarge'), { code: 16500 });
      });

      await expect(
        importVerses({
          csvPath,
          bulkWriteFn: alwaysThrottleFn,
          maxRetries: 2,
          baseDelayMs: 5,
          sleep: async () => undefined,
          logger: silentLogger,
        })
      ).rejects.toThrow(/RequestRateTooLarge/);
      expect(alwaysThrottleFn).toHaveBeenCalledTimes(3); // initial + 2 retries

      await expect(
        importVerses({
          csvPath,
          bulkWriteFn: alwaysThrottleFn,
          maxRetries: Number.NaN,
          sleep: async () => undefined,
          logger: silentLogger,
        })
      ).rejects.toThrow(/maxRetries must be a finite non-negative number/);
    });
  });
});
