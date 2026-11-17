---
title: 'Azure data-path spike'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: '1bc461c229048fb1421719496e45f5c95e196e6d'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `server/src/utils/importData.ts` wipes all verses via `deleteMany({})`, uses wrong CSV column names (`Book`, `Chapter`, `Verse`, `Text` instead of `Book_Name`, `Chapter_Name`, `Verse_#`, `Verse`), has no throttling retry, and has never been tested against Azure Cosmos DB for MongoDB (vCore). Epic 2 stats aggregations (`$match/$group/$sort/$project/$lookup`) also have no proven `< 1 s` latency or operator compatibility on Cosmos vCore free tier.

**Approach:** Provision (with owner confirmation) a free-tier Cosmos DB for MongoDB vCore cluster in Azure, fix and harden `importData.ts` to batch-upsert all 35,379 WEB Catholic verses idempotently on `verseOrder` with throttling retry, run a repeatable 10k-Result aggregation benchmark + correctness spike, and record the verdict (plus Node 22 App Service check) in `docs/azure-spike.md`.

## Boundaries & Constraints

**Always:**
- Provision `rg-ttb` in `eastus2` (or `eastus`) with a `Free` tier `Microsoft.DocumentDB/mongoClusters` cluster (`compute.tier: Free`, 32 GB, \$0/mo) in subscription `kba_sub_0` and retain it for Epic 4 with the 35,379 verses loaded.
- Map all 73 USFM `Book_Name` codes in `data/WEB_Catholic_Version_for_game_updated.csv` to canonical full English book names (`GEN` -> `Genesis`, `1CO` -> `1 Corinthians`, etc.).
- Keep `importData.ts` idempotent (`bulkWrite` `updateOne` upsert keyed on `verseOrder`), batched, and resilient to MongoDB/Cosmos throttling (`429`/`16500`/`RetryAfterMs`) without wiping existing verses on re-run.
- Verify all stats aggregation stages (`$match`, `$group`, `$sort`, `$project`, `$lookup`, `$limit`) against 10,000 seeded `Result` docs and compare aggregation results against in-JS ground truth.
- Clean up temporary spike user/results/progress data from the cluster after the benchmark, leaving the 35,379 verses intact (if keeping the cluster) or deleting the spike cluster cleanly if the user chooses.
- Never commit connection strings, passwords, or `.env` files.

**Never:**
- Alter biblical verse text or `Book Chapter:Verse` order from `data/WEB_Catholic_Version_for_game_updated.csv`.
- Use transactions, `$function`, change streams, or server-side JS.
- Commit or push without explicit user instruction.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CSV column & book mapping | `data/WEB_Catholic_Version_for_game_updated.csv` (`35,379` verses, 73 USFM `Book_Name` codes) | Parses `Verse_Order`, `Book_Name` -> canonical English name, `Chapter_Name`, `Verse_#`, `Verse` cleanly | Fails fast on missing file or invalid row |
| Idempotent import | Run `import-data` twice against target DB | Run 1 loads 35,379 verses; run 2 reports 0 inserted/modified (`matched: 35379`) | Retries batch on `16500`/`429` or transient write errors with backoff |
| Stats aggregation spike | 10,000 seeded `Result` + 1,000 `Progress` docs for spike user | `$match/$group/$sort/$project/$lookup/$limit` stages execute without unsupported-operator errors in `< 1000 ms` and match JS totals | Record exact failing stage/error in `docs/azure-spike.md` and propose Atlas fallback |

</frozen-after-approval>

## Code Map

- `data/WEB_Catholic_Version_for_game_updated.csv` -- 35,380 lines (35,379 verses, 73 Catholic canon books using USFM `Book_Name` codes, `Chapter_Name`, `Verse_#`, `Verse`)
- `server/src/utils/importData.ts` -- currently wipes `Verse.deleteMany({})` and reads nonexistent columns (`row.Book`, `row.Chapter`, `row.Verse`, `row.Text`)
- `server/src/models/Verse.ts`, `Result.ts`, `Progress.ts`, `User.ts` -- schemas and indexes used by import and stats aggregations
- `server/package.json` -- `"import-data": "ts-node src/utils/importData.ts"` (add `"spike:db"` script for the benchmark)
- `docs/azure-spike.md` -- new spike verdict document (to be created)
- `_bmad-output/planning-artifacts/architecture/architecture-typing-the-bible-2026-11-16/ARCHITECTURE-SPINE.md` -- update only if Cosmos vCore fails and Atlas fallback is triggered

## Tasks & Acceptance

