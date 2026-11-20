#!/usr/bin/env python3
"""
Unified Reusable Book Pre-Processor CLI

Stage 1: Universal PDF -> pages.ocr.json (digital text or Apple Vision / Tesseract OCR)
Stage 2: Pluggable book profile -> canonical companion-entries.json
Stage 3: Automatic coverage & OCR quality audit -> audit-report.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from extract_pages import extract_pdf_to_ocr_json
from profiles import PROFILES


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT_BASE = REPO_ROOT / "data" / "private-sources" / "extracted"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Pre-process scanned or digital books into canonical CompanionEntry JSON bundles."
    )
    parser.add_argument("--pdf", help="Path to the source PDF file")
    parser.add_argument("--profile", help=f"Book profile name ({', '.join(sorted(PROFILES))})")
    parser.add_argument("--slug", help="Output folder slug under data/private-sources/extracted/")
    parser.add_argument("--dpi", type=int, default=250, help="Render DPI for scanned pages (default: 250)")
    parser.add_argument("--skip-ocr", action="store_true", help="Reuse existing pages.ocr.json without re-running OCR")
    parser.add_argument("--force-ocr", action="store_true", help="Force re-rendering and re-running OCR")
    parser.add_argument("--list-profiles", action="store_true", help="List registered book profiles and exit")
    args = parser.parse_args()

    if args.list_profiles:
        print("Available book profiles:")
        for name in sorted(PROFILES):
            print(f"  - {name}")
        return 0

    if not args.pdf or not args.profile:
        parser.error("--pdf and --profile are required (or pass --list-profiles)")

    if args.profile not in PROFILES:
        parser.error(f"Unknown profile '{args.profile}'. Available: {', '.join(sorted(PROFILES))}")

    pdf_path = Path(args.pdf).resolve()
    if not pdf_path.exists():
        sys.stderr.write(f"error: PDF not found at {pdf_path}\n")
        return 1

    slug = args.slug or pdf_path.stem.lower().replace(" ", "-")
    work_dir = DEFAULT_OUT_BASE / slug
    ocr_json_path = work_dir / "pages.ocr.json"

    if not args.skip_ocr or not ocr_json_path.exists():
        ocr_json_path = extract_pdf_to_ocr_json(
            pdf_path, work_dir, dpi=args.dpi, force_ocr=args.force_ocr
        )

    pages = json.loads(ocr_json_path.read_text(encoding="utf-8"))
    parse_fn = PROFILES[args.profile]
    bundle, audit = parse_fn(pages, {"slug": slug, "pdf": pdf_path.name})

    bundle_path = work_dir / "companion-entries.json"
    audit_path = work_dir / "audit-report.json"

    bundle_path.write_text(json.dumps(bundle, indent=2, ensure_ascii=False), encoding="utf-8")
    audit_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote canonical bundle: {bundle_path}")
    print(f"Wrote audit report:     {audit_path}")
    print(json.dumps(audit, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
