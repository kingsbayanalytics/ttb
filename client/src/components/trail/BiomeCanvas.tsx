import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  PALETTE_INDEX,
  TrailTheme,
  getTrailPalette,
  getTrailThemeTokens,
} from './trailPalette';
import {
  SpriteSheetId,
  TRAIL_ATLAS_PATHS,
  drawPixelMatrixToContext,
  getAtlasPath,
  getSpriteFrame,
} from '../../assets/trail/pixelSprites';
import {
  ClearingSegment,
  TRAIL_LOGICAL_HEIGHT,
  TRAIL_LOGICAL_WIDTH,
  TRAIL_TILE_SIZE,
  TrailSceneVariant,
  WaypointPoint,
  WaypointState,
  buildClearingSegment,
  computeIntegerScale,
} from './trailLayouts';

export type { ClearingSegment, TrailSceneVariant, WaypointPoint, WaypointState };
export { TRAIL_LOGICAL_HEIGHT, TRAIL_LOGICAL_WIDTH };

/** Frame step cadence (~5.5 FPS, well below WCAG 2.3.1 3-flash threshold). */
export const ANIMATION_FRAME_INTERVAL_MS = 180;

const PHASE1_SHEETS: readonly SpriteSheetId[] = [
  'terrain-tiles-phase1',
  'landmarks-phase1',
  'keepers-phase1',
  'traveler-michael',
];

export const HD_BACKDROP_PATHS: Readonly<
  Record<TrailSceneVariant, Readonly<Record<TrailTheme, string>>>
> = {
  'eden-root-garden': {
    light: '/assets/trail/hd/genesis-daylight.webp',
    dark: '/assets/trail/hd/genesis-twilight.webp',
  },
  'twilight-shepherds-sanctuary': {
    light: '/assets/trail/hd/psalms-daylight.webp',
    dark: '/assets/trail/hd/psalms-twilight.webp',
  },
};

export const HD_SPRITE_PATHS = {
  michael: '/assets/trail/hd/traveler-michael-hd.png',
  dormant: '/assets/trail/hd/waypoint-dormant-hd.png',
  kindling: '/assets/trail/hd/waypoint-kindling-hd.png',
  bloomed: '/assets/trail/hd/waypoint-bloomed-hd.png',
} as const;

const HD_WAYPOINT_LOGICAL_WIDTH = 52;
const HD_WAYPOINT_LOGICAL_HEIGHT = 78;
const HD_MICHAEL_LOGICAL_WIDTH = 48;
const HD_MICHAEL_LOGICAL_HEIGHT = 74;

export interface BiomeCanvasChapter {
  readonly chapter: number;
  readonly totalVerses: number;
  readonly completedVerses: number;
  readonly state: WaypointState;
  readonly hasCompanion?: boolean;
}

export interface BiomeCanvasProps {
  readonly book: string;
  readonly clearingId?: string;
  readonly chapters: readonly BiomeCanvasChapter[];
  readonly activeChapter?: number;
  readonly selectedChapter?: number | null;
  readonly bookMastered?: boolean;
  /** Optional explicit theme override; defaults to ThemeContext `resolvedTheme`. */
  readonly themeOverride?: TrailTheme;
  /** Optional explicit reduced-motion override for tests or user controls. */
  readonly reducedMotionOverride?: boolean;
  /** Optional animation pause flag (WCAG 2.2.2 Pause, Stop, Hide support). */
  readonly animationPaused?: boolean;
  /** Optional explicit integer scaling factor (2, 3, or 4); otherwise DPR-aware auto. */
  readonly scaleOverride?: 2 | 3 | 4;
  /** Optional custom aria-label; defaults to a dynamic descriptive clearing summary. */
  readonly ariaLabel?: string;
  readonly className?: string;
  /** Optional callback notifying parent overlays whenever the clearing geometry changes. */
  readonly onLayoutResolved?: (segment: ClearingSegment) => void;
}

type AtlasImageMap = Map<string, HTMLImageElement>;

const SHARED_ATLAS_CACHE: AtlasImageMap = new Map();

export function clearBiomeCanvasImageCache(): void {
  SHARED_ATLAS_CACHE.clear();
}

function getLoadedCachedImage(path: string): HTMLImageElement | null {
  const img = SHARED_ATLAS_CACHE.get(path);
  if (img && img.complete && img.naturalWidth > 0) {
    return img;
  }
  return null;
}

function getLoadedAtlasImage(
  sheetId: SpriteSheetId,
  theme: TrailTheme
): HTMLImageElement | null {
  return getLoadedCachedImage(getAtlasPath(sheetId, theme));
}

interface LoadedHdBundle {
  readonly backdrop: HTMLImageElement;
  readonly michael: HTMLImageElement;
  readonly dormant: HTMLImageElement;
  readonly kindling: HTMLImageElement;
  readonly bloomed: HTMLImageElement;
}

