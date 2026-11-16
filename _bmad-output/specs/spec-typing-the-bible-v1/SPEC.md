---
id: SPEC-typing-the-bible-v1
companions:
  - ../../../docs/brownfield-assessment.md   # adopted: verified current state, gaps, hygiene problems
sources:
  - ../../../docs/notepads/project-plan.md
  - ../../../GEMINI.md
  - ../../../CLAUDE.md
  - ../../../feature-roadmap.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Typing the Bible v1 — finish and deploy

## Why

A vision to realize, half-built. The command-line "Type Through The Bible" game was ported to a React/Express/MongoDB web app. Typing, auth, and per-verse progress work, but the planned statistics dashboard, frontend tests, CI, and deployment never shipped, and the repo has drifted (tracked `node_modules`, stale docs, a broken client test suite). The owner (single user) wants a finished app, live at `https://ttb.kingsbayanalytics.com` behind his Microsoft/Entra MFA login like his KBA fitness app, to practice typing while working through scripture.

## Capabilities

- **CAP-1**
  - **intent:** A fresh clone installs and runs the whole app with documented commands.
  - **success:** `git ls-files` contains no `node_modules`, `build`, `dist`, or stray Todo-app code; every command in README/AGENTS.md executes; client and server dev ports agree.
- **CAP-2**
  - **intent:** The signed-in owner sees how their typing improves over time and how much of the Bible they have covered.
  - **success:** With seeded results, the dashboard shows WPM and accuracy trend by day, a daily activity heatmap, and completion by testament and book, with values that match stored `Result` data.
- **CAP-3**
  - **intent:** The authenticated owner can type a verse with live feedback and have the result saved to their progress.
  - **success:** Automated tests cover the full loop in both auth modes: local (register → login → type → save → progress shown) and Entra (trusted identity header → type → save → progress shown).
- **CAP-4**
  - **intent:** Regressions in typing, auth, progress, and stats are caught automatically.
  - **success:** Server and client suites pass with no crashing suites; stats calculations and TypingTest scoring have unit tests.
- **CAP-5**
  - **intent:** Every push and PR to `main` is checked automatically, and `main` deploys itself.
  - **success:** A GitHub Actions workflow runs install, typecheck, tests, and build; it is green on `main`, fails a PR containing a broken test, and on `main` success deploys to Azure.
- **CAP-6**
  - **intent:** The owner reaches the app at `https://ttb.kingsbayanalytics.com` and progress persists.
  - **success:** The URL serves client and API over a managed TLS certificate; data persists across restarts in Cosmos DB for MongoDB; the deploy docs let a fresh operator redeploy from scratch.
- **CAP-7**
  - **intent:** Only the owner's Microsoft/Entra identity can use the deployed app.
  - **success:** An unauthenticated request never reaches the API; a different Entra account is refused; sign-in requires MFA; no repo-root static serving; secrets come only from App Service settings/Key Vault; security headers are set.

## Constraints

- Keep the stack (React 18 + TS on CRA, Express 4, Mongoose, MongoDB-API database); no framework rewrite in v1.
- Azure hosting: App Service serves client and API; Cosmos DB for MongoDB stores data. Free or low-cost tier.
- Authentication in production is Entra via App Service Easy Auth; the app trusts only the Easy Auth identity headers and does not implement MFA. Local dev and tests keep the existing JWT login (`AUTH_MODE=local`), so the production mode must never be enabled without Easy Auth in front.
- Bible text is the public-domain WEB Catholic CSV in `data/`; no other translations.
- Existing `/api` routes stay backward compatible; new stats endpoints are additive.
- Tests must not depend on a developer's local MongoDB state.
- The 35k-verse import must tolerate Cosmos throttling (batching and retry).

## Non-goals

- Multi-user features: small groups, invites, open sign-up, social/clubs, leaderboards.
- Achievements/XP, memory mode, AI features, voice, PWA/offline, additional sacred texts, monetization, native mobile, verse cross-reference network (parked in `feature-roadmap.md` as post-v1).
- Per-word/per-character weakness analytics, plotly-chart parity with the Python game, and importing its historical `results.csv`/`word_stats.csv`.

## Success signal

The owner opens `https://ttb.kingsbayanalytics.com`, completes Microsoft sign-in with MFA, types a verse, and sees it reflected in a dashboard showing trend, activity, and book coverage; another account is refused; a deliberately broken test on a PR turns CI red.

## Assumptions

- Entra tenant enforces MFA for the owner via Security Defaults or Conditional Access; verify at deploy.
- Owner manages `kingsbayanalytics.com` DNS in the Microsoft 365 admin center and can add the `ttb` records.
- App Service Linux B1 is accepted (managed TLS for the custom domain needs it); Node 22 LTS confirmed available.
- Cosmos DB for MongoDB is compatible enough with Mongoose 8 and the stats aggregations; verify with a spike, with MongoDB Atlas as the fallback.
- GitHub Actions for CI/CD, because `origin` is `github.com/kingsbayanalytics/ttb`.
- Stale doc commands (`lint`, `format`, `seed`, `migrate`, `test:e2e`) are removed or implemented under CAP-1, not assumed to exist.

## Open Questions

- Cosmos DB vCore (free tier) is the accepted choice; confirm in the compatibility spike (fallback Atlas).
