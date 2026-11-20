"""
Book Profile: Anna Riva — Power of the Psalms (1982, Brawtley Press)

Parses layout-preserved Vision/Tesseract OCR (`pages.ocr.json`) into canonical
`CompanionEntry` records aligned with Typing the Bible's v3 schema:
  - Book-level Introduction (pp. 5-6), Conclusion (p. 128), Daily Prayer Schedule (p. 7),
    and Closing Prayers & Meditations (pp. 121-127)
  - Chapter-level entries for Psalms 1..150 (pp. 9-113) with KJV verse text stripped
    and ONLY Anna Riva's original purpose headings, commentary, cited verses, ritual tags,
    Psalm 119 Hebrew-octave verse ranges, and cross-referenced Subject List &
    320+ Powers of the Psalms Index entries (pp. 114-120).
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any


HEBREW_OCTAVES: list[tuple[str, str]] = [
    ("ALEPH", "1-8"),
    ("BETH", "9-16"),
    ("GIMEL", "17-24"),
    ("DALETH", "25-32"),
    ("HE", "33-40"),
    ("VAU", "41-48"),
    ("ZAIN", "49-56"),
    ("CHETH", "57-64"),
    ("TETH", "65-72"),
    ("JOD", "73-80"),
    ("CAPH", "81-88"),
    ("LAMED", "89-96"),
    ("MEM", "97-104"),
    ("NUN", "105-112"),
    ("SAMECH", "113-120"),
    ("AIN", "121-128"),
    ("PE", "129-136"),
    ("TZADDI", "137-144"),
    ("KOPH", "145-152"),
    ("RESH", "153-160"),
    ("SCHIN", "161-168"),
    ("TAU", "169-176"),
]
HEBREW_OCTAVE_MAP = {name: rng for name, rng in HEBREW_OCTAVES}
HEBREW_OCTAVE_ALIASES = {
    "VAV": "VAU",
    "ZAYIN": "ZAIN",
    "YOD": "JOD",
    "KAPH": "CAPH",
    "AYIN": "AIN",
    "SHIN": "SCHIN",
    "TAV": "TAU",
    "HEH": "HE",
    "TZADI": "TZADDI",
    "QOPH": "KOPH",
    "CHET": "CHETH",
    "TET": "TETH",
}

RITUAL_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("White Candle", re.compile(r"\bwhite\s+candles?\b", re.I)),
    ("Red Candle", re.compile(r"\bred\s+candles?\b", re.I)),
    ("Purple Candle", re.compile(r"\bpurple\s+candles?\b", re.I)),
    ("Green Candle", re.compile(r"\bgreen\s+candles?\b", re.I)),
    ("Blue Candle", re.compile(r"\bblue\s+candles?\b", re.I)),
    ("Yellow Candle", re.compile(r"\byellow\s+candles?\b", re.I)),
    ("Orange Candle", re.compile(r"\borange\s+candles?\b", re.I)),
    ("Pink Candle", re.compile(r"\bpink\s+candles?\b", re.I)),
    ("Brown Candle", re.compile(r"\bbrown\s+candles?\b", re.I)),
    ("Black Candle", re.compile(r"\bblack\s+candles?\b", re.I)),
    ("Gold Candle", re.compile(r"\bgold(?:en)?\s+candles?\b", re.I)),
    ("Candle", re.compile(r"\bcandles?\b", re.I)),
    ("Parchment", re.compile(r"\bparchment\b", re.I)),
    ("Anointing Oil", re.compile(r"\b(?:anoint(?:ing|ed)?|olive|holy|blessing|healing|special)\s+oil\b", re.I)),
    ("Incense", re.compile(r"\bincense\b", re.I)),
    ("Ritual Bath", re.compile(r"\bbath(?:e|ing|water)?\b", re.I)),
    ("Olive Oil", re.compile(r"\bolive\s+oil\b", re.I)),
    ("Herbs / Botanicals", re.compile(r"\b(?:herbs?|hyssop|frankincense|myrrh|rose|bay\s+leaf|salt)\b", re.I)),
    ("Memorization", re.compile(r"\b(?:commit\b.*\bmemory|memorize|repeat(?:ed)?\s+from\s+memory)\b", re.I)),
    ("Morning Practice", re.compile(r"\b(?:each\s+morning|upon\s+arising|sunrise|morning\s+prayer)\b", re.I)),
    ("Evening Practice", re.compile(r"\b(?:each\s+evening|before\s+retiring|sunset|bedtime|night)\b", re.I)),
    ("Fasting", re.compile(r"\bfast(?:ing)?\b", re.I)),
]


def clean_whitespace(text: str) -> str:
    text = re.sub(r"-\s+\n?\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def is_page_number_line(line: dict[str, Any], page_num: int) -> bool:
    txt = line["text"].strip()
    if line["y"] >= 0.70 and re.fullmatch(r"\d{1,3}", txt):
        if abs(int(txt) - page_num) <= 2:
            return True
    return False


def is_cross_divider(line: dict[str, Any]) -> bool:
    txt = line["text"].strip()
    if len(txt) < 4:
        return False
    cleaned = re.sub(r"\s+", "", txt)
    # Cross dividers OCR as sequences of t, +, *, †, f, 7, |, l
    non_cross = re.sub(r"[†+*tTfF|lI1i.,\-]", "", cleaned)
    if len(non_cross) == 0 and len(cleaned) >= 5 and re.search(r"[†+tT*]", cleaned):
        return True
    return False


def detect_psalm_header(line: dict[str, Any]) -> int | None:
    txt = line["text"].strip().upper()
    m = re.match(r"^PSALMS?\s+([0-9ILOS]{1,3})(?:\s+PSALMS?\s+[0-9ILOS]{1,3})?$", txt)
    if not m:
        return None
    raw = m.group(1).replace("I", "1").replace("L", "1").replace("O", "0").replace("S", "5")
    if not raw.isdigit():
        return None
    num = int(raw)
    if 1 <= num <= 150:
        return num
    return None


def is_verse_start_line(line: dict[str, Any]) -> int | None:
    txt = line["text"].strip()
    m = re.match(r"^(\d{1,3})[.,]\s*(.*)$", txt)
    if not m:
        return None
    num = int(m.group(1))
    if 1 <= num <= 176 and line["x"] <= 0.30:
        return num
    return None


def is_hebrew_octave_heading(line: dict[str, Any]) -> str | None:
    txt = re.sub(r"[^A-Z]", "", line["text"].strip().upper())
    center = line["x"] + line["w"] / 2.0
    if not (0.38 <= center <= 0.62):
        return None
    if txt in HEBREW_OCTAVE_MAP:
        return txt
    if txt in HEBREW_OCTAVE_ALIASES:
        return HEBREW_OCTAVE_ALIASES[txt]
    return None


def is_purpose_heading(line: dict[str, Any]) -> bool:
    txt = line["text"].strip()
    if len(txt) < 4 or len(txt) > 75:
        return False
    if detect_psalm_header(line) is not None:
        return False
    if is_cross_divider(line):
        return False
    if is_hebrew_octave_heading(line) is not None:
        return False
    # Must be mostly uppercase letters (allow apostrophes, hyphens, punctuation, digits)
    letters = [ch for ch in txt if ch.isalpha()]
    if len(letters) < 4:
        return False
    upper_ratio = sum(1 for ch in letters if ch.isupper()) / len(letters)
    if upper_ratio < 0.85:
        return False
    # Centered horizontally on the text column (~0.42 to 0.58)
    center = line["x"] + line["w"] / 2.0
    if not (0.36 <= center <= 0.64):
        return False
    # Exclude standalone KJV verse lines that happen to be short caps (rare)
    if re.match(r"^\d+[.,]\s", txt):
        return False
    return True


def extract_ritual_tags(text: str) -> list[str]:
    tags: list[str] = []
    for label, pattern in RITUAL_PATTERNS:
        if pattern.search(text):
            if label == "Candle" and any(t.endswith("Candle") for t in tags):
                continue
            tags.append(label)
    return tags


def extract_cited_verses(text: str) -> list[str]:
    refs: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"\bVerses?\s+(\d{1,3}(?:\s*(?:-|to|and|,)\s*\d{1,3})*)", text, re.I):
        val = re.sub(r"\s+", " ", m.group(1).strip())
        if val not in seen:
            seen.add(val)
            refs.append(val)
    if re.search(r"\bfirst\s+three\s+verses\b", text, re.I) and "1-3" not in seen:
        refs.append("1-3")
    return refs


def pair_index_rows(lines: list[dict[str, Any]], y_min: float = 0.07) -> tuple[list[tuple[str, str]], list[str]]:
    """Pair left-column labels (x < 0.55) with right-column Psalm references (x >= 0.55) by y-baseline."""
    filtered = [
        ln
        for ln in lines
        if ln["y"] >= y_min
        and ln["y"] < 0.72
        and ln["text"].strip().upper()
        not in {"POWERS OF THE PSALMS", "PSALM", "SUBJECT LIST", "DAILY PRAYERS:"}
    ]
    left_lines = [ln for ln in filtered if ln["x"] < 0.55]
    right_lines = [ln for ln in filtered if ln["x"] >= 0.55]

    used_right: set[int] = set()
    pairs: list[tuple[str, str]] = []
    unpaired_labels: list[str] = []

    for l_ln in left_lines:
        l_text = l_ln["text"].strip()
        # Check if right-hand number got merged onto the same OCR line
        merged = re.match(
            r"^(.+?)(?:\s*[.•\-_]{2,}\s*|\s+)((?:\(Verses?\s+\d+-\d+\)\s*)?\d{1,3}(?:\s*,\s*\d{1,3})*)$",
            l_text,
            re.I,
        )
        if merged and l_ln["w"] > 0.35:
            pairs.append((merged.group(1).strip(" .•-_"), merged.group(2).strip(" .•-_")))
            continue

        best_idx = None
        best_dy = 0.015
        for idx, r_ln in enumerate(right_lines):
            if idx in used_right:
                continue
            dy = abs(r_ln["y"] - l_ln["y"])
            if dy < best_dy:
                best_dy = dy
                best_idx = idx
        if best_idx is not None:
            used_right.add(best_idx)
            r_text = right_lines[best_idx]["text"].strip(" .•-_")
            pairs.append((l_text.strip(" .•-_"), r_text))
        else:
            cleaned_label = l_text.strip(" .•-_")
            if len(cleaned_label) >= 4:
                unpaired_labels.append(cleaned_label)

    return pairs, unpaired_labels


def normalize_purpose_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def parse_psalm_target_spec(spec: str) -> list[tuple[int, str | None]]:
    """Parse specs like '23', '11, 27, 31, 46', or '(Verses 65-72) 119'."""
    results: list[tuple[int, str | None]] = []
    verse_range_match = re.search(r"\(?\s*Verses?\s+(\d{1,3}\s*-\s*\d{1,3})\s*\)?", spec, re.I)
    verse_range = (
        re.sub(r"\s+", "", verse_range_match.group(1)) if verse_range_match else None
    )
    cleaned = re.sub(r"\(?\s*Verses?\s+\d{1,3}\s*-\s*\d{1,3}\s*\)?", "", spec, flags=re.I)
    for num_str in re.findall(r"\b(\d{1,3})\b", cleaned):
        num = int(num_str)
        if 1 <= num <= 150:
            results.append((num, verse_range))
    return results


def parse_plain_prose_pages(pages_by_num: dict[int, dict[str, Any]], page_nums: list[int], skip_headers: set[str]) -> str:
    paragraphs: list[str] = []
    buf: list[str] = []
    prev_y: float | None = None

    for pn in page_nums:
        page = pages_by_num.get(pn)
        if not page:
            continue
        prev_y = None
        for ln in page["lines"]:
            if is_page_number_line(ln, pn):
                continue
            txt = ln["text"].strip()
            if not txt or txt.upper() in skip_headers:
                continue
            if prev_y is not None and (ln["y"] - prev_y) > 0.024 and buf:
                paragraphs.append(clean_whitespace(" ".join(buf)))
                buf = []
            buf.append(txt)
            prev_y = ln["y"]
        if buf:
            paragraphs.append(clean_whitespace(" ".join(buf)))
            buf = []

    return "\n\n".join(p for p in paragraphs if p)


def parse_book(pages: list[dict[str, Any]], meta: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    pages_by_num = {p["page"]: p for p in pages}

    # 1. Book-level Introduction (pp. 5-6) & Conclusion (p. 128)
    intro_text = parse_plain_prose_pages(pages_by_num, [5, 6], {"INTRODUCTION"})
    conclusion_text = parse_plain_prose_pages(pages_by_num, [128], {"CONCLUSION"})
    prayers_text = parse_plain_prose_pages(
        pages_by_num, list(range(121, 128)), {"PRAYERS AND MEDITATIONS"}
    )

    # 2. Subject List & Daily Prayer Schedule (p. 7)
    daily_prayers: list[dict[str, Any]] = []
    subject_links: dict[int, list[dict[str, Any]]] = defaultdict(list)
    if 7 in pages_by_num:
        p7_pairs, _ = pair_index_rows(pages_by_num[7]["lines"], y_min=0.11)
        for label, target in p7_pairs:
            targets = parse_psalm_target_spec(target)
            if not targets:
                continue
            clean_label = re.sub(r"^Daily Prayers:\s*", "", label, flags=re.I).strip()
            is_daily = bool(
                re.match(
                    r"^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(morning|evening)\b",
                    clean_label,
                    re.I,
                )
            )
            if is_daily:
                daily_prayers.append(
                    {"slot": clean_label, "psalm": targets[0][0]}
                )
                subject_links[targets[0][0]].append(
                    {"purpose": f"Daily Prayer: {clean_label}", "source": "subject-list", "verseRange": None}
                )
            else:
                for pnum, vr in targets:
                    subject_links[pnum].append(
                        {"purpose": clean_label, "source": "subject-list", "verseRange": vr}
                    )

    # 3. Powers of the Psalms Back-of-Book Index (pp. 114-120)
    powers_index_by_psalm: dict[int, list[dict[str, Any]]] = defaultdict(list)
    unpaired_powers_labels: list[str] = []
    total_powers_entries = 0
    for pn in range(114, 121):
        if pn not in pages_by_num:
            continue
        pairs, unpaired = pair_index_rows(pages_by_num[pn]["lines"], y_min=0.07)
        unpaired_powers_labels.extend(unpaired)
        for label, target in pairs:
            targets = parse_psalm_target_spec(target)
            if not targets:
                continue
            total_powers_entries += 1
            for pnum, vr in targets:
                powers_index_by_psalm[pnum].append(
                    {"purpose": label, "source": "powers-index", "verseRange": vr}
                )

    # 4. Walk Psalms 1..150 (pp. 9-113) and extract Anna Riva's original purpose/commentary blocks
    psalm_commentary: dict[int, dict[str, Any]] = {
        n: {"pages": set(), "purposes": []} for n in range(1, 151)
    }

    current_psalm: int | None = None
    in_commentary = False
    current_purpose: dict[str, Any] | None = None
    current_octave: str | None = None
    saw_cross_divider = False

    def flush_purpose():
        nonlocal current_purpose
        if current_purpose is not None and current_psalm is not None:
            body_text = clean_whitespace(" ".join(current_purpose["body_lines"]))
            if body_text:
                entry = {
                    "title": clean_whitespace(current_purpose["title"]),
                    "body": body_text,
                    "page": current_purpose["page"],
                    "citedVerses": extract_cited_verses(body_text),
                    "ritualTags": extract_ritual_tags(current_purpose["title"] + " " + body_text),
                }
                if current_purpose.get("octave"):
                    entry["octave"] = current_purpose["octave"]
                    entry["verseRange"] = HEBREW_OCTAVE_MAP.get(current_purpose["octave"])
                psalm_commentary[current_psalm]["purposes"].append(entry)
        current_purpose = None

    for pn in range(9, 114):
        page = pages_by_num.get(pn)
        if not page:
            continue

        for ln in page["lines"]:
            if is_page_number_line(ln, pn):
                continue
            txt = ln["text"].strip()
            if not txt:
                continue

            # Stop on p.113 decorative quote after Psalm 150's commentary
            if pn == 113 and ln["y"] > 0.23:
                flush_purpose()
                break

            # Explicit PSALM N header
            header_num = detect_psalm_header(ln)
            if header_num is not None:
                # Duplicate left/right header on same line -> ignore second copy
                if header_num == current_psalm:
                    continue
                flush_purpose()
                current_psalm = header_num
                in_commentary = False
                saw_cross_divider = False
                current_octave = "ALEPH" if header_num == 119 else None
                psalm_commentary[current_psalm]["pages"].add(pn)
                continue

            # Cross divider marks end of current Psalm (or current Psalm 119 octave)
            if is_cross_divider(ln):
                flush_purpose()
                in_commentary = False
                saw_cross_divider = True
                continue

            # Hebrew octave header inside Psalm 119
            if current_psalm == 119:
                octave = is_hebrew_octave_heading(ln)
                if octave is not None:
                    flush_purpose()
                    current_octave = octave
                    in_commentary = False
                    saw_cross_divider = False
                    psalm_commentary[119]["pages"].add(pn)
                    continue

            # Infer missing PSALM header immediately after a cross divider when not in Psalm 119
            verse_num = is_verse_start_line(ln)
            if saw_cross_divider and current_psalm is not None and current_psalm != 119:
                if current_psalm < 150:
                    flush_purpose()
                    current_psalm = current_psalm + 1
                    in_commentary = False
                    saw_cross_divider = False
                    psalm_commentary[current_psalm]["pages"].add(pn)
                    if verse_num == 1:
                        continue

            if current_psalm is None:
                continue

            psalm_commentary[current_psalm]["pages"].add(pn)

            # Check for centered ALL-CAPS Purpose Heading -> begins Anna Riva's commentary block
            if is_purpose_heading(ln):
                # Merge consecutive ALL-CAPS wrapped heading lines if body hasn't started
                if current_purpose is not None and len(current_purpose["body_lines"]) == 0:
                    current_purpose["title"] += " " + txt
                else:
                    flush_purpose()
                    in_commentary = True
                    saw_cross_divider = False
                    current_purpose = {
                        "title": txt,
                        "body_lines": [],
                        "page": pn,
                        "octave": current_octave if current_psalm == 119 else None,
                    }
                continue

            # Skip KJV verse lines when not inside a commentary block
            if not in_commentary:
                continue

            # If a numbered verse line starts while in commentary, we missed a divider/header
            if verse_num is not None and verse_num == 1 and current_psalm < 150 and current_psalm != 119:
                flush_purpose()
                current_psalm = current_psalm + 1
                in_commentary = False
                psalm_commentary[current_psalm]["pages"].add(pn)
                continue

            if current_purpose is not None:
                current_purpose["body_lines"].append(txt)

    flush_purpose()

    # Cross-resolve any unpaired Powers Index rows whose isolated right-edge page digit
    # was skipped by OCR, by matching against extracted body purpose headings.
    body_title_to_psalms: dict[str, list[tuple[int, str | None]]] = defaultdict(list)
    for n in range(1, 151):
        for p_item in psalm_commentary[n]["purposes"]:
            k = normalize_purpose_key(p_item["title"])
            body_title_to_psalms[k].append((n, p_item.get("verseRange")))

    cross_resolved_index_entries = 0
    for label in unpaired_powers_labels:
        k = normalize_purpose_key(label)
        matches = body_title_to_psalms.get(k)
        if not matches:
            continue
        cross_resolved_index_entries += 1
        total_powers_entries += 1
        for pnum, vr in matches:
            powers_index_by_psalm[pnum].append(
                {"purpose": label, "source": "powers-index-crossresolved", "verseRange": vr}
            )

    # 5. Assemble canonical CompanionEntry records
    source_meta = {
        "title": meta.get("title", "Power of the Psalms"),
        "author": meta.get("author", "Anna Riva"),
        "year": meta.get("year", 1982),
        "publisher": meta.get("publisher", "Brawtley Press"),
        "isbn": meta.get("isbn", "9781943138609"),
    }

    entries: list[dict[str, Any]] = []

    # Book-level Overview + Daily Schedule + Conclusion + Prayers
    entries.append(
        {
            "workId": "web-bible",
            "book": "Psalms",
            "chapter": None,
            "entryType": "book-introduction",
            "lens": "hoodoo-folk",
            "visibility": "private-owner",
            "title": "Power of the Psalms — Introduction & Daily Schedule",
            "summary": "Anna Riva's overview of the 5 Books of the Psalter, authorship, Hallel & Pilgrim Songs, and 14 weekly morning/evening Psalm recommendations.",
            "body": intro_text + ("\n\n### Conclusion\n\n" + conclusion_text if conclusion_text else ""),
            "dailySchedule": daily_prayers,
            "source": {**source_meta, "pages": [5, 6, 7, 128]},
        }
    )

    if prayers_text:
        entries.append(
            {
                "workId": "web-bible",
                "book": "Psalms",
                "chapter": None,
                "entryType": "bonus-meditations",
                "lens": "hoodoo-folk",
                "visibility": "private-owner",
                "title": "Closing Prayers & Meditations",
                "summary": "Traditional daily prayers and meditations from the closing section of Power of the Psalms.",
                "body": prayers_text,
                "source": {**source_meta, "pages": list(range(121, 128))},
            }
        )

    psalms_with_purposes = 0
    psalms_missing_purposes: list[int] = []
    total_purposes = 0

    for n in range(1, 151):
        purposes = psalm_commentary[n]["purposes"]
        index_refs = powers_index_by_psalm.get(n, []) + subject_links.get(n, [])
        # Deduplicate index purposes case-insensitively
        dedup_index: list[dict[str, Any]] = []
        seen_idx: set[tuple[str, str | None]] = set()
        for item in index_refs:
            key = (item["purpose"].lower(), item.get("verseRange"))
            if key not in seen_idx:
                seen_idx.add(key)
                dedup_index.append(item)

        if purposes:
            psalms_with_purposes += 1
            total_purposes += len(purposes)
        else:
            psalms_missing_purposes.append(n)

        all_tags: list[str] = []
        all_cited: list[str] = []
        for p_item in purposes:
            for t in p_item["ritualTags"]:
                if t not in all_tags:
                    all_tags.append(t)
            for cv in p_item["citedVerses"]:
                if cv not in all_cited:
                    all_cited.append(cv)

        headline_titles = [p_item["title"].title() for p_item in purposes[:3]]
        summary = (
            " · ".join(headline_titles)
            if headline_titles
            else (
                " · ".join(item["purpose"] for item in dedup_index[:3])
                if dedup_index
                else f"Psalm {n} traditional notes"
            )
        )

        body_blocks = []
        for p_item in purposes:
            prefix = (
                f"### {p_item['title'].title()} ({p_item['octave']} · Verses {p_item['verseRange']})"
                if p_item.get("octave") and p_item.get("verseRange")
                else f"### {p_item['title'].title()}"
            )
            body_blocks.append(f"{prefix}\n{p_item['body']}")

        entries.append(
            {
                "workId": "web-bible",
                "book": "Psalms",
                "chapter": n,
                "entryType": "chapter-companion",
                "lens": "hoodoo-folk",
                "visibility": "private-owner",
                "title": f"Psalm {n} — Power of the Psalms",
                "summary": summary,
                "body": "\n\n".join(body_blocks),
                "purposes": purposes,
                "indexPurposes": dedup_index,
                "ritualTags": all_tags,
                "citedVerses": all_cited,
                "source": {
                    **source_meta,
                    "pages": sorted(psalm_commentary[n]["pages"]),
                },
            }
        )

    low_conf_pages = [
        {"page": p["page"], "avgConfidence": round(p["avgConfidence"], 3)}
        for p in pages
        if p["lines"] and p["avgConfidence"] < 0.95
    ]

    bundle = {
        "schemaVersion": "1.0",
        "profile": "anna-riva-psalms",
        "workId": "web-bible",
        "visibility": "private-owner",
        "source": source_meta,
        "entryCount": len(entries),
        "entries": entries,
    }

    audit = {
        "profile": "anna-riva-psalms",
        "totalPages": len(pages),
        "avgOcrConfidence": round(
            sum(p["avgConfidence"] for p in pages if p["lines"])
            / max(1, sum(1 for p in pages if p["lines"])),
            4,
        ),
        "psalmsTotal": 150,
        "psalmsWithCommentaryBlocks": psalms_with_purposes,
        "psalmsMissingCommentaryBlocks": psalms_missing_purposes,
        "totalCommentaryPurposeBlocks": total_purposes,
        "psalm119OctaveBlocks": len(psalm_commentary[119]["purposes"]),
        "totalPowersIndexEntriesParsed": total_powers_entries,
        "dailyPrayerSlotsParsed": len(daily_prayers),
        "lowConfidencePages": low_conf_pages,
    }

    return bundle, audit
