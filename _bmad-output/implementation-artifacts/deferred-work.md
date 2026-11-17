- source_spec: `_bmad-output/implementation-artifacts/1-1-clean-the-repo.md`
  summary: Add root/workspace build and `typecheck` scripts covering both `server` and `client` so `npm run build` and CI don't miss stale `server/dist/`.
  evidence: Root `package.json:11` only runs `cd client && npm run build`, and removing broken `lint` from `server/package.json` leaves no `typecheck` script (owned by Story 1.5 / Story 4.4).
- source_spec: `_bmad-output/implementation-artifacts/1-1-clean-the-repo.md`
  summary: Remove `express.static('../../')` repo-root exposure and make CORS origins configurable via env.
  evidence: Verified in `server/src/index.ts:19-29` (pre-existing; tracked in Story 3.4 Hardening).
- source_spec: `_bmad-output/implementation-artifacts/1-1-clean-the-repo.md`
  summary: Remove `'fallback_secret'` JWT default and decouple `server/src/tests/setupEnv.ts` from `.env` in `cwd`.
  evidence: Verified pre-existing in `server/src/middleware/authMiddleware.ts`, `userController.ts`, and `setupEnv.ts` (tracked in Story 1.2 and Story 3.1).
- source_spec: `_bmad-output/implementation-artifacts/1-1-clean-the-repo.md`
  summary: Add automated unit test for `PORT` defaulting/validation once config parsing is extracted from `server/src/index.ts`.
  evidence: Verified `server/src/index.ts:72,75` binds `PORT` as an unexported constant and skips `listen` when `NODE_ENV === 'test'`; `npm run dev` verified live on `3001`, and Story 3.1 introduces testable `server/src/config.ts`.
- source_spec: `_bmad-output/implementation-artifacts/1-2-server-tests-on-an-in-memory-database.md`
  summary: Decouple `server/src/tests/auth.test.ts` tests from sequential order and add negative/profile-update coverage (400 duplicate user, 401 invalid creds/missing token, `PUT /api/users/profile`).
  evidence: Verified pre-existing in `server/src/tests/auth.test.ts:18-68` where login and profile tests depend on the registration test creating `test@example.com`.
- source_spec: `_bmad-output/implementation-artifacts/1-2-server-tests-on-an-in-memory-database.md`
  summary: Add `server/src/tests/progress.test.ts` coverage for repeat submissions (`attempts` increment, best WPM/accuracy retention, multi-sample average) and `GET /api/progress/verse/:verseId`.
  evidence: Verified pre-existing in `server/src/tests/progress.test.ts`; current tests only submit once per user.
- source_spec: `_bmad-output/implementation-artifacts/1-3-repair-the-client-test-suite.md`
  summary: Clear pre-existing ESLint warnings in `TypingTest.tsx` (`selectedChapter`, `setAvailableBooks`, `fetchVerse` deps) and `Progress.tsx` so `cd client && CI=true npm run build` passes in CI.
  evidence: Verified `cd client && npm run build` reports pre-existing ESLint warnings; CRA treats warnings as errors when `CI=true` (blocks Story 1.5 CI).
- source_spec: `_bmad-output/implementation-artifacts/1-3-repair-the-client-test-suite.md`
  summary: Remove `client/__mocks__/react-router*.js` or fix `App.test.tsx` so `<App />` doesn't mount all `<Route>` elements simultaneously and log `act(...)` / `TypeError` warnings.
  evidence: Verified `client/__mocks__/react-router-dom.js` renders every `<Route>` `element` unconditionally, mounting `TypingTest` during `App.test.tsx`.
- source_spec: `_bmad-output/implementation-artifacts/1-3-repair-the-client-test-suite.md`
  summary: Fix duplicate `'John'` key in `TypingTest.tsx` `availableBooks`, compute live WPM while typing, and expand `TypingTest.test.tsx` branch coverage (`View Progress`, book errors, sequential fallback).
  evidence: Verified pre-existing in `TypingTest.tsx` and `TypingTest.test.tsx`.
- source_spec: `_bmad-output/implementation-artifacts/1-5-ci-pipeline.md`
  summary: Add component tests and unmount abort cleanup for `client/src/components/Progress.tsx` (or supersede during Epic 2 Dashboard work).
  evidence: Pre-existing lack of `Progress.test.tsx`; `Progress.tsx:24` `useEffect` invokes `fetchProgressData` without an abort guard.
- source_spec: `_bmad-output/implementation-artifacts/1-5-ci-pipeline.md`
  summary: Evaluate adding explicit ESLint checks across `server/` and `client/` test files in CI.
  evidence: Currently ESLint runs only via CRA `react-scripts build` on bundled `client/src` (`server/` has no ESLint config).
- source_spec: `_bmad-output/implementation-artifacts/1-4-azure-data-path-spike.md`
  summary: Align `client/src/components/TypingTest.tsx` `availableBooks` and `client/src/data/mockVerses.ts` (`Psalm`) with the 73 canonical book names in `server/src/utils/bookMapping.ts`.
  evidence: Verified `bookMapping.ts` stores canonical names (`Psalms`, `1 Corinthians`, `Tobit`, etc.) while `TypingTest.tsx:25-31` hardcodes `Corinthians`, `Thessalonians`, `Timothy`, `Peter`, and duplicate `John` (owned by Epic 2 Book Coverage).
- source_spec: `_bmad-output/implementation-artifacts/1-4-azure-data-path-spike.md`
  summary: Document `retrywrites=false`, `serverVersion: "7.0"`, and `az rest` (`Microsoft.DocumentDB/mongoClusters` `2024-07-01`) Free-tier provisioning details in Epic 4 `docs/deployment.md`.
  evidence: Observed during live Story 1.4 provisioning of `ttb-cosmos-vcore` in `eastus2`.
- source_spec: `_bmad-output/implementation-artifacts/1-4-azure-data-path-spike.md`
  summary: Note that `azureSpike.ts` had a post-Azure `cleanupMs` ordering edit verified via `mongodb-memory-server` (`azureSpike.test.ts`), and `main()` / `insertBatchWithRetry` CLI wrapper lack mocked unit tests.
  evidence: Live firewall rule was removed before that final 3-line refactor; all aggregation stages themselves were unchanged.
