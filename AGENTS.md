<!-- bmad:context -->
<!-- Verified 2026-11-19 against e15938c. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Typing the Bible

Single-owner web application for practicing typing speed, accuracy, and scripture memorization by transcribing Bible verses. React 18 + TypeScript (CRA 5) frontend in `client/`, Express 4 + Mongoose 8 + TypeScript API in `server/`, deployed on Azure App Service (`https://ttb.kingsbayanalytics.com`) backed by Azure Cosmos DB for MongoDB vCore. Planning artifacts live in `_bmad-output/`, the Azure operations runbook in `docs/deployment.md`, and the legacy Python reference in `Typing the Bible Improvement/`.

## Policy

- Keep all Bible verse text in the World English Bible (WEB) public-domain translation (`data/WEB_Catholic_Version_for_game_updated.csv`); never alter biblical text integrity or `Book Chapter:Verse` formatting.
- Never commit `.env` files or secrets; copy `server/.env.example` to `server/.env` locally.
- Do not push to `main` without explicit user approval; pushes to `main` pass `.github/workflows/ci.yml` and auto-deploy to production via `.github/workflows/deploy.yml`.
- Preserve the warm editorial design system in `client/src/App.css` (parchment/ivory light and obsidian dark tokens with `Newsreader`, `DM Sans`, and `JetBrains Mono`).
- Preserve `Typing the Bible Improvement/` and `data/` unless explicitly asked to modify them.

## Where things are

- Client entry and routes: `client/src/App.tsx`; API client and mock fallback: `client/src/services/api.ts`
- Server entry, Helmet CSP, and middleware: `server/src/index.ts`; route mounts in `server/src/routes/` (`authRoutes.ts`, `verseRoutes.ts`, `userRoutes.ts`, `progressRoutes.ts`, `statsRoutes.ts`, `memoryRoutes.ts`, `planRoutes.ts`)
- Verse CSV importer: `server/src/utils/importData.ts` reading `data/WEB_Catholic_Version_for_game_updated.csv`
- Azure provisioning, Entra Easy Auth, DNS/TLS, and rollback runbook: `docs/deployment.md`

## Running and verifying

- Target runtime is Node 22 LTS (matching CI and Azure App Service `NODE|22-lts`) with MongoDB (`MONGODB_URI` in `server/.env`).
- Run both apps in dev from root with `npm run dev` (server on `3001`, client on `3000`); never configure dev ports to `5000`.
- Seed or refresh verses from `server/` with `npm run import-data` (idempotent, throttling-tolerant `bulkWrite` upsert across all 35,379 verses).
- Server Jest suites run against `mongodb-memory-server` (no local MongoDB daemon required); `azureSpike.test.ts` and `stats.test.ts` seed 10k rows and can hit Jest's 60s timeout under parallel load, so iterate on single test files or run with `npx jest --runInBand`.
- Verify changes with `CI=true npm run typecheck && CI=true npm run build && CI=true npm test`; CI runs `typecheck`, `test`, and `build` separately.

## Conventions that differ from defaults

- Dual auth mode: local/CI uses JWT under `/api/users` (`POST /api/users` registers, `POST /api/users/login` logs in), while production runs `AUTH_MODE=entra` behind Azure Easy Auth (`WEBSITE_AUTH_ENABLED=True` required at boot, single `OWNER_OID`, same-origin cookies); `GET /api/auth/mode` reports active mode.
- Result submission is `POST /api/progress/result/:verseId`, not `POST /api/progress`; `Progress` documents are rollups derived from `Result` documents, so any attempt edit or delete must run `recomputeVerseProgress()` in `server/src/controllers/progressController.ts`.
- Curated study plans are mirrored in `server/src/utils/curatedCatalog.ts` and `client/src/data/curatedCatalog.ts`; update both files together and verify verse references against `data/WEB_Catholic_Version_for_game_updated.csv`.
- Client API helpers in `client/src/services/api.ts` fall back to `client/src/data/mockVerses.ts` and `mockProgress.ts` when `REACT_APP_USE_MOCK_DATA=true` or when API requests fail.

## Known pitfalls

- `server/dist/` holds compiled JS executed by `npm start` and can go stale relative to `server/src/`; use `npm run dev` locally or run `cd server && npm run build` before `npm start`.
- Editing the inline anti-FOUC theme `<script>` in `client/public/index.html` without updating both SHA-256 hashes (source and HtmlWebpackPlugin-minified) in `helmet` `script-src` (`server/src/index.ts`) breaks production under CSP.
- Azure App Service Easy Auth rejects cookie-authenticated `POST`/`PATCH`/`DELETE` requests from a custom domain with `403` unless that origin is listed in App Service CORS (see `docs/deployment.md`).

<!-- /bmad:context -->