function getLoadedHdBundle(
  variant: TrailSceneVariant,
  theme: TrailTheme
): LoadedHdBundle | null {
  const backdrop = getLoadedCachedImage(HD_BACKDROP_PATHS[variant][theme]);
  const michael = getLoadedCachedImage(HD_SPRITE_PATHS.michael);
  const dormant = getLoadedCachedImage(HD_SPRITE_PATHS.dormant);
  const kindling = getLoadedCachedImage(HD_SPRITE_PATHS.kindling);
  const bloomed = getLoadedCachedImage(HD_SPRITE_PATHS.bloomed);

  if (!backdrop || !michael || !dormant || !kindling || !bloomed) {
    return null;
  }

  return { backdrop, michael, dormant, kindling, bloomed };
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheetId: SpriteSheetId,
  frameName: string,
  theme: TrailTheme,
  logicalX: number,
  logicalY: number,
  scale: number
): void {
  const frame = getSpriteFrame(sheetId, frameName);
  const dx = Math.round(logicalX) * scale;
  const dy = Math.round(logicalY) * scale;
  const img = getLoadedAtlasImage(sheetId, theme);

  if (img && typeof ctx.drawImage === 'function') {
    ctx.drawImage(
      img,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      dx,
      dy,
      frame.width * scale,
      frame.height * scale
    );
    return;
  }

  drawPixelMatrixToContext(ctx, frame.pixels, theme, dx, dy, scale, false);
}

function fillLogicalRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  scale: number
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x) * scale,
    Math.round(y) * scale,
    Math.max(1, Math.round(w)) * scale,
    Math.max(1, Math.round(h)) * scale
  );
}

function drawPixelHalo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  color: string,
  alpha: number,
  scale: number
): void {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let dy = -radius; dy <= radius; dy += 2) {
    const span = Math.floor(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
    if (span <= 0) continue;
    ctx.fillRect(
      Math.round(centerX - span) * scale,
      Math.round(centerY + dy) * scale,
      Math.max(2, span * 2) * scale,
      2 * scale
    );
  }
  ctx.globalAlpha = prevAlpha;
}

function drawBrassSealSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  theme: TrailTheme,
  scale: number
): void {
  const palette = getTrailPalette(theme);
  const outline = palette[PALETTE_INDEX.OUTLINE_PRIMARY] ?? '#1E1916';
  const brass = palette[PALETTE_INDEX.BRASS_GOLD] ?? '#D4A359';
  const core = palette[PALETTE_INDEX.LANTERN_CORE] ?? '#FFF4D2';

  // Crisp 5x5 pixel diamond-star (`✦` brass seal)
  fillLogicalRect(ctx, cx - 2, cy, 5, 1, outline, scale);
  fillLogicalRect(ctx, cx, cy - 2, 1, 5, outline, scale);
  fillLogicalRect(ctx, cx - 1, cy - 1, 3, 3, brass, scale);
  fillLogicalRect(ctx, cx, cy, 1, 1, core, scale);
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  completedVerses: number,
  totalVerses: number,
  theme: TrailTheme,
  scale: number,
  barWidth = 24,
  barHeight = 5
): void {
  const tokens = getTrailThemeTokens(theme);
  const palette = getTrailPalette(theme);
  const left = Math.round(centerX - barWidth / 2);
  const ratio =
    totalVerses > 0 ? Math.min(1, Math.max(0, completedVerses / totalVerses)) : 0;
  const fillWidth = Math.max(1, Math.round((barWidth - 2) * ratio));

  fillLogicalRect(ctx, left, topY, barWidth, barHeight, tokens.outlineInk, scale);
  fillLogicalRect(
    ctx,
    left + 1,
    topY + 1,
    barWidth - 2,
    barHeight - 2,
    palette[PALETTE_INDEX.STONE_DEEP] ?? '#6E675F',
    scale
  );
  fillLogicalRect(
    ctx,
    left + 1,
    topY + 1,
    fillWidth,
    barHeight - 2,
    tokens.waypointKindling,
    scale
  );
}

function drawSelectionBrackets(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  theme: TrailTheme,
  scale: number,
  halfWidth = 15,
  halfHeight = 16
): void {
  const tokens = getTrailThemeTokens(theme);
  const palette = getTrailPalette(theme);
  const accent = palette[PALETTE_INDEX.LANTERN_CORE] ?? tokens.lanternHalo;
  const left = centerX - halfWidth;
  const right = centerX + halfWidth - 3;
  const top = centerY - halfHeight;
  const bottom = centerY + halfHeight - 3;
  const arm = halfWidth > 18 ? 6 : 4;

  // Four crisp pixel L-corners around the selected waypoint
  fillLogicalRect(ctx, left, top, arm, 1, accent, scale);
  fillLogicalRect(ctx, left, top, 1, arm, accent, scale);

  fillLogicalRect(ctx, right - (arm - 4), top, arm, 1, accent, scale);
  fillLogicalRect(ctx, right + 3, top, 1, arm, accent, scale);

  fillLogicalRect(ctx, left, bottom + 3, arm, 1, accent, scale);
  fillLogicalRect(ctx, left, bottom - (arm - 4), 1, arm, accent, scale);

  fillLogicalRect(ctx, right - (arm - 4), bottom + 3, arm, 1, accent, scale);
  fillLogicalRect(ctx, right + 3, bottom - (arm - 4), 1, arm, accent, scale);
}

