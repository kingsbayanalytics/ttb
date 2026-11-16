---
title: Typing the Bible
status: final
created: 2026-11-16
updated: 2026-11-16
spec: ../../specs/spec-typing-the-bible-v1/SPEC.md
---

# PRD: Typing the Bible (v1 — finish and deploy)

## 0. Document Purpose

For the owner and the BMAD agents (architecture, epics, dev). It builds on `SPEC.md` (capabilities CAP-1..7) and the verified `docs/brownfield-assessment.md`; it does not repeat them. Terms in §3 are used verbatim. This is a brownfield PRD: requirements marked **[EXISTS]** describe working behavior that must not regress; everything else is new work.

## 1. Vision

Typing the Bible turns copying scripture into deliberate practice. The owner types the WEB Catholic Bible verse by verse, gets live character feedback, and sees speed and accuracy improve while the book-by-book map fills in. v1 finishes what was started: a trustworthy statistics dashboard, automated tests and CI, and a live, private deployment at `https://ttb.kingsbayanalytics.com` behind Microsoft MFA.

## 2. Target User

### 2.1 Jobs To Be Done
- Practice typing on text worth reading, and see measurable improvement.
- Work through the whole Bible in order, or by book, and always know how far along I am.
- Keep it as my own tool: no accounts to manage, nothing public.

### 2.2 Non-Users (v1)
Anyone but the owner. No groups, invites, or public sign-up.

