---
status: final
stepsCompleted: [validate-prerequisites, design-epics, create-stories, final-validation]
inputDocuments:
  - _bmad-output/specs/spec-typing-the-bible-v1/SPEC.md
  - _bmad-output/planning-artifacts/prds/prd-typing-the-bible-2026-11-16/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-typing-the-bible-2026-11-16/ARCHITECTURE-SPINE.md
  - docs/brownfield-assessment.md
---

# Typing the Bible - Epic Breakdown

## Overview

Decomposes the PRD (FR-1..11), spec (CAP-1..7), and architecture spine (AD-1..9) into four epics for finishing and deploying the app for a single owner. Brownfield: stories describe changes to an existing, working app. "Owner" is the only user.

## Requirements Inventory

### Functional Requirements

- FR-1 Preserve the core typing loop **[EXISTS]**
- FR-2 Resume at next untyped verse (overall / per book)
- FR-3 Dashboard trend (WPM, accuracy by day)
- FR-4 Dashboard activity heatmap
- FR-5 Dashboard book coverage with jump-to-typing
- FR-6 Entra identity mode (headers, owner check, boot guard, client UI)
- FR-7 Deployment security (no root static, helmet, CORS config, secrets from env, debug route removed)
- FR-8 Repo hygiene
- FR-9 Test suites (memory DB, client suite repaired, stats unit tests, full loop per auth mode)
- FR-10 CI (+ deploy on main)
- FR-11 Deployed app at https://ttb.kingsbayanalytics.com

### NonFunctional Requirements

- NFR-1 Stats endpoints < 1 s at 10k Attempts.
- NFR-2 Charts have a text/table alternative; not colour-only.
- NFR-3 Keystroke feedback < 50 ms; no regression.
- NFR-4 Production traffic is HTTPS with a managed certificate; access requires Entra sign-in with MFA.
- NFR-5 Free/low-cost Azure tiers; known exception: App Service B1 (needed for managed TLS on a custom domain).

### Additional Requirements (from architecture)

- AD-1 one origin; AD-2 auth strategy; AD-3 stats derived on read, pure service; AD-4 DB portability subset; AD-5 validated `config.ts`; AD-6 memory-server tests and `services/api.ts` mocking; AD-7 API envelope + `/api/stats/*`; AD-8 OIDC GitHub→Azure; AD-9 single HTTP boundary + `components/dashboard/`.
- Owner decisions settled 2026-11-16: B1 plan cost accepted (higher tier acceptable later); DNS for `kingsbayanalytics.com` is managed by the owner in the Microsoft 365 admin center; Node 22 LTS confirmed available on App Service Linux.

### FR Coverage Map

| FR | Epic.Story |
| --- | --- |
| FR-1 | 1.2, 1.3 |
| FR-2 | 2.2 |
| FR-3 | 2.1, 2.2, 2.3 |
| FR-4 | 2.1, 2.2, 2.4 |
| FR-5 | 2.1, 2.2, 2.5 |
| FR-6 | 3.1, 3.2, 3.3 |
| FR-7 | 3.1, 3.4, 4.1 |
| FR-8 | 1.1 |
| FR-9 | 1.2, 1.3, 2.1, 3.2 |
| FR-10 | 1.5, 4.4 |
| FR-11 | 1.4, 4.1–4.5 |

## Epic List

1. **Solid foundation** — a clean repo, trustworthy tests, CI, and a de-risked Azure data path.
2. **Statistics dashboard** — the owner sees trend, activity, and book coverage and can jump back into typing.
3. **Private access** — Entra identity mode and security hardening, proven locally.
4. **Live at ttb.kingsbayanalytics.com** — Azure resources, data, auth, deploy pipeline, domain.

Order: 1 → (2 ∥ 3) → 4. Epics 2 and 3 are independent; Epic 4 needs 1 and 3.

---

## Epic 1: Solid foundation

The owner can clone, install, test, and trust the repo, and knows Azure's database will work before anything depends on it.

### Story 1.1: Clean the repo

**Covers:** CAP-1, FR-8
As the owner, I want a clean, reproducible repo, so that every later change is reviewable and commands in the docs actually work.

**Acceptance Criteria:**

**Given** the current repo **When** I run `git rm -r --cached node_modules` and update `.gitignore` **Then** `git ls-files` has no `node_modules/`, `build/`, `dist/`, `.DS_Store`, or `.claude/worktrees` entries
**And** no files are deleted from disk beyond the removals below, and nothing is committed without my say-so.