function resolveDefaultActiveChapter(
  segment: ClearingSegment,
  chapterMap: ReadonlyMap<number, BiomeCanvasChapter>
): number | undefined {
  let latestInProgress: number | undefined;
  let firstDormant: number | undefined;

  for (const wp of segment.waypoints) {
    const ch = chapterMap.get(wp.chapter);
    const state = ch?.state ?? 'dormant';
    if (state === 'in_progress') {
      latestInProgress = wp.chapter;
    } else if (state === 'dormant' && firstDormant === undefined) {
      firstDormant = wp.chapter;
    }
  }

  if (latestInProgress !== undefined) return latestInProgress;
  if (firstDormant !== undefined) return firstDormant;
  return segment.waypoints[segment.waypoints.length - 1]?.chapter;
}

export function buildBiomeCanvasAriaLabel(
  segment: ClearingSegment,
  chapters: readonly BiomeCanvasChapter[],
  bookMastered: boolean
): string {
  const chapterMap = new Map<number, BiomeCanvasChapter>();
  for (const ch of chapters) {
    chapterMap.set(ch.chapter, ch);
  }

  let bloomedCount = 0;
  let inProgressCount = 0;
  for (const chapterNum of segment.chapters) {
    const state = chapterMap.get(chapterNum)?.state ?? 'dormant';
    if (state === 'bloomed') {
      bloomedCount += 1;
    } else if (state === 'in_progress') {
      inProgressCount += 1;
    }
  }

  const totalInClearing = segment.chapters.length;
  const parts = [
    `${segment.book} ${segment.label} trail clearing`,
    `${bloomedCount} of ${totalInClearing} chapters bloomed`,
  ];
  if (inProgressCount > 0) {
    parts.push(`${inProgressCount} in progress`);
  }
  if (bookMastered) {
    parts.push('book mastered');
  }
  return parts.join(', ');
}

interface PaintSceneOptions {
  readonly ctx: CanvasRenderingContext2D;
  readonly segment: ClearingSegment;
  readonly chapterMap: ReadonlyMap<number, BiomeCanvasChapter>;
  readonly activeChapter: number | undefined;
  readonly selectedChapter: number | null;
  readonly bookMastered: boolean;
  readonly theme: TrailTheme;
  readonly scale: number;
  readonly frameTick: number;
  readonly staticFrame: boolean;
}

interface PaintHdOptions extends PaintSceneOptions {
  readonly hd: LoadedHdBundle;
  readonly hasAnyBloom: boolean;
}

