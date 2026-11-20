# Reusable Book & Companion Pre-Processor

Converts scanned or digital source books (PDFs) into normalized, schema-validated `CompanionEntry` JSON bundles ready for private or public-domain ingestion into Typing the Bible's Cosmos DB / MongoDB database.

## Copyright & Privacy Rule
- Place personal/copyrighted PDFs (e.g. Anna Riva's *Power of the Psalms*, Zora Neale Hurston's *Mules and Men*) exclusively inside `data/private-sources/`, which is **gitignored** (`.gitignore`).
- Never commit copyrighted book PDFs, raw OCR output (`pages.ocr.json`), or `visibility: "private-owner"` companion JSON files into Git.

## 3-Stage Reusable Architecture

1. **Stage 1 — Universal Page Extractor (`extract_pages.py` + `vision_ocr.swift`)**
   - Probes whether the PDF has an embedded digital text layer (`pdftotext`) or is scanned imagery.
   - For scanned pages, renders high-resolution PNGs (`pdftoppm -r 250`) and runs native **macOS Apple Vision OCR** (`VNRecognizeTextRequest`, `.accurate`, language correction, top-left normalized bounding boxes + per-line confidence), with automatic `tesseract` fallback on non-macOS systems.
   - Writes a resumable, layout-preserving cache to `data/private-sources/extracted/<slug>/pages.ocr.json`.

2. **Stage 2 — Pluggable Book Profiles (`profiles/*.py`)**
   - Each book (or book family) implements a small parser profile taking `pages.ocr.json` + metadata and emitting a canonical `CompanionBundle` (`companion-entries.json`) with:
     - `workId` (`"web-bible"` today; extensible to any future book/corpus)
     - `book`, `chapter`, `verses` (optional cited verse numbers or octave ranges)
     - `lens` (`"hoodoo-folk" | "historical-classic" | "devotional" | "community"`)
     - `visibility` (`"private-owner" | "public-domain"`)
     - `source`: `{ title, author, year, isbn, pages }`
     - `purposes[]`, `indexPurposes[]`, `ritualTags[]`, `citedVerses[]`, `summary`, `body`
   - Built-in profiles:
     - `anna-riva-psalms` — *Power of the Psalms* (Anna Riva, 1982): strips KJV verse text so WEB text stays pure, parses the Psalm Index (p.4), Introduction (pp.5–6), Subject List & Daily Morning/Evening Prayers (p.7), all 150 Psalm commentary/purpose blocks (pp.9–112), the 320+ *Powers of the Psalms* Index (pp.113–120) including Psalm 119 verse-octave ranges, and *Prayers & Meditations* (pp.121–127).

3. **Stage 3 — Coverage & Quality Audit (`audit-report.json`)**
   - Automatically verifies index-to-body cross-references (e.g., `150/150` Psalms accounted for), counts extracted purposes and ritual tags, computes per-page OCR confidence, and lists any low-confidence pages for quick human spot-checking.

## Usage

```bash
# Full run (Stage 1 OCR + Stage 2 Profile Parse + Stage 3 Audit)
python3 scripts/book-preprocessor/run_preprocessor.py \
  --pdf data/private-sources/power-of-the-psalms-anna-riva.pdf \
  --profile anna-riva-psalms \
  --slug power-of-the-psalms

# Re-run parser rapidly using cached pages.ocr.json (no re-OCR)
python3 scripts/book-preprocessor/run_preprocessor.py \
  --pdf data/private-sources/power-of-the-psalms-anna-riva.pdf \
  --profile anna-riva-psalms \
  --slug power-of-the-psalms \
  --skip-ocr
```

## Adding a Future Book (Reusability Playbook)
1. Drop the PDF into `data/private-sources/<book-slug>.pdf`.
2. Run `extract_pages.py` once to generate `pages.ocr.json` (with layout coordinates!).
3. Add a new profile in `scripts/book-preprocessor/profiles/<profile_name>.py` implementing `parse_book(pages, meta) -> (bundle, audit)` and register it in `profiles/__init__.py`.
4. Run `run_preprocessor.py` and verify `audit-report.json` before importing `companion-entries.json` into MongoDB.
