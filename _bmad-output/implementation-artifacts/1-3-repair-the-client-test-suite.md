---
title: 'Repair the client test suite'
type: 'bugfix'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: '928ddbb899540d3258cc2906ae1482f61fd9079c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `client/src/components/TypingTest.test.tsx` hangs on `"Loading verse..."` and crashes the Jest worker (4 child process exceptions) due to `jest.useFakeTimers()` stalling `@testing-library/dom` async waits and an unawaited `screen.findByText` inside `waitFor`. In addition, `TypingTest.tsx` has scoring and submission bugs (skipping `startTime` and `submitResult` when >1 character is entered at once, returning `Infinity` on 0 ms duration, returning `100` instead of `0` on all-incorrect input, and submitting stale accuracy/incorrect counts) with no dedicated scoring unit tests.

**Approach:** Extract the pure typing metrics (`countIncorrectCharacters`, `calculateAccuracy`, `calculateWpm`, `calculateCps`) into `client/src/utils/typingMetrics.ts` with comprehensive fixed-input unit tests, wire `TypingTest.tsx` to use them and fix its start-time/submission timing bug, and rewrite `TypingTest.test.tsx` to mock only `services/api.ts` service exports with real timers and bounded deterministic waits.

## Boundaries & Constraints

**Always:**
- Run `cd client && npm test` (and `CI=true npm test`) cleanly with zero worker crashes or unhandled promise rejections.
- Mock only `../services/api` (`VerseService`, `ProgressService`, `AuthService`) in `TypingTest.test.tsx`; remove `mockAxios` from the test file and use bounded waits (`{ timeout: 2000 }` or `findBy*`, never fake timers stalling `waitFor`).
- Keep `client` production build (`cd client && npm run build`) green and preserve existing UI copy, test IDs, and CSS classes.
- Wire root `package.json` `npm test` to run server then client (`cd server && npm test && cd ../client && npm test`) and remove the stale `TypingTest.test.tsx` crash pitfall from `AGENTS.md`.

**Never:**
- Alter `Progress.tsx`, `api.ts`, or `server/` endpoints/models.
- Change `client/package.json` `moduleNameMapper` unless `App.test.tsx` is also proven green without it.
- Commit or push without explicit user instruction.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty typed text | `typedText=""`, `targetText="In the beginning"` | `incorrect=0`, `accuracy=100` | N/A |
| All characters wrong | `typedText="XXXXX"`, `targetText="Hello"` | `incorrect=5`, `accuracy=0` (not `100`) | N/A |
| Mixed accuracy & rounding | `typedText="In thX"`, `targetText="In the"` | `incorrect=1`, `accuracy=83` | N/A |
| WPM / CPS normal & zero duration | `words=12, chars=56, durationMs=30000` vs `durationMs=0` | `wpm=24`, `cps=1.866...`; at `durationMs<=0`, `wpm=0`, `cps=0` (never `Infinity`/`NaN`) | Non-positive duration returns `0` |
| Single-paste / fast completion | Logged-in user enters full `mockVerse.text` in one `change` event | `startTime` initializes, `Verse Completed!` renders, `submitResult` receives accurate `wpm`, `accuracy`, `incorrectCharacters` | Submission failure logs and does not crash UI |
| Fetch error state | `VerseService.getRandomVerse` rejects with `Error('Failed to fetch')` | Error message `'Failed to fetch'` and `Try Again` button render cleanly with no unhandled rejection | Clicking `Try Again` retries fetch |

</frozen-after-approval>

## Code Map

- `client/src/components/TypingTest.tsx:45-94,154-178,337-339` -- `startTime` check (`=== 1`), completion `useEffect` (`===` length check, inline `incorrect`/`accuracy`/`wpm` math), `fetchVerse` (does not reset `wpm`/`accuracy`/`incorrectCharCount`), `submitResult` (bails out if `!startTime`, divides by `duration` directly for `cps`, reads closure `startTime`/`accuracy`), and `Time:` display (`'N/A'` if `startTime` is null)
- `client/src/components/TypingTest.test.tsx:18-59,173,208-278` -- `jest.useFakeTimers()`, `mockAxios`, partial `beforeEach` mock resets, unawaited `screen.findByText` inside `waitFor` (line 173) causing Jest worker crash, and `act(... jest.runAllTimers())` wrappers
- `client/src/App.test.tsx` -- existing passing smoke test (must remain green)
- `package.json:13` -- root `"test": "cd server && npm test"` (needs `&& cd ../client && npm test`)
- `AGENTS.md:27,36` -- inside `<!-- bmad:context -->` managed block; currently states root `npm test` skips client and `TypingTest.test.tsx` crashes