**Given** root `src/` (Todo app) and `tests/server/verse.test.ts` **When** I confirm nothing imports them **Then** they are removed.

**Given** `client/.env.development` targets `:3001` and the server defaults to `5000` **When** I run `npm run dev` **Then** client and server ports agree and the app loads verses end to end.

**Given** `CLAUDE.md`, `GEMINI.md`, README list commands **When** I run each listed command **Then** each works or is removed from the docs (`lint`, `format`, `seed`, `migrate`, `test:e2e`, `docs/api.md` references)
**And** one `AGENTS.md` holds agent instructions; `CLAUDE.md`/`GEMINI.md` point to it (via `bmad-project-context`).

### Story 1.2: Server tests on an in-memory database

**Covers:** FR-1, FR-9, AD-6
As the owner, I want server tests that need no local MongoDB, so that they pass on any machine and in CI.

**Acceptance Criteria:**

**Given** a machine with no MongoDB running **When** I run `npm test` in `server` **Then** all existing suites pass using `mongodb-memory-server`, one database per suite
**And** no test reads `MONGODB_URI` or connects to `localhost:27017`.

**Given** local auth mode **When** the full-loop test runs **Then** it covers register → login → submit result → progress and summary reflect it.

### Story 1.3: Repair the client test suite

**Covers:** FR-1, FR-9, AD-6
As the owner, I want the client suite green and non-crashing, so that typing regressions are caught.

**Acceptance Criteria:**

**Given** `TypingTest.test.tsx` currently hangs on "Loading verse..." and crashes the Jest worker **When** I run `npm test` in `client` **Then** every suite passes with no worker crashes
**And** tests mock only `services/api.ts` and use bounded, deterministic waits.

**Given** the scoring logic in `TypingTest.tsx` **When** unit tests run **Then** WPM, accuracy, and incorrect-character counting are covered with fixed inputs.

### Story 1.4: Azure data-path spike

**Covers:** FR-11, AD-4
As the owner, I want proof that the app works on Cosmos DB for MongoDB (vCore) before building around it, so that I don't discover incompatibility late.

**Acceptance Criteria:**

**Given** an Azure subscription and a free-tier vCore cluster **When** I point `MONGODB_URI` at it and run the import **Then** all verses load (idempotent upsert on `verseOrder`, batched, retry on throttling) and a second run changes nothing.

**Given** the cluster **When** I run the aggregation stages the stats will use (`$match/$group/$sort/$project/$lookup`) over seeded data **Then** results are correct and respond < 1 s at 10k seeded Results.

**And** Node 22 availability was confirmed on 2026-11-16 via `az webapp list-runtimes --os linux` (`NODE:22-lts`, also `24-lts`); re-check at resource creation.
**And** a short `docs/azure-spike.md` records the verdict; on failure the fallback (MongoDB Atlas) is proposed and the architecture spine is updated.

### Story 1.5: CI pipeline

**Covers:** FR-10, AD-8
As the owner, I want every push and PR checked automatically, so that broken code is visible before it ships.

**Acceptance Criteria:**

**Given** a push or PR **When** `.github/workflows/ci.yml` runs **Then** it installs (`npm ci`) root/server/client, typechecks both, runs server and client tests, and builds the client.

**Given** a PR with a deliberately failing test **When** CI runs **Then** the check fails and blocks the merge (branch protection noted in docs).

---

## Epic 2: Statistics dashboard

The owner sees how typing is improving and how much of the Bible is covered, and can continue from there.

### Story 2.1: Stats service with unit tests

**Covers:** FR-3..5, FR-9, AD-3
As the owner, I want trustworthy numbers, so that the dashboard can be believed.

**Acceptance Criteria:**

**Given** plain `Result` rows with timestamps **When** `buildTrend(rows, tz, range)` runs **Then** it returns one `{date, avgWpm, avgAccuracy, attempts}` per active day, bucketed in the supplied IANA timezone, matching a hand-computed fixture (including a result near midnight and a DST boundary).

**Given** rows **When** `buildActivity(rows, tz, year)` runs **Then** it returns `{date, attempts}` for active days only.

**Given** completed verse ids and a book index **When** `buildCoverage` runs **Then** it returns overall and per-Book `{totalVerses, completedVerses}` in canonical book order, with Testament roll-ups.

