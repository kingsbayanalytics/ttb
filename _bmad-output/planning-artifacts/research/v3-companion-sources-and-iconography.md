# Typing the Bible v3 — Deep Recon: Multi-Lens Companion Sources, Schema & 73-Book Iconography

**Author:** Chardia (Business Analyst — Deep Recon)  
**Date:** 2026-11-19  
**Target Canon:** World English Bible (WEB) Catholic Edition — **73 books, 1,328 chapters, 35,379 verses** ([bookMapping.ts](file:///Users/mikewarren/ttb/server/src/utils/bookMapping.ts), [WEB_Catholic_Version_for_game_updated.csv](file:///Users/mikewarren/ttb/data/WEB_Catholic_Version_for_game_updated.csv))  
**Target Stack:** React 18 + Express 4 + Mongoose 8 + Azure Cosmos DB for MongoDB vCore (single-owner private app behind Azure Entra Easy Auth)

---

## Executive Summary & Critical Findings

1. **Copyright Split Enables Rich Personal Commentary Without Polluting Git:** Because Typing the Bible is a single-owner Entra-authenticated application, companion content divides cleanly into two storage tiers controlled by a `visibility` flag (`public-domain` vs. `private-owner`):
   - **Public-domain commentaries** (Haydock 1859, 1913 Catholic Encyclopedia, R. H. Charles 1913, Spurgeon, Matthew Henry, Puckett 1926, Godfrey Selig pre-1923 editions) can be ingested reproducibly from open archives and safely referenced in repo seed pipelines.
   - **In-copyright owner-vault works**—specifically **Anna Riva's *Powers of the Psalms* (© 1982)**, **Zora Neale Hurston's *Mules and Men* (© 1935, renewed `R321025`, US PD on Jan 1, 2031)**, and **Hurston's *"Hoodoo in America"* (1931 *JAF*, renewal unverified; unconditional US PD Jan 1, 2027)**—must **never** be committed to Git or bundled into static client files. Instead, Michael ingests his legally owned PDFs/notes via a local offline CLI directly into his private Cosmos DB (`visibility: 'private-owner'`).
2. **Full 73-Book Coverage Requires a Catholic + Deuterocanonical Backbone:** Most popular Protestant public-domain JSON datasets (Matthew Henry, Spurgeon, Pulpit) stop at 66 books. Combining **Father George Leo Haydock's *Catholic Bible Commentary* (1859)**, ***The Catholic Encyclopedia* (1913)**, and **R. H. Charles's *Apocrypha and Pseudepigrapha* (1913)** achieves **100% coverage of all 73 books / 1,328 chapters**, including the 9-book Deuterocanonical/Greek block (`TOB`, `JDT`, `ESG`, `WIS`, `SIR`, `BAR`, `1MA`, `2MA`, `DAG`) located at positions #38–46 in `bookMapping.ts`.
3. **Mandatory Psalm & Book-Name Normalization for Haydock:** Haydock (1859) follows **Douay-Rheims / Latin Vulgate** numbering, which shifts **Psalms 9–147** by one chapter relative to WEB/Masoretic numbering (and uses legacy book names like *Ecclesiasticus* = Sirach, *1–4 Kings* = 1–2 Samuel / 1–2 Kings). An explicit normalizer table is required in the ingestion CLI so chapter unlocks never mismatch.
4. **Firecrawl Is Blocked on Reddit; Official Reddit OAuth Now Requires Pre-Approval:** As of 2025–2026, **Firecrawl actively restricts/blocks `reddit.com`** due to anti-bot enforcement and Terms of Service, and Reddit's **Responsible Builder Policy** phased out instant self-service OAuth `script` app creation in favor of manual pre-approval. For `r/Bible` curation, use an **offline human-curated import CLI** immediately (Day 1) and add an **approved non-commercial OAuth2 script** (100 QPM free tier) once Reddit approves the ticket—storing paraphrased takeaways + short attributed excerpts with permalinks, never raw bulk dumps, and never scraping live from Express.
5. **9 Cohesive Stardew-meets-Hoodoo Biomes Cover All 73 Books:** Section 3 maps every canonical book to a named landmark, folkloric/botanical prop, and misty-to-bloomed visual state harmonized with `client/src/App.css`, giving Helia an immediate Phase 1 slice (**Genesis = Eden Root-Garden** + **Psalms = Shepherd's Twilight Pasture**) and a unified 73-book roadmap.

---

## 1. Multi-Lens Companion Source Matrix

### 1.1 Lens A — Hoodoo, Rootwork & African-American Folkloric (`lens: 'hoodoo-folk'`)

| Source | Author / Year | Canon Coverage | Copyright Status (US, 2026) | Recommended Ingestion & Storage Pattern | Digital Access / Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ***Powers of the Psalms*** | Anna Riva (Dorothy Spencer), **1982** (International Imports) | **Psalms (all 150 chapters; 375 workings)** — uses KJV/Masoretic numbering (= 1:1 with WEB) | **In Copyright** (1982 + modern reprints 2008/2015) | **Private Owner CLI only:** parse Michael's personal PDF locally -> Cosmos DB (`visibility: 'private-owner'`). Never commit PDF/JSON to Git. Extract structured `intentionTags`, candle/herb motifs, and concise summary. | Owner's local PDF |
| ***Mules and Men*** | Zora Neale Hurston, **1935** (J. B. Lippincott) | Cross-book Hoodoo/conjure ethnography (Mosaic lore, Exodus, Psalms, biblical folk authority) | **In Copyright** (orig. `A87313`; renewed Aug 27, 1963 as `R321025` -> US PD **Jan 1, 2031**) | **Private Owner / Fair-Use Synthesis:** store thematic Hoodoo ethnographic takeaways + brief attributed quotes with page/chapter citations (`visibility: 'private-owner'`). Do not commit verbatim chapters. | Owner's copy / library reference (Wikisource / U.S. Copyright records) |
| ***"Hoodoo in America"*** | Zora Neale Hurston, **1931** (*Journal of American Folklore*, Vol. 44, No. 174, pp. 317–417) | Psalms & conjure prescriptions from New Orleans & Bahamas fieldwork | **Threshold / Verify Renewal** (1931 periodical; depends on individual + AFS collective renewal in CCE; unconditional US PD **Jan 1, 2027**) | Treat conservatively as **`private-owner`** until Jan 1, 2027 (or CCE non-renewal proof); extract ritual/scripture cross-references and citations. | JSTOR / Duke University archive / *JAF* Vol. 44 |
| ***Secrets of the Psalms*** (*Shimmush Tehillim*) | Godfrey Selig (1788 German; pre-1923 US English translations) | **Psalms (all 150)** — foundational ancestor of Hoodoo Psalm-work & Pow-wow | **Public Domain (pre-1923 editions only)**; *avoid* 1982 Dorene Publishing revised text | **Public-Domain Seed:** ingest from verified pre-1923 scan/transcription (Internet Archive) to provide an open-license companion baseline alongside Riva. | Internet Archive (pre-1923 editions) |
| ***Folk Beliefs of the Southern Negro*** | Newbell Niles Puckett, **1926** (UNC Press) | Broad Southern Black folklore, conjure, rootwork, protective & biblical folk traditions | **Confirmed Public Domain** (published pre-1931) | **Public-Domain Seed:** curate chapter-linked folkloric cards (especially Pentateuch, Psalms, Proverbs, Gospels, Revelation) with historical framing. | Internet Archive & HathiTrust full-text scans |
| ***The Book of American Negro Spirituals*** & Pre-1931 *JAF* Folklore | James Weldon Johnson & J. Rosamond Johnson (**1925**); Roland Steiner (1899–1901) | **Cross-canon bridge:** Genesis, Exodus (*Go Down Moses*), Joshua (*Jericho*), Ezekiel (*Dry Bones*), Daniel (*Deliver Daniel*), Gospels, Revelation (*Wade in the Water*) | **Confirmed Public Domain** (pre-1931) | **Public-Domain Seed:** extends the African-American spiritual/folkloric lens gracefully across non-Psalm books so the *Hoodoo & Folk* tab stays meaningful throughout the Bible. | Internet Archive / HathiTrust / *JAF* archives |

> **Editorial Framing Guardrail:** Present Hoodoo, conjure, and African-American spiritual traditions with cultural reverence and historical rigor (as living heritage, oral theology, and folk practice)—never caricature, sensationalized "spooky" aesthetics, or clinical dismissal.

---

### 1.2 Lens B — Catholic & Historical Public-Domain 73-Book Coverage (`lens: 'historical-classic'`)

| Source | Author / Era | Canon Coverage | Copyright Status | Best Structured Machine-Readable Sources | Technical Notes & Gotchas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ***Catholic Bible Commentary*** (1859 Dunigan Ed.) | Fr. George Leo Haydock (1811–1814; rev. 1859) | **All 73 Catholic Books (100%)** including Deuterocanonicals & Greek Esther/Daniel | **Public Domain** | • GitHub [`Data-Science-Link/the_depositum`](https://github.com/Data-Science-Link/the_depositum) (Python EPUB->Markdown pipeline)<br>• Todd Easton transcription (`haydock1859.tripod.com`) & e-Sword/MySword SQLite modules (`biblesupport.com`)<br>• Internet Archive full OCR (`douay-rheims-bible-with-haydock-commentary-complete`) | **CRITICAL:** Uses Douay-Rheims/Vulgate Psalm numbering (shift across Ps 9–147) and legacy DR book names. Requires normalization map (see §1.2.1). |
| ***The Catholic Encyclopedia*** (1907–1914) | Robert Appleton Co. (15 vols. + index) | **All 73 Books** (rich book-level historical, literary, and canonical introductions) | **Public Domain** | • English Wikisource (`Catholic_Encyclopedia_(1913)`) via **MediaWiki API**<br>• Internet Archive XML/hOCR/JSON dumps<br>• New Advent (`newadvent.org/cathen/`) | Ideal for **book-level intro cards** (`chapter: 0` or shown on Chapter 1 unlock) across all 73 books, especially Deuterocanonicals. |
| ***The Apocrypha and Pseudepigrapha of the OT*** (Vol. I) | R. H. Charles, ed. (**1913**, Clarendon Press) | **All Deuterocanonicals + Greek Additions** (`TOB`, `JDT`, `ESG`, `WIS`, `SIR`, `BAR` + Letter of Jeremiah, `1MA`, `2MA`, `DAG` Susanna/Bel) | **Public Domain** (1913; author d. 1931) | • Internet Archive (Vol. I Apocrypha)<br>• CCEL (`ccel.org`)<br>• Wikisource | Best scholarly historical-critical counterweight to Haydock for the 9-book Deuterocanonical/Greek section (#38–46). |
| ***Cambridge Bible for Schools & Colleges*** (Apocrypha vols.) | Various Cambridge scholars (late 19th–early 20th c.) | Individual verse/chapter commentaries on **Wisdom, Sirach (Ecclesiasticus), 1 Maccabees, Tobit, Judith** | **Public Domain** (verify each vol. pre-1931) | • Internet Archive & Google Books scans | Optional enrichment for deep Deuterocanonical chapters where concise summaries are desired. |
| ***The Treasury of David*** | Charles H. Spurgeon (**1869–1885**) | **Psalms (all 150 chapters)** — exposition, homiletic hints, quaint sayings | **Public Domain** | • GitHub `LyteWord` structured Markdown<br>• CCEL (`ccel.org`) | Uses KJV/Masoretic numbering (= **1:1 match with WEB**). Excellent literary contrast alongside Anna Riva in Phase 1! |
| ***Matthew Henry's Complete / Concise Commentary*** | Matthew Henry (**1706–1714**) | **66 Protocanonical Books** (Gen–Mal, Mat–Rev) | **Public Domain** | • **`HelloAOLab/bible-api`** (bulk SQLite `bible.eng.db` + JSON `/api/c/{commentary}/{book}/{chapter}.json`)<br>• GitHub `LyteWord` Markdown | Fastest, cleanest structured JSON/SQLite ingest for Phase 1 (`GEN` + `PSA`) and all 66 protocanonical books. Concise edition fits drawer length well. |
| ***Catena Aurea*** (Golden Chain) | St. Thomas Aquinas (1260s; trans. J. H. Newman, 1841–45) | **4 Gospels** (`MAT`, `MRK`, `LUK`, `JHN`) — patristic anthology | **Public Domain** | • CCEL / Internet Archive / e-Sword modules | High-value patristic commentary for Biome 7 (Galilean Harbor). |

#### 1.2.1 Mandatory Haydock / Douay-Rheims Normalization Rules

Before upserting Haydock 1859 into Cosmos DB, the offline ingestion CLI **must** apply two deterministic transforms:

1. **Psalm Number Alignment (Vulgate/DR -> WEB/Masoretic):**
   - `DR 1–8` -> `WEB 1–8` (identical)
   - `DR 9` -> split: vv. 1–21 -> `WEB 9`, vv. 22–39 -> `WEB 10`
   - `DR 10–112` -> **`WEB (n + 1)`** (i.e., `WEB 11–113`)
   - `DR 113` -> split: vv. 1–8 -> `WEB 114`, vv. 9–26 -> `WEB 115`
   - `DR 114` + `DR 115` -> merge into **`WEB 116`**
   - `DR 116–145` -> **`WEB (n + 1)`** (i.e., `WEB 117–146`)
   - `DR 146` + `DR 147` -> merge into **`WEB 147`**
   - `DR 148–150` -> `WEB 148–150` (identical)
2. **Book Alias & Greek-Chapter Mapping:**
   - `1–2 Kings (DR)` -> `1–2 Samuel`; `3–4 Kings (DR)` -> `1–2 Kings`; `1–2 Esdras (DR)` -> `Ezra` / `Nehemiah`; `Paralipomenon` -> `Chronicles`; `Canticle of Canticles` -> `Song of Solomon`; `Ecclesiasticus` -> `Sirach`; `Machabees` -> `Maccabees`; `Apocalypse` -> `Revelation`; `Tobias` -> `Tobit`; `Osee/Micheas/Habacuc/Sophonias/Aggeus/Zacharias` -> standard WEB names in `bookMapping.ts`.
   - **CSV-Specific Detail:** In `WEB_Catholic_Version_for_game_updated.csv`, `ESG` (Esther) has **10 chapters** (`1–10`, Greek additions woven in) and `DAG` (Daniel) has **14 chapters** (`1–14`, including Susanna in ch. 13 and Bel & the Dragon in ch. 14). Both align naturally with Haydock and R. H. Charles once chapter numbers are validated against the CSV's chapter set.

---

### 1.3 Lens C — Curated Community `r/Bible` Cards (`lens: 'community-notes'`)

#### Firecrawl vs. Reddit Official OAuth API vs. Human-Curated Local CLI

| Dimension | Firecrawl (`firecrawl.dev`) | Reddit Official OAuth2 API | Human-Curated Offline CLI Import (Recommended Day 1) |
| :--- | :--- | :--- | :--- |
| **Works on `reddit.com`?** | **No — blocked/restricted.** Firecrawl actively blocks major social media platforms (including Reddit, Instagram, TikTok, YouTube) and returns unsupported-site errors to comply with anti-bot and legal pressure. | **Yes — once approved.** Requires OAuth2 credentials + descriptive `User-Agent`. | **Yes — immediate.** Michael bookmarks/exports specific threads he personally finds illuminating and runs a local CLI importer. |
| **TOS / Legal Posture** | **Violates Reddit User Agreement** (prohibits unauthorized automated scraping/harvesting). *Use Firecrawl only on open PD sites (e.g., CCEL/New Advent) if needed.* | **TOS-compliant** under Free Non-Commercial Tier (**100 QPM**), strictly zero commercial monetization. | **Low-friction & TOS-respectful** when storing curated synthesis + short fair-use quotes + attribution + permalink. |
| **Access Friction (2025–2026)** | Blocked on target domain. | **High initial delay:** Reddit's **Responsible Builder Policy** phased out instant self-service `script` app creation on `reddit.com/prefs/apps`. Developers must submit a manual pre-approval ticket detailing exact read-only endpoints, personal use, and low volume (weeks wait; hobbyist rejections common). | **Zero delay.** Ready for Phase 1 vertical slice (Genesis + Psalms) immediately; seamlessly upgrades to OAuth-assisted discovery if/when Reddit approves the ticket. |
| **Runtime Server Impact** | N/A | **Offline CLI only** — Express never calls Reddit live. | **Offline CLI only** — Express reads pre-curated docs from Cosmos DB. |

#### Copyright, Attribution & Community Curation Guardrails

1. **User Copyright & Fair Use:** Under Reddit's User Agreement, **individual Redditors retain copyright** to their posts and comments. Never bulk-dump entire comment trees verbatim. Instead, each curated `r/Bible` card should store:
   - A **human/editorial synthesis** (`summary` + `bodyMarkdown` in Michael's curated voice, framing the discussion question and top 2–3 perspectives),
   - Optional **brief attributed quote excerpt** (`<= 300 characters`),
   - Full provenance: `subreddit` (`r/Bible`, optionally `r/AcademicBiblical`), `authorHandle` (`u/...`), `permalink`, `threadTitle`, `upvotesAtCapture`, and `retrievedAt`.
2. **Private Vault & Non-Redistribution:** Tag all community cards `visibility: 'private-owner'` and `license: 'fair-use-excerpt'`. Never commit scraped Reddit JSON to public Git repositories and never use Reddit content for ML/LLM model training.
3. **Deletion Hygiene & Staging Review:** All offline CLI runs write to a local staging file (ignored by `.gitignore`) where Michael reviews/approves cards before upserting (`status: 'draft' -> 'published'`). If a source thread is later deleted (`[deleted]`/`[removed]`), provide a CLI prune command.
4. **Submission Tip if Requesting Reddit OAuth Approval:** Submit a ticket via Reddit's Responsible Builder Policy channel stating explicitly: *(a) single-user private non-commercial personal study journal, (b) strictly read-only `GET` on `r/Bible` search/comments, (c) offline manual CLI run `< 20 QPM` (well below 100 QPM), (d) no AI training, no redistribution, no monetization.*

---

## 2. Suggested `CompanionEntry` Schema (`workId`-Extensible)

Designed to fit seamlessly beside `server/src/models/Verse.ts` and `server/src/models/Progress.ts` on **Azure Cosmos DB for MongoDB vCore** while keeping `Result` and `Progress` untouched (honoring Architecture Decision AD-3).

### 2.1 Core Collection: `CompanionEntry` (`server/src/models/CompanionEntry.ts`)

```ts
export type CompanionLens =
  | 'hoodoo-folk'
  | 'historical-classic'
  | 'community-notes'
  | 'personal-note';

export type CompanionVisibility = 'public-domain' | 'private-owner';

export type CompanionLicense =
  | 'public-domain'
  | 'private-owner-pdf'
  | 'fair-use-excerpt'
  | 'owner-authored';

export interface ICompanionSourceMeta {
  sourceId: string;           // Stable slug: 'anna-riva-psalms-1982', 'haydock-1859', 'spurgeon-tod', 'reddit-rbible'
  title: string;              // Display title: 'Powers of the Psalms'
  author?: string;            // 'Anna Riva', 'Fr. George Leo Haydock', 'u/scholar_example'
  publicationYear?: number;   // 1982, 1859, 1913
  edition?: string;           // '1859 Dunigan Ed.'
  numberingSystem?: 'masoretic-web' | 'vulgate-dr' | 'native';
  originalRef?: string;       // e.g. 'Douay-Rheims Psalm 22' when normalized to WEB Psalm 23
  url?: string;               // Reference URL or Reddit permalink
  subreddit?: string;         // 'r/Bible'
  authorHandle?: string;      // 'u/...' (community cards)
  license: CompanionLicense;
  retrievedAt?: Date;
}

export interface ICompanionFolkMetadata {
  intentionTags: string[];        // ['protection', 'peace', 'guidance', 'prosperity']
  traditionalElements?: string[]; // ['white candle', 'hyssop', 'spring water']
  timingOrCadence?: string;       // e.g. 'Read at dawn or before travel'
}

export interface ICompanionEntry {
  // --- Extensible Work & Location Addressing ---
  workId: string;             // Default: 'web-catholic-bible'; future: 'du-bois-souls-1903', 'aurelius-meditations'
  sectionKey: string;         // USFM code for Bible ('GEN', 'PSA', 'TOB'); part/essay slug for non-Bible ('ch-01')
  book: string;               // Canonical display name ('Genesis', 'Psalms') — matches Verse.book 1:1
  chapter: number;            // 1..150 for Bible chapters; 0 reserved for Book-level intro (e.g. 1913 Catholic Encyc.)
  verseStart?: number;        // Optional verse-level callout inside a chapter
  verseEnd?: number;

  // --- Multi-Lens Classification & Safety ---
  lens: CompanionLens;
  visibility: CompanionVisibility; // Hard guard against exporting private PDFs / Reddit cards into public seeds
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;          // Deterministic card order within a lens tab

  // --- Editorial Content ---
  headline: string;           // Crisp drawer heading (<= 100 chars)
  summary: string;            // 1-2 sentence scannable lead-in for post-session drawer
  bodyMarkdown: string;       // Full formatted reading-room body
  quoteExcerpt?: string;      // Optional short attributed quotation (<= 400 chars for fair use)
  keyThemes: string[];        // Cross-lens tags: ['shepherd', 'protection', 'still-waters']
  folkMeta?: ICompanionFolkMetadata; // Populated for 'hoodoo-folk' entries

  // --- Provenance & Idempotency ---
  source: ICompanionSourceMeta;
  contentHash: string;        // SHA-256 of canonical body for idempotent CLI bulkWrite upserts (like importData.ts)
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 2.2 Recommended Cosmos DB Indexes

```ts
// 1. Primary post-session drawer lookup (book + chapter + published cards grouped by lens)
companionEntrySchema.index({ workId: 1, book: 1, chapter: 1, status: 1, lens: 1, sortOrder: 1 });

// 2. USFM / sectionKey lookup (used by trail biome map & future non-Bible works)
companionEntrySchema.index({ workId: 1, sectionKey: 1, chapter: 1, status: 1 });

// 3. Idempotent offline CLI upsert key (prevents duplicate imports across re-runs)
companionEntrySchema.index(
  { workId: 1, sectionKey: 1, chapter: 1, lens: 1, 'source.sourceId': 1, sortOrder: 1 },
  { unique: true }
);

// 4. Optional theme/intention browse index (Reading Room search/filter)
companionEntrySchema.index({ workId: 1, lens: 1, keyThemes: 1 });
```

### 2.3 Companion Work Registry & Unlock State Architecture

- **Optional `CompanionWork` Registry (Lightweight Config or Collection):** Start as a typed registry (`server/src/utils/companionWorks.ts`) containing `{ workId: 'web-catholic-bible', title: 'World English Bible (Catholic)', unitLabel: 'Chapter', sectionLabel: 'Book', totalSections: 73, totalUnits: 1328 }`. When Michael adds a second book (e.g., W. E. B. Du Bois's *The Souls of Black Folk* or Marcus Aurelius's *Meditations*), no `CompanionEntry` migration is needed—only a new `workId` entry!
- **Deriving Chapter Unlock Without Mutating `Progress`:** A chapter `(book, chapter)` is unlocked when the count of `Progress` docs with `{ user, completed: true }` for verses in that chapter equals the `Verse` count for `(book, chapter)`. For fast Trail Map rendering across all 1,328 chapters, an aggregation pipeline (similar to `stats/buildCoverage`) returns `{ book, chapter, completedVerses, totalVerses, state: 'locked' | 'in-progress' | 'bloomed' }` in a single query—zero duplication of `Progress` truth.

### 2.4 Extensibility Proof: Side-by-Side Document Examples

```json
// Example 1: Bible — Psalms 23 (Hoodoo & Folk lens from Michael's private PDF)
{
  "workId": "web-catholic-bible",
  "sectionKey": "PSA",
  "book": "Psalms",
  "chapter": 23,
  "lens": "hoodoo-folk",
  "visibility": "private-owner",
  "status": "published",
  "sortOrder": 1,
  "headline": "Guidance, Provision & Quiet Courage",
  "summary": "Traditional Hoodoo petitionary use of Psalm 23 for steady guidance, protection in uncertain seasons, and blessing the home.",
  "bodyMarkdown": "...",
  "keyThemes": ["guidance", "protection", "provision", "peace"],
  "folkMeta": {
    "intentionTags": ["guidance", "revelation", "home-blessing"],
    "traditionalElements": ["white candle", "anointing oil", "quiet reading at dusk"]
  },
  "source": {
    "sourceId": "anna-riva-psalms-1982",
    "title": "Powers of the Psalms",
    "author": "Anna Riva",
    "publicationYear": 1982,
    "numberingSystem": "masoretic-web",
    "license": "private-owner-pdf"
  }
}
```

```json
// Example 2: Future Non-Bible Work — Du Bois's The Souls of Black Folk (1903, US PD)
{
  "workId": "du-bois-souls-1903",
  "sectionKey": "ch-01",
  "book": "Of Our Spiritual Strivings",
  "chapter": 1,
  "lens": "historical-classic",
  "visibility": "public-domain",
  "status": "published",
  "sortOrder": 1,
  "headline": "The Veil, Double-Consciousness & the Sorrow Songs",
  "summary": "Historical context on Du Bois's 1903 framing of double-consciousness and his pairing of each chapter with bars from African-American spirituals.",
  "bodyMarkdown": "...",
  "keyThemes": ["double-consciousness", "spirituals", "reconstruction"],
  "source": {
    "sourceId": "owner-study-guide-dubois",
    "title": "Personal Reading Notes",
    "numberingSystem": "native",
    "license": "owner-authored"
  }
}
```

---

## 3. 73-Book Biblical Landmark Iconography Map (9 Stardew-meets-Hoodoo Visual Biomes)

### 3.1 Visual Grammar & Palette Harmonization (Handoff to Helia)

- **Design System Bridge (`client/src/App.css`):** Every biome's pixel palette anchors to the existing Editorial Atlas tokens—parchment `#F5F3EE` / obsidian `#121214` skies & paper frames, terracotta `#B84A39` / `#E07A5F` clay & hearth glow, slate-blue `#345474` / `#6D9DC5` water & twilight mist, ochre `#8A6A2F` / `#D4A359` lantern brass & harvest grain, and botanical green `#1F6E38` / `#4ADE80` blooming foliage.
- **Stardew-meets-Hoodoo Craft Motifs:** Warm 16-bit coziness infused with African-American Southern & Hoodoo heritage—red-clay crossroads, drying herb bundles (rosemary, hyssop, bay, sage), brass/glass oil lanterns, woven sweetgrass baskets, iron kettles, blue-glass bottle trees, cedar porches, handwritten ledger books, and living water springs.
- **Representation Rule:** Every human sprite along the trail—the protagonist traveler (Michael) and all regional elders, shepherds, artisans, midwives, prophets, fishermen, and neighbors—is depicted as **Black**, rendered with warm, dignified 16-bit pixel craft.
- **Three Visual Progression States per Book/Chapter:**
  - **Locked / Unvisited:** Soft parchment/twilight mist, monochrome stone/slate silhouette, unlit lantern.
  - **In-Progress (`> 0%` typed):** Warm lantern flicker at the trailhead, first sprouts pushing through red clay, traveler sprite camped at current chapter milestone.
  - **Bloomed (`100%` chapter/book typed):** Full color saturation, blooming botanicals, warm golden particles/fireflies, illuminated landmark banner, companion drawer badge unlocked.

### 3.2 Biome Overview (Exact Canon Order = 73 Books, 1,328 Chapters)

| # | Biome / Region Name | Canon Range (`bookMapping.ts`) | Books | Chapters | Dominant Atmosphere & CSS Token Anchor |
| :-: | :--- | :--- | :-: | :-: | :--- |
| **1** | **The Root-Garden & Red-Clay Wilderness** | `GEN`–`DEU` (#1–5) | 5 | 187 | Dawn garden loam, braided rivers, red clay & cedar tents (`--success-color` + `--accent-terracotta`) |
| **2** | **Red-Clay Crossroads & Hearth-Towns** | `JOS`–`NEH` (#6–16) | 11 | 241 | Sun-warmed wheat fields, stone walls, forge & mason hearths (`--accent-ochre` + `--accent-clay`) |
| **3** | **Shepherd's Twilight Pasture & Elder's Timber Study** | `JOB`–`SNG` (#17–21) | 5 | 243 | Indigo twilight pasture, lantern-lit porch, cedar study & herb rafters (`--accent-slate-blue` + `--accent-ochre`) |
| **4** | **Ember Ridge & Watchman's Bluffs** | `ISA`–`EZK` (#22–25) | 4 | 171 | Terracotta canyon mesas, potter's kilns, weeping willows & starry wheels (`--accent-terracotta` + `--ink-primary`) |
| **5** | **Harvest Hollows & Twelve Lantern Crossroads** | `HOS`–`MAL` (#26–37) | 12 | 67 | Autumn country lane with twelve wayside shrines, orchards & harbors (`--accent-ochre` + `--success-color`) |
| **6** | **The Lantern-Lit Apothecary & Silver Citadel** | `TOB`–`DAG` (#38–46) | 9 | 151 | Moonlit courtyard, healing-herb apothecary, Persian gardens & menorah fire (`--accent-slate-blue` + `--accent-ochre`) |
| **7** | **Galilean Harbor & Cypress Groves** | `MAT`–`ACT` (#47–51) | 5 | 117 | Shimmering slate-blue piers, fishing skiffs, olive hills & Pentecost sails (`--accent-slate-blue` + `--success-color`) |
| **8** | **The Post-Road Lantern Towns** | `ROM`–`PHM` (#52–64) | 13 | 87 | Coastal crossroads post-houses, wax-sealed mailbags & fellowship porches (`--accent-terracotta` + `--accent-ochre`) |
| **9** | **Crown of Stars & River of Life** | `HEB`–`REV` (#65–73) | 9 | 64 | Ascending mist-stone sanctums opening to jasper shores & healing trees (`--accent-ochre` + `--accent-slate-blue`) |
| | **Total** | **All 73 WEB Catholic Books** | **73** | **1,328** | **100% alignment with `bookMapping.ts`** |

---

### 3.3 Complete 73-Book Landmark Iconography Map

#### Biome 1: The Root-Garden & Red-Clay Wilderness *(Books 1–5 · 187 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 1 | `GEN` | **Genesis** *(Phase 1)* | 50 | **Eden Root-Garden** | Four-river crossroads, ancient fig & pomegranate canopy, braided sweetgrass, drying High John & sage bundles; blooms with rainbow prism & fireflies. |
| 2 | `EXO` | Exodus | 40 | **Red-Sea Crossing & Burning Acacia** | Parted slate-blue tide walls, glowing ember-acacia bush, brass travel lantern & staff leaning by red-clay shore. |
| 3 | `LEV` | Leviticus | 27 | **Cedar Tabernacle Apothecary** | Fragrant frankincense brazier, woven linen curtains, hyssop cleansing basin & hanging botanical jars. |
| 4 | `NUM` | Numbers | 36 | **Cloud-Pillar Campgrounds** | Twelve ringed canvas tents around a central hearth fire, budding almond rod sprouting white blossoms on bloom. |
| 5 | `DEU` | Deuteronomy | 34 | **Nebo Overlook Porch** | High stone ridge overlooking a verdant valley, carved wooden tablet post, wind-chimes & elder's walking staff. |

#### Biome 2: Red-Clay Crossroads & Hearth-Towns *(Books 6–16 · 241 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 6 | `JOS` | Joshua | 24 | **River-Stone Ford & Trumpet Wall** | Twelve stacked smooth river stones at Jordan's edge, ram's horn resting on cedar fence, crimson cord fluttering from a window. |
| 7 | `JDG` | Judges | 21 | **Deborah's Palm & Clay-Pitcher Ridge** | Shaded date-palm council seat, terracotta pitchers concealing warm torchlight, golden fleece on morning dew. |
| 8 | `RUT` | Ruth | 4 | **Barley Gleaning Meadow** | Sunlit amber barley sheaves, woven harvest basket, farmhouse porch with two glowing welcome lanterns. |
| 9 | `1SA` | 1 Samuel | 31 | **Shiloh Lamp-House & Brook Stones** | Nighttime temple oil lamp, five smooth sling-stones beside a bubbling creek, horn of anointing oil. |
| 10 | `2SA` | 2 Samuel | 24 | **Cedar Harp-Court & Threshing Floor** | Stone courtyard with timber music stand, wooden harp, altar hearth rising on a breezy hilltop. |
| 11 | `1KI` | 1 Kings | 22 | **Cedar-Beam Temple & Raven Brook** | Warm golden-ochre sanctuary pillars, brookside juniper tree with black ravens bringing loaves, raincloud on the horizon. |
| 12 | `2KI` | 2 Kings | 25 | **Widow's Oil-Jar Cottage** | Shelves of gleaming earthenware oil jars, river dipping steps (Jordan), fiery ember-chariot streak across dusk sky. |
| 13 | `1CH` | 1 Chronicles | 29 | **Genealogy Oak & Singers' Pavilion** | Wide ancestral live-oak with brass name-tags hanging from boughs, choir pavilion with tambourines and cymbals. |
| 14 | `2CH` | 2 Chronicles | 36 | **Watchfire Courtyard & Brass Basin** | Courtyard bronze water-sea reflecting starlight, festival lanterns, trumpets gleaming along terraced steps. |
| 15 | `EZR` | Ezra | 10 | **Scribe's Reading Arbor** | Wooden outdoor lectern draped in indigo cloth, open parchment scrolls, masonry foundation stones freshly laid. |
| 16 | `NEH` | Nehemiah | 13 | **Lantern-Lit Mason's Gate** | Rebuilt red-stone town gate, mason's trowel resting beside a brass lantern, terraced herb garden inside the wall. |

#### Biome 3: Shepherd's Twilight Pasture & Elder's Timber Study *(Books 17–21 · 243 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 17 | `JOB` | Job | 42 | **Whirlwind Ash-Porch & Starry Orchard** | Weather-worn porch lantern enduring storm clouds; on bloom, Pleiades & Orion shine over a restored twice-blessed orchard. |
| 18 | `PSA` | **Psalms** *(Phase 1)* | 150 | **Shepherd's Twilight Pasture** | Quiet green pasture beside mirror-still water, hanging hyssop & rosemary bundles on a wooden arbor, oil-lantern crook, five trail clearings matching the 5 Books of the Psalter (Ps 1–41, 42–72, 73–89, 90–106, 107–150). |
| 19 | `PRO` | Proverbs | 31 | **Elder's Timber Study** | Warm cedar cabin interior/porch, crackling hearth, brass balance scale, open commonplace ledger, apothecary tea kettle & spindle. |
| 20 | `ECC` | Ecclesiastes | 12 | **Sundial Courtyard & Silver Cord Well** | Mossy stone sundial encircled by four-season shrubs (sprout, bloom, harvest, frost), deep courtyard well with brass pulley. |
| 21 | `SNG` | Song of Solomon | 8 | **Spikenard & Pomegranate Arbor** | Moonlit trellis overflowing with myrrh, cinnamon, henna blossoms, wild lilies, and twin turtledoves perched above garden walls. |

#### Biome 4: Ember Ridge & Watchman's Bluffs *(Books 22–25 · 171 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 22 | `ISA` | Isaiah | 66 | **Glowing Coal Forge & Rose-Desert Highway** | Tongs holding a live hearth-coal, plowshares hammered at an anvil, wild desert roses blooming along a cleared red-clay road. |
| 23 | `JER` | Jeremiah | 52 | **Potter's Red-Clay Wheelhouse** | Spinning terracotta wheel, almond-branch sprig in a clay jug, sealed deed jar buried in rich dark soil. |
| 24 | `LAM` | Lamentations | 5 | **Weeping Willow Gate** | Rain-misted stone archway draped in silver willows; blooms with first dawn-ochre sunbeam ("mercies new every morning"). |
| 25 | `EZK` | Ezekiel | 48 | **Dry-Bones Meadow & Living River-Bluff** | Starry wind-swept valley sprouting emerald grass & wildflowers, watchtower wheel-lantern, clear stream widening toward healing fruit trees. |

#### Biome 5: Harvest Hollows & Twelve Lantern Crossroads *(Books 26–37 · 67 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 26 | `HOS` | Hosea | 14 | **Dew-Crowned Vineyard Gate** | Dew-sparkled olive shoots & grape arbors opening onto a Valley of Hope doorway. |
| 27 | `JOL` | Joel | 3 | **Threshing-Floor Harvest Barn** | Overflowing wine-vats, lantern-lit dreams under twilight clouds, restored green pasture after locust wind. |
| 28 | `AMO` | Amos | 9 | **Plumb-Line Stone Wall & Fig Basket** | Brass plumb-line hanging beside a warm stone wall, woven basket of late-summer figs, rushing creek of justice. |
| 29 | `OBA` | Obadiah | 1 | **Eagle's Cleft Watchpost** | Single high red-rock lookout nest with a steady warning beacon lantern. |
| 30 | `JON` | Jonah | 4 | **Gourd-Vine Pier & Whale Cove** | Coastal timber jetty, calm slate-blue harbor waves, broad leafy shade-gourd trellis beside a quiet bench. |
| 31 | `MIC` | Micah | 7 | **Vine-and-Fig Homestead** | Peaceful cottage yard shaded by a grapevine and fig tree, iron pruning hooks resting cleanly by the porch steps. |
| 32 | `NAM` | Nahum | 3 | **Storm-Clearing River Bend** | Clearing indigo thunderclouds breaking into warm gold over a peaceful courier footpath. |
| 33 | `HAB` | Habakkuk | 3 | **Watchtower Slate-Board** | Timber lookout tower with a chalked vision-slate, budding fig branch & deer tracks along high hills. |
| 34 | `ZEP` | Zephaniah | 3 | **Singing-Lantern Courtyard** | Quiet dusk courtyard strung with warm celebratory paper/brass lanterns and a chorus bench. |
| 35 | `HAG` | Haggai | 2 | **Timber-Stack Mill & Cornerstone** | Freshly milled mountain cedar beams, square-cut foundation stone & gleaming gold-ochre signet crest. |
| 36 | `ZEC` | Zechariah | 14 | **Seven-Lamp Olive Grove** | Twin olive trees feeding a golden seven-branched lampstand beside a peaceful sunlit town square. |
| 37 | `MAL` | Malachi | 4 | **Refiner's Hearth & Rising-Sun Meadow** | Silver crucible glowing softly at sunrise, feathered sunbeams gilding a green pasture calf-meadow. |

#### Biome 6: The Lantern-Lit Apothecary & Silver Citadel *(Books 38–46 · 151 Chapters — Deuterocanonicals & Greek Additions)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 38 | `TOB` | Tobit | 14 | **Wayfarer's Apothecary & River-Dog Trail** | Winding lantern road with faithful trail dog, healing river-fish salve jars, smoking herbal incense brazier & home hearth. |
| 39 | `JDT` | Judith | 16 | **Hilltop Spring & Laurel Courtyard** | Mountain wellspring cistern, woven olive-branch crown, ceremonial tambourine & steadfast watch-gate. |
| 40 | `ESG` | Esther *(Greek)* | 10 | **Persian Moon-Garden & Golden Scepter** | Starlit courtyard fountain, fragrant myrrh & sweet-oil apothecary vessels, royal ochre scroll & pomegranate pavilion. |
| 41 | `WIS` | Wisdom | 19 | **Mirror-Lamp Library** | Brass astrolabe, polished silver hand-mirror catching starlight, herbal distillation table & glowing wisdom scrolls. |
| 42 | `SIR` | Sirach *(Ecclesiasticus)* | 51 | **Physician's Herb-Garden & Bench** | Terraced medicinal herb beds (myrrh, cassia, galbanum, balm), mortar & pestle on cedar bench, elder's proverbs notebook. |
| 43 | `BAR` | Baruch | 6 | **Star-Chart Porch & Cedar Scroll-Chest** | Night terrace overlooking distant hills, bound parchment chest, silver constellations answering their call. |
| 44 | `1MA` | 1 Maccabees | 16 | **Hill-Country Forge & Rededication Menorah** | Stone village courtyard, hammer-and-shield signet, newly kindled eight-day sanctuary lampstand glowing in winter dusk. |
| 45 | `2MA` | 2 Maccabees | 15 | **Sacred-Fire Cistern & Lantern Procession** | Hidden stone wellspring that bursts into warm golden temple-fire, palm-branch procession lanterns. |
| 46 | `DAG` | Daniel *(Greek, 14 ch)* | 14 | **Dew-Cooled Furnace & Garden Bench** | Cool indigo-and-ember brazier archway, calm lion-den lantern, shady garden judgment bench (Susanna ch. 13) & sealed temple doors (ch. 14). |

#### Biome 7: Galilean Harbor & Cypress Groves *(Books 47–51 · 117 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 47 | `MAT` | Matthew | 28 | **Sermon-Hill Meadow & Star Pier** | Hillside wildflower meadow (lilies of the field, mustard tree), warm hillside lamp-house & quiet harbor pier. |
| 48 | `MRK` | Mark | 16 | **Storm-Calmed Fishing Skiff** | Wooden fishing boat moored on rippling slate-blue water, coiled hemp nets, five loaves & two fish in a woven basket. |
| 49 | `LUK` | Luke | 24 | **Emmaus Supper Inn & Physician's Garden** | Warm roadside tavern table with broken bread & glowing candle, oil-and-wine healing satchel, prodigal welcome gate. |
| 50 | `JHN` | John | 21 | **Jacob's Wellspring & Charcoal Beach** | Stone well shaded by grapevine trellis, six earthenware water jars, glowing sunrise charcoal fire on the lakeshore. |
| 51 | `ACT` | Acts | 28 | **Pentecost Upper-Porch & Harbor Lighthouse** | Warm upper-room window glowing with soft flame-lanterns, coastal lighthouse & wooden sailing ship departing on trade winds. |

#### Biome 8: The Post-Road Lantern Towns *(Books 52–64 · 87 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 52 | `ROM` | Romans | 16 | **Grafted Olive-Tree Crossroads** | Great stone milestone at the imperial post-road, gnarled olive tree grafted with tender emerald shoots & letter pouch. |
| 53 | `1CO` | 1 Corinthians | 16 | **Harbor Market & Brass-Bell Courtyard** | Bustling twin-sea harbor square, glowing earthenware lamps, harmonious brass chimes & communal bread table. |
| 54 | `2CO` | 2 Corinthians | 13 | **Clay-Jar Lantern Workshop** | Humble terracotta pots radiating warm golden inner light on timber workshop shelves. |
| 55 | `GAL` | Galatians | 6 | **Nine-Fruit Heritage Orchard** | Sun-dappled orchard arbor laden with nine distinct ripe fruits, open garden gate of freedom. |
| 56 | `EPH` | Ephesians | 6 | **Watchman's Brass-Lantern Armory** | Warm hearth-hall displaying ceremonial brass belt, shield, olive-sandal rack & open scroll of peace. |
| 57 | `PHP` | Philippians | 4 | **Riverside Song-Garden** | Peaceful riverbank prayer bench (Lydia's purple-dyed cloth drying on a cedar line), humming night-song lanterns. |
| 58 | `COL` | Colossians | 4 | **Deep-Root Cedar Grove** | Tall rooted cedars beside a cool mountain stream, woven tapestry banner of unity. |
| 59 | `1TH` | 1 Thessalonians | 5 | **Dawn-Watch Harbor Bench** | East-facing coastal bench with warm coffee/tea mug, morning star rising over slate-blue waters. |
| 60 | `2TH` | 2 Thessalonians | 3 | **Steady Loom & Worktable** | Neat artisan worktable with weaving shuttle, tidy inkpot & steady brass desk lamp. |
| 61 | `1TI` | 1 Timothy | 6 | **Apprentice's Study-Porch** | Elder's passing-of-the-lamp porch, neatly bound parchment scrolls & herbal tonic shelf. |
| 62 | `2TI` | 2 Timothy | 4 | **Winter Cloak & Parchment Desk** | Cozy candle-lit stone study with warm wool cloak draped on chair, marathon laurel wreath & stacked notebooks. |
| 63 | `TIT` | Titus | 3 | **Island Harbor Schoolhouse** | Whitewashed sunlit island porch with terracotta roof tiles, rosemary planters & community chalkboard. |
| 64 | `PHM` | Philemon | 1 | **Open-Door Welcome Threshold** | Single warm wooden doorway with lit porch lantern, hand-waxed reconciliation letter & extra chair set at table. |

#### Biome 9: Crown of Stars & River of Life *(Books 65–73 · 64 Chapters)*
| # | USFM | Book | Ch | Landmark Name | Stardew-meets-Hoodoo Visual Motif & Bloom Prop |
| :-: | :--- | :--- | :-: | :--- | :--- |
| 65 | `HEB` | Hebrews | 13 | **Anchor-Stone Sanctuary & Cloud Gallery** | Heavy iron harbor anchor resting beside blooming laurel vines, terraced stone steps leading into warm lantern cloudlight. |
| 66 | `JAS` | James | 5 | **Rudder-Bridge & Pure-Spring Fountain** | Wooden river footbridge, small wooden ship's tiller, clear bubbling spring watering fig & olive trees. |
| 67 | `1PE` | 1 Peter | 5 | **Living-Stone Hearthhouse** | Fitted warm-stone cottage walls glowing from within, hearth embers refining silver & traveler's lantern by the door. |
| 68 | `2PE` | 2 Peter | 3 | **Morning-Star Observatory** | Wooden hilltop deck with brass spyglass, morning star shining cleanly above mist-covered ridges. |
| 69 | `1JN` | 1 John | 5 | **Fellowship Lamp-Table** | Round cedar supper table lit by warm oil lamps, bread & clear glass water pitcher surrounded by elderberry vines. |
| 70 | `2JN` | 2 John | 1 | **Elect Lady's Garden Gate** | Intimate flower-lined cottage gate with sealed wax letter tucked into a wooden mail-box. |
| 71 | `3JN` | 3 John | 1 | **Wayfarer's Guest-Porch** | Welcoming wooden guest cabin with folded quilt, glowing porch lamp & inked hospitality ledger. |
| 72 | `JUD` | Jude | 1 | **Mountain Beacon-Cairn** | Steadfast stone trail-cairn topped with a wind-proof brass beacon flame above coastal fog. |
| 73 | `REV` | Revelation | 22 | **Jasper Shore & Tree of Twelve Leaves** | Luminous crystal river flowing from a warm ochre-and-pearl courtyard; twelve-fruit healing tree whose leaves shimmer softly over the entire completed trail. |

---

### 3.4 Phase 1 Vertical Slice Focus (Genesis + Psalms)

For v3 Phase 1 (recommended starter slice for Helia + engineering):
- **Genesis (`GEN`, 50 ch — Biome 1: *Eden Root-Garden*):** Segment the 50 chapters into 5 visual trail clearings (`1–11` Garden & Flood, `12–25` Abraham's Oaks, `26–36` Wells & Bethel Ladder, `37–41` Coat & Granary, `42–50` Goshen Reunion). Companion lenses: *Historical & Classic* (Haydock + Matthew Henry + 1913 Catholic Encyclopedia intro), *Hoodoo & Folk* (Puckett 1926 + Johnson Spirituals / African-American oral motifs), *Community `r/Bible`* (curated starter cards).
- **Psalms (`PSA`, 150 ch — Biome 3: *Shepherd's Twilight Pasture*):** Segment into the **5 canonical Books of the Psalter** (`1–41`, `42–72`, `73–89`, `90–106`, `107–150`) so the trail feels rhythmic and approachable rather than a flat 150-node list. Companion lenses: *Hoodoo & Folk* (**Anna Riva *Powers of the Psalms*** via private owner PDF CLI + Godfrey Selig PD baseline + Hurston ethnographic notes), *Historical & Classic* (**Spurgeon's *Treasury of David*** + normalized **Haydock 1859**), *Community `r/Bible`* (curated starter cards).

---

## Sources & Citations

1. **Repository Canon & Schema Ground Truth:** [bookMapping.ts](file:///Users/mikewarren/ttb/server/src/utils/bookMapping.ts), [WEB_Catholic_Version_for_game_updated.csv](file:///Users/mikewarren/ttb/data/WEB_Catholic_Version_for_game_updated.csv), [Verse.ts](file:///Users/mikewarren/ttb/server/src/models/Verse.ts), [Progress.ts](file:///Users/mikewarren/ttb/server/src/models/Progress.ts), [App.css](file:///Users/mikewarren/ttb/client/src/App.css).
2. **Anna Riva & Godfrey Selig:** International Imports publication metadata for Anna Riva, *Powers of the Psalms* (© 1982; reprints 2008/2015); Godfrey Selig, *Secrets of the Psalms* (*Shimmush Tehillim*, 18th-c. German origin; Internet Archive pre-1923 editions vs. 1982 Dorene Publishing modern edition).
3. **Zora Neale Hurston & Puckett Copyright Status:** U.S. Copyright Office / Project Gutenberg & Wikisource copyright renewal records (*Mules and Men*, © Sept 16, 1935, `A87313`, renewed Aug 27, 1963 `R321025` -> US PD Jan 1, 2031); *Journal of American Folklore* Vol. 44, No. 174 (Oct–Dec 1931, pp. 317–417, *"Hoodoo in America"* — 1931 renewal threshold); Newbell Niles Puckett, *Folk Beliefs of the Southern Negro* (1926, UNC Press — US PD; Internet Archive / HathiTrust).
4. **Public-Domain 73-Book Commentaries:** Fr. George Leo Haydock, *Catholic Bible Commentary* (1859 Dunigan Ed. — `Data-Science-Link/the_depositum`, Todd Easton transcription, Internet Archive OCR); *The Catholic Encyclopedia* (1907–1914 — English Wikisource MediaWiki API, Internet Archive, New Advent); R. H. Charles, *The Apocrypha and Pseudepigrapha of the Old Testament*, Vol. I (1913 — Internet Archive, CCEL, Wikisource); `HelloAOLab/bible-api` (SQLite/JSON public-domain commentaries incl. Matthew Henry); `LyteWord` GitHub (Matthew Henry & Spurgeon's *Treasury of David*); Vulgate/Douay-Rheims vs. Hebrew/Masoretic Psalm numbering reconciliation (`drbo.org`, `bookofhours.org`).
5. **Reddit API & Firecrawl Policy (2025–2026):** Reddit Data API Terms & Free Non-Commercial Tier (100 QPM OAuth2, non-commercial restriction); Reddit **Responsible Builder Policy** (manual pre-approval replacing self-service `script` app creation); Reddit User Agreement (prohibition on unauthorized scraping; user retention of comment copyright); Firecrawl platform restrictions blocking major social media domains including `reddit.com`.