### 2.3 Key User Journeys
- **UJ-1. A morning session.** The owner opens the URL, is already signed in with Microsoft (MFA'd earlier), picks "next verse in order", types it, sees WPM and accuracy, and moves on to the next. **Edge case:** a mid-session reload keeps the day's results; only the in-progress verse resets.
- **UJ-2. Checking progress.** On Sunday the owner opens the dashboard: a seven-week activity heatmap, WPM and accuracy trend lines, and a Testament → Book bar chart showing Genesis 62% done. He picks a book and starts typing from the first untyped verse.
- **UJ-3. Shipping a change.** The owner pushes a branch; CI runs typecheck, tests, and build and reports green or red; merging to `main` deploys to Azure, and he opens the site to confirm.
- **UJ-4. A stranger arrives.** Someone else hits the URL, is sent to Microsoft sign-in, and is refused after sign-in. Nothing in the API answers them.

## 3. Glossary

- **Verse** — one numbered line of the WEB Catholic text; has `book`, `chapter`, `verse`, and a global `verseOrder`.
- **Attempt** — one completed typing of a Verse; stored as a `Result` (WPM, accuracy, character counts, timestamps).
- **Progress** — per-Verse record: completed flag, attempts, best WPM, best accuracy.
- **Coverage** — share of Verses (overall, per Testament, per Book) with at least one completed Attempt.
- **Owner** — the single Entra identity allowed to use the deployed app.
- **Auth Mode** — `local` (JWT login, dev/test) or `entra` (Easy Auth identity headers, production).
- **Dashboard** — the statistics page; supersedes the current Progress "summary" tab.

## 4. Features

### 4.1 Typing and progress core **[EXISTS]**
**Description:** Verse selection (random, by order, by book/chapter), live character feedback, result submission, per-Verse Progress. Realizes UJ-1.

#### FR-1: Preserve the core loop
The Owner can select a Verse, type it with live feedback, and have the Attempt saved and Progress updated. Realizes UJ-1.

**Consequences (testable):**
- `POST /api/progress/result/:verseId` creates a `Result` and creates or updates the Progress (attempts +1, best values only increase).
- The existing 8 server tests keep passing; the broken client `TypingTest` suite is repaired (see FR-9).

#### FR-2: Resume next untyped verse
The Owner can start typing from the next untyped Verse overall or within a chosen Book. Realizes UJ-2.

**Consequences (testable):**
- API returns the lowest `verseOrder` with no completed Progress, optionally scoped by book; returns an explicit "book complete" state when none remain.

### 4.2 Statistics Dashboard
**Description:** One page, three views, all computed from stored `Result` and Progress data for the signed-in Owner; times shown in the Owner's local timezone. Realizes UJ-2.

#### FR-3: Trend
The Owner can see average WPM and accuracy per day over a selectable range (30/90/365 days, all).

**Consequences (testable):**
- `GET /api/stats/trend?range=` returns one point per day with at least one Attempt: `{date, avgWpm, avgAccuracy, attempts}`; values equal a hand-computed fixture.
- Empty range shows an empty-state message, not a broken chart.

#### FR-4: Activity heatmap
The Owner can see Attempts per day as a calendar heatmap (GitHub-style) with a per-day tooltip.

**Consequences (testable):**
- `GET /api/stats/activity?year=` returns `{date, attempts}` for each active day; days with zero Attempts render as the empty colour; day boundaries use the client-supplied timezone offset.

#### FR-5: Book coverage
The Owner can see Coverage overall and by Testament and Book, and navigate from a Book to typing it (FR-2).

**Consequences (testable):**
- `GET /api/stats/coverage` returns `{totalVerses, completedVerses}` overall and per Book in canonical order; percentages on screen equal the API values.

**Feature-specific NFRs:**
- Stats endpoints respond in under 1 s with 10k Attempts on the target database tier. Charts are accessible (text/table alternative; not colour-only).
- Chart library chosen in architecture; no server-side rendering.

### 4.3 Authentication and access
**Description:** Production identity is delegated to Entra through App Service Easy Auth. Local dev and CI keep JWT login. Realizes UJ-1, UJ-4.

#### FR-6: Entra identity mode
In `entra` mode the server derives the Owner from Easy Auth identity headers, creates the Owner's user record on first sight, and ignores any `Authorization` token.

**Consequences (testable):**
- Requests without the identity headers get 401; with headers for the allowed principal they succeed and map to one stable user record.
- A principal that is not the configured Owner id gets 403, even though Easy Auth passed it (defence in depth).
- The server refuses to boot with `AUTH_MODE=entra` unless `WEBSITE_AUTH_ENABLED=True` is present.
- Public `GET /api/auth/mode` returns `local` or `entra`.
- The client hides register/login in `entra` mode and shows the Owner's name with a sign-out link (`/.auth/logout`).

#### FR-7: Deployment security
**Consequences (testable):**
- No static serving of the repo root; only `client/build`. `helmet` headers present; CORS origin comes from config; secrets only from environment; `check-localstorage` debug route removed.

### 4.4 Quality, CI/CD, and deployment

#### FR-8: Repo hygiene (CAP-1)
**Consequences (testable):** `node_modules`/`build`/`dist` untracked and ignored; stray Todo-app `src/` and `tests/` removed; dev ports unified and documented; README/AGENTS.md list only commands that run; `CLAUDE.md`/`GEMINI.md` consolidated into AGENTS.md pointers.

#### FR-9: Test suites (CAP-3, CAP-4)
**Consequences (testable):** Server tests run against an in-memory/ephemeral MongoDB (no local state); client `TypingTest` suite passes; unit tests cover scoring/WPM and all `/api/stats` aggregations; one test per Auth Mode runs the full loop.

#### FR-10: CI (CAP-5)
**Consequences (testable):** GitHub Actions on push/PR: install, typecheck, server and client tests, client build; failing test fails the PR. On `main` success, deploys to Azure.

#### FR-11: Deployed app (CAP-6)
**Consequences (testable):** App Service serves `client/build` and `/api` at `https://ttb.kingsbayanalytics.com` with managed TLS; Cosmos DB for MongoDB holds data; the 35k-verse import is a documented, re-runnable, throttling-tolerant command; `docs/deployment.md` covers resource creation, Easy Auth (Entra app registration, assignment required, MFA check), DNS record, secrets, deploy, rollback, and backup/restore.

## 5. Non-Goals (Explicit)
- Any second user, sharing, invites, leaderboards.
- Gamification (XP, achievements, streak rewards), memory mode, AI, voice, PWA/offline, extra translations, monetization.
- Weakness analytics per word/character; importing the Python game's history.
- Replacing CRA or rewriting the stack.

## 6. Success Metrics
- Owner uses the live site for typing for 7 consecutive days without falling back to local.
- Dashboard numbers match a manual recomputation from a data export (zero discrepancies on the fixture and on production spot-check).
- CI is green on `main`; mean time from merge to live ≤ 15 minutes.
- Counter-metric: no Owner-visible regressions in typing responsiveness (keystroke feedback < 50 ms).

## 7. Risks and Open Items
- **Cosmos DB for MongoDB compatibility** (aggregation operators, unique indexes, RU throttling) — spike first (Epic 1); fallback MongoDB Atlas. [ASSUMPTION: Mongoose 8 works.]
- **MFA enforcement** lives in the Entra tenant, not the app; verify Security Defaults/Conditional Access covers the Owner. [ASSUMPTION]
- **DNS ownership** for `kingsbayanalytics.com` — Owner to confirm who controls it.
- **Easy Auth + SPA**: API calls rely on the Easy Auth session cookie; same-origin serving avoids CORS and token handling.
