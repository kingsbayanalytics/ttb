#!/usr/bin/env python3
"""
Typing the Bible v3 — Offline HD Pixel Diorama Asset Processor

Transforms bespoke HD pixel-art backdrops and chroma-keyed sprites into unified,
deterministic production assets under `client/public/assets/trail/hd/`:
  - 10 Story-Arc Backdrops (`1280x720`, exact 16:9 @2x on 640x360 logical grid, WebP):
      * 5 Genesis Story Arcs:
          genesis-daylight/twilight              (eden-root-garden)
          abrahams-oaks-daylight/twilight        (abrahams-oaks)
          bethel-ladder-daylight/twilight        (bethel-ladder-homestead)
          joseph-granary-daylight/twilight       (joseph-granary-ridge)
          goshen-river-daylight/twilight         (goshen-river-porch)
      * 5 Psalms Story Arcs:
          psalms-daylight/twilight               (twilight-shepherds-sanctuary)
          mountain-brook-daylight/twilight       (mountain-brook-cedars)
          asaph-watchfire-daylight/twilight      (asaph-watchfire-harp)
          ancient-hyssop-daylight/twilight       (ancient-hyssop-porch)
          hallelujah-courtyard-daylight/twilight (hallelujah-starlit-courtyard)
  - Sprites (@2x transparent PNGs calibrated to the 640x360 logical scene):
      traveler-michael-hd.png          (96x148  -> 48x74 logical)
      stone-dormant-hd.png             (64x36   -> 32x18 logical)
      stone-kindling-hd.png            (64x36   -> 32x18 logical)
      stone-bloomed-hd.png             (64x36   -> 32x18 logical)
      prop-bottle-tree-dormant-hd.png  (112x148 -> 56x74 logical)
      prop-bottle-tree-bloomed-hd.png  (112x148 -> 56x74 logical)
      prop-herb-rack-hd.png            (88x92   -> 44x46 logical)
      prop-river-cairn-hd.png          (72x68   -> 36x34 logical)
      keeper-garden-elder-hd.png       (96x148  -> 48x74 logical)
      keeper-psalms-elder-hd.png       (96x148  -> 48x74 logical)

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
    "abrahams-oaks": "gen_arc2_abrahams_oaks_raw_1795205029839.jpg",
    "bethel-ladder": "gen_arc3_bethel_ladder_raw_v3_1795205030322.jpg",
    "joseph-granary": "gen_arc4_joseph_granary_raw_1795205004212.jpg",
    "goshen-river": "gen_arc5_goshen_river_raw_v3_1795205032627.jpg",
    "mountain-brook": "psa_arc2_mountain_brook_raw_1795205106987.jpg",
    "asaph-watchfire": "psa_arc3_asaph_watchfire_raw_1795205120034.jpg",
    "ancient-hyssop": "psa_arc4_hyssop_apothecary_raw_1795205126247.jpg",
    "hallelujah-courtyard": "psa_arc5_hallelujah_courtyard_raw_1795205128252.jpg",
    "traveler-michael": "traveler_michael_raw_1795159181054.jpg",
    "flush-stones": "sprite_flush_stones_trio_1795204987714.jpg",
    "waking-props": "sprite_waking_yard_props_4col_1795204989575.jpg",
    "elder-keepers": "sprite_elder_keepers_2col_1795205081868.jpg",
}

STORY_ARC_DUAL_STEMS: Tuple[str, ...] = (
    "abrahams-oaks",
    "bethel-ladder",
    "joseph-granary",
    "goshen-river",
    "mountain-brook",
    "asaph-watchfire",
    "ancient-hyssop",
    "hallelujah-courtyard",
)

BACKDROP_WIDTH = 1280
BACKDROP_HEIGHT = 720

# Unified @2x sprite frame canvas sizes on the 640x360 logical scene
MICHAEL_TARGET_SIZE = (96, 148)
STONE_TARGET_SIZE = (64, 36)
BOTTLE_TREE_TARGET_SIZE = (112, 148)
HERB_RACK_TARGET_SIZE = (88, 92)
RIVER_CAIRN_TARGET_SIZE = (72, 68)
KEEPER_TARGET_SIZE = (96, 148)


def crop_and_resize_16_9(src_path: Path) -> Image.Image:
    """Center-crop a 16:9-ish raw pixel illustration to exact 1280x720 RGB."""
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

    return im.resize((BACKDROP_WIDTH, BACKDROP_HEIGHT), Image.Resampling.LANCZOS)


def encode_webp(im: Image.Image, dst_path: Path) -> Tuple[int, int, int]:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst_path, format="WEBP", quality=88, method=6)
    return (im.size[0], im.size[1], dst_path.stat().st_size)


def grade_daylight_to_twilight(im: Image.Image) -> Image.Image:
    """
    Create an obsidian/indigo Lantern Twilight LUT grade from a Story-Arc plate
    while preserving warm ember/window/starry highlights so path coordinates
    remain 100% identical across Light and Dark themes.
    """
    arr = np.array(im, dtype=np.float32)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Identify warm emissive lights (braziers, starry ladder, lit windows, golden sky glow)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    warmth = np.clip((r - b) / 255.0, 0.0, 1.0)
    is_glow = np.clip(((lum - 165.0) / 70.0) * (0.45 + 0.85 * warmth), 0.0, 1.0)

    # Nocturnal Editorial Atlas twilight tint (#1A2130 / #23374D shift)
    twi_r = r * 0.52 + 12.0
    twi_g = g * 0.56 + 16.0
    twi_b = b * 0.72 + 28.0

    # Gently preserve warm hearth/star highlights against deep indigo dusk
    out_r = twi_r * (1.0 - is_glow) + np.clip(r * 1.02 + 6.0, 0.0, 255.0) * is_glow
    out_g = twi_g * (1.0 - is_glow) + np.clip(g * 0.94 + 2.0, 0.0, 255.0) * is_glow
    out_b = twi_b * (1.0 - is_glow) + np.clip(b * 0.82, 0.0, 255.0) * is_glow

    graded = np.stack([out_r, out_g, out_b], axis=-1)
    graded = np.clip(graded, 0, 255).astype(np.uint8)
    return Image.fromarray(graded, mode="RGB")


def build_chroma_alpha(rgb: np.ndarray, aggressive_interior: bool = False) -> np.ndarray:
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

    # 2. Clear enclosed pure-magenta cutouts (e.g., A-frame rack legs, bottle branches, harp frame)
    if aggressive_interior:
        is_interior_mag = (chroma > 70) & (r > 130) & (b > 130) & (g < 110)
    else:
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
    flip_horizontal: bool = False,
) -> Image.Image:
    """Crop tightly around opaque pixels and center-anchor onto target transparent PNG."""
    ys, xs = np.where(rgba[:, :, 3] > 0)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("Sprite mask is empty after chroma keying")

    cropped = Image.fromarray(
        rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], mode="RGBA"
    )
    if flip_horizontal:
        cropped = cropped.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

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


def split_2d_components(
    rgba: np.ndarray,
    expected_count: int,
    min_pixels: int = 800,
) -> List[np.ndarray]:
    """
    Separate sprites using 2D connected components (2px neighborhood bridge) when isometric
    silhouettes share a small vertical X-projection shadow without touching in 2D space.
    """
    fg = rgba[:, :, 3] > 0
    h, w = fg.shape
    vis = np.zeros_like(fg)
    label_img = np.full((h, w), -1, dtype=np.int32)
    major_comps: List[Tuple[int, float, int]] = []
    small_comps: List[Tuple[int, List[Tuple[int, int]]]] = []
    comp_id = 0

    for y in range(h):
        for x in range(w):
            if fg[y, x] and not vis[y, x]:
                q: deque[Tuple[int, int]] = deque([(y, x)])
                vis[y, x] = True
                pts: List[Tuple[int, int]] = []
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for dy in (-2, -1, 0, 1, 2):
                        for dx in (-2, -1, 0, 1, 2):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not vis[ny, nx]:
                                vis[ny, nx] = True
                                q.append((ny, nx))

                if len(pts) >= min_pixels:
                    mean_x = sum(p[1] for p in pts) / len(pts)
                    for py, px in pts:
                        label_img[py, px] = comp_id
                    major_comps.append((comp_id, mean_x, len(pts)))
                    comp_id += 1
                elif len(pts) >= 4:
                    small_comps.append((comp_id, pts))

    # Assign any small detached specks (e.g., sparkle/flower bud) to nearest major centroid X
    if small_comps and major_comps:
        for _, pts in small_comps:
            sx = sum(p[1] for p in pts) / len(pts)
            nearest_id = min(major_comps, key=lambda c: abs(c[1] - sx))[0]
            for py, px in pts:
                label_img[py, px] = nearest_id

    if len(major_comps) != expected_count:
        raise ValueError(
            f"Expected {expected_count} 2D sprite components, found {len(major_comps)}: {major_comps}"
        )

    major_comps.sort(key=lambda c: c[1])
    slices: List[np.ndarray] = []
    for cid, _, _ in major_comps:
        mask = label_img == cid
        ys, xs = np.where(mask)
        sub = np.zeros_like(rgba)
        sub[ys, xs] = rgba[ys, xs]
        slices.append(sub[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1])
    return slices


def split_sprite_columns(
    rgba: np.ndarray,
    expected_count: int,
    min_width: int = 30,
    min_col_pixels: int = 2,
) -> List[np.ndarray]:
    """Split a horizontal sprite sheet cleanly into isolated column or 2D slices."""
    col_fg_counts = (rgba[:, :, 3] > 0).sum(axis=0)
    col_has_fg = col_fg_counts >= min_col_pixels
    segments: List[Tuple[int, int]] = []
    in_seg = False
    start = 0

    for x, active in enumerate(col_has_fg):
        if active and not in_seg:
            in_seg = True
            start = x
        elif not active and in_seg:
            if x - start >= min_width:
                segments.append((start, x))
            in_seg = False
    if in_seg and len(col_has_fg) - start >= min_width:
        segments.append((start, len(col_has_fg)))

    if len(segments) == expected_count:
        return [rgba[:, s:e] for s, e in segments]

    return split_2d_components(rgba, expected_count=expected_count)


def process_all(artifacts_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Existing Clearing-1 Backdrops (Genesis Eden & Psalms Sanctuary)
    for key in ("genesis-daylight", "genesis-twilight", "psalms-daylight", "psalms-twilight"):
        src = artifacts_dir / RAW_ASSETS[key]
        if not src.exists():
            raise FileNotFoundError(f"Missing raw backdrop artifact: {src}")
        im = crop_and_resize_16_9(src)
        dst = out_dir / f"{key}.webp"
        w, h, size_bytes = encode_webp(im, dst)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {w}x{h} WebP ({size_bytes:,} bytes)")

    # 2. Eight New Story-Arc Backdrops (daylight + derived lantern twilight plates)
    for stem in STORY_ARC_DUAL_STEMS:
        src = artifacts_dir / RAW_ASSETS[stem]
        if not src.exists():
            raise FileNotFoundError(f"Missing story-arc raw backdrop: {src}")
        daylight_im = crop_and_resize_16_9(src)
        twilight_im = grade_daylight_to_twilight(daylight_im)

        day_dst = out_dir / f"{stem}-daylight.webp"
        twi_dst = out_dir / f"{stem}-twilight.webp"
        w, h, ds = encode_webp(daylight_im, day_dst)
        _, _, ts = encode_webp(twilight_im, twi_dst)
        print(
            f"Encoded {day_dst.relative_to(REPO_ROOT)} ({ds:,}B) & "
            f"{twi_dst.relative_to(REPO_ROOT)} ({ts:,}B): {w}x{h} WebP"
        )

    # 3. Traveler Michael
    michael_src = artifacts_dir / RAW_ASSETS["traveler-michael"]
    if not michael_src.exists():
        raise FileNotFoundError(f"Missing raw Michael sprite artifact: {michael_src}")
    m_rgb = np.array(Image.open(michael_src).convert("RGB"))
    m_rgba = build_chroma_alpha(m_rgb)
    m_sprite = trim_and_place_sprite(
        m_rgba,
        target_size=MICHAEL_TARGET_SIZE,
        max_content_height=134,
        bottom_margin=4,
    )
    m_dst = out_dir / "traveler-michael-hd.png"
    m_sprite.save(m_dst, format="PNG", optimize=True)
    print(f"Encoded {m_dst.relative_to(REPO_ROOT)}: {m_sprite.size[0]}x{m_sprite.size[1]} PNG ({m_dst.stat().st_size:,} bytes)")

    # 4. Option B Flush River Flagstones Trio (3 columns -> 64x36 PNGs @ 32x18 logical)
    stones_src = artifacts_dir / RAW_ASSETS["flush-stones"]
    if not stones_src.exists():
        raise FileNotFoundError(f"Missing raw flush-stones artifact: {stones_src}")
    s_rgb = np.array(Image.open(stones_src).convert("RGB"))
    s_rgba = build_chroma_alpha(s_rgb)
    stone_cols = split_sprite_columns(s_rgba, expected_count=3)
    stone_specs = (
        ("stone-dormant-hd.png", 30, 3),
        ("stone-kindling-hd.png", 31, 3),
        ("stone-bloomed-hd.png", 33, 2),
    )
    for col_rgba, (filename, content_h, bottom_pad) in zip(stone_cols, stone_specs):
        stone_img = trim_and_place_sprite(
            col_rgba,
            target_size=STONE_TARGET_SIZE,
            max_content_height=content_h,
            bottom_margin=bottom_pad,
        )
        dst = out_dir / filename
        stone_img.save(dst, format="PNG", optimize=True)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {stone_img.size[0]}x{stone_img.size[1]} PNG ({dst.stat().st_size:,} bytes)")

    # 5. Waking Hoodoo & Biblical Yard Props (4 columns)
    props_src = artifacts_dir / RAW_ASSETS["waking-props"]
    if not props_src.exists():
        raise FileNotFoundError(f"Missing raw waking-props artifact: {props_src}")
    p_rgb = np.array(Image.open(props_src).convert("RGB"))
    p_rgba = build_chroma_alpha(p_rgb, aggressive_interior=True)
    prop_cols = split_sprite_columns(p_rgba, expected_count=4)
    prop_specs = (
        ("prop-bottle-tree-dormant-hd.png", BOTTLE_TREE_TARGET_SIZE, 134, 4),
        ("prop-bottle-tree-bloomed-hd.png", BOTTLE_TREE_TARGET_SIZE, 140, 4),
        ("prop-herb-rack-hd.png", HERB_RACK_TARGET_SIZE, 84, 4),
        ("prop-river-cairn-hd.png", RIVER_CAIRN_TARGET_SIZE, 60, 4),
    )
    for col_rgba, (filename, target_size, content_h, bottom_pad) in zip(prop_cols, prop_specs):
        prop_img = trim_and_place_sprite(
            col_rgba,
            target_size=target_size,
            max_content_height=content_h,
            bottom_margin=bottom_pad,
        )
        dst = out_dir / filename
        prop_img.save(dst, format="PNG", optimize=True)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {prop_img.size[0]}x{prop_img.size[1]} PNG ({dst.stat().st_size:,} bytes)")

    # 6. Black Elder Biome Keepers Duo (2 columns -> flipped to face trail & porch left-down)
    elders_src = artifacts_dir / RAW_ASSETS["elder-keepers"]
    if not elders_src.exists():
        raise FileNotFoundError(f"Missing raw elder-keepers artifact: {elders_src}")
    e_rgb = np.array(Image.open(elders_src).convert("RGB"))
    e_rgba = build_chroma_alpha(e_rgb, aggressive_interior=True)
    elder_cols = split_sprite_columns(e_rgba, expected_count=2)
    elder_specs = (
        ("keeper-garden-elder-hd.png", 136, 4, True),
        ("keeper-psalms-elder-hd.png", 136, 4, True),
    )
    for col_rgba, (filename, content_h, bottom_pad, flip_h) in zip(elder_cols, elder_specs):
        elder_img = trim_and_place_sprite(
            col_rgba,
            target_size=KEEPER_TARGET_SIZE,
            max_content_height=content_h,
            bottom_margin=bottom_pad,
            flip_horizontal=flip_h,
        )
        dst = out_dir / filename
        elder_img.save(dst, format="PNG", optimize=True)
        print(f"Encoded {dst.relative_to(REPO_ROOT)}: {elder_img.size[0]}x{elder_img.size[1]} PNG ({dst.stat().st_size:,} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build HD trail backdrops and sprites.")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()
    process_all(args.artifacts_dir, args.out_dir)


if __name__ == "__main__":
    main()