## Tasks & Acceptance

**Execution:**
- [x] `client/src/utils/typingMetrics.ts` -- create pure functions `countIncorrectCharacters`, `calculateAccuracy`, `calculateWpm`, `calculateCps` covering empty (`typedLength <= 0` → `100` accuracy), `typedText.length > targetText.length` overflow chars, 0% accuracy (clamped `[0, 100]`), rounding, and `durationMs <= 0` edge cases -- decouple scoring math for unit testing
- [x] `client/src/utils/typingMetrics.test.ts` -- add unit tests covering every fixed-input scoring scenario in the I/O Matrix plus overflow-length input -- satisfy scoring coverage AC
- [x] `client/src/components/TypingTest.tsx` -- import `typingMetrics` helpers, set `startTime` on `typedText.length > 0`, handle completion on `typedText.length >= verse.text.length` using `effectiveStartTime = startTime || now` (calling `setStartTime(effectiveStartTime)` if `!startTime`), pass `effectiveStartTime`, `accuracy`, and `incorrect` directly into `submitResult` (removing the `!startTime` bail-out and computing `cps` via `calculateCps`), and reset `wpm`/`accuracy`/`incorrectCharCount` in `fetchVerse` -- fix scoring/submission/reset bugs while keeping UI unchanged
- [x] `client/src/components/TypingTest.test.tsx` -- remove `jest.useFakeTimers()`, `afterEach` timer cleanup, `mockAxios`, and `act(... jest.runAllTimers())` wrappers; restore default resolved/return values for all 6 mocked service methods in `beforeEach` (keeping `AuthService.getCurrentUser` on `mockReturnValue` for reference stability); fix `screen.findByText` inside `waitFor` on line 173; verify deterministic bounded waits across all existing scenarios plus `Try Again` retry, `submitResult` rejection resilience, all-wrong accuracy, and single-change completion -- eliminate Jest worker crash and hangs
- [x] `package.json`, `AGENTS.md` -- update root `npm test` to run server then client (`cd server && npm test && cd ../client && npm test`), and update `AGENTS.md` (noting it sits inside the `bmad-project-context` managed block) to reflect client tests running cleanly -- satisfy AD-6 and keep agent instructions accurate

**Acceptance Criteria:**
- Given `client/src/components/TypingTest.test.tsx` and `client/src/utils/typingMetrics.test.ts`, when running `cd client && CI=true npm test` (and `npm test` from repo root), then all suites and tests pass cleanly with zero Jest worker crashes, zero `act()` errors on unhandled rejections, and exit code 0.
- Given fixed inputs for `countIncorrectCharacters`, `calculateAccuracy`, `calculateWpm`, and `calculateCps`, when unit tests run, then empty, 0%-accuracy, mixed, normal-duration, and 0 ms-duration cases all assert exact outputs.
- Given `cd client && npm run build`, when building for production, then TypeScript and CRA build succeed cleanly.

## Implementation Notes

- Extracted `countIncorrectCharacters`, `calculateAccuracy`, `calculateWpm`, and `calculateCps` into `client/src/utils/typingMetrics.ts` with 15 unit tests in `client/src/utils/typingMetrics.test.ts`.
- Wired `TypingTest.tsx` to `typingMetrics`, initialized `startTime` on `typedText.length > 0`, computed `effectiveStartTime`, `accuracy`, and `incorrect` directly before `submitResult`, and reset metrics in `fetchVerse`.
- Rewrote `TypingTest.test.tsx` without fake timers or `mockAxios`, added matrix/resilience scenarios, updated root `package.json` `test` script, and updated `AGENTS.md`.
- Verified `cd client && CI=true npm test` (3 suites, 30 tests passed), `cd client && npm run build` (built cleanly with ESLint warnings only), and `npm test` from root.
- Post-review patches applied: removed unused `incorrectCharCount` state and changed stats effect dep to `user?._id` in `TypingTest.tsx`; added `Number.isFinite` guards + 4 new edge-case tests in `typingMetrics.ts` / `typingMetrics.test.ts`; added elapsed-time non-zero `WPM`/`CPS`, overshoot (`mockVerse.text + '!'`), and verse-2 `WPM: 0` reset tests in `TypingTest.test.tsx`. Re-verified `npm test` from root (server 3/3 suites, client 3/3 suites / 34 tests) and `cd client && npm run build`.

## Spec Change Log

## Review Triage Log

