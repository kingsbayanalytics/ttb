---
title: 'Clean the repo'
type: 'chore'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: 'f67ff08f2b3b297e951c4e526a0e3e179fa15611'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository tracks 9,578 `node_modules` files and three `.DS_Store` files, contains dead Todo-app scaffolding (`src/`) and duplicate test files (`tests/`), has mismatched dev ports (`server/src/index.ts` defaults to `5000` while `client/.env.development` and `server/.env` use `3001`), and has duplicated, stale agent/project docs listing nonexistent commands.

**Approach:** Untrack ignored artifacts from the git index without deleting local dependencies, remove the dead `src/` and `tests/` directories, align server default port and `.env.example` to `3001`, prune nonexistent commands from docs, and consolidate agent instructions into `AGENTS.md` with `CLAUDE.md` and `GEMINI.md` pointing to it.

## Boundaries & Constraints

**Always:**
- Untrack `node_modules` and `.DS_Store` via `git rm --cached` so local working-tree `node_modules` remain intact for `npm run dev`.
- Keep all work on branch `story/1-1-clean-the-repo`; never commit or push without explicit user instruction.
- Verify every command kept in `README.md`, `AGENTS.md`, and `docs/notepads/backend-setup.md` actually exists in `package.json` and runs.
- Preserve existing working app behavior (`npm run dev` loads verses end to end).

**Never:**
- Delete `Typing the Bible Improvement/`, `data/`, `check-localstorage.html` (Story 3.4), or any `.env` files on disk.
- Alter `.cursor/rules/ttb-project-rules.mdc` without user request.
- Introduce ESLint/Prettier tooling or rewrite `client/`/`server/` app logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh clone env setup | No `server/.env` present; `PORT` unset | `server/src/index.ts` defaults to `3001`, matching `client/.env.development` (`http://localhost:3001/api`) | `server/.env.example` documents `PORT=3001` |
| Untracking cached files | `node_modules/` and `Typing the Bible Improvement/**/.DS_Store` tracked | `git ls-files` has zero matches; `node_modules/` remains on disk | `.gitignore` blocks re-adding `node_modules/`, `build/`, `dist/`, `.DS_Store` |

</frozen-after-approval>

## Code Map

- `.gitignore` -- root ignore rules (currently missing `node_modules/`, `build/`, `dist/`, `.DS_Store`, `server/.env`, `client/.env*.local`)
- `src/` (7 files) -- unrelated Todo-app React scaffolding; zero imports from `client/`, `server/`, or `package.json`
- `tests/` (`tests/tsconfig.json`, `tests/server/verse.test.ts`) -- duplicate/older copy of `server/src/tests/verse.test.ts`; unreferenced
- `server/src/index.ts:72` -- `const PORT = process.env.PORT || 5000;` (mismatches `client/.env.development` and `server/.env` `3001`)
- `server/package.json:11` -- `"lint": "eslint . --ext .ts"` (broken; `eslint` is not installed)
- `client/.env.development` -- `REACT_APP_API_URL=http://localhost:3001/api`
- `README.md`, `docs/notepads/backend-setup.md` -- reference port `5000`, `npm run seed`, `/api/auth/*`, and `src/`
- `CLAUDE.md`, `GEMINI.md` -- duplicated project docs listing nonexistent `lint`, `format`, `seed`, `migrate`, `test:e2e`, `docs/api.md`

## Tasks & Acceptance

**Execution:**
- [x] `.gitignore` -- add `node_modules/`, `build/`, `dist/`, `.DS_Store`, and `.env` / `.env*.local` patterns (keeping `client/.env.development`, `client/.env.production`, `!.env.example`) -- prevent tracked build/dependency/OS clutter
- [x] Git index (`node_modules`, `.DS_Store`) -- run `git rm -r --cached node_modules` and `git rm --cached "Typing the Bible Improvement/.DS_Store" "Typing the Bible Improvement/Screenshots/.DS_Store" "Typing the Bible Improvement/eng-web-c_readaloud_with_additions/.DS_Store"` -- untrack 9,581 bloat/OS files while keeping working-tree `node_modules`
- [x] `src/`, `tests/` -- remove dead Todo-app `src/` and obsolete `tests/` -- eliminate misleading dead code
- [x] `server/src/index.ts`, `server/.env.example`, `server/package.json` -- change default `PORT` fallback on line 72 from `5000` to `3001`, add `server/.env.example` (`PORT=3001`, `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=development`), remove broken `"lint"` script from `server/package.json` -- align dev ports and ensure all listed scripts run
- [x] `README.md`, `docs/notepads/backend-setup.md` -- update port references (`5000` -> `3001`), replace `npm run seed` / `npm start` (for server dev) with real commands (`npm run import-data`, `npm run dev`), fix endpoint paths (`/api/users`, `/api/progress/result/:verseId`), remove dead `src/` and `docs/api.md` references -- keep human docs truthful
- [x] `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` -- create concise `AGENTS.md` with `<!-- bmad:context -->` block (verified commands, pitfalls, entry points, WEB translation rule); replace `CLAUDE.md` and `GEMINI.md` with `@AGENTS.md` pointers -- follow `bmad-project-context` adoption without instruction duplication

