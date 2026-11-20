/**
 * Typing the Bible v3 — Deterministic 16-Bit HD Story-Arc Layouts, Flush Flagstones & Yard Props
 *
 * Computes crisp logical coordinates inside a unified 640x360 HD pixel viewBox
 * (clean 2x/3x/4x integer scaling up to 1280x720, 1920x1080, 2560x1440) across all
 * 10 Phase 1 story-arc clearings (5 Genesis arcs + 5 Psalter Books):
 *   - Flush ground-level river flagstones seated directly along each painted footpath
 *   - Progressive Hoodoo/biblical yard props (Bottle Tree, Herb Rack, River Cairn,
 *     Black Elder Biome Keepers) with normalized click-hotspot percentages
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
  | 'abrahams-oaks'
  | 'bethel-ladder-homestead'
  | 'joseph-granary-ridge'
  | 'goshen-river-porch'
  | 'twilight-shepherds-sanctuary'
  | 'mountain-brook-cedars'
  | 'asaph-watchfire-harp'
  | 'ancient-hyssop-porch'
  | 'hallelujah-starlit-courtyard';

export type YardPropId =
  | 'bottle-tree'
  | 'herb-rack'
  | 'river-cairn'
  | 'elder-keeper';

export interface LogicalPoint {
  readonly x: number;
  readonly y: number;
}

export interface WaypointPoint {
  readonly chapter: number;
  /** Logical center X (0..TRAIL_LOGICAL_WIDTH) for the flush river flagstone */
  readonly x: number;
  /** Logical center Y (0..TRAIL_LOGICAL_HEIGHT) for the flush river flagstone */
  readonly y: number;
  /** Normalized percentage X (0..100) for `<WaypointOverlay />` alignment */
  readonly xPct: number;
  /** Normalized percentage Y (0..100) for `<WaypointOverlay />` alignment */
  readonly yPct: number;
  /** Foot-anchor X for Michael's traveler sprite */
  readonly footX: number;
  /** Foot-anchor Y for Michael's traveler sprite */
  readonly footY: number;
  readonly indexInClearing: number;
}

export interface YardPropHotspot {
  readonly id: YardPropId;
  readonly title: string;
  readonly tradition: string;
  readonly loreSummary: string;
  readonly dormantHint: string;
  readonly wakeRuleLabel: string;
  /** Bottom-center foot anchor X in logical 640x360 pixels for sprite draw */
  readonly anchorX: number;
  /** Bottom-center foot anchor Y in logical 640x360 pixels for sprite draw */
  readonly anchorY: number;
  /** Normalized interactive hotspot center X (0..100%) */
  readonly xPct: number;
  /** Normalized interactive hotspot center Y (0..100%) */
  readonly yPct: number;
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
  readonly yardHotspots: readonly YardPropHotspot[];
  readonly props: readonly ClearingPropPlacement[];
  readonly fireflyAnchors: readonly FireflyAnchor[];
}