function paintHdClearingScene({
  ctx,
  segment,
  chapterMap,
  activeChapter,
  selectedChapter,
  bookMastered,
  theme,
  scale,
  frameTick,
  staticFrame,
  hd,
  hasAnyBloom,
}: PaintHdOptions): void {
  const tokens = getTrailThemeTokens(theme);
  const palette = getTrailPalette(theme);
  const { scene } = segment;

  ctx.imageSmoothingEnabled = false;

  // 1. Draw the mockup-grade 1280x720 HD pixel-art biome backdrop
  ctx.drawImage(
    hd.backdrop,
    0,
    0,
    TRAIL_LOGICAL_WIDTH * scale,
    TRAIL_LOGICAL_HEIGHT * scale
  );

  // 2. Book Mastery warm radiance halo on Hero Landmark / Elder Keeper sanctuary
  if (bookMastered) {
    const shrineX = scene.variant === 'twilight-shepherds-sanctuary' ? 548 : 190;
    const shrineY = scene.variant === 'twilight-shepherds-sanctuary' ? 92 : 112;
    drawPixelHalo(
      ctx,
      shrineX,
      shrineY,
      54,
      tokens.lanternHalo,
      theme === 'dark' ? 0.24 : 0.14,
      scale
    );
    drawBrassSealSparkle(ctx, shrineX, shrineY - 46, theme, scale);
  }

  // 3. Collect and Y-sort all chapter hook-posts + Traveler Michael for natural 3/4 depth
  const resolvedActiveChapter =
    activeChapter !== undefined ? activeChapter : resolveDefaultActiveChapter(segment, chapterMap);
  const travelerWaypoint =
    resolvedActiveChapter !== undefined
      ? segment.waypoints.find((wp) => wp.chapter === resolvedActiveChapter)
      : undefined;

  type DepthDrawable =
    | { readonly kind: 'waypoint'; readonly sortY: number; readonly wp: WaypointPoint }
    | { readonly kind: 'michael'; readonly sortY: number; readonly wp: WaypointPoint };

  const drawables: DepthDrawable[] = segment.waypoints.map((wp) => ({
    kind: 'waypoint',
    sortY: wp.y,
    wp,
  }));

  if (travelerWaypoint) {
    drawables.push({
      kind: 'michael',
      sortY: travelerWaypoint.footY,
      wp: travelerWaypoint,
    });
  }

  drawables.sort((a, b) => a.sortY - b.sortY);

  // Paint ground lantern glow pools underneath kindling/bloomed posts + Michael first
  for (const wp of segment.waypoints) {
    const state: WaypointState = chapterMap.get(wp.chapter)?.state ?? 'dormant';
    if (state === 'bloomed') {
      const pulse = !staticFrame && frameTick % 4 >= 2 ? 2 : 0;
      drawPixelHalo(
        ctx,
        wp.x + 8,
        wp.y - 44,
        24 + pulse,
        tokens.lanternHalo,
        theme === 'dark' ? 0.34 : 0.2,
        scale
      );
      drawPixelHalo(
        ctx,
        wp.x + 6,
        wp.y - 4,
        20,
        tokens.lanternHalo,
        theme === 'dark' ? 0.22 : 0.12,
        scale
      );
    } else if (state === 'in_progress') {
      drawPixelHalo(
        ctx,
        wp.x + 8,
        wp.y - 42,
        14,
        tokens.waypointKindling,
        theme === 'dark' ? 0.24 : 0.14,
        scale
      );
    }
  }

  // Draw depth-sorted hook-post waypoints & Michael
  for (const item of drawables) {
    if (item.kind === 'waypoint') {
      const { wp } = item;
      const data = chapterMap.get(wp.chapter);
      const state: WaypointState = data?.state ?? 'dormant';
      const completedVerses = data?.completedVerses ?? 0;
      const totalVerses = data?.totalVerses ?? 0;

      const drawX = Math.round(wp.x - HD_WAYPOINT_LOGICAL_WIDTH / 2) * scale;
      const drawY = Math.round(wp.y - (HD_WAYPOINT_LOGICAL_HEIGHT - 4)) * scale;
      const spriteImg =
        state === 'bloomed'
          ? hd.bloomed
          : state === 'in_progress'
            ? hd.kindling
            : hd.dormant;

      if (state === 'dormant' && !hasAnyBloom) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 0.88;
        ctx.drawImage(
          spriteImg,
          drawX,
          drawY,
          HD_WAYPOINT_LOGICAL_WIDTH * scale,
          HD_WAYPOINT_LOGICAL_HEIGHT * scale
        );
        ctx.globalAlpha = prevAlpha;
      } else {
        ctx.drawImage(
          spriteImg,
          drawX,
          drawY,
          HD_WAYPOINT_LOGICAL_WIDTH * scale,
          HD_WAYPOINT_LOGICAL_HEIGHT * scale
        );
      }

      if (state === 'bloomed') {
        drawBrassSealSparkle(ctx, wp.x + 14, wp.y - 58, theme, scale);
      } else if (state === 'in_progress') {
        drawProgressBar(ctx, wp.x, wp.y - 76, completedVerses, totalVerses, theme, scale, 24, 5);
      }

      if (selectedChapter === wp.chapter) {
        drawSelectionBrackets(ctx, wp.x, wp.y - 36, theme, scale, 24, 38);
      }
      continue;
    }

    // Draw Michael standing on the footpath beside the active waypoint
    const { footX, footY } = item.wp;
    const bobOffset = !staticFrame && frameTick % 4 >= 2 ? -1 : 0;

    // Grounding pixel shadow under sneakers
    fillLogicalRect(ctx, footX - 11, footY - 2, 22, 4, tokens.outlineInk, scale);

    // Warm brass lantern pool beside Michael
    drawPixelHalo(
      ctx,
      footX - 13,
      footY - 24 + bobOffset,
      theme === 'dark' ? 18 : 12,
      tokens.lanternHalo,
      theme === 'dark' ? 0.34 : 0.16,
      scale
    );

    ctx.drawImage(
      hd.michael,
      Math.round(footX - HD_MICHAEL_LOGICAL_WIDTH / 2) * scale,
      Math.round(footY - (HD_MICHAEL_LOGICAL_HEIGHT - 4) + bobOffset) * scale,
      HD_MICHAEL_LOGICAL_WIDTH * scale,
      HD_MICHAEL_LOGICAL_HEIGHT * scale
    );
  }

  // 4. Atmospheric drifting fireflies (disabled strictly when staticFrame is true)
  if (!staticFrame && (theme === 'dark' || bookMastered) && hasAnyBloom) {
    const fireflyGlow = palette[PALETTE_INDEX.LANTERN_GLOW] ?? tokens.lanternHalo;
    const fireflyCore = palette[PALETTE_INDEX.LANTERN_CORE] ?? '#FFF0C2';

    for (const anchor of scene.fireflyAnchors) {
      const t = frameTick * 0.42 + anchor.phase;
      const fx = Math.round(anchor.x + Math.sin(t) * 8);
      const fy = Math.round(anchor.y + Math.cos(t * 0.8) * 5);
      fillLogicalRect(ctx, fx, fy, 3, 3, fireflyGlow, scale);
      fillLogicalRect(ctx, fx + 1, fy + 1, 1, 1, fireflyCore, scale);
    }
  }
}

