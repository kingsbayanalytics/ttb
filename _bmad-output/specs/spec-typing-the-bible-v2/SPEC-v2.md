# Typing the Bible v2 — Specification & Swarm Contract

**Base Branch:** `main`
**Design System:** Editorial Atlas ("Deconstructing the House of Cards" — `Newsreader` serif, `DM Sans` body, `JetBrains Mono` tabular data, warm parchment `#F5F3EE` / ivory `#FAF8F4` / bone `#ECE8DF` / stone `#D6D0C4` / terracotta `#B84A39` / slate-blue `#345474` / ochre `#8A6A2F`, plus dark mode).

---

## 1. Scope & Capabilities (Epics 5–8 + Editorial Favicon)

### Epic 5 (1.1) — Memory Deck & Progressive Mantra Trainer
- **Goal:** Allow the owner to save specific noteworthy verses and Psalms mantras (rather than all 35,379 verses) into a personal **Memory Deck** and practice them across 5 progressive recall stages.
- **5 Progressive Recall Stages (`client/src/utils/memoryMask.ts`):**
  1. **Stage 1 — Full Text:** Complete verse text visible.
  2. **Stage 2 — Every Other Word:** Every 2nd word (1-indexed: words 2, 4, 6, …) has its letters/digits replaced by `_` of equal length, preserving punctuation (`;`, `,`, `.`, `:`, `'`, `"`, `?`, `!`).
  3. **Stage 3 — First Letters Only:** Every word keeps its first letter/digit and masks remaining letters/digits with `_`, preserving punctuation.
  4. **Stage 4 — First & Last Word:** First and last words of the verse remain visible; all middle words have letters/digits masked with `_`, preserving punctuation.
  5. **Stage 5 — Full Recall:** All word letters/digits masked with `_`, preserving punctuation and spaces.
- **Live Reveal While Typing:** When practicing a verse at Stage 2–5, characters at indices `< typedText.length` render the actual verse character with `.correct` or `.incorrect` styling, while untyped characters at indices `>= typedText.length` render the masked character from `maskVerseForStage(verse.text, stage)`.
- **Data Model (`server/src/models/MemoryItem.ts`):**
  - Fields: `user` (`ObjectId` ref `User`, indexed), `verse` (`ObjectId` ref `Verse`), `verseOrder` (`Number`), `book` (`String`), `chapter` (`Number`), `verseNum` (`Number`), `stage` (`1 | 2 | 3 | 4 | 5`, default `1`), `stageCompletions` (`Number`, default `0`), `packId` (`String`, optional), `lastPracticedAt` (`Date`, optional).
  - Unique compound index on `{ user: 1, verse: 1 }`.
- **API Endpoints (`/api/memory`, protected by `protect`):**
  - `GET /api/memory` — returns user's saved `MemoryItem` list populated with `verse` (`book`, `chapter`, `verse`, `text`, `verseOrder`, `characters`, `words`), sorted by `verseOrder: 1`.
  - `POST /api/memory` — body `{ verseId }` (or `{ book, chapter, verse }`); upserts into user's Memory Deck at `stage: 1` if not present.
  - `POST /api/memory/pack/:packId` — resolves all verses in a curated pack (`curatedCatalog.ts`) from the `Verse` collection and bulk-upserts them into the user's Memory Deck.
  - `POST /api/memory/:id/practice` — body `{ wpm, accuracy, stage, advance?: boolean }`; updates `lastPracticedAt`, increments `stageCompletions`, and if `accuracy >= 95` (or `advance !== false`), increments `stage` up to `5`.
  - `PATCH /api/memory/:id` — body `{ stage }` (`1..5`) so user can manually select any stage.
  - `DELETE /api/memory/:id` — removes verse from Memory Deck.

### Epic 7 (1.3) — Curated Study & Mantra Plans Knowledgebase
- **Goal:** Provide a curated knowledgebase of noteworthy scripture packs and study plans (`server/src/utils/curatedCatalog.ts` and `client/src/data/curatedCatalog.ts`):
  1. `psalms-mantras` — **Psalms for Daily Mantras & Focus** (e.g., Psalms 1:1–3, 23:1–6, 46:1–2, 51:10–12, 91:1–2, 119:105, 121:1–8, 139:14).
  2. `anchor-verses` — **Essential Anchor Scripture** (e.g., Genesis 1:1, Proverbs 3:5–6, Isaiah 40:31, Jeremiah 29:11, Matthew 6:9–13, John 1:1, John 3:16, Romans 8:28, 1 Corinthians 13:4–7, Philippians 4:6–8, Philippians 4:13).
  3. `proverbs-wisdom` — **Proverbs: Wisdom & Discipline** (e.g., Proverbs 1:7, 3:5–6, 4:23, 15:1, 16:3, 16:9, 27:17).
  4. `sermon-on-the-mount` — **Sermon on the Mount: Beatitudes & Lord's Prayer** (Matthew 5:3–12, 6:9–13).
