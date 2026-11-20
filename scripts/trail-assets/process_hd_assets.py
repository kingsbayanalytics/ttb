#!/usr/bin/env python3
"""
Typing the Bible v3 — Offline HD Pixel Diorama Asset Processor

Transforms bespoke HD pixel-art backdrops and chroma-keyed sprites into unified,
deterministic production assets under `client/public/assets/trail/hd/`:
  - Backdrops (`1280x720`, exact 16:9 @2x on a 640x360 logical grid, WebP):
      genesis-daylight.webp, genesis-twilight.webp,
      psalms-daylight.webp,  psalms-twilight.webp
  - Sprites (@2x transparent PNGs calibrated to the 640x360 logical scene):
      traveler-michael-hd.png (96x148  -> 48x74 logical)
      waypoint-dormant-hd.png (104x156 -> 52x78 logical)
      waypoint-kindling-hd.png (104x156 -> 52x78 logical)
      waypoint-bloomed-hd.png (104x156 -> 52x78 logical)

Usage:
  python3 scripts/trail-assets/process_hd_assets.py \
    --artifacts-dir /Users/mikewarren/.gemini/antigravity/brain/<conv-id>
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_DIR = Path(
    "/Users/mikewarren/.gemini/antigravity/brain/2b3b59ab-e655-41c0-8cf2-cc24e2c86950"
)
DEFAULT_OUT_DIR = REPO_ROOT / "client" / "public" / "assets" / "trail" / "hd"

# Canonical raw artifact filenames saved by generate_image
RAW_ASSETS: Dict[str, str] = {
    "genesis-daylight": "genesis_daylight_raw_1795159174526.jpg",
    "genesis-twilight": "genesis_twilight_raw_v3_1795159217133.jpg",
    "psalms-daylight": "psalms_daylight_final_1795159216199.jpg",
    "psalms-twilight": "psalms_twilight_raw_v2_1795159207564.jpg",
    "traveler-michael": "traveler_michael_raw_1795159181054.jpg",
    "waypoint-lanterns": "waypoint_lanterns_raw_clean_1795159200355.jpg",
}

BACKDROP_WIDTH = 1280
BACKDROP_HEIGHT = 720

# Unified @2x sprite frame canvas sizes (corresponding to 48x74 & 52x78 logical px)
MICHAEL_TARGET_SIZE = (96, 148)
WAYPOINT_TARGET_SIZE = (104, 156)


def process_backdrop(src_path: Path, dst_path: Path) -> Tuple[int, int, int]:
    """Center-crop a 16:9-ish raw pixel illustration to exact 16:9 and encode WebP."""
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    target_w = int(round(h * 16 / 9))
    if w > target_w:
        left = (w - target_w) // 2
        im = im.crop((left, 0, left + target_w, h))
    elif h > int(round(w * 9 / 16)):
        target_h = int(round(w * 9 / 16))
        top = (h - target_h) // 2
        im = im.crop((0, top, w, top + target_h))

    resized = im.resize((BACKDROP_WIDTH, BACKDROP_HEIGHT), Image.Resampling.LANCZOS)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dst_path, format="WEBP", quality=88, method=6)
    return (BACKDROP_WIDTH, BACKDROP_HEIGHT, dst_path.stat().st_size)


def build_chroma_alpha(rgb: np.ndarray) -> np.ndarray:
    """
    Remove solid #FF00FF chroma background and enclosed triangle gaps while preserving
    crisp dark espresso pixel outlines without purple JPEG compression fringe.
    """
    h, w, _ = rgb.shape
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    chroma = np.minimum(r, b) - g

    # 1. Border-connected flood fill through strong magenta pixels
    is_outer_mag = (chroma > 65) & (r > 100) & (b > 100)
    bg = np.zeros((h, w), dtype=bool)
    queue: deque[Tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_outer_mag[y, x] and not bg[y, x]:
                bg[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_outer_mag[y, x] and not bg[y, x]:
                bg[y, x] = True
                queue.append((y, x))

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and is_outer_mag[ny, nx]:
                bg[ny, nx] = True
                queue.append((ny, nx))

    # 2. Also clear interior enclosed pure-magenta holes (e.g., wooden L-brace gap & lantern ring)
    is_interior_mag = (chroma > 105) & (r > 150) & (b > 150) & (g < 95)
    bg = bg | is_interior_mag

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = np.where(bg, 0, 255)

    # 3. Clean 2-pass morphological edge despill for magenta JPEG fringe on outline edges
    for _ in range(2):
        alpha = rgba[:, :, 3]
        is_bg_now = alpha == 0
        neighbor_bg = np.zeros((h, w), dtype=bool)
        neighbor_bg[1:, :] |= is_bg_now[:-1, :]
        neighbor_bg[:-1, :] |= is_bg_now[1:, :]
        neighbor_bg[:, 1:] |= is_bg_now[:, :-1]
        neighbor_bg[:, :-1] |= is_bg_now[:, 1:]

        edge = (~is_bg_now) & neighbor_bg
        pr = rgba[:, :, 0].astype(np.int16)
        pg = rgba[:, :, 1].astype(np.int16)
        pb = rgba[:, :, 2].astype(np.int16)
        pchroma = np.minimum(pr, pb) - pg

        # Strongly magenta antialiased edge pixels -> transparent
        kill_fringe = edge & (pchroma > 38) & (pr > 85) & (pb > 85)
        rgba[kill_fringe, 3] = 0

        # Mild magenta tint on dark outline edge pixels -> neutral dark espresso despill
        despill = edge & (~kill_fringe) & (pchroma > 14) & (pr > pg + 10) & (pb > pg + 10)
        cap = np.clip(pg + 8, 0, 255).astype(np.uint8)
        rgba[despill, 0] = np.minimum(rgba[despill, 0], cap[despill])
        rgba[despill, 2] = np.minimum(rgba[despill, 2], cap[despill])

    return rgba


def trim_and_place_sprite(
    rgba: np.ndarray,
    target_size: Tuple[int, int],
    max_content_height: int,
    bottom_margin: int,
) -> Image.Image:
    """Crop tightly around opaque pixels and center-anchor onto target transparent PNG."""
    ys, xs = np.where(rgba[:, :, 3] > 0)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("Sprite mask is empty after chroma keying")

    cropped = Image.fromarray(
        rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], mode="RGBA"
    )
    cw, ch = cropped.size
    scale_ratio = max_content_height / ch
    new_w = max(2, int(round(cw * scale_ratio)))
    new_h = max(2, int(round(ch * scale_ratio)))

    # Clamp horizontally inside target canvas while keeping aspect ratio intact
    tw, th = target_size
    if new_w > tw - 4:
        clamp_ratio = (tw - 4) / cw
        new_w = max(2, int(round(cw * clamp_ratio)))
        new_h = max(2, int(round(ch * clamp_ratio)))

    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    # Sharpen sprite alpha so 16-bit pixel silhouettes stay crisp against any backdrop
    res_arr = np.array(resized)
    res_arr[:, :, 3] = np.where(res_arr[:, :, 3] >= 120, 255, 0)
    crisp_sprite = Image.fromarray(res_arr, mode="RGBA")

    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    paste_x = (tw - new_w) // 2
    paste_y = th - bottom_margin - new_h
    canvas.paste(crisp_sprite, (paste_x, paste_y), crisp_sprite)
    return canvas


def split_lantern_columns(rgba: np.ndarray) -> List[np.ndarray]:
    """Split horizontal lantern trio sheet cleanly into 3 isolated column sprites."""
    col_has_fg = (rgba[:, :, 3] > 0).any(axis=0)
    segments: List[Tuple[int, int]] = []
    in_seg = False
    start = 0

    for x, active in enumerate(col_has_fg):
        if active and not in_seg:
            in_seg = True
            start = x
        elif not active and in_seg:
            if x - start > 30:
                segments.append((start, x))
            in_seg = False
    if in_seg and len(col_has_fg) - start > 30:
        segments.append((start, len(col_has_fg)))

    if len(segments) != 3:
        raise ValueError(
            f"Expected 3 separated lantern columns in trio sprite sheet, found {len(segments)}: {segments}"
        )

    return [rgba[:, s:e] for s, e in segments]


def process_all(artifacts_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Backdrops
    for key in ("genesis-daylight", "genesis-twilight", "psalms-daylight", "psalms-twilight"):
        src = artifacts_dir / RAW_ASSETS[key]
        if not src.exists():
            raise FileNotFoundError(f"Missing raw backdrop artifact: {src}")
        dst = out_dir / f"{key}.webp"
        w, h, size_bytes = process_backdrop(src, dst)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {w}x{h} WebP ({size_bytes:,} bytes)")

    # 2. Traveler Michael
    michael_src = artifacts_dir / RAW_ASSETS["traveler-michael"]
    if not michael_src.exists():
        raise FileNotFoundError(f"Missing raw Michael sprite artifact: {michael_src}")
    m_rgb = np.array(Image.open(michael_src).convert("RGB"))
    m_rgba = build_chroma_alpha(m_rgb)
    # 134 px height on 720p (@2x) ~= 67 logical px on 640x360 (matches mockup_1b scale)
    m_sprite = trim_and_place_sprite(
        m_rgba,
        target_size=MICHAEL_TARGET_SIZE,
        max_content_height=134,
        bottom_margin=4,
    )
    m_dst = out_dir / "traveler-michael-hd.png"
    m_sprite.save(m_dst, format="PNG", optimize=True)
    print(f"Encoded {m_dst.relative_to(REPO_ROOT)}: {m_sprite.size[0]}x{m_sprite.size[1]} PNG ({m_dst.stat().st_size:,} bytes)")

    # 3. Three Hook-Post Waypoint Lanterns (shared vertical post alignment!)
    lanterns_src = artifacts_dir / RAW_ASSETS["waypoint-lanterns"]
    if not lanterns_src.exists():
        raise FileNotFoundError(f"Missing raw lantern trio artifact: {lanterns_src}")
    l_rgb = np.array(Image.open(lanterns_src).convert("RGB"))
    l_rgba = build_chroma_alpha(l_rgb)
    cols = split_lantern_columns(l_rgba)

    # Dormant/Kindling height ~458px, Bloomed ~492px (wildflowers extend slightly lower)
    # Use consistent height ratios so timber post heights match pixel-for-pixel across states
    names_and_heights = [
        ("waypoint-dormant-hd.png", 132, 10),
        ("waypoint-kindling-hd.png", 132, 10),
        ("waypoint-bloomed-hd.png", 142, 4),
    ]
    for col_rgba, (filename, content_h, bottom_pad) in zip(cols, names_and_heights):
        post_img = trim_and_place_sprite(
            col_rgba,
            target_size=WAYPOINT_TARGET_SIZE,
            max_content_height=content_h,
            bottom_margin=bottom_pad,
        )
        dst = out_dir / filename
        post_img.save(dst, format="PNG", optimize=True)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {post_img.size[0]}x{post_img.size[1]} PNG ({dst.stat().st_size:,} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build HD trail backdrops and sprites.")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()
    process_all(args.artifacts_dir, args.out_dir)


if __name__ == "__main__":
    main()
