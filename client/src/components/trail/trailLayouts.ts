/**
 * Typing the Bible v3 — Deterministic 16-Bit HD Clearing Layouts & Waypoint Geometry
 *
 * Computes crisp logical coordinates inside a unified 640x360 HD pixel viewBox
 * (clean 2x/3x/4x integer scaling up to 1280x720, 1920x1080, 2560x1440) with gentle
 * left-to-right winding Bezier paths traced onto the Genesis ("Eden Root-Garden") and
 * Psalms ("Twilight Shepherd's Sanctuary") HD pixel dioramas, plus normalized percentage
 * coordinates for `<WaypointOverlay />` alignment.
 */

import {
  Phase1KeeperPrefix,
  TrailClearingDefinition,
  findClearingForChapter,
  getBiomeForBook,
  getTrailClearingsForBook,
} from '../../data/trailBiomes';

export const TRAIL_LOGICAL_WIDTH = 640;
export const TRAIL_LOGICAL_HEIGHT = 360;
export const TRAIL_TILE_SIZE = 16;

export type WaypointState = 'dormant' | 'in_progress' | 'bloomed';

export type TrailSceneVariant =
  | 'eden-root-garden'
  | 'twilight-shepherds-sanctuary';

export interface LogicalPoint {
  readonly x: number;
  readonly y: number;
}

export interface WaypointPoint {
  readonly chapter: number;
  /** Logical center X (0..TRAIL_LOGICAL_WIDTH) for the 32x32 lantern stone */
  readonly x: number;
  /** Logical center Y (0..TRAIL_LOGICAL_HEIGHT) for the 32x32 lantern stone */
  readonly y: number;
  /** Normalized percentage X (0..100) for `<WaypointOverlay />` button alignment */
  readonly xPct: number;
  /** Normalized percentage Y (0..100) for `<WaypointOverlay />` button alignment */
  readonly yPct: number;
  /** Foot-anchor X for Michael's 16x24 traveler sprite */
  readonly footX: number;
  /** Foot-anchor Y for Michael's 16x24 traveler sprite */
  readonly footY: number;
  readonly indexInClearing: number;
}

export interface ClearingPropPlacement {
  readonly sheet: 'landmarks-phase1' | 'terrain-tiles-phase1';
  readonly frame: string;
  readonly bloomedFrame?: string;
  readonly x: number;
  readonly y: number;
}

export interface HeroLandmarkPlacement {
  readonly x: number;
  readonly y: number;
  readonly dormantFrame: string;
  readonly bloomedFrame: string;
  readonly label: string;
}

export interface KeeperPlacement {
  readonly x: number;
  readonly y: number;
  readonly framePrefix: Phase1KeeperPrefix;
  readonly name: string;
}

export interface FireflyAnchor {
  readonly x: number;
  readonly y: number;
  readonly phase: number;
}

export interface ClearingSceneBlueprint {
  readonly variant: TrailSceneVariant;
  readonly pathTile: 'red-clay-path-straight' | 'mossy-stone-path';
  readonly pathEdgeTile: 'red-clay-path-edge' | 'mossy-stone-path';
  readonly hasCreek: boolean;
  readonly creekY: number;
  readonly hasCedarPorch: boolean;
  readonly porchRect: { readonly x: number; readonly y: number; readonly cols: number; readonly rows: number };
  readonly heroLandmark: HeroLandmarkPlacement;
  readonly keeperPlacement: KeeperPlacement;
  readonly props: readonly ClearingPropPlacement[];
  readonly fireflyAnchors: readonly FireflyAnchor[];
}

export interface ClearingSegment {
  readonly clearingId: string;
  readonly legId: string;
  readonly legLabel: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly book: string;
  readonly biomeId: string;
  readonly startChapter: number;
  readonly endChapter: number;
  readonly chapters: readonly number[];
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly waypoints: readonly WaypointPoint[];
  readonly pathSamples: readonly LogicalPoint[];
  readonly scene: ClearingSceneBlueprint;
}

interface CubicBezierSegment {
  readonly p0: LogicalPoint;
  readonly p1: LogicalPoint;
  readonly p2: LogicalPoint;
  readonly p3: LogicalPoint;
}

function evalCubicBezier(seg: CubicBezierSegment, t: number): LogicalPoint {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * seg.p0.x + 3 * uu * t * seg.p1.x + 3 * u * tt * seg.p2.x + ttt * seg.p3.x,
    y: uuu * seg.p0.y + 3 * uu * t * seg.p1.y + 3 * u * tt * seg.p2.y + ttt * seg.p3.y,
  };
}

