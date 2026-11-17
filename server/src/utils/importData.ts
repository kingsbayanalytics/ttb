import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import type { AnyBulkWriteOperation, BulkWriteOptions, BulkWriteResult } from 'mongodb';
import { config } from '../config';
import { Verse } from '../models';
import { IVerse } from '../models/Verse';
import { mapUsfmBookCode } from './bookMapping';

export const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../data/WEB_Catholic_Version_for_game_updated.csv'
);

export interface CsvVerseRow {
  Verse_Order?: string;
  Book_Name?: string;
  Chapter_Name?: string;
  'Verse_#'?: string;
  Verse?: string;
  [key: string]: string | undefined;
}

export interface ParsedVerse {
  verseOrder: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  characters: number;
  words: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface ImportVersesOptions extends RetryOptions {
  csvPath?: string;
  batchSize?: number;
  bulkWriteFn?: (
    ops: AnyBulkWriteOperation<IVerse>[],
    options: BulkWriteOptions
  ) => Promise<Pick<BulkWriteResult, 'matchedCount' | 'modifiedCount' | 'upsertedCount'>>;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export interface ImportSummary {
  totalRows: number;
  batches: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  retries: number;
  durationMs: number;
}

const RETRYABLE_ERROR_CODES = new Set<number>([
  16500, // Azure Cosmos DB RequestRateTooLarge
  429,   // HTTP/rate limit
  50,    // MaxTimeMSExpired
  91,    // ShutdownInProgress
  189,   // PrimarySteppedDown
  10107, // NotWritablePrimary
  11600, // InterruptedAtShutdown
  11602, // InterruptedDueToReplStateChange
  13435, // NotPrimaryNoSecondaryOk
  13436, // NotPrimaryOrSecondary
]);

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function parsePositiveInt(raw: string | undefined, fieldName: string, rowNumber: number): number {
  const trimmed = (raw ?? '').trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid ${fieldName} at CSV row ${rowNumber}: "${raw ?? ''}"`);
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Out-of-range ${fieldName} at CSV row ${rowNumber}: "${raw ?? ''}"`);
  }
  return value;
}

export function parseCsvRow(row: CsvVerseRow, rowNumber: number): ParsedVerse {
  const verseOrder = parsePositiveInt(row.Verse_Order, 'Verse_Order', rowNumber);
  const chapter = parsePositiveInt(row.Chapter_Name, 'Chapter_Name', rowNumber);
  const verse = parsePositiveInt(row['Verse_#'], 'Verse_#', rowNumber);

  let book: string;
  try {
    book = mapUsfmBookCode(row.Book_Name);
  } catch (err: any) {
    throw new Error(`Invalid Book_Name at CSV row ${rowNumber}: ${err.message}`);
  }

  const text = row.Verse ?? '';
  if (text.trim().length === 0) {
    throw new Error(`Empty Verse text at CSV row ${rowNumber}`);
  }

  return {
    verseOrder,
    book,
    chapter,
    verse,
    text,
    characters: text.length,
    words: text.trim().split(/\s+/).filter(Boolean).length,
  };
}

export async function loadVersesFromCsv(csvPath: string = DEFAULT_CSV_PATH): Promise<ParsedVerse[]> {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const verses: ParsedVerse[] = [];
  const seenOrders = new Set<number>();
  const seenLocations = new Set<string>();

  await new Promise<void>((resolve, reject) => {
    let rowNumber = 1; // 1 = header row; first data row becomes 2
    let aborted = false;

    const readStream = fs.createReadStream(csvPath);
    const stream = readStream.pipe(
      csv({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
      })
    );

    readStream.on('error', (err) => {
      if (aborted) return;
      aborted = true;
      stream.destroy();
      reject(err);
    });

    stream.on('data', (row: CsvVerseRow) => {
      if (aborted) return;
      rowNumber += 1;
      try {
        const parsed = parseCsvRow(row, rowNumber);
        if (seenOrders.has(parsed.verseOrder)) {
          throw new Error(`Duplicate Verse_Order ${parsed.verseOrder} at CSV row ${rowNumber}`);
        }
        const locationKey = `${parsed.book}:${parsed.chapter}:${parsed.verse}`;
        if (seenLocations.has(locationKey)) {
          throw new Error(
            `Duplicate (book, chapter, verse) ${parsed.book} ${parsed.chapter}:${parsed.verse} at CSV row ${rowNumber}`
          );
        }
        seenOrders.add(parsed.verseOrder);
        seenLocations.add(locationKey);
        verses.push(parsed);
      } catch (err) {
        aborted = true;
        readStream.destroy();
        stream.destroy();
        reject(err);
      }
    });

    stream.on('error', (err) => {
      if (aborted) return;
      aborted = true;
      readStream.destroy();
      reject(err);
    });
    stream.on('end', () => {
      if (!aborted) {
        resolve();
      }
    });
  });

  if (verses.length === 0) {
    throw new Error(`CSV file contains no verse rows: ${csvPath}`);
  }

  return verses;
}