**Acceptance Criteria:**
- Given the cleaned index and `.gitignore`, when running `git ls-files`, then zero `node_modules/`, `build/`, `dist/`, `.DS_Store`, or `.claude/worktrees/` paths appear, and local `node_modules/` remains on disk.
- Given `src/` and `tests/` are removed, when building/testing `server` and `client`, then nothing breaks or imports them.
- Given `server/src/index.ts` defaults to `3001`, when running `npm run dev` (or starting server + client), then server listens on `3001`, client calls `http://localhost:3001/api`, and verses load when MongoDB is running (or mock mode is enabled).
- Given `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`, and `docs/notepads/backend-setup.md`, when checking every documented npm script, then every listed script exists and executes cleanly; `CLAUDE.md` and `GEMINI.md` point to `AGENTS.md`.

## Implementation Notes

- Executed on `story/1-1-clean-the-repo` (uncommitted).
- `git rm --cached` staged removal of 9,578 `node_modules` files and 3 `.DS_Store` files plus `src/` (7 files) and `tests/` (2 files).
- Updated `.gitignore`, `server/src/index.ts` (default port `3001`), `server/package.json` (removed broken `lint` script), `README.md`, `docs/notepads/backend-setup.md`, `CLAUDE.md`, and `GEMINI.md`; added `server/.env.example` and `AGENTS.md`.
- Verified `git ls-files`, disk presence checks, `cd server && npm run build && npm test` (3 suites / 8 tests passed against local MongoDB), `cd client && npm run build`, and `npm run dev` (server `3001`, client `3000`, `/api/verses?limit=1` returned verse 1).
- Post-review patches applied to `server/src/tests/verse.test.ts` (restored `GET /api/verses/book/:book` coverage with multi-book fixture), `.gitignore`, `README.md`, and `docs/notepads/backend-setup.md`; re-verified `cd server && npm run build && npm test` (3 suites / 10 tests passed), `cd client && npm run build`, `git ls-files` clean, and disk presence checks.

## Spec Change Log

## Review Triage Log

