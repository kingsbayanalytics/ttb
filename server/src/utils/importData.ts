import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import type { AnyBulkWriteOperation, BulkWriteOptions, BulkWriteResult } from 'mongodb';
import { config } from '../config';
import { Verse } from '../models';
import { IVerse } from '../models/Verse';
import { mapUsfmBookCode } from './bookMapping';
import {
  RetryOptions,
  isRetryableWriteError,
  extractRetryAfterMs,
  executeBatchWithRetry,
} from './cosmosBulk';

export { RetryOptions, isRetryableWriteError, extractRetryAfterMs };

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
