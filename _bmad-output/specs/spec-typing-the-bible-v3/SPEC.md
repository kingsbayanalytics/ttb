---
id: SPEC-typing-the-bible-v3
version: 3.0-phase1
status: locked-for-build
companions:
  - ../../planning-artifacts/research/v3-companion-sources-and-iconography.md
  - ../../planning-artifacts/v3-ux-companion-and-pixel-trail.md
  - ../../planning-artifacts/architecture/v3-architecture-spine.md
  - ../../planning-artifacts/v3-phase1-epics-and-stories.md
sources:
  - ../../../AGENTS.md
  - ../../../scripts/book-preprocessor/README.md
  - ../../../scripts/book-preprocessor/profiles/anna_riva_psalms.py
---

> **Canonical contract.** This SPEC defines the locked product contract for Typing the Bible v3 (Phase 1 vertical slice: **Genesis + Psalms**, architected for all 73 WEB Catholic canonical books and future non-Bible works via `workId`). Where earlier discovery drafts differ on field names (e.g., `workId` string or `lens` enum), this SPEC is authoritative.

# Typing the Bible v3 — Companion Reading Room & Living Pixel Trail

## 1. Why

Typing the Bible v1–v2 delivered a private, single-owner typing studio (`https://ttb.kingsbayanalytics.com`) with 35,379 World English Bible (WEB) verses, statistics, memory drills, streaks, and weakness analytics. What is still missing is the **meaning and journey** attached to finishing scripture:

1. **Multi-Lens Companion Reading Room:** Completing a chapter should reward Michael with curated study commentary across three distinct lenses—**Hoodoo & Folk** (starting with his privately owned Anna Riva *Power of the Psalms*), **Historical & Classic** (public-domain Catholic & classic biblical scholarship covering all 73 books), and **Community (`r/Bible`)** (offline-curated reader discussions)—without polluting the public-domain WEB verse text or interrupting typing flow.
2. **Stardew Valley-Inspired 16-Bit Living Trail:** Progress across books and chapters should feel like walking a living pilgrimage through an African-American and Hoodoo-infused biblical world where unread chapters rest in warm parchment mist and completed chapters bloom into light, color, and craft.

Phase 1 delivers a complete, joyful vertical slice for **Genesis (50 chapters)** and **Psalms (150 chapters across the 5 Books of the Psalter)** while keeping every data contract, biome registry, and ingestion pipeline cleanly extensible to all 73 canonical books and future non-Bible texts.

---

## 2. Locked Product Decisions

