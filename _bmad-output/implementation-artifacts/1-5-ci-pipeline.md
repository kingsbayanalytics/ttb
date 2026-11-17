---
title: 'CI pipeline'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: '42a87426c4bd1e21867d522a3494006932158c0b'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no GitHub Actions CI workflow, no `typecheck` scripts in `server/` or `client/`, and five pre-existing ESLint warnings in `client/src/components/Progress.tsx` and `TypingTest.tsx` that cause `CI=true npm run build` (default on CI runners) to fail.

**Approach:** Clear the five blocking client ESLint warnings, add `typecheck` (and full `build`) scripts, add `.github/workflows/ci.yml` to run `npm ci`, typecheck, tests, and builds on Node 22 for pushes and PRs to `main`, and document GitHub branch protection so failing PR checks block merges.

## Boundaries & Constraints

**Always:**
- Run `npm ci` across root, `server/`, and `client/`, typecheck both `server` and `client`, run `npm test`, and build both `server` and `client` with `CI=true`.
- Pin Node `22` (`actions/setup-node@v4`) and trigger on `push` and `pull_request` targeting `main`.
- Keep all existing client and server behavior and test suites passing.
- Document branch protection configuration for `main` (requiring the CI check) in repo docs.

**Never:**
- Disable `CI=true` warnings-as-errors in CRA or add deploy/Azure credentials to `ci.yml` (deploy belongs to Story 4.4).
- Commit or push without explicit user instruction.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean CI build | `CI=true` set on `cd client && npm run build` | Compiles with 0 ESLint errors/warnings and exits 0 | Fails if any warning is introduced |
| Typecheck failure | Type error in `server/src` or `client/src` | `typecheck` script exits non-zero before/during CI | `tsc --noEmit` fails job |
| Broken test on PR | Failing test in server or client | `npm test` exits non-zero and fails the CI check | Branch protection blocks PR merge |

</frozen-after-approval>

## Code Map

- `client/src/components/Progress.tsx:24` -- `useEffect` missing `navigate` in dependency array (`react-hooks/exhaustive-deps`)
- `client/src/components/TypingTest.tsx:24-25,40` -- unused `selectedChapter`/`setSelectedChapter`/`setAvailableBooks`, and mount `useEffect` missing `fetchVerse` dep (`react-hooks/exhaustive-deps`)
- `package.json`, `server/package.json`, `client/package.json` -- lack `typecheck` scripts; root `build` only builds `client`
- `.github/workflows/ci.yml` -- new workflow file (does not exist yet)
- `README.md` -- add brief CI & branch protection note

## Tasks & Acceptance

**Execution:**
- [x] `client/src/components/Progress.tsx`, `client/src/components/TypingTest.tsx` -- add `navigate` to `Progress.tsx` effect deps, remove unused `selectedChapter`/`setSelectedChapter` and `setAvailableBooks` setter in `TypingTest.tsx`, and add `eslint-disable-next-line react-hooks/exhaustive-deps` on `TypingTest.tsx` mount-only `useEffect` -- make `CI=true npm run build` pass with zero warnings
- [x] `package.json`, `server/package.json`, `client/package.json` -- add `"typecheck": "tsc --noEmit"` to `server` and `client`, `"typecheck"` at root, and update root `"build"` to build both `server` and `client` -- unify CI and local verification commands
- [x] `.github/workflows/ci.yml` -- create GitHub Actions workflow on `push` and `pull_request` (`main`) using Node `22`, npm dependency caching, `npm ci` (root/server/client), `typecheck`, `npm test`, and `npm run build` -- automate PR and `main` verification
- [x] `README.md` -- document the CI workflow and GitHub branch protection setting on `main` (requiring the CI status check before merge) -- satisfy branch-protection documentation AC

**Acceptance Criteria:**
- Given `CI=true`, when running `npm run typecheck`, `npm test`, and `npm run build` (for root, `server`, and `client`), then all commands exit 0 with zero ESLint warnings/errors.
- Given `.github/workflows/ci.yml`, when inspecting its triggers and steps, then it runs on `push` and `pull_request` to `main`, uses Node `22`, installs via `npm ci` in all three packages, and runs typecheck, tests, and build.
- Given `README.md`, when checking CI documentation, then branch protection setup requiring the CI status check on `main` is documented.

