# Typing the Bible — Brownfield Assessment

_Assessed 2026-11-16 against `main` @ d12f269 (BMAD 6.12.4 Core+BMM just installed). Facts below were verified in the code or by running tests, not copied from the docs._

## What exists (verified)

| Area | State |
|---|---|
| Stack | React 18 + TS (CRA/react-scripts 5) · Express 4 + Mongoose 8 + JWT/bcrypt · MongoDB |
| Data | `data/WEB_Catholic_Version_for_game_updated.csv` (35,380 lines) + `server/src/utils/importData.ts` |
| API | `/api/verses` (list, random, by order, by book, by book+chapter, by id) · `/api/users` (register, login, profile get/put) · `/api/progress` (list, summary, per-verse, `POST /result/:verseId`) |
| Client routes | `/`, `/login`, `/register`, `/typing`, `/progress`, `/profile`, `/check-localstorage` |
| Progress page | Summary cards (completion, speed, accuracy, tests) + recent/all tabs. No charts/visualizations yet |
| Server tests | 3 suites / 8 tests, **all pass** (auth, verses, progress) |
| Client tests | **Broken**: `TypingTest.test.tsx` times out on "Loading verse..." and crashes the Jest worker; only `App.test.tsx` passes |
| Legacy | `Typing the Bible Improvement/` = original Python game, notebooks, CSV results/analytics (reference only) |

## Gaps between docs and reality

1. `CLAUDE.md`/`GEMINI.md`/`README.md` describe a "statistics dashboard" as in progress. The only stats UI is the summary tab in `Progress.tsx`. The plotly → web-chart conversion has not started.
2. Docs list `npm run lint`, `format`, `seed`, `migrate`, `test:e2e`, and `docs/api.md`. None of these exist. The real import command is `npm run import-data` (server).
3. `server/dist/` (compiled JS) is present in the working tree. `npm start` runs it, so it can go stale relative to `src/`. Confirm whether it is tracked (it is not in the git file list, so it is only local).
4. Client `.env.development` points at `localhost:3001/api`, but the server defaults to port `5000` and CORS allows only `localhost:3000/3001`. Verify the working dev ports.
5. The result payload has `wpm`, `cps`, `accuracy`, and incorrect-character counts. `Progress` keeps only best WPM, best accuracy, and attempts. Per-character and per-word analytics from the Python game (`word_stats.csv`, keypress trials) have no web equivalent.

## Hygiene problems to fix early

- **9,578 `node_modules/` files are tracked in git** at the repo root (`client/` and `server/` are clean). Untrack them and add them to `.gitignore`.
- Root `.gitignore` is 6 lines. It lacks `node_modules`, `build`, `dist`, `.DS_Store`, and `.claude/worktrees`.
- Stray, unrelated scaffolding: root `src/` (a Todo app) and `tests/server/verse.test.ts`. They look dead.
- `server/.env` is correctly ignored. `client/.env.*` are tracked but contain no secrets.
- `server/src/index.ts` serves the whole repo root as static files (`express.static('../../')`) and has no rate limiting or helmet. Review before any deployment.
- `check-localstorage.html` and the `/check-localstorage` route are debug artifacts.
- `.cursorrules` is empty. `CLAUDE.md` and `GEMINI.md` duplicate each other. `bmad-project-context` should consolidate them into one `AGENTS.md`.

## Remaining scope from the existing plan (candidate "path to done")

From `docs/notepads/project-plan.md` and `GEMINI.md`:
1. Statistics calculation and dashboard, including converting the plotly analytics to web charts.
2. Frontend unit tests (and repairing the broken suite).
3. CI/CD pipeline.
4. Deployment documentation, and an actual deployment target.

`feature-roadmap.md` (a 12-month, ~20-feature vision: achievements, memory mode, clubs, AI, voice, PWA, extra texts, monetization) is **aspirational**. It should go through scoping, not be treated as the backlog.

## Open decisions for the PRD

- What does "done" mean: personal-use app running locally, a deployed public app, or both?
- Which parts of `feature-roadmap.md` are in v1, deferred, or dropped?
- Hosting target and database (Atlas?). Is multi-user a real requirement, or single-user?
- Bible text licensing: the WEB Catholic version is public domain. Confirm that before any additional translations.
