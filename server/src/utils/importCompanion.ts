import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongodb';
import { config } from '../config';
import CompanionEntry, {
  COMPANION_ENTRY_TYPES,
  COMPANION_LENSES,
  COMPANION_STATUSES,
  COMPANION_VISIBILITIES,
  CompanionEntryType,
  CompanionLens,
  CompanionStatus,
  CompanionVisibility,
  HTTPS_URL_REGEX,
  ICompanionDailyScheduleSlot,
  ICompanionEntry,
  ICompanionIndexPurpose,
  ICompanionPurpose,
  ICompanionSource,
  buildCompanionUpsertKey,
} from '../models/CompanionEntry';
import { isCanonicalBook } from './bookMapping';
import {
  DEFAULT_WORK_ID,
  getCanonicalChapterCount,
  isValidCanonicalChapter,
  resolveSectionKeyForWork,
} from './companionWorks';
import {
  BulkWriteLikeFn,
  RetryOptions,
  executeBatchWithRetry,
} from './cosmosBulk';
import { validateCommunityEntry } from './communityBundleValidator';

export const DEFAULT_COMPANION_BATCH_SIZE = 50;
export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const PRIVATE_SOURCES_DIR = path.resolve(REPO_ROOT, 'data/private-sources');

const LENS_ALIASES: Readonly<Record<string, CompanionLens>> = {
  'hoodoo-folk': 'hoodoo-folk',
  hoodoo_folk: 'hoodoo-folk',
  'historical-classic': 'historical-classic',
  historical_classic: 'historical-classic',
  community: 'community',
  'community-notes': 'community',
  community_notes: 'community',
  'community-reddit': 'community',
  community_reddit: 'community',
  'personal-note': 'personal-note',
  personal_note: 'personal-note',
};

export interface RawCompanionBundle {
  schemaVersion?: string;
  profile?: string;
  workId?: string;
  visibility?: string;
  source?: Partial<ICompanionSource>;
  entryCount?: number;
  entries?: Record<string, any>[];
}

export interface CompanionBundleStats {
  totalInBundle: number;
  importedCount: number;
  skippedDrafts: number;
  byEntryType: Record<string, number>;
  byLens: Record<string, number>;
  byVisibility: Record<string, number>;
  byBook: Record<string, number>;
  purposesCount: number;
  indexPurposesCount: number;
  dailyScheduleCount: number;
  ps119OctavesCount: number;
}

export interface ImportCompanionOptions extends RetryOptions {
  filePath?: string;
  bundle?: RawCompanionBundle;
  dryRun?: boolean;
  batchSize?: number;
  includeDrafts?: boolean;
  archiveMissingForSource?: string;
  allowNonstandardPrivatePath?: boolean;
  repoRoot?: string;
  bulkWriteFn?: BulkWriteLikeFn<ICompanionEntry>;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export interface ImportCompanionSummary {
  dryRun: boolean;
  stats: CompanionBundleStats;
  batches: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  archivedCount: number;
  retries: number;
  durationMs: number;
}

export interface PruneCompanionResult {
  sourceId: string;
  deletedCount: number;
}

export function slugifySourceId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new Error(`Cannot derive non-empty sourceId from "${value}"`);
  }
  return slug;
}