function paintClearingScene({
  ctx,
  segment,
  chapterMap,
  activeChapter,
  selectedChapter,
  bookMastered,
  theme,
  scale,
  frameTick,
  staticFrame,
}: PaintSceneOptions): void {
  const tokens = getTrailThemeTokens(theme);
  const palette = getTrailPalette(theme);
  const { scene } = segment;

  ctx.imageSmoothingEnabled = false;

  // Determine overall bloom vitality in this clearing
  let bloomedCount = 0;
  for (const wp of segment.waypoints) {
    if (chapterMap.get(wp.chapter)?.state === 'bloomed') {
      bloomedCount += 1;
    }
  }
  const hasAnyBloom = bloomedCount > 0 || bookMastered;

  // Prefer the mockup-grade 1280x720 HD diorama when browser images have decoded
  const hdBundle = getLoadedHdBundle(scene.variant, theme);
  if (hdBundle && typeof ctx.drawImage === 'function') {
    paintHdClearingScene({
      ctx,
      segment,
      chapterMap,
      activeChapter,
      selectedChapter,
      bookMastered,
      theme,
      scale,
      frameTick,
      staticFrame,
      hd: hdBundle,
      hasAnyBloom,
    });
    return;
  }

  // Fallback: deterministic 16-bit procedural tile/sprite renderer (used in JSDOM tests & preload)
  fillLogicalRect(ctx, 0, 0, TRAIL_LOGICAL_WIDTH, TRAIL_LOGICAL_HEIGHT, tokens.canvasBg, scale);

  // 2. Ground tile grid (20 x 12 tiles of 16x16 logical pixels)
  const cols = Math.ceil(TRAIL_LOGICAL_WIDTH / TRAIL_TILE_SIZE);
  const rows = Math.ceil(TRAIL_LOGICAL_HEIGHT / TRAIL_TILE_SIZE);
  const waterFrame = !staticFrame && frameTick % 4 >= 2 ? 'creek-water-1' : 'creek-water-0';

  for (let row = 0; row < rows; row += 1) {
    const tileY = row * TRAIL_TILE_SIZE;
    for (let col = 0; col < cols; col += 1) {
      const tileX = col * TRAIL_TILE_SIZE;
      const centerX = tileX + 8;
      const centerY = tileY + 8;

      // Top sanctuary hedgerow frame
      if (row === 0) {
        const hedgeTile =
          (col + row) % 3 === 0 && hasAnyBloom ? 'hedgerow-blossom' : 'hedgerow-foliage-a';
        drawSprite(ctx, 'terrain-tiles-phase1', hedgeTile, theme, tileX, tileY, scale);
        continue;
      }

      // Psalms Twilight Creek along lower verge
      if (scene.hasCreek && tileY >= scene.creekY) {
        drawSprite(ctx, 'terrain-tiles-phase1', waterFrame, theme, tileX, tileY, scale);
        continue;
      }
      if (scene.hasCreek && tileY >= scene.creekY - TRAIL_TILE_SIZE) {
        drawSprite(ctx, 'terrain-tiles-phase1', 'creek-bank-top', theme, tileX, tileY, scale);
        continue;
      }

      // Psalms Cedar Sanctuary Porch deck
      if (
        scene.hasCedarPorch &&
        tileX >= scene.porchRect.x &&
        tileX < scene.porchRect.x + scene.porchRect.cols * TRAIL_TILE_SIZE &&
        tileY >= scene.porchRect.y &&
        tileY < scene.porchRect.y + scene.porchRect.rows * TRAIL_TILE_SIZE
      ) {
        const isBottomEdge =
          tileY >= scene.porchRect.y + (scene.porchRect.rows - 1) * TRAIL_TILE_SIZE;
        drawSprite(
          ctx,
          'terrain-tiles-phase1',
          isBottomEdge ? 'cedar-porch-edge' : 'cedar-porch-deck',
          theme,
          tileX,
          tileY,
          scale
        );
        continue;
      }

      // Check proximity to nearest waypoint to tint terrain by waypoint state
      let nearestState: WaypointState = 'dormant';
      let nearestDist = Infinity;
      for (const wp of segment.waypoints) {
        const dist = Math.hypot(centerX - wp.x, centerY - wp.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestState = chapterMap.get(wp.chapter)?.state ?? 'dormant';
        }
      }

      let groundTile = (col + row) % 2 === 0 ? 'grass-sage-a' : 'grass-sage-b';
      if (nearestDist < 26 && nearestState === 'dormant' && !bookMastered) {
        groundTile = 'dormant-earth';
      } else if (nearestDist < 28 && nearestState === 'bloomed') {
        groundTile = (col + row) % 3 === 0 ? 'grass-wildflowers' : 'grass-sage-b';
      } else if (
        scene.variant === 'eden-root-garden' &&
        row === 2 &&
        col >= 2 &&
        col <= 7
      ) {
        groundTile = hasAnyBloom
          ? col % 2 === 0
            ? 'garden-herbs-lush'
            : 'garden-sprouts'
          : 'garden-loam-soil';
      }

      drawSprite(ctx, 'terrain-tiles-phase1', groundTile, theme, tileX, tileY, scale);
    }
  }

  // 3. Wooden garden/pasture fence accent along the upper-left horizon
  for (let col = 1; col <= 10; col += 1) {
    const fx = col * TRAIL_TILE_SIZE;
    const fy = 44;
    const fenceFrame = col === 1 || col === 6 || col === 10 ? 'wooden-fence-post' : 'wooden-fence-h';
    drawSprite(ctx, 'terrain-tiles-phase1', fenceFrame, theme, fx, fy, scale);
  }

  // 4. Winding red-clay (Genesis) or mossy-stone (Psalms) pilgrimage path
  const pathColor =
    scene.variant === 'eden-root-garden'
      ? palette[PALETTE_INDEX.TERRACOTTA_BASE] ?? tokens.clay
      : palette[PALETTE_INDEX.STONE_MID] ?? '#D6D0C4';
  const pathHighlight =
    scene.variant === 'eden-root-garden'
      ? palette[PALETTE_INDEX.CLAY_DUST] ?? tokens.clayHighlight
      : palette[PALETTE_INDEX.BONE_LIGHT] ?? '#ECE8DF';
  const pathEdge =
    scene.variant === 'eden-root-garden'
      ? palette[PALETTE_INDEX.TERRACOTTA_DEEP] ?? '#8A3022'
      : palette[PALETTE_INDEX.STONE_DARK] ?? '#9B9284';

  for (let i = 0; i < segment.pathSamples.length; i += 1) {
    const pt = segment.pathSamples[i];
    // Crisp stepped pixel-art trail ribbon
    fillLogicalRect(ctx, pt.x - 7, pt.y - 4, 14, 10, pathEdge, scale);
    fillLogicalRect(ctx, pt.x - 6, pt.y - 3, 12, 8, pathColor, scale);
    if (i % 2 === 0) {
      fillLogicalRect(ctx, pt.x - 3, pt.y - 1, 5, 3, pathHighlight, scale);
    }
    if (i % 5 === 0) {
      drawSprite(ctx, 'terrain-tiles-phase1', scene.pathTile, theme, pt.x - 8, pt.y - 8, scale);
    }
  }

  // 5. Scenic Heritage Props (cedar herb beds, drying herbs, brass porch lanterns)
  for (const prop of scene.props) {
    const frameName = hasAnyBloom && prop.bloomedFrame ? prop.bloomedFrame : prop.frame;
    if (frameName === 'brass-porch-lantern-lit') {
      drawPixelHalo(
        ctx,
        prop.x + 16,
        prop.y + 14,
        14,
        tokens.lanternHalo,
        theme === 'dark' ? 0.28 : 0.16,
        scale
      );
    }
    drawSprite(ctx, prop.sheet, frameName, theme, prop.x, prop.y, scale);
  }

  // 6. Hero Landmark & Book Mastery Sanctuary Radiance + Biome Keeper
  const { heroLandmark, keeperPlacement } = scene;
  const landmarkFrame =
    bookMastered || hasAnyBloom ? heroLandmark.bloomedFrame : heroLandmark.dormantFrame;

  if (bookMastered) {
    drawPixelHalo(
      ctx,
      heroLandmark.x + 16,
      heroLandmark.y + 16,
      24,
      tokens.lanternHalo,
      theme === 'dark' ? 0.34 : 0.22,
      scale
    );
  }

  drawSprite(ctx, 'landmarks-phase1', landmarkFrame, theme, heroLandmark.x, heroLandmark.y, scale);

  if (bookMastered) {
    const keeperFrameIndex = !staticFrame && frameTick % 4 >= 2 ? 1 : 0;
    const keeperFrameName = `${keeperPlacement.framePrefix}-${keeperFrameIndex}`;
    drawSprite(
      ctx,
      'keepers-phase1',
      keeperFrameName,
      theme,
      keeperPlacement.x,
      keeperPlacement.y,
      scale
    );
    drawBrassSealSparkle(ctx, heroLandmark.x + 16, heroLandmark.y - 2, theme, scale);
  }

  // 7. Chapter Waypoints (Dormant / In-Progress / Bloomed)
  for (const wp of segment.waypoints) {
    const data = chapterMap.get(wp.chapter);
    const state: WaypointState = data?.state ?? 'dormant';
    const completedVerses = data?.completedVerses ?? 0;
    const totalVerses = data?.totalVerses ?? 0;
    const spriteX = wp.x - 16;
    const spriteY = wp.y - 18;

    if (state === 'bloomed') {
      drawSprite(
        ctx,
        'terrain-tiles-phase1',
        'stone-cobble-clearing',
        theme,
        wp.x - 8,
        wp.y - 6,
        scale
      );
      const pulseRadius = !staticFrame && frameTick % 4 >= 2 ? 14 : 12;
      drawPixelHalo(
        ctx,
        wp.x,
        wp.y - 5,
        pulseRadius,
        tokens.lanternHalo,
        theme === 'dark' ? 0.36 : 0.22,
        scale
      );
      drawSprite(ctx, 'landmarks-phase1', 'waypoint-bloomed', theme, spriteX, spriteY, scale);
      // Distinct brass seal (`✦`) marker so Bloomed state never relies on color alone
      drawBrassSealSparkle(ctx, wp.x + 9, wp.y - 12, theme, scale);
    } else if (state === 'in_progress') {
      drawPixelHalo(
        ctx,
        wp.x,
        wp.y - 4,
        9,
        tokens.waypointKindling,
        theme === 'dark' ? 0.26 : 0.16,
        scale
      );
      drawSprite(ctx, 'landmarks-phase1', 'waypoint-kindling', theme, spriteX, spriteY, scale);
      drawProgressBar(ctx, wp.x, wp.y + 11, completedVerses, totalVerses, theme, scale);
    } else {
      // Dormant: monochrome stone veiled in soft parchment/obsidian pixel mist
      drawSprite(ctx, 'landmarks-phase1', 'waypoint-dormant', theme, spriteX, spriteY, scale);
      const mistDriftX = !staticFrame ? (frameTick % 4 === 2 ? 1 : 0) : 0;
      drawSprite(
        ctx,
        'terrain-tiles-phase1',
        'mist-veil-medium',
        theme,
        wp.x - 8 + mistDriftX,
        wp.y - 8,
        scale
      );
    }

    if (selectedChapter === wp.chapter) {
      drawSelectionBrackets(ctx, wp.x, wp.y, theme, scale);
    }
  }

  // 8. Traveler Michael (`traveler-michael`, 16x24, foot-anchored at active waypoint)
  const resolvedActiveChapter =
    activeChapter !== undefined ? activeChapter : resolveDefaultActiveChapter(segment, chapterMap);
  const travelerWaypoint =
    resolvedActiveChapter !== undefined
      ? segment.waypoints.find((wp) => wp.chapter === resolvedActiveChapter)
      : undefined;

  if (travelerWaypoint) {
    const activeData = chapterMap.get(travelerWaypoint.chapter);
    const isActiveBloomed = activeData?.state === 'bloomed';

    let travelerFrame = 'idle-0';
    if (!staticFrame) {
      if (isActiveBloomed) {
        const cycle = ['idle-0', 'idle-1', 'lantern-raise-0', 'lantern-raise-1'];
        travelerFrame = cycle[frameTick % cycle.length];
      } else {
        travelerFrame = frameTick % 2 === 0 ? 'idle-0' : 'idle-1';
      }
    }

    const footX = travelerWaypoint.footX;
    const footY = travelerWaypoint.footY;

    // Grounding pixel shadow under Michael's sneakers
    fillLogicalRect(ctx, footX - 5, footY - 1, 10, 2, tokens.outlineInk, scale);

    // Subtle lantern warmth beside Michael in Twilight theme
    if (theme === 'dark') {
      drawPixelHalo(ctx, footX + 5, footY - 10, 10, tokens.lanternHalo, 0.24, scale);
    }

    drawSprite(ctx, 'traveler-michael', travelerFrame, theme, footX - 8, footY - 24, scale);
  }

  // 9. Atmospheric twilight fireflies (strictly off when reduced motion / paused)
  if (!staticFrame && (theme === 'dark' || bookMastered) && hasAnyBloom) {
    const fireflyGlow = palette[PALETTE_INDEX.LANTERN_GLOW] ?? tokens.lanternHalo;
    const fireflyCore = palette[PALETTE_INDEX.LANTERN_CORE] ?? '#FFF0C2';

    for (const anchor of scene.fireflyAnchors) {
      const t = frameTick * 0.45 + anchor.phase;
      const fx = Math.round(anchor.x + Math.sin(t) * 5);
      const fy = Math.round(anchor.y + Math.cos(t * 0.8) * 3);
      fillLogicalRect(ctx, fx, fy, 2, 2, fireflyGlow, scale);
      fillLogicalRect(ctx, fx, fy, 1, 1, fireflyCore, scale);
    }
  }
}

