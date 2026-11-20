#!/usr/bin/env python3
"""
Stage 1: Universal PDF Page Extractor (Digital Text + Native macOS Vision OCR / Tesseract Fallback)

Extracts per-page text and layout bounding boxes from any PDF into a reusable
`pages.ocr.json` cache so book-specific profiles can parse and re-parse rapidly
without re-running OCR.
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent


def get_pdf_page_count(pdf_path: Path) -> int:
    out = subprocess.check_output(["pdfinfo", str(pdf_path)], text=True)
    for line in out.splitlines():
        if line.lower().startswith("pages:"):
            return int(line.split(":", 1)[1].strip())
    raise RuntimeError(f"Could not determine page count for {pdf_path}")


def extract_digital_text_page(pdf_path: Path, page_num: int) -> str:
    try:
        return subprocess.check_output(
            ["pdftotext", "-f", str(page_num), "-l", str(page_num), str(pdf_path), "-"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def compile_vision_binary(cache_dir: Path) -> Path | None:
    if platform.system() != "Darwin":
        return None
    swiftc = shutil.which("swiftc")
    if not swiftc:
        return None

    src = SCRIPT_DIR / "vision_ocr.swift"
    binary = cache_dir / "vision_ocr_bin"
    if not binary.exists() or src.stat().st_mtime > binary.stat().st_mtime:
        sys.stderr.write("[extract_pages] Compiling native macOS Vision OCR helper...\n")
        subprocess.check_call([swiftc, "-O", str(src), "-o", str(binary)])
    return binary


def run_tesseract_ocr(images_dir: Path) -> list[dict[str, Any]]:
    tesseract = shutil.which("tesseract")
    if not tesseract:
        raise RuntimeError("Neither macOS Vision (swiftc) nor tesseract is available for OCR.")

    pages: list[dict[str, Any]] = []
    pngs = sorted(images_dir.glob("*.png"))
    for idx, img in enumerate(pngs, start=1):
        stem_tail = img.stem.rsplit("-", 1)[-1]
        page_num = int(stem_tail) if stem_tail.isdigit() else idx
        text = subprocess.check_output(
            [tesseract, str(img), "stdout", "--psm", "6"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        lines = []
        raw_lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        total_lines = max(1, len(raw_lines))
        for i, ln in enumerate(raw_lines):
            lines.append(
                {
                    "text": ln,
                    "x": 0.1,
                    "y": round(i / total_lines, 4),
                    "w": 0.8,
                    "h": round(1.0 / total_lines, 4),
                    "confidence": 0.85,
                }
            )
        pages.append(
            {
                "page": page_num,
                "image": img.name,
                "avgConfidence": 0.85 if lines else 0.0,
                "lines": lines,
            }
        )
    return pages


def extract_pdf_to_ocr_json(
    pdf_path: Path,
    work_dir: Path,
    dpi: int = 250,
    force_ocr: bool = False,
) -> Path:
    work_dir.mkdir(parents=True, exist_ok=True)
    ocr_json_path = work_dir / "pages.ocr.json"

    if ocr_json_path.exists() and not force_ocr:
        sys.stderr.write(f"[extract_pages] Reusing cached OCR at {ocr_json_path}\n")
        return ocr_json_path

    total_pages = get_pdf_page_count(pdf_path)
    sys.stderr.write(f"[extract_pages] Inspecting {pdf_path.name} ({total_pages} pages)...\n")

    # Quick probe on up to 5 spread-out pages to decide if PDF has digital text
    probe_pages = sorted({1, min(4, total_pages), min(10, total_pages), total_pages // 2, total_pages})
    digital_hits = sum(1 for p in probe_pages if len(extract_digital_text_page(pdf_path, p)) >= 60)

    if digital_hits >= max(2, len(probe_pages) // 2) and not force_ocr:
        sys.stderr.write("[extract_pages] Digital text layer detected; extracting directly via pdftotext...\n")
        pages: list[dict[str, Any]] = []
        for p in range(1, total_pages + 1):
            txt = extract_digital_text_page(pdf_path, p)
            raw_lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
            denom = max(1, len(raw_lines))
            pages.append(
                {
                    "page": p,
                    "image": "",
                    "avgConfidence": 1.0 if raw_lines else 0.0,
                    "lines": [
                        {
                            "text": ln,
                            "x": 0.1,
                            "y": round(i / denom, 4),
                            "w": 0.8,
                            "h": round(1.0 / denom, 4),
                            "confidence": 1.0,
                        }
                        for i, ln in enumerate(raw_lines)
                    ],
                }
            )
        ocr_json_path.write_text(json.dumps(pages, indent=2, ensure_ascii=False), encoding="utf-8")
        return ocr_json_path

    # Scanned PDF -> render PNGs with pdftoppm and OCR
    images_dir = work_dir / "pages-png"
    images_dir.mkdir(parents=True, exist_ok=True)
    existing_pngs = list(images_dir.glob("page-*.png"))
    if len(existing_pngs) < total_pages or force_ocr:
        for old in existing_pngs:
            old.unlink()
        sys.stderr.write(f"[extract_pages] Rendering {total_pages} scanned pages at {dpi} DPI via pdftoppm...\n")
        subprocess.check_call(
            ["pdftoppm", "-png", "-r", str(dpi), str(pdf_path), str(images_dir / "page")]
        )

    vision_bin = compile_vision_binary(work_dir)
    if vision_bin is not None:
        sys.stderr.write("[extract_pages] Running native macOS Apple Vision OCR...\n")
        subprocess.check_call([str(vision_bin), str(images_dir), str(ocr_json_path)])
    else:
        sys.stderr.write("[extract_pages] Running Tesseract OCR fallback...\n")
        pages = run_tesseract_ocr(images_dir)
        ocr_json_path.write_text(json.dumps(pages, indent=2, ensure_ascii=False), encoding="utf-8")

    return ocr_json_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: extract_pages.py <pdf_path> <work_dir> [--force]\n")
        sys.exit(1)
    pdf = Path(sys.argv[1]).resolve()
    out_dir = Path(sys.argv[2]).resolve()
    force = "--force" in sys.argv[3:]
    result = extract_pdf_to_ocr_json(pdf, out_dir, force_ocr=force)
    print(result)