function hashStringToInt(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Traces the painted S-curve footpath across the 640x360 HD Genesis & Psalms backdrops
 * while preserving the classic lower-middle meadow band for fallback rendering.
 */
function buildSerpentineCurves(
  variant: TrailSceneVariant,
  seed: number
): readonly CubicBezierSegment[] {
  const yShift = ((seed >> 2) % 5) - 2; // -2..+2 px subtle clearing variation

  if (variant === 'twilight-shepherds-sanctuary') {
    // Psalms footpath enters left meadow (48, 238), winds up past the harp ridge
    // (320, 188), and meets the Southern Cedar Sanctuary porch steps near (528, 178).
    return [
      {
        p0: { x: 48, y: 238 + yShift },
        p1: { x: 132, y: 246 + yShift },
        p2: { x: 222, y: 244 - yShift },
        p3: { x: 300, y: 196 + yShift },
      },
      {
        p0: { x: 300, y: 196 + yShift },
        p1: { x: 368, y: 164 - yShift },
        p2: { x: 454, y: 190 + yShift },
        p3: { x: 528, y: 178 - yShift },
      },
    ];
  }

  // Genesis Eden Root-Garden: painted clay trail sweeps from (52, 242) clear below
  // the raised cedar herb beds across (310, 196) and onward toward (552, 184).
  return [
    {
      p0: { x: 52, y: 242 + yShift },
      p1: { x: 140, y: 248 + yShift },
      p2: { x: 232, y: 246 - yShift },
      p3: { x: 310, y: 196 + yShift },
    },
    {
      p0: { x: 310, y: 196 + yShift },
      p1: { x: 374, y: 162 - yShift },
      p2: { x: 468, y: 188 + yShift },
      p3: { x: 552, y: 184 - yShift },
    },
  ];
}

function sampleCurvesEvenly(
  curves: readonly CubicBezierSegment[],
  densePerSegment = 48
): { readonly samples: readonly LogicalPoint[]; readonly cumulativeLengths: readonly number[] } {
  const samples: LogicalPoint[] = [];
  const cumulativeLengths: number[] = [];
  let totalLen = 0;

  for (let c = 0; c < curves.length; c += 1) {
    const startIdx = c === 0 ? 0 : 1;
    for (let i = startIdx; i <= densePerSegment; i += 1) {
      const t = i / densePerSegment;
      const pt = evalCubicBezier(curves[c], t);
      if (samples.length > 0) {
        const prev = samples[samples.length - 1];
        totalLen += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      }
      samples.push(pt);
      cumulativeLengths.push(totalLen);
    }
  }

  return { samples, cumulativeLengths };
}

function pointAtArcLength(
  samples: readonly LogicalPoint[],
  cumulativeLengths: readonly number[],
  targetLength: number
): LogicalPoint {
  if (samples.length === 0) {
    return { x: TRAIL_LOGICAL_WIDTH / 2, y: TRAIL_LOGICAL_HEIGHT / 2 };
  }
  const maxLen = cumulativeLengths[cumulativeLengths.length - 1] || 0;
  if (targetLength <= 0 || maxLen <= 0) {
    return samples[0];
  }
  if (targetLength >= maxLen) {
    return samples[samples.length - 1];
  }

  for (let i = 1; i < cumulativeLengths.length; i += 1) {
    if (cumulativeLengths[i] >= targetLength) {
      const segStart = cumulativeLengths[i - 1];
      const segEnd = cumulativeLengths[i];
      const ratio = segEnd > segStart ? (targetLength - segStart) / (segEnd - segStart) : 0;
      const a = samples[i - 1];
      const b = samples[i];
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
      };
    }
  }

  return samples[samples.length - 1];
}