export interface ClearingSegment {
  readonly clearingId: string;
  readonly legId: string;
  readonly legLabel: string;
  readonly storyTitle: string;
  readonly storyMotif: string;
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

export interface YardPropWakeState {
  readonly bottleTreeBloomed: boolean;
  readonly bottleCount: number;
  readonly herbRackAwake: boolean;
  readonly riverCairnAwake: boolean;
  readonly elderKeeperAwake: boolean;
}

export function computeYardPropWakeState(
  bloomedCount: number,
  totalInClearing: number,
  bookMastered: boolean
): YardPropWakeState {
  const safeTotal = Math.max(1, totalInClearing);
  const ratio = bloomedCount / safeTotal;
  const bottleTreeBloomed = bloomedCount >= 1 || bookMastered;
  const herbRackAwake = ratio >= 0.25 || bloomedCount >= 2 || bookMastered;
  const riverCairnAwake = ratio >= 0.5 || bloomedCount >= 4 || bookMastered;
  const elderKeeperAwake = bloomedCount >= safeTotal || bookMastered;

  return {
    bottleTreeBloomed,
    bottleCount: bookMastered ? safeTotal : Math.min(8, bloomedCount),
    herbRackAwake,
    riverCairnAwake,
    elderKeeperAwake,
  };
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
 * Calibrated S-curve footpath splines matched directly to each 1280x720 (640x360 logical)
 * painted terracotta clay or mossy path centerlines across all 10 story-arc dioramas.
 */
function buildSerpentineCurves(
  variant: TrailSceneVariant,
  seed: number
): readonly CubicBezierSegment[] {
  const yShift = (seed % 3) - 1; // -1..+1 px subtle organic stone alignment per sub-clearing

  switch (variant) {
    case 'abrahams-oaks':
      return [
        {
          p0: { x: 64, y: 246 + yShift },
          p1: { x: 145, y: 272 + yShift },
          p2: { x: 230, y: 274 - yShift },
          p3: { x: 300, y: 222 + yShift },
        },
        {
          p0: { x: 300, y: 222 + yShift },
          p1: { x: 355, y: 190 - yShift },
          p2: { x: 425, y: 204 + yShift },
          p3: { x: 496, y: 184 - yShift },
        },
      ];
    case 'bethel-ladder-homestead':
      return [
        {
          p0: { x: 68, y: 304 + yShift },
          p1: { x: 135, y: 248 + yShift },
          p2: { x: 225, y: 206 - yShift },
          p3: { x: 310, y: 198 + yShift },
        },
        {
          p0: { x: 310, y: 198 + yShift },
          p1: { x: 375, y: 194 - yShift },
          p2: { x: 430, y: 182 + yShift },
          p3: { x: 478, y: 164 - yShift },
        },
      ];
    case 'joseph-granary-ridge':
      return [
        {
          p0: { x: 64, y: 268 + yShift },
          p1: { x: 150, y: 286 + yShift },
          p2: { x: 260, y: 298 - yShift },
          p3: { x: 348, y: 276 + yShift },
        },
        {
          p0: { x: 348, y: 276 + yShift },
          p1: { x: 405, y: 260 - yShift },
          p2: { x: 440, y: 222 + yShift },
          p3: { x: 488, y: 202 - yShift },
        },
      ];
    case 'goshen-river-porch':
      return [
        {
          p0: { x: 64, y: 258 + yShift },
          p1: { x: 155, y: 258 + yShift },
          p2: { x: 235, y: 226 - yShift },
          p3: { x: 315, y: 186 + yShift },
        },
        {
          p0: { x: 315, y: 186 + yShift },
          p1: { x: 375, y: 166 - yShift },
          p2: { x: 445, y: 170 + yShift },
          p3: { x: 502, y: 156 - yShift },
        },
      ];
    case 'twilight-shepherds-sanctuary':
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
    case 'mountain-brook-cedars':
      return [
        {
          p0: { x: 64, y: 316 + yShift },
          p1: { x: 135, y: 246 + yShift },
          p2: { x: 215, y: 218 - yShift },
          p3: { x: 300, y: 228 + yShift },
        },
        {
          p0: { x: 300, y: 228 + yShift },
          p1: { x: 375, y: 238 - yShift },
          p2: { x: 435, y: 220 + yShift },
          p3: { x: 488, y: 172 - yShift },
        },
      ];
    case 'asaph-watchfire-harp':
      return [
        {
          p0: { x: 64, y: 250 + yShift },
          p1: { x: 135, y: 240 + yShift },
          p2: { x: 210, y: 204 - yShift },
          p3: { x: 295, y: 218 + yShift },
        },
        {
          p0: { x: 295, y: 218 + yShift },
          p1: { x: 370, y: 236 - yShift },
          p2: { x: 435, y: 234 + yShift },
          p3: { x: 492, y: 202 - yShift },
        },
      ];
    case 'ancient-hyssop-porch':
      return [
        {
          p0: { x: 66, y: 322 + yShift },
          p1: { x: 135, y: 265 + yShift },
          p2: { x: 195, y: 204 - yShift },
          p3: { x: 275, y: 222 + yShift },
        },
        {
          p0: { x: 275, y: 222 + yShift },
          p1: { x: 348, y: 248 - yShift },
          p2: { x: 415, y: 248 + yShift },
          p3: { x: 472, y: 176 - yShift },
        },
      ];
    case 'hallelujah-starlit-courtyard':
      return [
        {
          p0: { x: 64, y: 250 + yShift },
          p1: { x: 145, y: 276 + yShift },
          p2: { x: 230, y: 302 - yShift },
          p3: { x: 300, y: 230 + yShift },
        },
        {
          p0: { x: 300, y: 230 + yShift },
          p1: { x: 355, y: 166 - yShift },
          p2: { x: 435, y: 182 + yShift },
          p3: { x: 492, y: 180 - yShift },
        },
      ];
    case 'eden-root-garden':
    default:
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
          p3: { x: 544, y: 184 - yShift },
        },
      ];
  }
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

interface VariantAnchorConfig {
  readonly bottleTree: { readonly x: number; readonly y: number };
  readonly herbRack: { readonly x: number; readonly y: number };
  readonly riverCairn: { readonly x: number; readonly y: number };
  readonly elderKeeper: { readonly x: number; readonly y: number };
  readonly bottleLore: string;
  readonly herbLore: string;
  readonly cairnLore: string;
  readonly elderLore: string;
}

const VARIANT_YARD_CONFIG: Readonly<Record<TrailSceneVariant, VariantAnchorConfig>> = {
  'eden-root-garden': {
    bottleTree: { x: 86, y: 184 },
    herbRack: { x: 224, y: 158 },
    riverCairn: { x: 468, y: 288 },
    elderKeeper: { x: 540, y: 168 },
    bottleLore:
      'Cobalt-blue and amber glass hung on cedar boughs echoes Southern yard traditions recorded by Puckett and Hurston—catching twilight over the four rivers of Eden.',
    herbLore:
      'Braided sweetgrass, rosemary, and drying High John roots season beside the garden bed, honoring both rooted creation care and African-American herbal craft.',
    cairnLore:
      'Five river stones anointed with warm oil mark covenant footsteps across Genesis 1–10—resting quietly above the floodwaters as the rainbow clears the sky.',
    elderLore:
      'Once every chapter in this clearing blooms (or Genesis is mastered), the Garden Root-Keeper steps forward carrying freshly braided sweetgrass.',
  },
  'abrahams-oaks': {
    bottleTree: { x: 102, y: 182 },
    herbRack: { x: 214, y: 170 },
    riverCairn: { x: 466, y: 288 },
    elderKeeper: { x: 544, y: 172 },
    bottleLore:
      'Beneath Abraham’s sweeping live oaks, each finished chapter hangs a glinting bottle catching twilight stars that number the promise of Genesis 12–17.',
    herbLore:
      'Drying thyme, sage, and wildflower bundles gather near the hospitality tent where strangers were welcomed at Mamre’s oak shade.',
    cairnLore:
      'Field and river witness stones recall every altar built from Shechem to Beersheba as Abram walked the land in trust.',
    elderLore:
      'At clearing completion, the Garden Root-Keeper welcomes Michael at the hearth pavilion beneath the moss-draped oaks.',
  },
  'bethel-ladder-homestead': {
    bottleTree: { x: 104, y: 174 },
    herbRack: { x: 238, y: 172 },
    riverCairn: { x: 452, y: 290 },
    elderKeeper: { x: 506, y: 162 },
    bottleLore:
      'At Bethel’s crossroads, Southern cobalt bottle craft keeps watch beneath Jacob’s starry stairway between heaven and red-clay earth.',
    herbLore:
      'Braided sweetgrass, lavender, and High John roots cure slowly opposite the stone well where traveler stories gather.',
    cairnLore:
      'Just as Jacob poured oil atop his pillar stone at Bethel and Mizpah, this five-stone cairn gleams quietly beside the stream.',
    elderLore:
      'Complete Bethel’s chapters and the Garden Root-Keeper greets you on the timber homestead steps beneath the live oak.',
  },
  'joseph-granary-ridge': {
    bottleTree: { x: 100, y: 180 },
    herbRack: { x: 212, y: 172 },
    riverCairn: { x: 486, y: 286 },
    elderKeeper: { x: 514, y: 192 },
    bottleLore:
      'Along the sorghum and wheat ridge, gleaming cobalt and amber bottles mark seasons remembered faithfully through famine and plenty.',
    herbLore:
      'Drying pantry herbs stand beside harvest baskets and Joseph’s multicolored woven garment hanging neatly along the porch rail.',
    cairnLore:
      'Balanced river stones anchor the granary ridge—honoring endurance from pit and prison to stewardship.',
    elderLore:
      'Finish all chapters in Ch. 31–40 and the Garden Root-Keeper joins you on the amber granary porch.',
  },
  'goshen-river-porch': {
    bottleTree: { x: 108, y: 184 },
    herbRack: { x: 248, y: 164 },
    riverCairn: { x: 450, y: 266 },
    elderKeeper: { x: 530, y: 152 },
    bottleLore:
      'Beside the braided sunset waters of Goshen, the bottle tree catches reflected amber light across cypress knees and willow boughs.',
    herbLore:
      'Sweetgrass, rosemary, and sage perfume the riverfront porch where estranged brothers finally sit down in peace.',
    cairnLore:
      'A riverside witness cairn marks Israel’s final blessings in Genesis 48–50 before the next great crossing begins.',
    elderLore:
      'When Goshen blooms in full, the Garden Root-Keeper waits beside the rocking chair on the welcoming cedar porch.',
  },
  'twilight-shepherds-sanctuary': {
    bottleTree: { x: 84, y: 184 },
    herbRack: { x: 164, y: 166 },
    riverCairn: { x: 462, y: 284 },
    elderKeeper: { x: 534, y: 164 },
    bottleLore:
      'In Black Southern folk tradition and Anna Riva’s Powers of the Psalms, blue-glass bottles hold watchful prayer over doorway and threshold across Book I (Psalms 1–41).',
    herbLore:
      'Anna Riva pairs cleansing psalms like Psalm 23 and 24 with sweetgrass, rosemary, and hyssop bundles cured along the pasture edge.',
    cairnLore:
      'Still-water river stones stacked beside the meadow crook echo Psalm 23’s quiet pastures and restored strength.',
    elderLore:
      'When this Book I pasture blooms completely, the Twilight Psalmist steps forward cradling his hand-carved cedar harp.',
  },
  'mountain-brook-cedars': {
    bottleTree: { x: 108, y: 138 },
    herbRack: { x: 342, y: 184 },
    riverCairn: { x: 416, y: 294 },
    elderKeeper: { x: 518, y: 168 },
    bottleLore:
      'Set high on the mossy cedar bluff overlooking Psalm 42’s drinking deer, cobalt and amber bottles catch mountain evening air.',
    herbLore:
      'Rosemary, pine-sage, and purifying hyssop cure beside the cascading highland brook of Book II (Psalms 42–72).',
    cairnLore:
      'Smooth brook stones commemorate songs of refuge ("My soul pants for you, O God, like a deer pants for streams of water").',
    elderLore:
      'Bloom this clearing completely to welcome the Twilight Psalmist onto the hillside cabin porch.',
  },
  'asaph-watchfire-harp': {
    bottleTree: { x: 96, y: 172 },
    herbRack: { x: 222, y: 168 },
    riverCairn: { x: 472, y: 274 },
    elderKeeper: { x: 520, y: 184 },
    bottleLore:
      'Against deep indigo dusk on Asaph’s watch-terrace (Psalms 73–89), glowing bottles catch amber sparks from the sanctuary brazier.',
    herbLore:
      'Fragrant cedar-smoked herbs dry calmly near the stone watchwall—balancing lament with steadfast covenant song.',
    cairnLore:
      'Five balanced watchfire stones ground the hillside lookout above misted valleys.',
    elderLore:
      'When Asaph’s watchfire clearing blooms, the Twilight Psalmist stands beside the terrace harp and flame.',
  },
  'ancient-hyssop-porch': {
    bottleTree: { x: 98, y: 176 },
    herbRack: { x: 192, y: 174 },
    riverCairn: { x: 446, y: 286 },
    elderKeeper: { x: 486, y: 166 },
    bottleLore:
      'Beside the antique sundial and raised hyssop beds of Book IV (Psalms 90–106), sunlit glass bottles honor Psalm 91 shelter.',
    herbLore:
      'Raised beds and cedar rafters unite Anna Riva’s herbal apothecary notes (hyssop, rosemary, lavender) with ancient thanksgiving psalms.',
    cairnLore:
      'Steadfast garden stones recall Moses’s timeless prayer: "Lord, you have been our dwelling place from one generation to another."',
    elderLore:
      'Complete this clearing and the Twilight Psalmist welcomes you at the stone apothecary porch.',
  },
  'hallelujah-starlit-courtyard': {
    bottleTree: { x: 112, y: 178 },
    herbRack: { x: 238, y: 174 },
    riverCairn: { x: 476, y: 280 },
    elderKeeper: { x: 518, y: 174 },
    bottleLore:
      'In Book V (Psalms 107–150), gleaming bottles reflect dawn starbeams lighting the Ascent courtyard toward Psalm 150’s grand praise.',
    herbLore:
      'Festive sweetgrass and myrrh-scented herbs hang along the olive courtyard leading up the limestone steps.',
    cairnLore:
      'The stone the builders rejected becomes the warm threshold landmark of the Hallelujah courtyard.',
    elderLore:
      'Finish this clearing or master all 150 Psalms to see the Twilight Psalmist waiting in full sanctuary warmth.',
  },
};

function resolveSceneVariant(
  book: string,
  biomeId: string,
  legId?: string
): TrailSceneVariant {
  if (book === 'Genesis') {
    switch (legId) {
      case 'gen-leg-2':
        return 'abrahams-oaks';
      case 'gen-leg-3':
        return 'bethel-ladder-homestead';
      case 'gen-leg-4':
        return 'joseph-granary-ridge';
      case 'gen-leg-5':
        return 'goshen-river-porch';
      case 'gen-leg-1':
      default:
        return 'eden-root-garden';
    }
  }

  if (book === 'Psalms' || biomeId === 'twilight-shepherds-sanctuary') {
    switch (legId) {
      case 'psa-book-2':
        return 'mountain-brook-cedars';
      case 'psa-book-3':
        return 'asaph-watchfire-harp';
      case 'psa-book-4':
        return 'ancient-hyssop-porch';
      case 'psa-book-5':
        return 'hallelujah-starlit-courtyard';
      case 'psa-book-1':
      default:
        return 'twilight-shepherds-sanctuary';
    }
  }

  return 'eden-root-garden';
}

function buildYardHotspots(
  book: string,
  variant: TrailSceneVariant
): readonly YardPropHotspot[] {
  const cfg = VARIANT_YARD_CONFIG[variant];
  const isPsalms = book === 'Psalms' || variant.includes('psalm') || variant.includes('brook') || variant.includes('watchfire') || variant.includes('hyssop') || variant.includes('hallelujah');
  const elderTitle = isPsalms ? 'The Twilight Psalmist' : 'The Garden Root-Keeper';

  const toPct = (x: number, y: number) => ({
    xPct: Number(((x / TRAIL_LOGICAL_WIDTH) * 100).toFixed(2)),
    yPct: Number(((y / TRAIL_LOGICAL_HEIGHT) * 100).toFixed(2)),
  });

  const btPct = toPct(cfg.bottleTree.x, cfg.bottleTree.y - 34);
  const hrPct = toPct(cfg.herbRack.x, cfg.herbRack.y - 22);
  const rcPct = toPct(cfg.riverCairn.x, cfg.riverCairn.y - 16);
  const ekPct = toPct(cfg.elderKeeper.x, cfg.elderKeeper.y - 32);

  return [
    {
      id: 'bottle-tree',
      title: 'Hoodoo Bottle Tree',
      tradition: 'Southern Black Yard Craft · Puckett & Hurston',
      loreSummary: cfg.bottleLore,
      dormantHint: 'Bare cedar twigs await your first completed chapter in this clearing.',
      wakeRuleLabel: 'Wakes at 1st bloomed chapter',
      anchorX: cfg.bottleTree.x,
      anchorY: cfg.bottleTree.y,
      ...btPct,
    },
    {
      id: 'herb-rack',
      title: 'Rootwork & Sanctuary Herb Rack',
      tradition: 'Braided Sweetgrass · Rosemary · Hyssop',
      loreSummary: cfg.herbLore,
      dormantHint: 'Herb bundles arrive once 25% of this clearing (or 2 chapters) blooms.',
      wakeRuleLabel: 'Wakes at 25% clearing bloom',
      anchorX: cfg.herbRack.x,
      anchorY: cfg.herbRack.y,
      ...hrPct,
    },
    {
      id: 'river-cairn',
      title: 'Anointed River Cairn',
      tradition: 'Covenant Witness Stones',
      loreSummary: cfg.cairnLore,
      dormantHint: 'Stacked river stones settle by the verge once 50% (or 4 chapters) blooms.',
      wakeRuleLabel: 'Wakes at 50% clearing bloom',
      anchorX: cfg.riverCairn.x,
      anchorY: cfg.riverCairn.y,
      ...rcPct,
    },
    {
      id: 'elder-keeper',
      title: elderTitle,
      tradition: isPsalms ? 'Psalter Porch Keeper' : 'Genesis Biome Keeper',
      loreSummary: cfg.elderLore,
      dormantHint: `${elderTitle} steps onto the porch when all chapters here bloom.`,
      wakeRuleLabel: 'Wakes at 100% clearing bloom',
      anchorX: cfg.elderKeeper.x,
      anchorY: cfg.elderKeeper.y,
      ...ekPct,
    },
  ];
}

function buildSceneBlueprint(
  book: string,
  variant: TrailSceneVariant,
  seed: number
): ClearingSceneBlueprint {
  const yardHotspots = buildYardHotspots(book, variant);
  const isPsalmsFamily =
    book === 'Psalms' ||
    variant === 'twilight-shepherds-sanctuary' ||
    variant === 'mountain-brook-cedars' ||
    variant === 'asaph-watchfire-harp' ||
    variant === 'ancient-hyssop-porch' ||
    variant === 'hallelujah-starlit-courtyard';

  if (isPsalmsFamily) {
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
      yardHotspots,
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

  // Genesis Story-Arc Family
  const herbOffset = (seed % 3) * 20;
  return {
    variant,
    pathTile: 'red-clay-path-straight',
    pathEdgeTile: 'red-clay-path-edge',
    hasCreek: variant === 'bethel-ladder-homestead' || variant === 'goshen-river-porch',
    creekY: 324,
    hasCedarPorch: variant !== 'eden-root-garden',
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
    yardHotspots,
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

function buildSegmentFromClearing(
  book: string,
  biomeId: string,
  clearing: TrailClearingDefinition
): ClearingSegment {
  const variant = resolveSceneVariant(book, biomeId, clearing.legId);
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
    // Option B: Flush river flagstones rest directly along the painted red-clay centerline
    const x = Math.min(TRAIL_LOGICAL_WIDTH - 24, Math.max(24, Math.round(pt.x)));
    const y = Math.min(TRAIL_LOGICAL_HEIGHT - 24, Math.max(64, Math.round(pt.y)));
    const footX = Math.max(36, Math.min(TRAIL_LOGICAL_WIDTH - 48, Math.round(pt.x - 16)));
    const footY = Math.min(TRAIL_LOGICAL_HEIGHT - 22, Math.max(96, Math.round(pt.y + 4)));

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
    storyTitle: clearing.storyTitle,
    storyMotif: clearing.storyMotif,
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
    scene: buildSceneBlueprint(book, variant, seed),
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