- **API Endpoints (`/api/plans`, protected by `protect`):**
  - `GET /api/plans` — returns all curated plans with their metadata, verse count, and the user's completed verse count per plan (matched against `Progress` / `MemoryItem`), plus resolved `Verse` documents when `?planId=<id>` is queried (`GET /api/plans/:planId`).
- **Frontend UI (`/memory` route in `client/src/components/memory/MemoryStudio.tsx` + `"★ Save to Memory Deck"` button in `TypingTest.tsx`):**
  - Accessible from Navbar (`Memory & Plans` link -> `/memory`).
  - Tab/section 1: **Memory Deck & 5-Stage Trainer** (select a saved verse, pick Stage 1–5, type with progressive masking, auto-promote stage on >=95% accuracy).
  - Tab/section 2: **Curated Mantras & Study Plans** (browse the 4 curated packs with context notes, click **"Add Pack to Memory Deck"** or **"Practice Plan in Typing Console"** via `/typing?plan=<planId>`).
  - In `TypingTest.tsx`: add a `"★ Save to Memory Deck"` (or `"✓ Saved in Memory Deck"`) button in `.verse-reference` and support `?plan=<planId>` sequential practice.

### Epic 6 (1.2) — Per-Word & Per-Character Weakness Analytics
- **Goal:** Track character, punctuation, and word mistakes during typing and surface actionable weakness analytics + a targeted drill mode.
- **Data Model Extension (`server/src/models/Result.ts` & `client/src/types/index.ts`):**
  - Add optional fields to `Result`:
    - `missedChars?: Array<{ char: string; count: number }>`
    - `missedWords?: Array<{ word: string; count: number }>`
- **Pure Client Extraction (`client/src/utils/weaknessExtractor.ts`):**
  - `extractTypingErrors(verseText: string, mismatches: ReadonlyMap<number, string> | string): { missedChars: Array<{ char: string; count: number }>; missedWords: Array<{ word: string; count: number }> }`
  - Records any index `i` where the user typed an incorrect character at least once during the attempt (comparing each keystroke change in `TypingTest.tsx` or final mismatch positions) and maps index `i` both to `verseText[i]` and to the containing word in `verseText` (stripped of surrounding punctuation or kept clean).
- **Pure Server Aggregation (`server/src/services/stats/weakness.ts`):**
  - `buildWeaknessReport(results: ReadonlyArray< WeakResultInput >): WeaknessReport`
  - Returns `{ topCharacters: Array<{ char: string; label: string; count: number }>, topWords: Array<{ word: string; count: number }>, totalTrackedAttempts: number, suggestedDrillText: string }`.
- **API Endpoint (`GET /api/stats/weakness`, protected by `protect`):**
  - Returns `{ success: true, data: WeaknessReport }`.
- **Frontend Component (`client/src/components/dashboard/WeaknessAnalytics.tsx`):**
  - Rendered on `/dashboard`; displays top missed characters/punctuation (`;`, `:`, `'`, `,`, letters) and top missed words in editorial mono badges, plus a **"Practice Weak Words Drill"** inline practice console or button.

### Epic 8 (1.4) — Personal Streaks, Milestones & Badges
- **Goal:** Compute timezone-aware daily streaks, personal milestones, and unlockable editorial badges.
- **Pure Server Service (`server/src/services/stats/streaksAndBadges.ts`):**
  - `buildStreaksAndBadges(options: { results: ReadonlyArray<TrendResultInput>; completedProgressCount: number; psalmsCompletedCount: number; timezone: string; now?: Date }): AchievementsData`
  - Computes:
    - `streak`: `{ currentStreakDays: number; longestStreakDays: number; lastActiveDate: string | null; activeToday: boolean }` (note: `currentStreakDays` stays active if the user practiced today OR yesterday in `timezone`!).
    - `milestones`: `{ totalAttempts: number; bestWpm: number; flawlessCount: number; uniqueVersesCompleted: number; psalmsCompletedCount: number }`
    - `badges`: 10 badges (`first-scribe`, `streak-3`, `streak-7`, `streak-30`, `speed-60`, `speed-80`, `speed-100`, `precision-100`, `psalms-mantra`, `explorer-50`) with `{ id, title, description, category, unlocked, progressCurrent, progressTarget, progressPct }`.
- **API Endpoint (`GET /api/stats/achievements?tz=`, protected by `protect`):**
  - Returns `{ success: true, data: AchievementsData }`.
- **Frontend Component (`client/src/components/dashboard/StreakAndBadges.tsx`):**
  - Rendered near the top of `/dashboard` (and optionally summarized on `/profile`), showing Current Streak, Longest Streak, Best WPM, Flawless Verses, and the Editorial Badge Grid.

### Editorial Favicon (`client/public/`)
- Add `client/public/favicon.svg` (editorial `§` emblem on `#141413` with `#B84A39` terracotta rule) and regenerate `client/public/favicon.ico`, `client/public/logo192.png`, and `client/public/logo512.png`, plus link `<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/favicon.svg" />` in `client/public/index.html`.