function buildSceneBlueprint(
  variant: TrailSceneVariant,
  seed: number
): ClearingSceneBlueprint {
  if (variant === 'twilight-shepherds-sanctuary') {
    const lanternShift = (seed % 3) * 16;
    return {
      variant,
      pathTile: 'mossy-stone-path',
      pathEdgeTile: 'mossy-stone-path',
      hasCreek: true,
      creekY: 296,
      hasCedarPorch: true,
      porchRect: { x: 464, y: 32, cols: 10, rows: 6 },
      heroLandmark: {
        x: 540,
        y: 28,
        dormantFrame: 'shepherds-sanctuary-porch',
        bloomedFrame: 'shepherds-sanctuary-porch',
        label: "Shepherd's Sanctuary Porch",
      },
      keeperPlacement: {
        x: 500,
        y: 52,
        framePrefix: 'psalms-twilight-psalmist',
        name: 'The Twilight Psalmist',
      },
      props: [
        {
          sheet: 'landmarks-phase1',
          frame: 'hanging-drying-herbs',
          x: 428,
          y: 28,
        },
        {
          sheet: 'landmarks-phase1',
          frame: 'brass-porch-lantern-unlit',
          bloomedFrame: 'brass-porch-lantern-lit',
          x: 368 - lanternShift,
          y: 36,
        },
        {
          sheet: 'landmarks-phase1',
          frame: 'cedar-herb-bed',
          x: 48 + (seed % 2) * 28,
          y: 40,
        },
        {
          sheet: 'landmarks-phase1',
          frame: 'hanging-drying-herbs',
          x: 156 + (seed % 3) * 20,
          y: 32,
        },
      ],
      fireflyAnchors: [
        { x: 92, y: 112, phase: 0 },
        { x: 224, y: 92, phase: 1.7 },
        { x: 356, y: 124, phase: 3.1 },
        { x: 468, y: 110, phase: 4.4 },
        { x: 564, y: 272, phase: 2.3 },
        { x: 176, y: 288, phase: 5.2 },
      ],
    };
  }

  // Genesis — Eden Root-Garden
  const herbOffset = (seed % 3) * 20;
  return {
    variant,
    pathTile: 'red-clay-path-straight',
    pathEdgeTile: 'red-clay-path-edge',
    hasCreek: false,
    creekY: 324,
    hasCedarPorch: false,
    porchRect: { x: 0, y: 0, cols: 0, rows: 0 },
    heroLandmark: {
      x: 536,
      y: 28,
      dormantFrame: 'eden-tree-dormant',
      bloomedFrame: 'eden-tree-bloomed',
      label: 'Eden Tree of Roots',
    },
    keeperPlacement: {
      x: 488,
      y: 56,
      framePrefix: 'genesis-root-keeper',
      name: 'The Garden Root-Keeper',
    },
    props: [
      {
        sheet: 'landmarks-phase1',
        frame: 'cedar-herb-bed',
        x: 44 + herbOffset,
        y: 44,
      },
      {
        sheet: 'landmarks-phase1',
        frame: 'cedar-herb-bed',
        x: 148 + herbOffset,
        y: 40,
      },
      {
        sheet: 'landmarks-phase1',
        frame: 'hanging-drying-herbs',
        x: 272,
        y: 32,
      },
      {
        sheet: 'landmarks-phase1',
        frame: 'brass-porch-lantern-unlit',
        bloomedFrame: 'brass-porch-lantern-lit',
        x: 388,
        y: 40,
      },
    ],
    fireflyAnchors: [
      { x: 108, y: 116, phase: 0.4 },
      { x: 248, y: 96, phase: 1.9 },
      { x: 384, y: 108, phase: 3.4 },
      { x: 512, y: 92, phase: 4.8 },
      { x: 292, y: 300, phase: 2.6 },
    ],
  };
}

function resolveSceneVariant(book: string, biomeId: string): TrailSceneVariant {
  if (book === 'Psalms' || biomeId === 'twilight-shepherds-sanctuary') {
    return 'twilight-shepherds-sanctuary';
  }
  return 'eden-root-garden';
}