| Finding | Source | Verdict | Evidence & Route |
|---|---|---|---|
| `incorrectCharCount` is unread dead state in `TypingTest.tsx:22`, adding an ESLint `no-unused-vars` warning | blind-hunter #1 | `medium` -> `patch` | Verified `incorrectCharCount` is only written, never read after `submitResult` was changed to accept `incorrect` directly. Remove the dead `useState` and its setter calls. |
| Unstable `user` object reference in stats/completion `useEffect` deps (`TypingTest.tsx:30,84`) | blind-hunter #2 | `medium` -> `patch` | Verified `AuthService.getCurrentUser()` returns a fresh `JSON.parse` object each render, risking extra effect runs and forcing test mock pointer stability. Depend on `user?._id` instead of `user`. |
| Missing `Number.isFinite` guards in `typingMetrics.ts` and missing `NaN`/`Infinity`/negative `words`/`chars` tests | blind-hunter #8, edge-case-hunter #3,#4 | `medium` -> `patch` | Verified `NaN <= 0` evaluates `false` in `calculateAccuracy`, `calculateWpm`, `calculateCps`, returning `NaN`. Add `Number.isFinite` checks and unit tests. |
| `TypingTest.test.tsx` only tests single-change completion (`duration=0`, `wpm=0`, `cps=0`), never verifies non-zero `WPM`/`CPS`, overshoot (`>= verse.text.length`), or `fetchVerse` `wpm` reset | verification-gap #1,#2,#3, blind-hunter #6 | `medium` -> `patch` | Verified `TypingTest.test.tsx` only runs `duration=0` completion, never passes `> verse.text.length`, and never types into verse 2 after non-zero WPM. Add elapsed-time WPM/CPS test, `mockVerse.text + '!'` overshoot test, and verse-2 `WPM: 0` reset check. |
| Pasting `> verse.text.length` lets `incorrectCharacters` exceed `verse.characters` (`TypingTest.tsx:61-86`) | edge-case-hunter #1 | `low` -> reject | Intentional spec behavior: Task 1 & Task 3 explicitly require counting overflow chars (`typedText.length > targetText.length`) and completing on `>= verse.text.length`. |
| `fetchVerse` sets `accuracy(0)` without `setVerse(null)`, so `useEffect` sets `accuracy(100)` when `typedText === ''` (`TypingTest.tsx:95-101`) | edge-case-hunter #2 | `low` -> reject | Harmless: `.typing-stats` only renders when `startTime && !completed`, and `accuracy` for empty input is defined as `100` in the I/O Matrix. |
| Live `WPM` stays `0` while typing (`TypingTest.tsx` computes WPM only at completion) | blind-hunter #3 | `medium` -> `defer` | Pre-existing behavior in `TypingTest.tsx` (WPM calculated on completion only); live WPM UX is out of scope for test repair. |
| Duplicate `'John'` key in `availableBooks` (`TypingTest.tsx:22,25`) | blind-hunter #4 | `low` -> `defer` | Pre-existing hardcoded book list; belongs with book-list/coverage cleanup rather than Story 1.3. |
| `App.test.tsx` prints `act(...)` / `TypeError` warnings because `__mocks__/react-router-dom.js` renders all `<Route>` elements | blind-hunter #5, verification-gap (other) | `medium` -> `defer` | Pre-existing in `client/__mocks__/react-router-dom.js` and `App.test.tsx`; Story 1.3 forbids altering `moduleNameMapper` without reworking `App.test.tsx`. |
| `CI=true npm run build` fails on pre-existing ESLint warnings in `TypingTest.tsx` and `Progress.tsx` | build verification | `medium` -> `defer` | Verified `Progress.tsx` and pre-existing `TypingTest.tsx` unused state (`selectedChapter`, `fetchVerse` deps) warn during `npm run build`; needed before Story 1.5 CI. |
| Empty `title=""` on logged-in `"Sequential"` button (`TypingTest.tsx:277`) | blind-hunter #7 | `low` -> reject | Pre-existing attribute in `TypingTest.tsx:267`; cosmetic and does not affect users or tests. |
| Untested branches (`View Progress`, book empty/error, sequential fallback) & positional `'g'` query in `TypingTest.test.tsx` | blind-hunter #9, #10 | `low` -> `defer` | Pre-existing test coverage gaps outside Story 1.3's crash repair and scoring-unit-test scope. |
| `sprint-status.yaml` missing hunk in diff header & status `in-progress` vs `in-review` | blind-hunter #11 | `false` | `_bmad-output` is intentionally excluded from the review diff (`{claims_file}` isolation); `sprint-status.yaml` updates at Step 5. |

## Verification

**Commands:**
- `npm test` (from repo root) -- expected: server (3 suites, 11 tests) and client (3 suites) both pass with exit code 0
- `cd client && CI=true npm test` -- expected: all client suites pass with zero worker exceptions or timeouts
- `cd client && npm run build` -- expected: production build succeeds
