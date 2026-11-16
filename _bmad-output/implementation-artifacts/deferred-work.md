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