export function normalizeLens(raw: unknown): CompanionLens {
  if (typeof raw !== 'string') {
    throw new Error(`Invalid lens value: "${String(raw)}"`);
  }
  const normalized = LENS_ALIASES[raw.trim().toLowerCase()];
  if (!normalized || !COMPANION_LENSES.includes(normalized)) {
    throw new Error(`Unsupported companion lens: "${raw}"`);
  }
  return normalized;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function computeContentHash(doc: Omit<ICompanionEntry, 'contentHash' | 'createdAt' | 'updatedAt'>): string {
  return crypto.createHash('sha256').update(stableStringify(doc)).digest('hex');
}

function dedupeStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

function isPathInsideDir(targetPath: string, parentDir: string): boolean {
  const rel = path.relative(path.resolve(parentDir), path.resolve(targetPath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function assertPrivatePathSafety(
  filePath: string,
  entries: Pick<ICompanionEntry, 'visibility'>[],
  options: { allowNonstandardPrivatePath?: boolean; repoRoot?: string } = {}
): void {
  if (options.allowNonstandardPrivatePath) {
    return;
  }
  const hasPrivate = entries.some((e) => e.visibility === 'private-owner');
  if (!hasPrivate) {
    return;
  }

  const repoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);
  const privateDir = path.resolve(repoRoot, 'data/private-sources');
  const resolvedFile = path.resolve(filePath);

  if (isPathInsideDir(resolvedFile, repoRoot) && !isPathInsideDir(resolvedFile, privateDir)) {
    throw new Error(
      `Refusing to import visibility="private-owner" bundle from tracked repository path "${resolvedFile}". ` +
        `Move private bundles under "data/private-sources/" or pass --allow-nonstandard-private-path explicitly.`
    );
  }
}

export function validateAndNormalizeBundle(
  bundle: RawCompanionBundle,
  options: { includeDrafts?: boolean } = {}
): { entries: ICompanionEntry[]; stats: CompanionBundleStats } {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('Companion bundle must be a JSON object');
  }
  if (!Array.isArray(bundle.entries)) {
    throw new Error('Companion bundle must contain an "entries" array');
  }
  if (bundle.schemaVersion && bundle.schemaVersion !== '1.0') {
    throw new Error(`Unsupported companion bundle schemaVersion: "${bundle.schemaVersion}"`);
  }

  const includeDrafts = options.includeDrafts ?? false;
  const bundleWorkId =
    typeof bundle.workId === 'string' && bundle.workId.trim()
      ? bundle.workId.trim()
      : DEFAULT_WORK_ID;
  const bundleVisibility = bundle.visibility;
  const bundleProfile =
    typeof bundle.profile === 'string' && bundle.profile.trim()
      ? bundle.profile.trim()
      : undefined;
  const bundleSource = bundle.source && typeof bundle.source === 'object' ? bundle.source : {};

  const normalizedEntries: ICompanionEntry[] = [];
  const seenUpsertKeys = new Set<string>();
  const errors: string[] = [];

  const stats: CompanionBundleStats = {
    totalInBundle: bundle.entries.length,
    importedCount: 0,
    skippedDrafts: 0,
    byEntryType: {},
    byLens: {},
    byVisibility: {},
    byBook: {},
    purposesCount: 0,
    indexPurposesCount: 0,
    dailyScheduleCount: 0,
    ps119OctavesCount: 0,
  };

  bundle.entries.forEach((raw, idx) => {
    const label = `entries[${idx}]`;
    try {
      if (!raw || typeof raw !== 'object') {
        throw new Error(`${label}: entry must be an object`);
      }

      const rawStatus = (raw.status ?? 'published') as CompanionStatus;
      if (!COMPANION_STATUSES.includes(rawStatus)) {
        throw new Error(`${label}: invalid status "${String(rawStatus)}"`);
      }
      if (rawStatus === 'draft' && !includeDrafts) {
        stats.skippedDrafts += 1;
        return;
      }

      const workId =
        typeof raw.workId === 'string' && raw.workId.trim()
          ? raw.workId.trim()
          : bundleWorkId;

      const book = typeof raw.book === 'string' ? raw.book.trim() : '';
      if (!book) {
        throw new Error(`${label}: "book" is required`);
      }

      const entryType = raw.entryType as CompanionEntryType;
      if (!COMPANION_ENTRY_TYPES.includes(entryType)) {
        throw new Error(`${label}: invalid entryType "${String(raw.entryType)}"`);
      }

      const chapter: number | null =
        raw.chapter === undefined || raw.chapter === null ? null : Number(raw.chapter);

      if (entryType === 'chapter-companion') {
        if (chapter === null || !Number.isInteger(chapter) || chapter < 1) {
          throw new Error(
            `${label}: chapter must be a positive integer for entryType "chapter-companion", got "${String(raw.chapter)}"`
          );
        }
      } else if (chapter !== null) {
        throw new Error(
          `${label}: chapter must be null for entryType "${entryType}", got "${String(raw.chapter)}"`
        );
      }

      if (workId === DEFAULT_WORK_ID) {
        if (!isCanonicalBook(book)) {
          throw new Error(`${label}: unknown canonical WEB book "${book}"`);
        }
        if (chapter !== null && !isValidCanonicalChapter(book, chapter)) {
          const maxCh = getCanonicalChapterCount(book);
          throw new Error(
            `${label}: chapter ${chapter} is out of canonical range for "${book}" (1..${maxCh})`
          );
        }
      }

      const sectionKey = resolveSectionKeyForWork(workId, book, raw.sectionKey);
      const lens = normalizeLens(raw.lens);

      const visibility = (raw.visibility ?? bundleVisibility) as CompanionVisibility;
      if (!COMPANION_VISIBILITIES.includes(visibility)) {
        throw new Error(`${label}: invalid visibility "${String(visibility)}"`);
      }

      const sortOrder = raw.sortOrder === undefined ? 0 : Number(raw.sortOrder);
      if (!Number.isInteger(sortOrder)) {
        throw new Error(`${label}: sortOrder must be an integer, got "${String(raw.sortOrder)}"`);
      }

      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      if (!title) {
        throw new Error(`${label}: non-empty "title" is required`);
      }

      const summary = typeof raw.summary === 'string' ? raw.summary : '';
      const body = typeof raw.body === 'string' ? raw.body : '';

      const mergedSourceRaw = {
        ...bundleSource,
        ...(raw.source && typeof raw.source === 'object' ? raw.source : {}),
      } as Record<string, any>;

      const sourceTitle =
        typeof mergedSourceRaw.title === 'string' && mergedSourceRaw.title.trim()
          ? mergedSourceRaw.title.trim()
          : '';
      if (!sourceTitle) {
        throw new Error(`${label}: source.title is required`);
      }

      const sourceIdRaw =
        (typeof mergedSourceRaw.sourceId === 'string' && mergedSourceRaw.sourceId.trim()) ||
        bundleProfile ||
        slugifySourceId(sourceTitle);

      let retrievedAt: Date | undefined;
      if (mergedSourceRaw.retrievedAt !== undefined && mergedSourceRaw.retrievedAt !== null) {
        const d =
          mergedSourceRaw.retrievedAt instanceof Date
            ? mergedSourceRaw.retrievedAt
            : new Date(String(mergedSourceRaw.retrievedAt));
        if (Number.isNaN(d.getTime())) {
          throw new Error(
            `${label}: invalid source.retrievedAt "${String(mergedSourceRaw.retrievedAt)}"`
          );
        }
        retrievedAt = d;
      }

      const source: ICompanionSource = {
        sourceId: sourceIdRaw,
        title: sourceTitle,
        ...(mergedSourceRaw.author ? { author: String(mergedSourceRaw.author).trim() } : {}),
        ...(typeof mergedSourceRaw.year === 'number' ? { year: mergedSourceRaw.year } : {}),
        ...(mergedSourceRaw.publisher
          ? { publisher: String(mergedSourceRaw.publisher).trim() }
          : {}),
        ...(mergedSourceRaw.isbn ? { isbn: String(mergedSourceRaw.isbn).trim() } : {}),
        ...(mergedSourceRaw.edition ? { edition: String(mergedSourceRaw.edition).trim() } : {}),
        ...(Array.isArray(mergedSourceRaw.pages)
          ? {
              pages: mergedSourceRaw.pages
                .map((p: any) => Number(p))
                .filter((p: number) => Number.isFinite(p)),
            }
          : {}),
        ...(mergedSourceRaw.numberingSystem
          ? { numberingSystem: mergedSourceRaw.numberingSystem }
          : {}),
        ...(mergedSourceRaw.originalRef
          ? { originalRef: String(mergedSourceRaw.originalRef).trim() }
          : {}),
        ...(mergedSourceRaw.license ? { license: mergedSourceRaw.license } : {}),
        ...(mergedSourceRaw.subreddit
          ? { subreddit: String(mergedSourceRaw.subreddit).trim() }
          : {}),
        ...(mergedSourceRaw.authorHandle
          ? { authorHandle: String(mergedSourceRaw.authorHandle).trim() }
          : {}),
        ...(retrievedAt ? { retrievedAt } : {}),
      };

      let externalUrl: string | undefined;
      if (raw.externalUrl !== undefined && raw.externalUrl !== null && raw.externalUrl !== '') {
        if (typeof raw.externalUrl !== 'string' || !HTTPS_URL_REGEX.test(raw.externalUrl.trim())) {
          throw new Error(`${label}: externalUrl must start with https://`);
        }
        externalUrl = raw.externalUrl.trim();
      }

      let quoteExcerpt: string | undefined;
      if (raw.quoteExcerpt !== undefined && raw.quoteExcerpt !== null) {
        if (typeof raw.quoteExcerpt !== 'string') {
          throw new Error(`${label}: quoteExcerpt must be a string`);
        }
        if (raw.quoteExcerpt.length > 400) {
          throw new Error(`${label}: quoteExcerpt exceeds 400 characters`);
        }
        quoteExcerpt = raw.quoteExcerpt;
      }

      if (lens === 'community') {
        const communityIssues = validateCommunityEntry(
          {
            ...raw,
            lens,
            visibility,
            title,
            summary,
            body,
            quoteExcerpt,
            externalUrl,
            source,
          },
          idx
        );
        if (communityIssues.length > 0) {
          throw new Error(
            `${label}: community validation failed: ${communityIssues
              .map((i) => `${i.field}: ${i.message}`)
              .join('; ')}`
          );
        }
      }

      const purposes: ICompanionPurpose[] = Array.isArray(raw.purposes)
        ? raw.purposes.map((p: any, pIdx: number) => {
            if (!p || typeof p !== 'object') {
              throw new Error(`${label}.purposes[${pIdx}]: must be an object`);
            }
            const pTitle = typeof p.title === 'string' ? p.title.trim() : '';
            const pBody = typeof p.body === 'string' ? p.body : '';
            if (!pTitle || !pBody) {
              throw new Error(`${label}.purposes[${pIdx}]: requires title and body`);
            }
            return {
              title: pTitle,
              body: pBody,
              ...(typeof p.page === 'number' ? { page: p.page } : {}),
              citedVerses: dedupeStrings(Array.isArray(p.citedVerses) ? p.citedVerses : []),
              ritualTags: dedupeStrings(Array.isArray(p.ritualTags) ? p.ritualTags : []),
              ...(typeof p.octave === 'string' && p.octave.trim()
                ? { octave: p.octave.trim() }
                : {}),
              ...(typeof p.verseRange === 'string' && p.verseRange.trim()
                ? { verseRange: p.verseRange.trim() }
                : {}),
            };
          })
        : [];

      const indexPurposes: ICompanionIndexPurpose[] = Array.isArray(raw.indexPurposes)
        ? raw.indexPurposes
            .map((ip: any, ipIdx: number): ICompanionIndexPurpose | null => {
              if (!ip || typeof ip !== 'object' || typeof ip.purpose !== 'string') {
                throw new Error(`${label}.indexPurposes[${ipIdx}]: requires string purpose`);
              }
              const trimmedPurpose = ip.purpose.trim();
              if (!trimmedPurpose) {
                return null;
              }
              return {
                purpose: trimmedPurpose,
                source:
                  typeof ip.source === 'string' && ip.source.trim()
                    ? ip.source.trim()
                    : 'powers-index',
                verseRange:
                  ip.verseRange === undefined || ip.verseRange === null
                    ? null
                    : String(ip.verseRange).trim(),
              };
            })
            .filter((ip): ip is ICompanionIndexPurpose => ip !== null)
        : [];

      const dailySchedule: ICompanionDailyScheduleSlot[] = Array.isArray(raw.dailySchedule)
        ? raw.dailySchedule.map((ds: any, dsIdx: number) => {
            if (!ds || typeof ds !== 'object' || typeof ds.slot !== 'string' || !ds.slot.trim()) {
              throw new Error(`${label}.dailySchedule[${dsIdx}]: requires slot`);
            }
            const psalmNum = Number(ds.psalm ?? ds.chapter);
            if (!Number.isInteger(psalmNum) || psalmNum < 1 || psalmNum > 150) {
              throw new Error(
                `${label}.dailySchedule[${dsIdx}]: invalid psalm number "${String(ds.psalm)}"`
              );
            }
            return {
              slot: ds.slot.trim(),
              psalm: psalmNum,
              book: typeof ds.book === 'string' && ds.book.trim() ? ds.book.trim() : 'Psalms',
              chapter: Number.isInteger(Number(ds.chapter)) ? Number(ds.chapter) : psalmNum,
            };
          })
        : [];

      const ritualTags = dedupeStrings([
        ...(Array.isArray(raw.ritualTags) ? raw.ritualTags : []),
        ...purposes.flatMap((p) => p.ritualTags),
      ]);

      const citedVerses = dedupeStrings([
        ...(Array.isArray(raw.citedVerses) ? raw.citedVerses : []),
        ...purposes.flatMap((p) => p.citedVerses),
      ]);

      const upsertKey = buildCompanionUpsertKey({
        workId,
        book,
        chapter,
        entryType,
        lens,
        sourceId: source.sourceId,
        sortOrder,
      });

      if (seenUpsertKeys.has(upsertKey)) {
        throw new Error(`${label}: duplicate upsertKey within bundle: "${upsertKey}"`);
      }
      seenUpsertKeys.add(upsertKey);

      const coreDoc: Omit<ICompanionEntry, 'contentHash' | 'createdAt' | 'updatedAt'> = {
        upsertKey,
        workId,
        sectionKey,
        book,
        chapter,
        entryType,
        lens,
        visibility,
        status: rawStatus,
        sortOrder,
        title,
        summary,
        body,
        ...(quoteExcerpt !== undefined ? { quoteExcerpt } : {}),
        purposes,
        indexPurposes,
        ritualTags,
        citedVerses,
        dailySchedule,
        source,
        ...(externalUrl !== undefined ? { externalUrl } : {}),
      };

      const contentHash = computeContentHash(coreDoc);
      const doc: ICompanionEntry = { ...coreDoc, contentHash };

      normalizedEntries.push(doc);

      stats.importedCount += 1;
      stats.byEntryType[entryType] = (stats.byEntryType[entryType] ?? 0) + 1;
      stats.byLens[lens] = (stats.byLens[lens] ?? 0) + 1;
      stats.byVisibility[visibility] = (stats.byVisibility[visibility] ?? 0) + 1;
      stats.byBook[book] = (stats.byBook[book] ?? 0) + 1;
      stats.purposesCount += purposes.length;
      stats.indexPurposesCount += indexPurposes.length;
      stats.dailyScheduleCount += dailySchedule.length;
      if (book === 'Psalms' && chapter === 119) {
        stats.ps119OctavesCount += purposes.filter((p) => Boolean(p.octave)).length;
      }
    } catch (err: any) {
      errors.push(err.message);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Companion bundle validation failed with ${errors.length} error(s):\n- ${errors
        .slice(0, 20)
        .join('\n- ')}`
    );
  }

  return { entries: normalizedEntries, stats };
}

export function buildCompanionUpsertOperations(
  entries: ICompanionEntry[],
  timestamp: Date = new Date()
): AnyBulkWriteOperation<ICompanionEntry>[] {
  return entries.map((entry) => {
    const { upsertKey, ...rest } = entry;
    return {
      updateOne: {
        filter: { upsertKey },
        update: {
          $set: {
            ...rest,
            updatedAt: timestamp,
          },
          $setOnInsert: {
            upsertKey,
            createdAt: timestamp,
          },
        },
        upsert: true,
      },
    };
  });
}

export async function pruneCompanionSource(
  sourceId: string,
  logger: Pick<Console, 'log' | 'warn' | 'error'> = console
): Promise<PruneCompanionResult> {
  const trimmed = sourceId.trim();
  if (!trimmed) {
    throw new Error('sourceId must be a non-empty string');
  }
  const res = await CompanionEntry.deleteMany({ 'source.sourceId': trimmed });
  const deletedCount = res.deletedCount ?? 0;
  logger.log(`Pruned ${deletedCount} companion entries for sourceId="${trimmed}"`);
  return { sourceId: trimmed, deletedCount };
}

export async function importCompanionBundle(
  options: ImportCompanionOptions
): Promise<ImportCompanionSummary> {
  const startedAt = Date.now();
  const logger = options.logger ?? console;
  const batchSize = options.batchSize ?? DEFAULT_COMPANION_BATCH_SIZE;
  const dryRun = options.dryRun ?? false;

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error(`batchSize must be a positive integer, got ${batchSize}`);
  }

  let bundle: RawCompanionBundle;
  if (options.bundle) {
    bundle = options.bundle;
  } else if (options.filePath) {
    const resolved = path.resolve(options.filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Companion bundle file not found: ${resolved}`);
    }
    const rawText = fs.readFileSync(resolved, 'utf8');
    try {
      bundle = JSON.parse(rawText) as RawCompanionBundle;
    } catch (err: any) {
      throw new Error(`Failed to parse JSON in ${resolved}: ${err.message}`);
    }
  } else {
    throw new Error('Either filePath or bundle must be provided');
  }

  const { entries, stats } = validateAndNormalizeBundle(bundle, {
    includeDrafts: options.includeDrafts,
  });

  if (options.filePath) {
    assertPrivatePathSafety(options.filePath, entries, {
      allowNonstandardPrivatePath: options.allowNonstandardPrivatePath,
      repoRoot: options.repoRoot,
    });
  }

  if (dryRun) {
    const durationMs = Date.now() - startedAt;
    logger.log(
      `[DRY-RUN] Validated ${stats.importedCount}/${stats.totalInBundle} companion entries in ${durationMs}ms ` +
        `(skippedDrafts=${stats.skippedDrafts}, entryTypes=${JSON.stringify(stats.byEntryType)}, ` +
        `lenses=${JSON.stringify(stats.byLens)}, visibility=${JSON.stringify(stats.byVisibility)}, ` +
        `books=${JSON.stringify(stats.byBook)}, purposes=${stats.purposesCount}, ` +
        `indexPurposes=${stats.indexPurposesCount}, dailySchedule=${stats.dailyScheduleCount}, ` +
        `ps119Octaves=${stats.ps119OctavesCount})`
    );
    return {
      dryRun: true,
      stats,
      batches: 0,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      archivedCount: 0,
      retries: 0,
      durationMs,
    };
  }

  const bulkWriteFn: BulkWriteLikeFn<ICompanionEntry> =
    options.bulkWriteFn ??
    ((ops, writeOpts) => CompanionEntry.collection.bulkWrite(ops as any, writeOpts));

  const totalBatches = Math.ceil(entries.length / batchSize);
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  let retries = 0;
  const timestamp = new Date();

  for (let i = 0; i < entries.length; i += batchSize) {
    const slice = entries.slice(i, i + batchSize);
    const ops = buildCompanionUpsertOperations(slice, timestamp);
    const batchRes = await executeBatchWithRetry(ops, bulkWriteFn, options, logger);

    matchedCount += batchRes.matchedCount;
    modifiedCount += batchRes.modifiedCount;
    upsertedCount += batchRes.upsertedCount;
    retries += batchRes.retries;

    const batchNum = Math.floor(i / batchSize) + 1;
    logger.log(
      `Processed companion batch ${batchNum}/${totalBatches} (upserted=${upsertedCount}, matched=${matchedCount}, modified=${modifiedCount})`
    );
  }

  let archivedCount = 0;
  if (options.archiveMissingForSource) {
    const sourceId = options.archiveMissingForSource.trim();
    if (!sourceId) {
      throw new Error('--archive-missing-for-source requires a non-empty sourceId');
    }
    const importedKeys = entries
      .filter((e) => e.source.sourceId === sourceId)
      .map((e) => e.upsertKey);
    const archiveRes = await CompanionEntry.updateMany(
      {
        'source.sourceId': sourceId,
        status: { $ne: 'archived' },
        upsertKey: { $nin: importedKeys },
      },
      {
        $set: { status: 'archived', updatedAt: new Date() },
      }
    );
    archivedCount = archiveRes.modifiedCount ?? 0;
    logger.log(
      `Archived ${archivedCount} missing companion entries for sourceId="${sourceId}"`
    );
  }

  const durationMs = Date.now() - startedAt;
  logger.log(
    `Companion import complete in ${durationMs}ms: total=${entries.length}, upserted=${upsertedCount}, matched=${matchedCount}, modified=${modifiedCount}, archived=${archivedCount}, retries=${retries}`
  );

  return {
    dryRun: false,
    stats,
    batches: totalBatches,
    matchedCount,
    modifiedCount,
    upsertedCount,
    archivedCount,
    retries,
    durationMs,
  };
}

export interface ParsedCliArgs {
  file?: string;
  dryRun: boolean;
  batchSize: number;
  includeDrafts: boolean;
  pruneSource?: string;
  archiveMissingForSource?: string;
  allowNonstandardPrivatePath: boolean;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const parsed: ParsedCliArgs = {
    dryRun: false,
    batchSize: DEFAULT_COMPANION_BATCH_SIZE,
    includeDrafts: false,
    allowNonstandardPrivatePath: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      parsed.file = argv[++i];
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--batch-size') {
      const val = Number(argv[++i]);
      if (!Number.isInteger(val) || val <= 0) {
        throw new Error(`Invalid --batch-size value: "${argv[i]}"`);
      }
      parsed.batchSize = val;
    } else if (arg === '--include-drafts') {
      parsed.includeDrafts = true;
    } else if (arg === '--prune-source') {
      parsed.pruneSource = argv[++i];
    } else if (arg === '--archive-missing-for-source') {
      parsed.archiveMissingForSource = argv[++i];
    } else if (arg === '--allow-nonstandard-private-path') {
      parsed.allowNonstandardPrivatePath = true;
    } else {
      throw new Error(`Unknown CLI argument: "${arg}"`);
    }
  }

  return parsed;
}

async function runCli(): Promise<void> {
  let args: ParsedCliArgs;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err: any) {
    console.error(`CLI argument error: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  if (!args.file && !args.pruneSource) {
    console.error(
      'Usage: npm run import-companion -- --file <bundle.json> [--dry-run] [--batch-size 50] [--include-drafts] [--archive-missing-for-source <sourceId>] [--allow-nonstandard-private-path]\n' +
        '   or: npm run import-companion -- --prune-source <sourceId>'
    );
    process.exitCode = 1;
    return;
  }

  if (args.dryRun && args.file && !args.pruneSource) {
    try {
      await importCompanionBundle({
        filePath: args.file,
        dryRun: true,
        batchSize: args.batchSize,
        includeDrafts: args.includeDrafts,
        allowNonstandardPrivatePath: args.allowNonstandardPrivatePath,
      });
    } catch (err: any) {
      console.error(`Companion dry-run failed: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  const uri = config.mongodbUri;
  if (!uri) {
    console.error('Error importing companion entries: MONGODB_URI is required');
    process.exitCode = 1;
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await CompanionEntry.createIndexes();

    if (args.pruneSource) {
      await pruneCompanionSource(args.pruneSource);
    }

    if (args.file) {
      await importCompanionBundle({
        filePath: args.file,
        dryRun: args.dryRun,
        batchSize: args.batchSize,
        includeDrafts: args.includeDrafts,
        archiveMissingForSource: args.archiveMissingForSource,
        allowNonstandardPrivatePath: args.allowNonstandardPrivatePath,
      });
    }
  } catch (error: any) {
    console.error(`Error importing companion entries: ${error.message}`);
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