| Finding | Source | Verdict | Evidence & Route |
|---|---|---|---|
| `tests/server/verse.test.ts` deletion dropped `GET /api/verses/book/:bookName` coverage | blind-hunter #1, edge-case-hunter #2 | `medium` -> `patch` | Verified `server/src/tests/verse.test.ts` only tests `/`, `/random`, `/order/:verseOrder`, whereas deleted `tests/server/verse.test.ts:102-124` tested `/book/Genesis` and `/book/NonExistentBook` against multi-book seed data. Patch `server/src/tests/verse.test.ts` to preserve those cases. |
| `README.md` marks `import-data` `(Optional)`, omits `NODE_ENV=production` & `JWT_SECRET` warning in Production Mode, and omits several endpoints | blind-hunter #2 | `medium` -> `patch` | Verified `README.md:239,270-284` and `server/src/index.ts:58`; skipping `import-data` leaves empty DB while `client/.env.development` has `USE_MOCK_DATA=false`, and `NODE_ENV=development` in `.env.example` prevents serving `client/build`. Patch `README.md` (also expand endpoint list). |
| `docs/notepads/backend-setup.md` line 103 says `.env.production` and lines 84-90 show wrong error JSON shape | blind-hunter #3 | `low` -> `patch` | Verified line 103 omits `client/` prefix and `server/src/utils/errorHandler.ts:31-35` returns `{success:false, error, stack}`. Direct correction in already-edited doc. |
| `.gitignore` ignores `server/package-lock.json` (while tracked) and lacks `coverage/`, `npm-debug.log*` | blind-hunter #4 | `medium` -> `patch` | Verified `git ls-files server/package-lock.json` is tracked; ignoring it hides lockfile updates needed by later stories and CI `npm ci`. Patch `.gitignore`. |
| Unstaged/uncommitted working tree, `sprint-status.yaml` `in-progress` vs spec `in-review`, `AGENTS.md` baseline `f67ff08` | blind-hunter #5 | `false` | Story 1.1 forbids committing without user instruction; `sprint-status.yaml` moves to `done` at Step 5; `f67ff08` is current `HEAD` per `bmad-project-context`. |
| `CLAUDE.md` has `@AGENTS.md` without fallback read line | blind-hunter #6 | `low` -> reject | Claude Code natively expands `@AGENTS.md` (matching sibling `pinescript` repo); edits to agent-context files are not warranted here. |
| Stale `docs/notepads/project-plan.md` (`/tests`), `docs/brownfield-assessment.md` (`5000`), `client/README.md` (`Node v14`) | blind-hunter #7 | `false` / `low` -> reject (`brownfield-assessment.md` is `false` — snapshot at `d12f269`; historical `project-plan.md` & CRA `client/README.md` are `low` pre-existing) | `docs/brownfield-assessment.md:2` explicitly scopes itself to `d12f269`. `project-plan.md` and `client/README.md` are pre-existing archival/boilerplate files. |
| Root `package.json` `build` omits server build; `server/package.json` has no `typecheck` script | blind-hunter #8 | `medium` -> `defer` | Pre-existing in root `package.json:11` (Story 1.5 CI & Story 4.4 Deploy own full build/typecheck scripts). |
| `server/src/index.ts:19-29` mounts `express.static('../../')` and hardcodes CORS | blind-hunter #9 | `high` -> `defer` | Pre-existing in `server/src/index.ts:19-29` and explicitly owned by Story 3.4 (Hardening). |
| `fallback_secret` JWT default and `setupEnv.ts` `dotenv.config({ path: '.env' })` | blind-hunter #10 | `medium` -> `defer` | Pre-existing in `userController.ts`, `authMiddleware.ts`, and `setupEnv.ts`; explicitly owned by Story 3.1 and Story 1.2. |
| `server/src/index.ts:72` non-numeric/`"0"` `PORT` bypasses `\|\| 3001` | edge-case-hunter #1 | `low` -> reject | Pre-existing env coercion pattern; only reachable with malformed `PORT` env var, and Story 3.1 replaces all env parsing with validated `server/src/config.ts`. |
| `server/src/index.ts:72` default port `3001` has no automated test | verification-gap #1 | `medium` -> `defer` | Verified `server/src/tests/` uses `setupTestApp()` without `index.ts` (`NODE_ENV !== 'test'` skips `listen`); Story 3.1 extracts `config.ts` so `PORT` is unit-testable, and `npm run dev` was verified live on `3001`. |

## Design Notes

**AGENTS.md adoption ledger (from `CLAUDE.md`, `GEMINI.md`):**
- Orientation, stack, key dirs -> condense into `AGENTS.md` Orientation & Where things are (exclude directory trees and aspirational BibViz/roadmap features -> already in `feature-roadmap.md` / `_bmad-output/`).
- Port `5000` & nonexistent commands (`lint`, `format`, `seed`, `migrate`, `test:e2e`, `docs/api.md`) -> delete (ground 1: stale/incorrect) and replace with verified `3001` port + real scripts (`npm run dev`, `npm run import-data`, `cd server && npm test`).
- Client `TypingTest.test.tsx` crash & `server/dist/` staleness warning -> capture in `AGENTS.md` Known pitfalls.
- `CLAUDE.md`, `GEMINI.md` -> rewrite to `@AGENTS.md` pointers (with a one-line read directive in `GEMINI.md` for harnesses that inject it verbatim).

## Verification

**Commands:**
- `git ls-files | grep -E "(^node_modules/|/node_modules/|/build/|/dist/|\.DS_Store|\.claude/worktrees/)"` -- expected: no output (exit 1)
- `cd server && npm run build && npm test` -- expected: compiles cleanly, 3 suites / 8 tests pass
- `cd client && npm run build` -- expected: production build succeeds
- `node -e "const fs=require('fs'); console.assert(fs.existsSync('AGENTS.md') && !fs.existsSync('src') && !fs.existsSync('tests'))"` -- expected: exit 0
- Verify `npm run dev` starts server on `3001` and client on `3000` and `/api/verses` responds (with local MongoDB running) or `curl -s http://localhost:3001/` returns welcome JSON.
