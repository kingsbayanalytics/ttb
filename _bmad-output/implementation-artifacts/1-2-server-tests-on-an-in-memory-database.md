---
title: 'Server tests on an in-memory database'
type: 'chore'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: 'b6165698e80bb92a44fe075dcf2df26828ce13c8'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** All three server test suites (`auth.test.ts`, `verse.test.ts`, `progress.test.ts`) load `server/.env` and connect to `MONGODB_URI` or `localhost:27017`, failing on machines without MongoDB running and risking interference with local databases. Additionally, no single test exercises the full local-auth user loop end-to-end (`register -> login -> submit result -> progress and summary`).

**Approach:** Switch all server test suites to `mongodb-memory-server` (one instance and database per suite via a shared test helper), isolate test environment setup from `.env` and `MONGODB_URI`, and add an end-to-end local-auth loop test covering registration through progress summary.

## Boundaries & Constraints

**Always:**
- Install `mongodb-memory-server` as a `devDependency` in `server/package.json` and update `server/package-lock.json`.
- Use one `MongoMemoryServer` instance and `mongoose` connection per test suite; stop it cleanly in `afterAll`.
- Ensure zero references to `MONGODB_URI` or `localhost:27017` remain anywhere in `server/src/tests/`.
- Keep all 10 existing server tests passing alongside the new full-loop test, even when `MONGODB_URI` is set to an unreachable address or `.env` is absent.

**Never:**
- Modify `server/src/index.ts`, production controllers, routes, or Mongoose schemas.
- Share a single database across parallel Jest suites.
- Commit or push without explicit user instruction.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No local MongoDB / polluted env | `MONGODB_URI=mongodb://127.0.0.1:27999/bad` and no `.env` read | `setupEnv.ts` clears `MONGODB_URI`; all suites pass against `mongodb-memory-server` | `afterAll` closes mongoose and stops `mongod` |
| Local-auth full loop | Fresh user registers, logs in, fetches seeded verse, submits result | `POST /api/users` -> `POST /api/users/login` -> `GET /api/verses/order/:verseOrder` -> `POST /api/progress/result/:verseId` -> `GET /api/progress` and `GET /api/progress/summary` all succeed and match submitted WPM/accuracy | Returns 401 without token |

</frozen-after-approval>

## Code Map

- `server/package.json`, `server/package-lock.json` -- add `mongodb-memory-server` to `devDependencies`
- `server/jest.config.js` -- `setupFiles: ['./src/tests/setupEnv.ts']`, `forceExit: true`; needs generous `testTimeout` (e.g. `60000`) for cold binary download/startup
- `server/src/tests/setupEnv.ts` -- currently runs `dotenv.config({ path: '.env' })`; must isolate test env (`NODE_ENV='test'`, `JWT_SECRET`, `delete process.env.MONGODB_URI`)
- `server/src/tests/test-setup.ts` -- currently exports `setupTestApp()`; add `connectTestDB()` / `disconnectTestDB()` helper managing a per-suite `MongoMemoryServer`
- `server/src/tests/auth.test.ts`, `verse.test.ts`, `progress.test.ts` -- replace `mongoose.connect(process.env.MONGODB_URI || ...)` and `mongoose.connection.close()` with `connectTestDB()` / `disconnectTestDB()`
- `server/src/tests/progress.test.ts` -- add local-auth full-loop test (`POST /api/users` -> `POST /api/users/login` -> `GET /api/verses/order/:verseOrder` -> `POST /api/progress/result/:verseId` -> `GET /api/progress` & `/summary`)
- `AGENTS.md` -- remove the stale pitfall stating `cd server && npm test` requires a running MongoDB server

## Tasks & Acceptance

**Execution:**
- [x] `server/package.json`, `server/package-lock.json` -- install `mongodb-memory-server` (`npm install -D mongodb-memory-server` inside `server/`) -- provide isolated in-memory MongoDB for tests
- [x] `server/jest.config.js`, `server/src/tests/setupEnv.ts` -- set `testTimeout: 60000` in `jest.config.js`; replace `dotenv.config` in `setupEnv.ts` with `NODE_ENV = 'test'`, `JWT_SECRET` fallback for test, and `delete process.env.MONGODB_URI` -- decouple tests from `server/.env` and prevent cold-start timeouts
- [x] `server/src/tests/test-setup.ts` -- add `createTestDatabase()` (or `connectTestDB()` / `disconnectTestDB()`) wrapping `MongoMemoryServer.create()` and `mongoose.connect(uri)` / `mongoose.disconnect()` + `mongod.stop()` -- avoid duplicated lifecycle boilerplate across suites
- [x] `server/src/tests/auth.test.ts`, `server/src/tests/verse.test.ts`, `server/src/tests/progress.test.ts` -- migrate `beforeAll`/`afterAll` to the shared in-memory DB helper, remove `dotenv`/`MONGODB_URI`/`localhost:27017` usage, and add the local-auth full-loop test in `progress.test.ts` (and keep `AGENTS.md` pitfall updated) -- satisfy per-suite isolation and full-loop AC

**Acceptance Criteria:**
- Given `MONGODB_URI=mongodb://127.0.0.1:27999/unreachable` in the environment, when running `cd server && npm test`, then all suites pass against `mongodb-memory-server` with zero connections to `27017` or `27999`.
- Given an empty test database with a seeded verse, when the full-loop test runs `POST /api/users` -> `POST /api/users/login` -> `GET /api/verses/order/:verseOrder` -> `POST /api/progress/result/:verseId` -> `GET /api/progress` and `GET /api/progress/summary`, then all responses succeed and reflect the submitted result.
- Given `server/src/tests/`, when grepping for `MONGODB_URI`, `27017`, or `dotenv`, then zero matches exist.