**And** all three are pure functions with no database import.

### Story 2.2: Stats and next-verse endpoints

**Covers:** FR-2, FR-3..5, AD-7
As the owner, I want APIs for the dashboard and for resuming, so that the UI has data.

**Acceptance Criteria:**

**Given** an authenticated owner **When** I call `GET /api/stats/trend?range=&tz=`, `/activity?year=&tz=`, `/coverage` **Then** each returns `{success:true, data}` computed via the stats service from stored data; invalid params return 400 with `{success:false, message}`.

**Given** no authentication **When** I call any stats route **Then** I get 401.

**Given** seeded data **When** I call `GET /api/verses/next` and `GET /api/verses/next?book=Genesis` **Then** I get the lowest `verseOrder` without completed Progress (overall / in that book), or an explicit "complete" state when none remain.

**And** with 10k seeded Results each stats route responds in under 1 s (NFR-1).

### Story 2.3: Dashboard page with trend chart

**Covers:** FR-3, AD-9
As the owner, I want to see my WPM and accuracy trend, so that I know I'm improving.

**Acceptance Criteria:**

**Given** results exist **When** I open the Dashboard **Then** I see WPM and accuracy lines per day with a range selector (30/90/365/all)
**And** a visually hidden/expandable table gives the same data (NFR-2).

**Given** no results in the range **When** the page loads **Then** an empty-state message shows instead of an empty chart.

**And** all HTTP goes through `services/api.ts`; charts live in `components/dashboard/` and take plain arrays; the old Progress "summary" tab links to the Dashboard.

### Story 2.4: Activity heatmap

**Covers:** FR-4
As the owner, I want a calendar of when I practiced, so that I can see my consistency.

**Acceptance Criteria:**

**Given** a year with activity **When** I open the heatmap **Then** each day is shaded by attempts, days with none use the empty colour, and each cell has a tooltip with date and count
**And** intensity is also readable without colour (count in tooltip/table, NFR-2) and a year selector works.

### Story 2.5: Book coverage and continue typing

**Covers:** FR-2, FR-5
As the owner, I want to see how much of each book I've typed and jump into it, so that I can work through the Bible.

**Acceptance Criteria:**

**Given** progress exists **When** I open Coverage **Then** I see overall percentage and bars by Testament and Book in canonical order, with percentages equal to API values.

**Given** a Book row **When** I click "Continue" **Then** the typing page opens on that book's next untyped verse; a finished book shows "Complete" and does not offer Continue.

---

## Epic 3: Private access

The app can be run in Entra mode locally and proven to admit only the owner, before any cloud work.

### Story 3.1: Validated config and secret hygiene

**Covers:** FR-6, FR-7, AD-5
As the owner, I want the server to refuse to start misconfigured, so that production never runs on defaults.

**Acceptance Criteria:**

**Given** `server/src/config.ts` **When** the server boots **Then** every env var is read only there, typed, and validated; required missing values exit with a clear message.

**Given** `NODE_ENV=production` in `local` mode with no `JWT_SECRET` **When** the server boots **Then** it exits; the `'fallback_secret'` default is removed everywhere.

**Given** `AUTH_MODE=entra` and no `WEBSITE_AUTH_ENABLED=True` **When** the server boots **Then** it exits.

### Story 3.2: Entra authentication strategy

**Covers:** FR-6, AD-2, FR-9
As the owner, I want production to trust Entra's identity, so that only I can use the app.

**Acceptance Criteria:**

**Given** `AUTH_MODE=entra` and `OWNER_OID` **When** a request has no `X-MS-CLIENT-PRINCIPAL-ID` **Then** 401.
**When** the header is present but ≠ `OWNER_OID` **Then** 403.
**When** it equals `OWNER_OID` **Then** the request succeeds, and one `User` keyed by `entraOid` is created on first sight and reused afterward.

**Given** `entra` mode **When** a request carries an `Authorization: Bearer` token **Then** it is ignored (identity comes only from the principal header).

**Given** `entra` mode **When** I call `POST /api/users` or `POST /api/users/login` **Then** 404.

**And** public `GET /api/auth/mode` returns `local` or `entra`; one full-loop test (header identity → submit result → progress shown) passes using the memory database.

### Story 3.3: Client awareness of auth mode

**Covers:** FR-6, AD-9
As the owner, I want the UI to match the deployment's sign-in, so that I never see a redundant login.