function buildSegmentFromClearing(
  book: string,
  biomeId: string,
  clearing: TrailClearingDefinition
): ClearingSegment {
  const variant = resolveSceneVariant(book, biomeId);
  const seed = hashStringToInt(`${book}:${clearing.clearingId}`);
  const curves = buildSerpentineCurves(variant, seed);
  const { samples, cumulativeLengths } = sampleCurvesEvenly(curves, 44);
  const totalLen = cumulativeLengths[cumulativeLengths.length - 1] || 1;

  const chapters: number[] = [];
  for (let ch = clearing.startChapter; ch <= clearing.endChapter; ch += 1) {
    chapters.push(ch);
  }

  const count = chapters.length;
  const waypoints: WaypointPoint[] = chapters.map((chapter, idx) => {
    const frac = count === 1 ? 0.5 : idx / (count - 1);
    const pt = pointAtArcLength(samples, cumulativeLengths, frac * totalLen);
    const x = Math.round(pt.x);
    // Alternate wooden hook-post anchors along upper and lower path verges while keeping
    // left-side Genesis herb beds clear and placing Michael cleanly away from the right-hanging arm.
    const vergeOffset =
      variant === 'eden-root-garden' && pt.x < 240 && idx % 2 === 0
        ? -4
        : idx % 2 === 0
          ? -12
          : 22;
    const y = Math.min(TRAIL_LOGICAL_HEIGHT - 34, Math.max(96, Math.round(pt.y + vergeOffset)));
    const footX =
      idx % 2 === 1
        ? Math.max(36, Math.round(pt.x - 22))
        : Math.min(TRAIL_LOGICAL_WIDTH - 48, Math.max(36, Math.round(pt.x - 14)));
    const footY =
      idx % 2 === 1
        ? Math.min(TRAIL_LOGICAL_HEIGHT - 22, Math.max(96, Math.round(pt.y + 6)))
        : Math.min(TRAIL_LOGICAL_HEIGHT - 22, Math.max(96, Math.round(pt.y + 14)));
    return {
      chapter,
      x,
      y,
      xPct: Number(((x / TRAIL_LOGICAL_WIDTH) * 100).toFixed(3)),
      yPct: Number(((y / TRAIL_LOGICAL_HEIGHT) * 100).toFixed(3)),
      footX,
      footY,
      indexInClearing: idx,
    };
  });

  // Downsample smooth path points for deterministic clay/stone trail drawing
  const pathSamples: LogicalPoint[] = [];
  const sampleCount = 64;
  for (let i = 0; i <= sampleCount; i += 1) {
    const pt = pointAtArcLength(samples, cumulativeLengths, (i / sampleCount) * totalLen);
    pathSamples.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
  }

  return {
    clearingId: clearing.clearingId,
    legId: clearing.legId,
    legLabel: clearing.legLabel,
    label: clearing.label,
    shortLabel: clearing.shortLabel,
    book,
    biomeId,
    startChapter: clearing.startChapter,
    endChapter: clearing.endChapter,
    chapters,
    logicalWidth: TRAIL_LOGICAL_WIDTH,
    logicalHeight: TRAIL_LOGICAL_HEIGHT,
    waypoints,
    pathSamples,
    scene: buildSceneBlueprint(variant, seed),
  };
}

/**
 * Builds the deterministic clearing segment for a book and optional `clearingId`
 * (also accepts a `legId` and resolves to that leg's first clearing).
 */
export function buildClearingSegment(
  book: string,
  clearingId?: string,
  totalChapters?: number
): ClearingSegment {
  const biome = getBiomeForBook(book);
  const biomeId = biome?.biomeId ?? 'eden-root-garden';
  const clearings = getTrailClearingsForBook(book, totalChapters);

  let target = clearings[0];
  if (clearingId) {
    target =
      clearings.find((c) => c.clearingId === clearingId) ??
      clearings.find((c) => c.legId === clearingId) ??
      clearings[0];
  }

  return buildSegmentFromClearing(book, biomeId, target);
}

/**
 * Resolves the clearing containing `chapter` and builds its layout segment.
 */
export function buildClearingSegmentForChapter(
  book: string,
  chapter: number,
  totalChapters?: number
): ClearingSegment {
  const biome = getBiomeForBook(book);
  const biomeId = biome?.biomeId ?? 'eden-root-garden';
  const clearing = findClearingForChapter(book, chapter, totalChapters);
  return buildSegmentFromClearing(book, biomeId, clearing);
}

/**
 * Returns every clearing segment for a book in ascending canonical chapter order.
 */
export function getAllClearingSegmentsForBook(
  book: string,
  totalChapters?: number
): ClearingSegment[] {
  const biome = getBiomeForBook(book);
  const biomeId = biome?.biomeId ?? 'eden-root-garden';
  return getTrailClearingsForBook(book, totalChapters).map((clearing) =>
    buildSegmentFromClearing(book, biomeId, clearing)
  );
}

/**
 * Computes a crisp integer pixel-art scaling factor (`2`, `3`, or `4`) from the
 * canvas container width and display devicePixelRatio. Prevents sub-pixel "mixels".
 */
export function computeIntegerScale(
  containerWidth: number,
  devicePixelRatio = 1
): 2 | 3 | 4 {
  const safeWidth = Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 640;
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const targetBackingWidth = safeWidth * Math.min(safeDpr, 3);
  const rawScale = Math.round(targetBackingWidth / TRAIL_LOGICAL_WIDTH);

  if (rawScale >= 4) return 4;
  if (rawScale === 3) return 3;
  return 2;
}