| # | Decision | Contract Rule |
| :-: | :--- | :--- |
| **PD-1** | **Chapter completion is the primary unlock trigger** | A chapter `(workId, book, chapter)` unlocks its `chapter-companion` entries when `completedVerses >= totalVerses` for the owner in `Progress`. Book-level guides (`chapter: null`: `book-introduction`, `dailySchedule[]`, `bonus-meditations`) are accessible from the Book Guide on `/trail` and in the Companion Drawer without requiring full-book completion. |
| **PD-2** | **Sacred typing flow (Zen & Auto-Advance safe)** | Completing a chapter while `autoAdvance === true` or `zenMode === true` **never** auto-opens the Companion Drawer and **never** steals keyboard focus from `.typing-input-inline`. Instead, a quiet **Chapter Bloom Whisper Pill** (or minimalist **Zen Topbar Chip**) queues unlocks into a **Session Unlock Queue** for post-session reading. |
| **PD-3** | **Three Multi-Lens Companion tabs** | Companion Reading Room renders three ARIA tabs: **Hoodoo & Folk** (`hoodoo-folk`), **Historical & Classic** (`historical-classic`), and **Community `r/Bible`** (`community`). Canonical work identifier is **`workId: "web-bible"`** (extensible to future non-Bible works). |
| **PD-4** | **16-bit Living Trail aesthetic & representation** | Internally generated 16-bit pixel art harmonized with `client/src/App.css` Editorial Atlas tokens (Light = *Golden-Hour Daylight*, Dark = *Lantern Twilight*). **All human characters in the world are Black**, rendered with warm 4-step melanin ramps and authentic craft. **Michael's traveler avatar wears clean modern casual clothes** (contrasting intentionally with the timeless historic Southern Hoodoo & biblical world). |
| **PD-5** | **Phase 1 vertical slice = Genesis + Psalms** | Playable 16-bit trails ship for **Genesis** (5 legs of 10 chapters, *Eden Root-Garden*) and **Psalms** (5 Classical Books of the Psalter subdivided into 10–15 chapter scenic clearings, *Shepherd's Twilight Pasture*). The remaining 71 canonical books appear on the Macro Atlas strip across all 9 canonical regions as mist-veiled future horizons. |
| **PD-6** | **CLI-first ingestion; no in-app PDF upload** | Companion bundles are preprocessed locally via `scripts/book-preprocessor/` and imported via local CLI (`importCompanion.ts`) using idempotent Cosmos-safe `bulkWrite` upserts. In-app PDF upload and browser OCR are explicitly tabled for a future phase. |
| **PD-7** | **Copyright & private-vault hygiene** | In-copyright owner works (Anna Riva 1982, future Hurston *Mules and Men* / *Hoodoo in America*, and curated `r/Bible` excerpts) carry `visibility: "private-owner"`, live exclusively in gitignored `data/private-sources/` and the owner's authenticated Cosmos DB, and are **never** committed to Git, bundled in `client/build`, or exposed to unauthenticated/non-owner requests. |

---

## 3. Capabilities & Acceptance Contract

### CAP-V3-1 — Canonical `CompanionEntry` Storage & CLI Ingestion
- **Intent:** Ingest both private-owner preprocessed books (starting with Anna Riva's *Power of the Psalms*) and public-domain/community companion bundles idempotently into MongoDB / Cosmos DB vCore under a `workId`-extensible schema.
- **Canonical Bundle Compatibility:** Must directly ingest the `schemaVersion: "1.0"` JSON output already produced by [anna_riva_psalms.py](file:///Users/mikewarren/ttb/scripts/book-preprocessor/profiles/anna_riva_psalms.py) at gitignored `data/private-sources/extracted/power-of-the-psalms/companion-entries.json`:
  - **150/150 Psalms** (`entryType: "chapter-companion"`, `chapter: 1..150`)
  - **315 commentary purpose blocks** (`purposes[]`), including **22 Psalm 119 Hebrew-letter octaves** (`octave`, `verseRange`)
  - **304 cross-referenced index purposes** (`indexPurposes[]`)
  - **14 weekly morning/evening daily prayers** (`dailySchedule[]`) inside `entryType: "book-introduction"` (`chapter: null`)
  - Closing meditations (`entryType: "bonus-meditations"`, `chapter: null`) — **152 total entries**
- **Canonical Enums:**
  - `workId`: default `"web-bible"` (string, indexed)
  - `entryType`: `"chapter-companion" | "book-introduction" | "bonus-meditations"`
  - `lens`: `"hoodoo-folk" | "historical-classic" | "community"`
  - `visibility`: `"public-domain" | "private-owner"`
- **Success Criteria:**
  - Running `npm run import-companion -- --file <bundle.json>` upserts all entries idempotently (a second identical run performs 0 inserts and leaves document count unchanged) with Cosmos DB `16500` / HTTP `429` retry/backoff matching `importData.ts`.
  - KJV/source verse text is never copied into `Verse` documents; WEB verse text in `data/WEB_Catholic_Version_for_game_updated.csv` remains 100% unchanged.

### CAP-V3-2 — 73-Book Public-Domain Normalizer & Curated Community Pipeline
- **Intent:** Support multi-lens study across Genesis, Psalms, and the full 73-book Catholic WEB canon without chapter-number drift or Reddit TOS violations.
- **Vulgate/Douay-Rheims → WEB Normalizer:** Deterministic transform required for Haydock (1859) and Douay-Rheims sources:
  - `DR Ps 1–8` → `WEB Ps 1–8`
  - `DR Ps 9` → split (`vv. 1–21` → `WEB Ps 9`, `vv. 22–39` → `WEB Ps 10`)
  - `DR Ps 10–112` → `WEB Ps (n + 1)` (`11–113`)
  - `DR Ps 113` → split (`vv. 1–8` → `WEB Ps 114`, `vv. 9–26` → `WEB Ps 115`)
  - `DR Ps 114 + 115` → merge into `WEB Ps 116`
  - `DR Ps 116–145` → `WEB Ps (n + 1)` (`117–146`)
  - `DR Ps 146 + 147` → merge into `WEB Ps 147`
  - `DR Ps 148–150` → `WEB Ps 148–150`
  - Legacy DR book aliases (`1–4 Kings`, `Ecclesiasticus`, `Canticle of Canticles`, `Machabees`, `Apocalypse`, `Tobias`, `Paralipomenon`, `Osee`, etc.) mapped 1:1 to canonical names in `server/src/utils/bookMapping.ts`.
- **Phase 1 Seed Coverage:**
  - *Hoodoo & Folk:* Anna Riva private-owner bundle (Psalms 1–150 + book guide) + public-domain starter seed (Godfrey Selig pre-1923 *Secrets of the Psalms*, Puckett 1926 *Folk Beliefs of the Southern Negro*, Johnson 1925 *Book of American Negro Spirituals* for Genesis & Psalms).
  - *Historical & Classic:* Public-domain starter seed for Genesis & Psalms (1913 *Catholic Encyclopedia* book intros, normalized Haydock 1859 highlights, Spurgeon *Treasury of David* Psalms highlights / Matthew Henry Genesis concise highlights).
  - *Community (`r/Bible`):* Offline curated JSON bundle schema & CLI validator enforcing editorial summary, optional brief attributed excerpt (`<= 300 chars`), `authorHandle`, `externalUrl` permalink, `retrievedAt`, and `visibility: "private-owner"`. Express **never** scrapes Reddit live and Firecrawl is **never** used on `reddit.com`.
- **Success Criteria:** Unit tests verify 100% of Vulgate→WEB Psalm boundary cases and book aliases; validator rejects any community card exceeding 300-char excerpt or missing permalink/attribution.

### CAP-V3-3 — Derived Chapter Unlock Engine & Protected Companion/Trail APIs
- **Intent:** Derive chapter bloom state accurately from `Progress` + `Verse` without redundant drift-prone tables, emit real-time unlock notifications on verse submission, and protect all companion/trail APIs under existing dual-auth middleware.
- **Endpoints (all gated by `protect` — `401` unauthenticated, `403` wrong Entra `oid`):**
  - `POST /api/progress/result/:verseId` (existing, backward-compatible): adds optional `data.chapterJustUnlocked` (`{ workId, book, chapter, totalVerses, companionCount } | null`) **only** when the submitted verse transitions from uncompleted to completed and causes `completedVerses === totalVerses` for that chapter.
  - `GET /api/companion/:book/:chapter?workId=web-bible`: returns `{ workId, book, chapter, unlocked, progress: { completedVerses, totalVerses, bestWPM, bestAccuracy, unlockedAt }, lensCounts, lenses }`. When `unlocked === false`, `lenses` is empty/omitted (zero leaked companion body text) and only `progress` + `lensCounts` teaser metadata are returned.
  - `GET /api/companion/:book/guide?workId=web-bible`: returns book-level entries (`book-introduction` with `dailySchedule[]`, `bonus-meditations`) grouped by lens, plus book chapter completion summary.
  - `GET /api/trail/overview?workId=web-bible`: returns all 9 canonical biomes / 73 books with `phase1Active` flag (`Genesis`, `Psalms`), chapter bloom totals, and Michael's active biome/chapter pointer.
  - `GET /api/trail/books/:book?workId=web-bible`: returns ordered chapter waypoints `{ chapter, totalVerses, completedVerses, state: 'dormant' | 'in_progress' | 'bloomed', hasCompanion, lensCounts, bestWPM, bestAccuracy, unlockedAt }` plus book mastery boolean.
  - `GET /api/verses/next?book=<Book>&chapter=<N>` (extension of existing route): returns lowest untyped `verseOrder` within `(book, chapter)`, or verse 1 of that chapter with `{ chapterComplete: true, verse }` when re-typing a completed chapter.
- **Success Criteria:**
  - Deleting a verse's last `Result` via `recomputeVerseProgress()` immediately causes `GET /api/companion/:book/:chapter` to return `unlocked: false` and `/api/trail/books/:book` to revert the chapter from `bloomed` to `in_progress`/`dormant`.
  - Both `/api/trail/overview` and `/api/trail/books/Psalms` respond in `< 1 s` against seeded data.
  - Full `mongodb-memory-server` test coverage in both `local` and `entra` auth modes.

### CAP-V3-4 — Non-Intrusive Chapter Bloom & Multi-Lens Companion Reading Room UI
- **Intent:** Celebrate chapter unlocks gracefully without breaking typing flow and present multi-lens study notes in a serene Editorial Atlas slide-over drawer.
- **Flow Protection Rules:**
  - `autoAdvance === true` OR `zenMode === true`: never auto-open `<CompanionDrawer />`; never blur `.typing-input-inline`. Show quiet **Chapter Bloom Whisper Pill** (standard mode) or **Zen Topbar Chip** (`✦ Psalm 23 Unlocked (N)`), pushing unlocked chapters into an in-session **Session Unlock Queue** (Session Harvest Strip).
  - `autoAdvance === false` AND `zenMode === false`: display an inline **Chapter Bloom Banner** inside `.results-container` with `Open Companion Reading Room` and `View on Living Trail`.
  - `Escape` precedence: closes `<CompanionDrawer />` (restoring focus) **without** exiting Zen Mode; when drawer is closed, `Escape` exits Zen Mode as before.
- **Reading Room Drawer (`<CompanionDrawer />`):**
  - Invocable from `/typing`, `/trail`, and `/dashboard` (`BookCoverage`).
  - Responsive sheet (`min(560px, 46vw)` desktop, `min(520px, 88vw)` tablet, full bottom/viewport sheet mobile), Editorial Atlas surface tokens (`--bg-ivory`, `--border-strong`, `Newsreader` 62ch prose measure).
  - Three ARIA tabs (`Hoodoo & Folk`, `Historical & Classic`, `Community r/Bible`) with Left/Right arrow keyboard navigation and graceful empty states per lens.
  - Renders Anna Riva structured fields cleanly: purpose heading cards (`purposes[]`), Psalm 119 Hebrew-letter octave badges (`ALEPH · Verses 1–8` through `TAU · Verses 169–176`), `ritualTags[]` chips, `citedVerses[]` references, cross-referenced `indexPurposes[]`, and full source/page attribution; plus Book Guide view for `book-introduction`, 14-slot `dailySchedule[]` (with direct `Type Psalm N` / `Read Companion` actions), and `bonus-meditations`.
- **Success Criteria:** Automated client tests verify focus retention under `autoAdvance` and `zenMode`, multi-chapter session queueing, `Escape` precedence, tab keyboard navigation, Psalm 119 octave rendering, and locked-chapter teaser handling.

### CAP-V3-5 — Stardew-Inspired 16-Bit Living Pixel Trail (Genesis + Psalms Slice)
- **Intent:** Provide a tactile, internally authored 16-bit pilgrimage map at `/trail` rooted in Black & Hoodoo folk craft, synced seamlessly to Light/Dark themes and accessible to all input modes.
- **Visual & Representation Rules:**
  - Locked pixel grid: `16 × 16 px` base tiles, `16 × 24 px` human sprites, `32 × 32 px` / `32 × 48 px` landmarks, integer DPR scaling (`imageSmoothingEnabled = false`, `image-rendering: pixelated`), warm selective outlines (`#1E1916` / `#0D0C0E`, never `#000000`).
  - **100% internal art pipeline:** Assets built/stored locally inside the repo with zero external image URLs (preserving Helmet CSP and offline reliability). Never edit the inline theme `<script>` in `client/public/index.html`.
  - **Dual Theme Palette LUT:** Light = *Golden-Hour Daylight*, Dark = *Lantern Twilight*, derived directly from `client/src/App.css` tokens.
  - **Universal Representation:** All human characters are Black (4-step warm melanin ramps). **Michael's traveler avatar** wears **clean modern casual clothes** (terracotta overshirt, ivory crewneck tee, dark slate tapered jeans, clean cream-and-terracotta sneakers, modern crossbody bag, brass lantern in twilight) contrasted against historic Phase 1 Biome Keepers (*Garden Root-Keeper* in Genesis, *Twilight Psalmist* in Psalms).
  - **Never use faux-pixel fonts** for UI labels, chapter numbers, or scripture text—keep `Newsreader`, `DM Sans`, and `JetBrains Mono`.
- **Two-Tier Spatial Hierarchy (Phase 1):**
  - **Tier 1 — Macro Atlas Trail Strip:** Displays all 9 canonical regions (73 books) with **Genesis** and **Psalms** active/playable and the remaining 71 books shown as mist-veiled future horizons.
  - **Tier 2 — Playable Biome Clearing:**
    - **Genesis (50 ch, *Eden Root-Garden*):** 5 Trail Legs (`Ch. 1–10`, `11–20`, `21–30`, `31–40`, `41–50`).
    - **Psalms (150 ch, *Shepherd's Twilight Pasture*):** 5 Classical Books of the Psalter (`Book I: 1–41`, `Book II: 42–72`, `Book III: 73–89`, `Book IV: 90–106`, `Book V: 107–150`), each subdivided into scenic clearings of 10–15 lantern posts.
  - **4 Visual Progression States:** `dormant` (mist veil + unlit stone), `in_progress` (kindling ember + progress ring + sprouts), `bloomed` (full-color botanicals + golden lantern halo + `✦` Companion seal), and `book mastery` (hero landmark illuminated + Biome Keeper present).
  - **Waypoint Interactions:** Clicking or activating a waypoint opens a popover with exact verse progress, `Type Chapter N →` / `Continue Typing →` (deep-linking to `/typing?book=<Book>&chapter=<N>`), and `Open Companion Reading Room` when bloomed.
  - **Quick-Jump & Accessibility:** Toolbar provides `[Next Active]`, `[Bloomed Only (N)]`, `[Leg / Psalter Selector]`, `[Book Guide]`, and `[Accessible Chapter List]` (NFR-2 table/list alternative). Interactive DOM `<button>` overlay over `<canvas>` waypoints supports roving `tabindex` + arrow keys. `prefers-reduced-motion: reduce` freezes animations/particles and disables slide transitions.
- **Success Criteria:** `/trail` renders Genesis & Psalms clearings cleanly in Light and Dark themes, passes keyboard-only traversal & Accessible Chapter List tests, respects `prefers-reduced-motion`, deep-links accurately to `/typing?book=...&chapter=...`, and leaves typing keystroke latency `< 50 ms` (NFR-3) untouched.

---

## 4. Non-Functional Requirements & Guardrails

| ID | Requirement | Verification |
| :--- | :--- | :--- |
| **NFR-V3-1** | **Keystroke Latency Preserved (`< 50 ms`)** | `<BiomeCanvas />` is never mounted on `/typing`; `TypingTest.tsx` only reads additive `chapterJustUnlocked` from the existing result-save response (zero extra API calls per keystroke or per non-completing verse). |
| **NFR-V3-2** | **Cosmos DB vCore Portability & Latency (`< 1 s`)** | All aggregations use Cosmos-compatible stages (`$match`, `$group`, `$sort`, `$project`, `$lookup` / indexed queries); `importCompanion.ts` batches writes with 16500/429 backoff; `/api/trail/*` and `/api/companion/*` respond `< 1 s`. |
| **NFR-V3-3** | **Accessibility (WCAG 2.1 AA + Reduced Motion)** | Contrast `>= 4.5:1` in Light and Dark modes; status never color-only (shape + glyph + text); roving-`tabindex` waypoint buttons; one-click Accessible Chapter List; `aria-live="polite"` whisper pills; `prefers-reduced-motion: reduce` compliance. |
| **NFR-V3-4** | **CSP & Security Integrity** | Zero changes to `client/public/index.html` inline theme script; zero external image/font/API calls for trail assets or Reddit; all new API routes gated by `protect`; zero private-owner files tracked in Git. |
| **NFR-V3-5** | **CI & Test Completeness** | `CI=true npm run typecheck && CI=true npm run build && CI=true npm test` passes with 0 ESLint warnings and 0 crashing suites; server tests run on `mongodb-memory-server`; client tests mock only `services/api.ts`. |

---

## 5. Explicit Non-Goals (Tabled for Future Phases)

- **In-app PDF upload / browser-side OCR:** Ingestion remains CLI-first via `scripts/book-preprocessor/` + `npm run import-companion`.
- **Playable pixel art for the remaining 71 canonical books:** Phase 1 renders Genesis and Psalms as playable trails and displays the other 71 books as mist-veiled Atlas horizons; Biomes 2 and 4–9 follow in Phase 2/3.
- **Live Reddit scraping or Firecrawl integration:** Express never makes outbound HTTP calls to Reddit; `r/Bible` curation is offline CLI-only (with optional future Reddit OAuth2 offline script if approved).
- **In-app personal commentary authoring / WYSIWYG note editor:** Deferred beyond Phase 1 (though `CompanionEntry` remains schema-compatible with future `owner-authored` entries).
- **Multi-user sharing, public companion feeds, or AI-generated commentary at runtime:** Single-owner private workspace only.
- **Non-Bible text typing studio (e.g., Du Bois, Marcus Aurelius):** Data contracts include `workId: "web-bible"` today so future corpora plug in without schema migration, but Phase 1 UI/typing remains WEB Bible only.

---

## 6. Success Signal

Michael signs into Typing the Bible (`local` or Entra), imports his preprocessed Anna Riva *Power of the Psalms* bundle plus Phase 1 public-domain & curated `r/Bible` bundles via CLI, types the final verse of **Psalm 23** in Auto-Advance or Zen Mode without losing focus, clicks the quiet **Chapter Bloom Whisper Pill** to read all three lenses (*Hoodoo & Folk*, *Historical & Classic*, *Community `r/Bible`*) in the Editorial Atlas drawer, and visits **`/trail`** to see his Black traveler in clean modern casual clothes standing beside a newly bloomed lantern in *Shepherd's Twilight Pasture*—switching smoothly between Golden-Hour Daylight, Lantern Twilight, and the Accessible Chapter List.