**Acceptance Criteria:**

**Given** `entra` mode **When** the app loads **Then** register/login routes and links are hidden, my name shows in the navbar, and "Sign out" goes to `/.auth/logout`.

**Given** `local` mode **When** the app loads **Then** behaviour is unchanged.

**And** the client reads the mode only via `services/api.ts`; both modes have component tests.

### Story 3.4: Hardening

**Covers:** FR-7, AD-1, AD-5
As the owner, I want the server hardened before it is public, so that it is safe on the internet.

**Acceptance Criteria:**

**Given** the server **When** I request `/package.json` or any repo-root file **Then** 404 (the `express.static('../../')` is removed).

**Given** `check-localstorage.html`, its route, and the client route **When** the story is done **Then** they are removed.

**Given** any response **When** inspected **Then** `helmet` headers are present; CORS origins come from config (empty in production because same-origin).

**Given** `NODE_ENV=production` **When** I `GET /` and `/typing` **Then** `client/build` is served with SPA fallback, while unknown `/api/*` returns JSON 404 (AD-1).

---

## Epic 4: Live at ttb.kingsbayanalytics.com

The owner opens the site, signs in with Microsoft MFA, and uses the app; pushes to `main` ship.

### Story 4.1: Azure resources and runbook

**Covers:** FR-11, NFR-5
As the owner, I want the Azure resources created and documented, so that I can rebuild them.

**Acceptance Criteria:**

**Given** the spike verdict **When** I follow `docs/deployment.md` **Then** a resource group, Linux App Service B1 (Node 22 or recorded fallback), and the Cosmos DB for MongoDB vCore free cluster exist, with app settings (`NODE_ENV`, `AUTH_MODE`, `OWNER_OID`, `MONGODB_URI` as Key Vault reference or App Service setting) and no secrets in the repo.
**And** the doc covers rollback, backup/restore, and costs (B1 noted as the one paid component); I confirm the B1 cost before it is created.

### Story 4.2: Database initialization and verse import in Azure

**Covers:** FR-11, AD-4
As the owner, I want the production database prepared repeatably, so that the app has all verses.

**Acceptance Criteria:**

**Given** the production `MONGODB_URI` **When** I run `npm run db:init` then `npm run import-data` **Then** indexes exist and all verses are present; re-running is a no-op.
**And** the runbook documents the commands and the verse count to expect.

### Story 4.3: Entra sign-in and owner-only access

**Covers:** CAP-7, FR-6
As the owner, I want Microsoft sign-in with MFA that only I can pass, so that the app is private.

**Acceptance Criteria:**

**Given** the App Service **When** Easy Auth is configured with "require authentication" and an Entra app registration with "Assignment required" and only me assigned **Then** an unauthenticated browser is redirected to Microsoft sign-in.

**Given** a different Entra account **When** it tries to sign in **Then** Entra refuses (AADSTS50105) or the app returns 403.

**Given** my account **When** I sign in **Then** MFA is required (verified via Security Defaults/Conditional Access; recorded in the runbook) and `OWNER_OID` is set to my object id.

### Story 4.4: Deploy pipeline

**Covers:** FR-10, AD-8
As the owner, I want merges to `main` to deploy themselves, so that shipping is a push.

**Acceptance Criteria:**

**Given** a federated credential for `main` and GitHub variables for client/tenant/subscription ids (no client secret) **When** CI passes on `main` **Then** `deploy.yml` builds, logs in via `azure/login@v2` OIDC, and deploys with `azure/webapps-deploy@v3`.
**And** a failing CI run does not deploy, and the first deployment responds on the `azurewebsites.net` hostname behind sign-in.

### Story 4.5: Custom domain, TLS, and live acceptance

**Covers:** CAP-6, FR-11
As the owner, I want `https://ttb.kingsbayanalytics.com`, so that it is mine to remember.

**Acceptance Criteria:**

**Given** DNS control **When** I add the CNAME and verification TXT records, bind the hostname, and create a managed certificate **Then** `https://ttb.kingsbayanalytics.com` serves the app with a valid certificate; HTTP redirects to HTTPS.

**Given** the live site **When** I run the acceptance walkthrough **Then** UJ-1 (sign in with MFA, type a verse), UJ-2 (dashboard reflects it), UJ-3 (push deploys), and UJ-4 (another account refused) all pass and are recorded in `docs/deployment.md`.
**And** data persists across an App Service restart.
