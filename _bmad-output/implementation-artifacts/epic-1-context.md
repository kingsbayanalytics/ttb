# Epic 1 Context: Solid foundation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the brownfield repo clean, testable, and de-risked for Azure before new features land: a reproducible repo, server and client test suites that pass on any machine, a CI pipeline, and proof that Cosmos DB for MongoDB (vCore) works with the app. Single owner; app is finishing, not being redesigned.

## Stories

- Story 1.1: Clean the repo
- Story 1.2: Server tests on an in-memory database
- Story 1.3: Repair the client test suite
- Story 1.4: Azure data-path spike
- Story 1.5: CI pipeline

## Requirements & Constraints

- A fresh clone installs and runs dev with documented commands; every command in the docs must run or be removed. Client and server dev ports must agree.
- `node_modules`, `build`, `dist`, `.DS_Store` are never tracked. Nothing is committed or pushed beyond what the owner approves.
- Server tests need no local MongoDB; client tests are deterministic and never crash the Jest worker. Existing 8 server tests keep passing.
- CI on push/PR: install, typecheck, tests, client build; failing test must fail the PR.
- Spike proves verse import (idempotent, batched, throttle-tolerant) and the aggregation stages the stats need on Cosmos vCore, under 1 s at 10k results, with Atlas as fallback.

## Technical Decisions

- Stack stays: React 18 + TS (CRA 5), Express 4, Mongoose 8, MongoDB. Node 22 LTS (confirmed available on App Service).
- Server tests use `mongodb-memory-server` (one database per suite, no `MONGODB_URI`); client tests mock only the `services/api.ts` module with bounded waits.
- Only `MONGODB_URI` selects the database; restrict to portable features (CRUD, indexes, basic aggregation stages, no transactions).
- Agent instructions consolidate into one `AGENTS.md`; `CLAUDE.md`/`GEMINI.md` become pointers.
- GitHub Actions for CI; later OIDC login to Azure for deploy.

## Cross-Story Dependencies

- 1.2 and 1.3 provide the green suites that 1.5 (CI) runs.
- 1.1 should land first so later diffs are reviewable.
- 1.4 needs an Azure subscription and a free-tier vCore cluster; it can run in parallel with the others.
