<!-- bmad:context -->
<!-- Verified 2026-11-16 against f67ff08. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Typing the Bible

Web application for practicing typing speed and accuracy by transcribing Bible verses. React 18 + TypeScript (CRA 5) frontend in `client/`, Express 4 + Mongoose 8 + TypeScript API in `server/`, backed by MongoDB. Planning artifacts live in `_bmad-output/`, setup notes in `docs/notepads/`, and the legacy Python analytics reference in `Typing the Bible Improvement/`.

## Policy

- Keep all Bible verse text in the World English Bible (WEB) public-domain translation (`data/WEB_Catholic_Version_for_game_updated.csv`); never alter biblical text integrity or `Book Chapter:Verse` formatting.
- Never commit `.env` files or secrets; copy `server/.env.example` to `server/.env` locally.
- Preserve `Typing the Bible Improvement/`, `data/`, `check-localstorage.html`, and `.cursor/rules/ttb-project-rules.mdc` unless explicitly asked to modify them.

## Where things are

- Client entry and routes: `client/src/App.tsx`; API client and mock fallback: `client/src/services/api.ts`
- Server entry and middleware: `server/src/index.ts`; route mounts: `server/src/routes/verseRoutes.ts`, `userRoutes.ts`, `progressRoutes.ts`
- Verse CSV importer: `server/src/utils/importData.ts` reading `data/WEB_Catholic_Version_for_game_updated.csv`
- Server integration tests: `server/src/tests/` (`auth.test.ts`, `verse.test.ts`, `progress.test.ts`)

## Running and verifying

- Target runtime is Node 22 LTS with MongoDB (local or Atlas via `MONGODB_URI` in `server/.env`).
- Run both apps in dev from root with `npm run dev` (server on port `3001`, client on `3000`); never configure dev ports to `5000`.
- Seed MongoDB from `server/` using `npm run import-data` (replaces existing `Verse` documents from the CSV).
- Verify server changes with `cd server && npm run build && npm test`; verify client changes with `cd client && npm run build && npm test`.
- Root `npm test` runs server then client tests (`cd server && npm test && cd ../client && npm test`); run `cd client && npm run build` separately to check client TypeScript compilation and production bundling.

## Conventions that differ from defaults

- Auth routes live under `/api/users` (`POST /api/users` registers, `POST /api/users/login` logs in), and result submission is `POST /api/progress/result/:verseId`, not `/api/auth/*` or `POST /api/progress`.
- Client API helpers in `client/src/services/api.ts` fall back to `client/src/data/mockVerses.ts` and `mockProgress.ts` when `REACT_APP_USE_MOCK_DATA=true` or when API requests fail.

## Known pitfalls

- `server/dist/` holds compiled JS executed by `cd server && npm start` and can go stale relative to `server/src/`; use `npm run dev` locally or always run `cd server && npm run build` before `npm start`.

<!-- /bmad:context -->