**Execution:**
- [x] `server/src/utils/importData.ts` (plus unit tests on `mongodb-memory-server`) -- fix CSV column mapping (`Verse_Order`, `Book_Name`, `Chapter_Name`, `Verse_#`, `Verse`), map all 73 USFM book codes cleanly, replace `deleteMany` + `insertMany` with batched `bulkWrite` upserts on `verseOrder` with throttling retry/backoff, and disconnect cleanly -- make `npm run import-data` safe, idempotent, and Cosmos-tolerant
- [x] `server/src/scripts/azureSpike.ts` & `server/package.json` -- build a repeatable spike script (`npm run spike:db`) that ensures indexes, seeds 10,000 `Result` + 1,000 `Progress` docs for a temporary test user, executes trend/activity/coverage aggregation pipelines (`$match/$group/$sort/$project/$lookup/$limit`), verifies outputs against JS calculations, measures wall-clock latency, and cleans up synthetic test data -- prove Cosmos vCore compatibility and `< 1 s` latency
- [x] Azure free-tier vCore cluster + spike run -- provision free-tier `Microsoft.DocumentDB/mongoClusters` (per Open Question answer), allow temporary client IP firewall rule, run `npm run import-data` twice and `npm run spike:db`, and clean up temporary IP rule if requested -- obtain live Azure evidence
- [x] `docs/azure-spike.md` (& `ARCHITECTURE-SPINE.md` if failed) -- record cluster details (no secrets), double-run import counts/timings, 10k-Result aggregation latencies/verdict, and `az webapp list-runtimes --os linux` (`NODE:22-lts`, `NODE:24-lts`) output; update `ARCHITECTURE-SPINE.md` to MongoDB Atlas only if the spike fails -- close Story 1.4 and unblock Epic 2/4

**Acceptance Criteria:**
- Given the free-tier Cosmos vCore cluster and `MONGODB_URI`, when `cd server && npm run import-data` runs twice, then all 35,379 verses load on run 1 and run 2 modifies/inserts 0 documents.
- Given 10,000 seeded `Result` docs in the cluster, when `npm run spike:db` runs the `$match/$group/$sort/$project/$lookup/$limit` pipelines, then outputs match JS expectations and each query responds in `< 1000 ms`.
- Given `docs/azure-spike.md`, when reviewed, then it records the Node 22 App Service check, import timings, aggregation benchmarks, and a clear PASS/FAIL verdict (with Atlas fallback applied to the spine only on FAIL).

## Implementation Notes

- Created `server/src/utils/bookMapping.ts` (73 USFM codes -> canonical English names) and rewrote `server/src/utils/importData.ts` for strict CSV parsing, batched `bulkWrite` upserts on `verseOrder`, and throttling/transient retry/backoff.
- Added `server/src/scripts/azureSpike.ts` (`npm run spike:db`) and unit/integration tests `importData.test.ts` + `azureSpike.test.ts` on `mongodb-memory-server`.
- Provisioned `rg-ttb` (`eastus2`) + `ttb-cosmos-vcore` (`compute.tier: Free`, 32 GB, MongoDB `7.0`), ran `npm run import-data` twice (`35,379` upserted run 1; `0` inserted/modified run 2) and `npm run spike:db` (84–113 ms aggregations, 336 ms lean 10k fetch, all matched JS), removed temporary firewall rule, and documented PASS verdict in `docs/azure-spike.md`.
- Verified `npm run typecheck`, `CI=true npm run build`, and `CI=true npm test` (server 5/5 suites, 21/21 tests; client 3/3 suites, 34/34 tests).
- Post-review patches applied: hardened `importData.ts` stream error/abort handling, mixed `writeErrors` classification, partial metric counting, max `RetryAfterMs`, `maxDelayMs` capping, duplicate `(book, chapter, verse)` validation, `Verse.createIndexes()` in `runCli`, and `mongoose.disconnect()` guard; hardened `azureSpike.ts` `cleanup()` retry + CI-safe `latencyBudgetMs`; added persisted-field/in-place update/backoff/CSV-edge tests in `importData.test.ts`. Re-verified `CI=true npm run typecheck`, `CI=true npm run build`, and `CI=true npm test` (server 5/5 suites, 27/27 tests; client 3/3 suites, 34/34 tests).

## Spec Change Log

## Review Triage Log

