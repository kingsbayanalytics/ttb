# Story 1.4 — Azure Data-Path Spike

**Date:** 2026-11-17
**Verdict:** **PASS** — Azure Cosmos DB for MongoDB (vCore) Free tier is compatible with all planned import and Epic 2 stats aggregation operations and responds well under the `1000 ms` budget at `10,000` `Result` documents. The Atlas fallback in `ARCHITECTURE-SPINE.md` is **not** triggered.

---

## 1. Azure Environment & Provisioned Cluster

- **Subscription:** `kba_sub_0` (`eb749f93-f254-4609-8900-a250b0f2d418`)
- **Resource Group:** `rg-ttb` (`eastus2`)
- **Resource Type:** `Microsoft.DocumentDB/mongoClusters` (API `2024-07-01`)
- **Cluster Name:** `ttb-cosmos-vcore`
- **Tier & Sizing:** `compute.tier: Free` (\$0/mo), `storage.sizeGb: 32`, `sharding.shardCount: 1`, `highAvailability.targetMode: Disabled`, `serverVersion: "7.0"`
- **Endpoint Host:** `ttb-cosmos-vcore.mongocluster.cosmos.azure.com` (SRV connection string includes `tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000`)
- **Retention & Firewall:** Cluster is retained for Epic 4 with all `35,379` verses loaded and synthetic spike records removed. The temporary client IP firewall rule (`temp-spike-ip`) was deleted after the spike.

> **Provisioning note for Epic 4:** The `cosmosdb-preview` CLI extension (`az cosmosdb mongocluster create`) targets older `node_group_specs` properties; provisioning `compute.tier: Free` works cleanly via `Microsoft.DocumentDB/mongoClusters?api-version=2024-07-01` (`az rest` or ARM/Bicep).

---

## 2. Node 22 App Service Runtime Check

Command:
```sh
az webapp list-runtimes --os linux | grep -i node
```

Output:
```text
  "NODE:26",
  "NODE:24-lts",
  "NODE:22-lts",
```

`NODE:22-lts` (and `NODE:24-lts`) is confirmed available on Azure App Service Linux.

---

## 3. Idempotent Verse Import (`npm run import-data`)

`server/src/utils/importData.ts` was updated to:
- Read `Verse_Order`, `Book_Name`, `Chapter_Name`, `Verse_#`, `Verse` from `data/WEB_Catholic_Version_for_game_updated.csv`.
- Map all 73 USFM `Book_Name` codes (`server/src/utils/bookMapping.ts`) to canonical full English book names (`GEN` -> `Genesis`, `1CO` -> `1 Corinthians`, `ESG` -> `Esther`, `DAG` -> `Daniel`, etc.).
- Perform batched `bulkWrite` `updateOne` upserts keyed on `verseOrder` (batch size `500`, `71` batches total) without `deleteMany({})`.
- Retry throttled/transient write errors (`16500`, `429`, `RetryAfterMs`, `RetryableWriteError`) with exponential backoff.

| Run | Parsed Rows | Batches | Upserted | Matched | Modified | Retries | Duration |
|---|---:|---:|---:|---:|---:|---:|---:|
| Run 1 (empty DB) | 35,379 | 71 | 35,379 | 0 | 0 | 0 | 43,647 ms |
| Run 2 (re-run) | 35,379 | 71 | 0 | 35,379 | 0 | 0 | 11,835 ms |

Both runs completed with `0` throttling retries and confirmed full idempotency (`0` inserted, `0` modified on Run 2).

---

## 4. Aggregation & Latency Spike (`npm run spike:db`)

`server/src/scripts/azureSpike.ts` ensured schema indexes (`265 ms`), created a temporary spike user, seeded `10,000` `Result` documents (spanning 365 days) and `1,000` `Progress` documents (referencing `1,000` evenly sampled `Verse` documents across the canon, 80% `completed: true`), executed all stats pipelines, verified every bucket against in-JS ground truth, and cleaned up synthetic spike data (`44 ms`).

| Check / Pipeline | Stages Used | Measured Latency | Budget | Correctness vs. JS | Details |
|---|---|---:|---:|---|---|
| **Trend (90d)** | `$match`, `$project` (`$dateToString` w/ `America/New_York`), `$group`, `$sort`, `$limit`, `$project` | **113 ms** | `< 1000 ms` | **PASS** | `91` day buckets matched JS averages & counts |
| **Activity (10k docs)** | `$match`, `$group` (`$dateToString` `UTC`), `$sort`, `$project` | **86 ms** | `< 1000 ms` | **PASS** | `365` day buckets, `10,000` total attempts matched JS |
| **Coverage** | `$match`, `$lookup` (`verses`), `$project`, `$group`, `$sort`, `$limit`, `$project` | **84 ms** | `< 1000 ms` | **PASS** | `69` books (`800` completed verses) matched JS |
| **AD-3 `Result.find` (10k lean)** | Indexed query (`user`, `startTime`) | **336 ms** | `< 1000 ms` | **PASS** | `10,000` rows fetched for pure-JS stats option |
| **AD-3 `Progress.find` (completed)** | Indexed query (`user`) | **48 ms** | `< 1000 ms` | **PASS** | `800` rows fetched |

Post-cleanup collection counts verified on `ttb-cosmos-vcore` (`type-the-bible` database):
- `verses`: `35,379`
- `results`: `0`
- `progress`: `0`
- `users`: `0`

---

## 5. Implications for Epic 2 & Epic 4

1. **Both aggregation strategies work within `< 1 s`:** `$match/$group/$sort/$project/$lookup/$limit` and `$dateToString` with IANA `timezone` execute natively on Cosmos DB vCore 7.0 (`84–113 ms`), and AD-3's plain-row `.lean()` fetch (`336 ms` for 10k `Result` docs) also fits comfortably under `1000 ms`.
2. **Connection string:** Keep `retrywrites=false` as supplied by Cosmos DB vCore when configuring `MONGODB_URI` in Epic 4.
3. **Database init (`npm run db:init`):** `createIndexes()` across all models completed in `265 ms` on the live cluster, confirming Epic 4's index initialization step is fast and compatible.