## Implementation Notes

- Cleared the 5 CRA ESLint warnings in `client/src/components/Progress.tsx` and `TypingTest.tsx`.
- Added `typecheck` scripts in `server/package.json`, `client/package.json`, and root `package.json`, and updated root `build` to compile `server` then `client`.
- Added `.github/workflows/ci.yml` (Node 22, `CI: true`, `npm ci` across root/server/client, `typecheck`, `npm test`, `npm run build`) and documented branch protection in `README.md`.
- Verified `yaml.safe_load`, `CI=true npm run typecheck`, `CI=true npm test` (server 3/3 / 11 tests; client 3/3 / 34 tests), and `CI=true npm run build` (0 warnings).
- Post-review patches applied: hardened `.github/workflows/ci.yml` (`permissions: contents: read`, `concurrency`, `timeout-minutes: 15`, `actions/cache@v4` for `~/.cache/mongodb-binaries`) and updated `README.md` Production Mode + local verification commands. Re-verified `yaml.safe_load`, `CI=true npm run typecheck`, `CI=true npm run build` (0 warnings), and `CI=true npm test` (server 3/3 / 11 tests; client 3/3 / 34 tests).

## Spec Change Log

## Review Triage Log

| Finding | Source | Verdict | Evidence & Route |
|---|---|---|---|
| `.github/workflows/ci.yml` missing `permissions: contents: read`, `timeout-minutes`, and `concurrency` group | blind-hunter #1 | `medium` -> `patch` | Verified `ci.yml` omits `permissions`, `timeout-minutes`, and `concurrency`. Add least-privilege `permissions: contents: read`, `timeout-minutes: 15`, and `concurrency` cancel-in-progress. |
| `.github/workflows/ci.yml` does not cache `mongodb-memory-server` binary (`~/.cache/mongodb-binaries`) | blind-hunter #2 | `medium` -> `patch` | Verified only npm cache is configured; adding `actions/cache@v4` on `~/.cache/mongodb-binaries` prevents repeated binary downloads across CI runs. |
| `server` `typecheck` excludes `src/tests` via `server/tsconfig.json` | blind-hunter #3 | `false` | `server/jest.config.js` runs `ts-jest` without `isolatedModules`, so CI's `npm test` already typechecks all `src/tests/*.ts` files. |
| ESLint only runs on bundled client source during `react-scripts build`, not tests or `server/` | blind-hunter #4 | `low` -> `defer` | Pre-existing (`server/` has no ESLint config); introducing repo-wide ESLint tooling is outside Story 1.5 scope. |
| Static `availableBooks` `useState` and duplicate `'John'` key + `eslint-disable` in `TypingTest.tsx` | blind-hunter #5 | `low` -> reject | Pre-existing; duplicate `'John'` key is already tracked in `deferred-work.md`, and `eslint-disable-next-line` on mount `useEffect` prevents typing reset loops. |
| `Progress.tsx` lacks unit tests and unmount abort guard | blind-hunter #6 | `medium` -> `defer` | Pre-existing missing `Progress.test.tsx`; verified `useNavigate` only updates on route change (`react-router` v6) so `[user, navigate]` does not loop while on `/progress`. |
| `README.md` Production Mode still shows separate `client`/`server` build commands and omits `npm run typecheck` in dev | blind-hunter #7 | `low` -> `patch` | Verified `README.md:274-279` can reference root `npm run build` and mention `npm run typecheck`. |
| `sprint-status.yaml` missing hunk / status `in-progress` vs `in-review` | blind-hunter #8 | `false` | `_bmad-output/` is excluded from the review diff (`{claims_file}` isolation); `sprint-status.yaml` updates at Step 5. |
| Edge cases & verification gaps | edge-case-hunter, verification-gap | `false` (none) | Both reviewers reported no findings/gaps. |

## Verification

**Commands:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` -- expected: valid YAML (exit 0)
- `npm run typecheck` -- expected: server and client `tsc --noEmit` pass (exit 0)
- `CI=true npm test` -- expected: server (3 suites, 11 tests) and client (3 suites, 34 tests) pass (exit 0)
- `CI=true npm run build` -- expected: server `tsc` and client CRA production build exit 0 with zero ESLint warnings