export const BiomeCanvas: React.FC<BiomeCanvasProps> = ({
  book,
  clearingId,
  chapters,
  activeChapter,
  selectedChapter = null,
  bookMastered = false,
  themeOverride,
  reducedMotionOverride,
  animationPaused = false,
  scaleOverride,
  ariaLabel,
  className,
  onLayoutResolved,
}) => {
  const { resolvedTheme } = useTheme();
  const osReducedMotion = useReducedMotion();

  const effectiveTheme: TrailTheme = themeOverride ?? resolvedTheme;
  const effectiveReducedMotion =
    reducedMotionOverride !== undefined ? reducedMotionOverride : osReducedMotion;
  const shouldAnimate = !effectiveReducedMotion && !animationPaused;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [atlasVersion, setAtlasVersion] = useState<number>(0);

  const segment = useMemo(
    () => buildClearingSegment(book, clearingId),
    [book, clearingId]
  );

  const chapterMap = useMemo(() => {
    const map = new Map<number, BiomeCanvasChapter>();
    for (const ch of chapters) {
      map.set(ch.chapter, ch);
    }
    return map;
  }, [chapters]);

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const integerScale: 2 | 3 | 4 =
    scaleOverride ?? computeIntegerScale(containerWidth, dpr);

  const backingWidth = TRAIL_LOGICAL_WIDTH * integerScale;
  const backingHeight = TRAIL_LOGICAL_HEIGHT * integerScale;

  const computedAriaLabel = useMemo(
    () => ariaLabel ?? buildBiomeCanvasAriaLabel(segment, chapters, bookMastered),
    [ariaLabel, segment, chapters, bookMastered]
  );

  useEffect(() => {
    if (onLayoutResolved) {
      onLayoutResolved(segment);
    }
  }, [onLayoutResolved, segment]);

  // Measure container width for DPR-aware integer scaling
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateWidth = () => {
      const nextWidth = wrapper.clientWidth || wrapper.getBoundingClientRect().width || 640;
      if (nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(wrapper);
      return () => observer.disconnect();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    return undefined;
  }, []);

  // Preload HD diorama assets (backdrop + sprites) & fallback PNG atlases for the active theme
  const activeVariant = segment.scene.variant;
  useEffect(() => {
    if (typeof Image === 'undefined') return undefined;
    let cancelled = false;
    const handleAtlasLoad = () => {
      if (!cancelled) {
        setAtlasVersion((v) => v + 1);
      }
    };

    const assetPaths: string[] = [
      HD_BACKDROP_PATHS[activeVariant][effectiveTheme],
      HD_SPRITE_PATHS.michael,
      HD_SPRITE_PATHS.dormant,
      HD_SPRITE_PATHS.kindling,
      HD_SPRITE_PATHS.bloomed,
      ...PHASE1_SHEETS.map((sheetId) => TRAIL_ATLAS_PATHS[sheetId][effectiveTheme]),
    ];

    for (const path of assetPaths) {
      if (SHARED_ATLAS_CACHE.has(path)) {
        continue;
      }
      const img = new Image();
      img.decoding = 'async';
      img.onload = handleAtlasLoad;
      img.src = path;
      SHARED_ATLAS_CACHE.set(path, img);
    }

    return () => {
      cancelled = true;
    };
  }, [activeVariant, effectiveTheme]);

  // Main render & motion-safe animation controller
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const paintFrame = (tick: number, staticFrame: boolean) => {
      paintClearingScene({
        ctx,
        segment,
        chapterMap,
        activeChapter,
        selectedChapter,
        bookMastered,
        theme: effectiveTheme,
        scale: integerScale,
        frameTick: tick,
        staticFrame,
      });
    };

    // Always paint immediately (guarantees instant redraw on theme/prop change)
    paintFrame(0, !shouldAnimate);

    // Hard lock: NEVER schedule requestAnimationFrame under reduced motion or paused state
    if (!shouldAnimate || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return undefined;
    }

    let rafId: number | null = null;
    let lastTimestamp = 0;
    let tick = 0;
    let isVisibleInTab =
      typeof document === 'undefined' || document.visibilityState !== 'hidden';
    let isRenderedOnScreen = true;

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const step = (timestamp: number) => {
      rafId = null;
      if (!isVisibleInTab || !isRenderedOnScreen) {
        return;
      }
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }
      if (timestamp - lastTimestamp >= ANIMATION_FRAME_INTERVAL_MS) {
        tick = (tick + 1) % 64;
        lastTimestamp = timestamp;
        paintFrame(tick, false);
      }
      rafId = window.requestAnimationFrame(step);
    };

    const startLoop = () => {
      if (rafId === null && isVisibleInTab && isRenderedOnScreen) {
        lastTimestamp = 0;
        rafId = window.requestAnimationFrame(step);
      }
    };

    const handleVisibilityChange = () => {
      isVisibleInTab = document.visibilityState !== 'hidden';
      if (isVisibleInTab) {
        startLoop();
      } else {
        stopLoop();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Modern efficient background processing: pause animation when off-screen via
    // `contentvisibilityautostatechange`, falling back to `IntersectionObserver`.
    const wrapper = wrapperRef.current;
    let cleanupOffscreen: (() => void) | undefined;

    if (wrapper && typeof document !== 'undefined') {
      const supportsContentVisibility =
        'contentVisibility' in document.documentElement.style;

      if (supportsContentVisibility) {
        const handleCvChange = (event: Event) => {
          const skipped = Boolean((event as Event & { skipped?: boolean }).skipped);
          isRenderedOnScreen = !skipped;
          if (isRenderedOnScreen) {
            startLoop();
          } else {
            stopLoop();
          }
        };
        wrapper.addEventListener('contentvisibilityautostatechange', handleCvChange);
        cleanupOffscreen = () => {
          wrapper.removeEventListener('contentvisibilityautostatechange', handleCvChange);
        };
      } else if (typeof IntersectionObserver === 'function') {
        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            isRenderedOnScreen = entry.isIntersecting;
            if (isRenderedOnScreen) {
              startLoop();
            } else {
              stopLoop();
            }
          },
          { rootMargin: '200px' }
        );
        observer.observe(wrapper);
        cleanupOffscreen = () => observer.disconnect();
      }
    }

    startLoop();

    return () => {
      stopLoop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (cleanupOffscreen) {
        cleanupOffscreen();
      }
    };
  }, [
    segment,
    chapterMap,
    activeChapter,
    selectedChapter,
    bookMastered,
    effectiveTheme,
    integerScale,
    shouldAnimate,
    atlasVersion,
  ]);

  const wrapperStyle = {
    position: 'relative',
    width: '100%',
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 360px',
  } as React.CSSProperties;

  return (
    <div
      ref={wrapperRef}
      className={className ? `biome-canvas-wrapper ${className}` : 'biome-canvas-wrapper'}
      data-biome-id={segment.biomeId}
      data-clearing-id={segment.clearingId}
      data-trail-theme={effectiveTheme}
      data-pixel-scale={String(integerScale)}
      style={wrapperStyle}
    >
      <canvas
        ref={canvasRef}
        width={backingWidth}
        height={backingHeight}
        role="img"
        aria-label={computedAriaLabel}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          aspectRatio: `${TRAIL_LOGICAL_WIDTH} / ${TRAIL_LOGICAL_HEIGHT}`,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default BiomeCanvas;