| Finding | Source | Verdict | Evidence & Route |
|---|---|---|---|
| `loadVersesFromCsv` skips `readStream.on('error')` and keeps parsing buffered rows after `parseCsvRow` throws | edge-case-hunter #1,#2, blind-hunter #2 | `medium` -> `patch` | Verified `importData.ts:197-248` pipes `fs.createReadStream` without a source error handler or `aborted` flag. Attach `readStream.on('error', ...)` and destroy both streams on abort. |
| `isRetryableWriteError` retries mixed fatal+retryable `writeErrors`; `executeBatchWithRetry` can empty `currentOps`, loop on `NaN` `maxRetries`, or wait uncapped `RetryAfterMs`; `runCli` `disconnect` unguarded | edge-case-hunter #3,#4,#5,#8 | `medium` -> `patch` | Verified `importData.ts:277-498`. Check `writeErrors.every(...)` before top-level code/message, guard `nextOps.length > 0`, `Number.isFinite(maxRetries)`, cap `waitMs` by `maxDelayMs`, and `try/catch` `mongoose.disconnect()`. |
| `importData.test.ts` misses string code/`errorLabels`/`hasErrorLabel` retryable branches and multi-batch (>500) real `Verse.collection.bulkWrite` test | verification-gap #1,#2 | `medium` -> `patch` | Verified `importData.test.ts` only tests numeric `16500`/`429` and `batchSize: 2` on 3 rows. Add unit tests for retry branches/guards and >500-row real `bulkWrite`. |
| `azureSpike.ts` `cleanup()` sets `cleanedUp = true` before deletes finish | edge-case-hunter #7 | `medium` -> `patch` | Verified `azureSpike.ts:756-767`; move `cleanedUp = true` after `insertBatchWithRetry(...)` succeeds so `finally` retries on transient failure. |
| `executeBatchWithRetry` double-counts `error.result` on un-narrowed retry; `extractRetryAfterMs` uses first match instead of max; `loadVersesFromCsv` lacks duplicate `(book, chapter, verse)` check; `runCli` omits `Verse.createIndexes()` | blind-hunter #2,#3,#4,#5 | `medium` -> `patch` | Verified in `importData.ts`. Accumulate `error.result` only when `nextOps` narrowed; take `Math.max` of `RetryAfterMs` hints; track duplicate `(book, chapter, verse)`; call `await Verse.createIndexes()` in `runCli`. |
| Persisted `Verse` fields/in-place `$set` update, exponential backoff without `RetryAfterMs`, duplicate `Verse_Order`, BOM header, and empty CSV untested; `azureSpike.test.ts` `passedLatency` (< 1000 ms) can flake on CI `mongodb-memory-server` | verification-gap #1,#2, blind-hunter #10 | `medium` -> `patch` | Verified in `importData.test.ts` and `azureSpike.test.ts`. Add persisted-field/update/backoff/CSV-edge assertions in `importData.test.ts` and configurable `latencyBudgetMs` for CI-safe `azureSpike.test.ts`. |
| `azureSpike.ts` `insertMany` partial-batch retry (`Result` duplicates / `Progress` `E11000`), `User.create` before `try`, `69/73` book sampling, `ad3FetchMs` in `overallPass`, `$sort` before `$limit` | edge-case-hunter #6, blind-hunter #7,#8,#9 | `low` -> `defer` / reject | `User.create` before `try` has nothing between it and `try` (`false`); live Azure run already succeeded with 0 retries (`69` books accurately reported in `docs/azure-spike.md`), and Epic 2 owns production stats sorting/windowing. |
| `azureSpike.ts` `insertMany` partial-batch retry (`Result` duplicates / `Progress` `E11000`) | edge-case-hunter #6 | `low` -> reject | Spike benchmark seeding script only; live Azure run had 0 retries and `azureSpike.ts` is not production app code. |
| `updatedAt` in `buildUpsertOperations` uses `$setOnInsert` so modified rows wouldn't bump `updatedAt` | blind-hunter #3 | `false` | Intentional: using `$set` for `updatedAt` would modify all 35,379 docs on every run, breaking the idempotent `modified=0` AC. |
| `bookMapping.ts` canonical names (`Psalms`, `1 Corinthians`, 73 books) differ from `TypingTest.tsx` hardcoded `availableBooks` (`Corinthians`, `John` x2) & `mockVerses.ts` (`Psalm`) | blind-hunter #4,#7 | `medium` -> `defer` | Pre-existing in `TypingTest.tsx` and `mockVerses.ts`; Epic 2 (Book Coverage) will align client book selectors with `CANONICAL_BOOK_ORDER`. |
| `azureSpike.ts` refactored `cleanupMs` ordering after live Azure run; `main()`/`insertBatchWithRetry` unmocked in `azureSpike.test.ts` | blind-hunter #1, verification-gap #3,#4 | `low` -> `defer` | Verified `azureSpike.test.ts` passed on `mongodb-memory-server` after the 3-line `cleanup()` ordering fix and aggregation pipelines were unchanged; live firewall rule already closed. |
| `docs/azure-spike.md` reports `serverVersion: "7.0"` & `retrywrites=false` not yet echoed in `ARCHITECTURE-SPINE.md` / `README.md` | blind-hunter #5,#6 | `low` -> `defer` | `ARCHITECTURE-SPINE.md` does not pin a Mongo server version; Epic 4 (`docs/deployment.md`) will record `retrywrites=false` and `serverVersion: "7.0"`. |
| `sprint-status.yaml` / `1-4-azure-data-path-spike.md` diff & status sync | blind-hunter #8 | `false` | `_bmad-output/` is excluded from review diff per `{claims_file}` isolation; `sprint-status.yaml` updates at Step 5. |

## Verification

**Commands:**
- `cd server && npm run build && npm test` -- expected: unit tests for `importData` idempotency and retry pass cleanly
- `cd server && MONGODB_URI="<spike-uri>" npm run import-data` (x2) -- expected: 35,379 verses upserted on run 1; 0 inserted/modified on run 2
- `cd server && MONGODB_URI="<spike-uri>" npm run spike:db` -- expected: all aggregation pipelines match JS totals and finish in `< 1000 ms`
- `az webapp list-runtimes --os linux | grep -i node` -- expected: confirms `NODE:22-lts`
