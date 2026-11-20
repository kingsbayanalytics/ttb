import type {
  AnyBulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  Document,
} from 'mongodb';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export type BulkWriteLikeFn<TDoc extends Document = Document> = (
  ops: AnyBulkWriteOperation<TDoc>[],
  options: BulkWriteOptions
) => Promise<Pick<BulkWriteResult, 'matchedCount' | 'modifiedCount' | 'upsertedCount'>>;

export interface BulkBatchResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  retries: number;
}

export const RETRYABLE_ERROR_CODES = new Set<number>([
  16500, // Azure Cosmos DB RequestRateTooLarge
  429, // HTTP/rate limit
  50, // MaxTimeMSExpired
  91, // ShutdownInProgress
  189, // PrimarySteppedDown
  10107, // NotWritablePrimary
  11600, // InterruptedAtShutdown
  11602, // InterruptedDueToReplStateChange
  13435, // NotPrimaryNoSecondaryOk
  13436, // NotPrimaryOrSecondary
]);

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

export async function executeBatchWithRetry<TDoc extends Document>(
  ops: AnyBulkWriteOperation<TDoc>[],
  bulkWriteFn: BulkWriteLikeFn<TDoc>,
  options: RetryOptions = {},
  logger: Pick<Console, 'log' | 'warn' | 'error'> = console
): Promise<BulkBatchResult> {
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

      let narrowedOps: AnyBulkWriteOperation<TDoc>[] | undefined;
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