## Implementation Notes

- Installed `mongodb-memory-server@^11.3.0` in `server/` and added `testTimeout: 60000` in `server/jest.config.js`.
- Replaced `dotenv.config` in `server/src/tests/setupEnv.ts` with `NODE_ENV = 'test'`, `JWT_SECRET = 'test-jwt-secret'`, and `delete process.env.MONGODB_URI`.
- Added `connectTestDB()` / `disconnectTestDB()` in `server/src/tests/test-setup.ts` and migrated `auth.test.ts`, `verse.test.ts`, and `progress.test.ts`, adding the `Local-auth full loop` test in `progress.test.ts`; removed the stale MongoDB pitfall from `AGENTS.md`.
- Verified `cd server && npm run build` and `MONGODB_URI=mongodb://127.0.0.1:27999/unreachable npm test` (3 suites, 11/11 tests passed); `grep` only hits `delete process.env.MONGODB_URI;` in `setupEnv.ts`.
- Post-review patches applied: excluded `src/tests` from `server/tsconfig.json` (and removed stale `server/dist/tests`), guarded `connectTestDB`/`disconnectTestDB` cleanup in `test-setup.ts`, added `globalSetup.ts` (`MongoBinary.getPath()`) and removed `forceExit: true` in `server/jest.config.js`, and refined `progress.test.ts` timestamps + `POST /api/progress/result/:verseId` 401 check. Re-verified `cd server && npm run build && MONGODB_URI=mongodb://127.0.0.1:27999/unreachable npm test` (3 suites, 11/11 tests passed cleanly without `forceExit`).

## Spec Change Log

## Review Triage Log

| Finding | Source | Verdict | Evidence & Route |
|---|---|---|---|
| `server/tsconfig.json` compiles `setupEnv.ts` & `test-setup.ts` into `server/dist/tests/` (pulling `mongodb-memory-server` into `dist`) | blind-hunter #1 | `high` -> `patch` | Verified `server/dist/tests/{setupEnv,test-setup}.js` emitted because `tsconfig.json` only excludes `**/*.test.ts`. Exclude `src/tests` in `server/tsconfig.json` and remove `server/dist/tests`. |
| `test-setup.ts` `connectTestDB`/`disconnectTestDB` can leak `mongod` on double-connect or error | blind-hunter #2, edge-case-hunter #1,#2,#3 | `medium` -> `patch` | Verified `connectTestDB` and `disconnectTestDB` lack `try/finally` and active-connection guard. Add cleanup guards in `test-setup.ts`. |
| `setupEnv.ts` has `delete process.env.MONGODB_URI;` which matches `grep ... server/src/tests/` | blind-hunter #3, edge-case-hunter #4 | `false` / reject spec-edit | `dotenv` is never imported in tests or routes/controllers/models; `MONGODB_URI` deletion is required by the frozen I/O Matrix; rejecting a spec-edit fix per review rules (`*.test.ts` and `test-setup.ts` have 0 matches). |
| `progress.test.ts`: `startTime === endTime` with `duration: 30000`, `401` only on `GET /api/progress`, redundant nested `describe`, missing multi-attempt & `/verse/:verseId` tests | blind-hunter #4 | `low` -> `patch` (new test) / `defer` (pre-existing) | Verified `startTime`/`endTime` in new full-loop test both call `new Date()` and `401` only hits `/api/progress`. Fix timestamps + add 401 on `POST /result/:verseId` + drop redundant nested `describe`; defer multi-attempt & `/verse/:verseId` coverage. |
| `auth.test.ts` test ordering coupling & missing 400/401/`PUT /profile` tests | blind-hunter #5 | `medium` -> `defer` | Pre-existing in `server/src/tests/auth.test.ts`; not caused by Story 1.2. |
| `server/jest.config.js` keeps `forceExit: true` masking open handles | blind-hunter #6 | `medium` -> `patch` | Verified `forceExit: true` in `jest.config.js:6` alongside `--detectOpenHandles`. Remove `forceExit: true` so Jest verifies clean teardown (or keep only if upstream driver requires it, verified by running). |
| Parallel Jest workers call `MongoMemoryServer.create()` concurrently without `globalSetup` binary pre-download | blind-hunter #7 | `medium` -> `patch` | Verified no `globalSetup` in `jest.config.js`; cold CI run can race downloading the Mongo binary. Add `globalSetup.ts` calling `MongoBinary.getPath()`. |
| `setupTestApp()` mounts `morgan('dev')` unconditionally | blind-hunter #8 | `low` -> reject | Pre-existing in `test-setup.ts:14`; cosmetic stdout noise during tests. |
| `sprint-status.yaml` `in-progress` vs spec `in-review` | blind-hunter #9 | `false` | Normal mid-review workflow state prior to Step 5 sync. |
| `AGENTS.md` baseline `f67ff08` and not mentioning `mongodb-memory-server` | blind-hunter #10 | `low` -> reject | Agent-context file; `f67ff08` is current `HEAD`; edits to `AGENTS.md` belong to `bmad-project-context` refresh if needed. |
| No verification gaps | verification-gap | `false` (none) | Verified all 3 suites and 11 tests run against `mongodb-memory-server`. |

## Verification

**Commands:**
- `cd server && npm run build` -- expected: compiles cleanly (`tsc`)
- `cd server && MONGODB_URI=mongodb://127.0.0.1:27999/unreachable npm test` -- expected: all 3 suites and all tests (11+) pass with zero open-handle leaks
- `grep -rnE "MONGODB_URI|27017|dotenv" server/src/tests/` -- expected: no matches (exit 1)