function getNumericCode(err: any): number | undefined {
  if (typeof err?.code === 'number') return err.code;
  if (typeof err?.code === 'string' && /^\d+$/.test(err.code)) return Number(err.code);
  if (typeof err?.status === 'number') return err.status;
  return undefined;
}

function isRetryableMessage(msg: string | undefined): boolean {
  if (!msg) return false;
  return /16500|429|TooManyRequests|RequestRateTooLarge|RetryAfterMs/i.test(msg);
}

export function isRetryableWriteError(error: any): boolean {
  if (!error) return false;

  const writeErrors: any[] | undefined = error.writeErrors;
  if (Array.isArray(writeErrors) && writeErrors.length > 0) {
    return writeErrors.every(
      (we) =>
        (getNumericCode(we) !== undefined && RETRYABLE_ERROR_CODES.has(getNumericCode(we)!)) ||
        isRetryableMessage(we.errmsg || we.message)
    );
  }

  const code = getNumericCode(error);
  if (code !== undefined && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  if (Array.isArray(error.errorLabels) && error.errorLabels.includes('RetryableWriteError')) {
    return true;
  }
  if (typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('RetryableWriteError')) {
    return true;
  }

  if (isRetryableMessage(error.message) || isRetryableMessage(error.errmsg)) {
    return true;
  }

  return false;
}

export function extractRetryAfterMs(error: any): number | undefined {
  let maxRetryAfterMs: number | undefined;
  const record = (value: number) => {
    if (maxRetryAfterMs === undefined || value > maxRetryAfterMs) {
      maxRetryAfterMs = value;
    }
  };

  if (typeof error?.retryAfterMs === 'number' && error.retryAfterMs >= 0) {
    record(error.retryAfterMs);
  }

  const candidates: string[] = [];
  if (typeof error?.message === 'string') candidates.push(error.message);
  if (typeof error?.errmsg === 'string') candidates.push(error.errmsg);
  if (Array.isArray(error?.writeErrors)) {
    for (const we of error.writeErrors) {
      if (typeof we?.retryAfterMs === 'number' && we.retryAfterMs >= 0) {
        record(we.retryAfterMs);
      }
      if (typeof we?.errmsg === 'string') candidates.push(we.errmsg);
      if (typeof we?.message === 'string') candidates.push(we.message);
    }
  }

  for (const text of candidates) {
    for (const match of text.matchAll(/RetryAfterMs[=:\s]+(\d+)/gi)) {
      record(Number(match[1]));
    }
  }

  return maxRetryAfterMs;
}

export function buildUpsertOperations(
  verses: ParsedVerse[],
  timestamp: Date = new Date()
): AnyBulkWriteOperation<IVerse>[] {
  return verses.map((verse) => ({
    updateOne: {
      filter: { verseOrder: verse.verseOrder },
      update: {
        $set: {
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
          characters: verse.characters,
          words: verse.words,
        },
        $setOnInsert: {
          verseOrder: verse.verseOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      upsert: true,
    },
  }));
}

async function executeBatchWithRetry(
  ops: AnyBulkWriteOperation<IVerse>[],
  bulkWriteFn: NonNullable<ImportVersesOptions['bulkWriteFn']>,
  options: RetryOptions,
  logger: Pick<Console, 'log' | 'warn' | 'error'>
): Promise<{
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  retries: number;
}> {
  const maxRetries = options.maxRetries ?? 6;
  if (!Number.isFinite(maxRetries) || maxRetries < 0) {
    throw new Error(`maxRetries must be a finite non-negative number, got ${options.maxRetries}`);
  }
  const baseDelayMs = options.baseDelayMs ?? 150;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const sleep = options.sleep ?? defaultSleep;

  let currentOps = ops;
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  let retries = 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const res = await bulkWriteFn(currentOps, { ordered: false });
      matchedCount += res.matchedCount ?? 0;
      modifiedCount += res.modifiedCount ?? 0;
      upsertedCount += res.upsertedCount ?? 0;
      return { matchedCount, modifiedCount, upsertedCount, retries };
    } catch (error: any) {
      if (!isRetryableWriteError(error) || attempt >= maxRetries) {
        throw error;
      }

      let narrowedOps: AnyBulkWriteOperation<IVerse>[] | undefined;
      if (Array.isArray(error?.writeErrors) && error.writeErrors.length > 0) {
        const failedIndices = new Set<number>(
          error.writeErrors
            .map((we: any) => we.index)
            .filter((idx: unknown): idx is number => typeof idx === 'number')
        );
        if (failedIndices.size > 0) {
          const nextOps = currentOps.filter((_, idx) => failedIndices.has(idx));
          if (nextOps.length > 0 && nextOps.length < currentOps.length) {
            narrowedOps = nextOps;
          }
        }
      }

      // Accumulate partial progress only when failed ops actually narrowed the batch
      if (narrowedOps) {
        if (error?.result) {
          matchedCount += error.result.matchedCount ?? 0;
          modifiedCount += error.result.modifiedCount ?? 0;
          upsertedCount += error.result.upsertedCount ?? 0;
        }
        currentOps = narrowedOps;
      }

      const retryAfterMs = extractRetryAfterMs(error);
      const exponentialMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitterMs = Math.floor(Math.random() * 50);
      const waitMs =
        retryAfterMs !== undefined
          ? Math.min(maxDelayMs, Math.max(retryAfterMs, baseDelayMs))
          : Math.min(maxDelayMs, exponentialMs + jitterMs);

      retries += 1;
      logger.warn(
        `Throttled/transient error on batch (${currentOps.length} ops); retry ${retries}/${maxRetries} after ${waitMs}ms: ${error.message}`
      );
      await sleep(waitMs);
    }
  }
}

export async function importVerses(options: ImportVersesOptions = {}): Promise<ImportSummary> {
  const startedAt = Date.now();
  const csvPath = options.csvPath ?? DEFAULT_CSV_PATH;
  const batchSize = options.batchSize ?? 500;
  const logger = options.logger ?? console;
  const bulkWriteFn: NonNullable<ImportVersesOptions['bulkWriteFn']> =
    options.bulkWriteFn ??
    ((ops, writeOpts) => Verse.collection.bulkWrite(ops as any, writeOpts));

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error(`batchSize must be a positive integer, got ${batchSize}`);
  }

  const verses = await loadVersesFromCsv(csvPath);
  logger.log(`CSV file processed: ${verses.length} verses parsed from ${csvPath}`);

  const totalBatches = Math.ceil(verses.length / batchSize);
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  let retries = 0;
  const timestamp = new Date();

  for (let i = 0; i < verses.length; i += batchSize) {
    const slice = verses.slice(i, i + batchSize);
    const ops = buildUpsertOperations(slice, timestamp);
    const batchResult = await executeBatchWithRetry(ops, bulkWriteFn, options, logger);

    matchedCount += batchResult.matchedCount;
    modifiedCount += batchResult.modifiedCount;
    upsertedCount += batchResult.upsertedCount;
    retries += batchResult.retries;

    const batchNumber = Math.floor(i / batchSize) + 1;
    if (batchNumber === totalBatches || batchNumber % 10 === 0) {
      logger.log(
        `Processed batch ${batchNumber}/${totalBatches} (upserted=${upsertedCount}, matched=${matchedCount}, modified=${modifiedCount})`
      );
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.log(
    `Import complete in ${durationMs}ms: total=${verses.length}, upserted=${upsertedCount}, matched=${matchedCount}, modified=${modifiedCount}, retries=${retries}`
  );

  return {
    totalRows: verses.length,
    batches: totalBatches,
    matchedCount,
    modifiedCount,
    upsertedCount,
    retries,
    durationMs,
  };
}

async function runCli(): Promise<void> {
  const uri = config.mongodbUri;
  if (!uri) {
    console.error('Error importing verses: MONGODB_URI is required');
    process.exitCode = 1;
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await Verse.createIndexes();
    await importVerses();
  } catch (error: any) {
    console.error(`Error importing verses: ${error.message}`);
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
