/**
 * Typing the Bible v3 — Dual-Theme 16-Bit Pixel Trail Palette & LUT
 *
 * Harmonizes every 16-bit sprite, tile, and landmark directly with the
 * Editorial Atlas design system (`client/src/App.css`):
 *   - Light theme: "Golden-Hour Daylight"
 *   - Dark theme:  "Lantern Twilight"
 *
 * Cultural & visual locks:
 *   - Universal Black cast with 3 warm 4-step melanin ramps (Deep Mahogany,
 *     Rich Chestnut, Warm Amber-Bronze) — never flat or greyed-out skin tones.
 *   - Warm selective outlines (`#1E1916` Light / `#0D0C0E` Dark) — NEVER `#000000`.
 */

export type TrailTheme = 'light' | 'dark';

export type PaletteIndex = number;

export type MelaninRampName =
  | 'deep-mahogany'
  | 'rich-chestnut'
  | 'warm-amber-bronze';

export interface MelaninRamp {
  readonly id: MelaninRampName;
  readonly label: string;
  readonly shadow: string;
  readonly base: string;
  readonly mid: string;
  readonly highlight: string;
  readonly indices: readonly [PaletteIndex, PaletteIndex, PaletteIndex, PaletteIndex];
}

export interface TrailThemeTokens {
  readonly theme: TrailTheme;
  readonly label: string;
  readonly canvasBg: string;
  readonly canvasFrame: string;
  readonly mistVeil: string;
  readonly clay: string;
  readonly clayHighlight: string;
  readonly brassGlow: string;
  readonly lanternHalo: string;
  readonly water: string;
  readonly waterHighlight: string;
  readonly botanicalSage: string;
  readonly botanicalHighlight: string;
  readonly timber: string;
  readonly outlineInk: string;
  readonly waypointDormant: string;
  readonly waypointKindling: string;
  readonly waypointBloomed: string;
}

/**
 * Named palette indices shared identically by the offline PNG atlas generator
 * (`scripts/trail-assets/`) and runtime `<BiomeCanvas />` pixel matrices.
 */
export const PALETTE_INDEX = {
  TRANSPARENT: 0,
  OUTLINE_PRIMARY: 1,
  OUTLINE_WARM: 2,

  // Sky, paper, weathered stone, and mist veil
  PARCHMENT_SKY: 3,
  IVORY_CREAM: 4,
  BONE_LIGHT: 5,
  STONE_MID: 6,
  STONE_DARK: 7,
  STONE_DEEP: 8,
  MIST_LIGHT: 9,
  MIST_MEDIUM: 10,
  MIST_DENSE: 11,

  // Melanin Ramp 1: Deep Mahogany
  MAHOGANY_SHADOW: 12,
  MAHOGANY_BASE: 13,
  MAHOGANY_MID: 14,
  MAHOGANY_HIGHLIGHT: 15,

  // Melanin Ramp 2: Rich Chestnut
  CHESTNUT_SHADOW: 16,
  CHESTNUT_BASE: 17,
  CHESTNUT_MID: 18,
  CHESTNUT_HIGHLIGHT: 19,

  // Melanin Ramp 3: Warm Amber-Bronze
  AMBER_SHADOW: 20,
  AMBER_BASE: 21,
  AMBER_MID: 22,
  AMBER_HIGHLIGHT: 23,

  // Natural Black hair textures & elder silver
  HAIR_DEEP: 24,
  HAIR_SHEEN: 25,
  HAIR_SILVER: 26,

  // Trail clay, terracotta & modern overshirt
  TERRACOTTA_DEEP: 27,
  TERRACOTTA_BASE: 28,
  TERRACOTTA_BRIGHT: 29,
  CLAY_DUST: 30,

  // Brass lantern, ochre headwrap & golden glow
  BRASS_DEEP: 31,
  BRASS_OCHRE: 32,
  BRASS_GOLD: 33,
  LANTERN_GLOW: 34,
  LANTERN_CORE: 35,

  // Modern tapered jeans, living creek water & twilight indigo
  JEANS_SHADOW: 36,
  JEANS_BASE: 37,
  WATER_DEEP: 38,
  WATER_BASE: 39,
  WATER_MID: 40,
  WATER_SPARKLE: 41,

  // Botanical sage, root greens & drying herbs
  FOLIAGE_DEEP: 42,
  FOLIAGE_BASE: 43,
  FOLIAGE_SAGE: 44,
  FOLIAGE_LIGHT: 45,
  SAGE_PALE: 46,

  // Rich garden loam, cedar timber & leather sling
  TIMBER_DEEP: 47,
  TIMBER_BASE: 48,
  TIMBER_MID: 49,
  TIMBER_LIGHT: 50,
  TIMBER_PALE: 51,

  // Herbal blossoms & Eden fruit accents
  LAVENDER_BASE: 52,
  BLOSSOM_ROSE: 53,
} as const;

export const PALETTE_SIZE = 54;

/**
 * Canonical warm 4-step melanin skin ramps (UX Blueprint Section 3.1).
 * Used across Michael's traveler avatar and every Phase 1+ biome keeper.
 */
export const MELANIN_SKIN_RAMPS: Readonly<Record<MelaninRampName, MelaninRamp>> = {
  'deep-mahogany': {
    id: 'deep-mahogany',
    label: 'Deep Mahogany',
    shadow: '#2D1810',
    base: '#4E2A1B',
    mid: '#6E3E28',
    highlight: '#8F573B',
    indices: [
      PALETTE_INDEX.MAHOGANY_SHADOW,
      PALETTE_INDEX.MAHOGANY_BASE,
      PALETTE_INDEX.MAHOGANY_MID,
      PALETTE_INDEX.MAHOGANY_HIGHLIGHT,
    ],
  },
  'rich-chestnut': {
    id: 'rich-chestnut',
    label: 'Rich Chestnut',
    shadow: '#3F2114',
    base: '#6B3B24',
    mid: '#8E5234',
    highlight: '#B3714D',
    indices: [
      PALETTE_INDEX.CHESTNUT_SHADOW,
      PALETTE_INDEX.CHESTNUT_BASE,
      PALETTE_INDEX.CHESTNUT_MID,
      PALETTE_INDEX.CHESTNUT_HIGHLIGHT,
    ],
  },
  'warm-amber-bronze': {
    id: 'warm-amber-bronze',
    label: 'Warm Amber-Bronze',
    shadow: '#56301B',
    base: '#854F2E',
    mid: '#AD6D43',
    highlight: '#CE8E5F',
    indices: [
      PALETTE_INDEX.AMBER_SHADOW,
      PALETTE_INDEX.AMBER_BASE,
      PALETTE_INDEX.AMBER_MID,
      PALETTE_INDEX.AMBER_HIGHLIGHT,
    ],
  },
};

/**
 * Golden-Hour Daylight LUT (Editorial Atlas Light theme).
 * Index 0 is transparent (`null`). Every non-null color is `#RRGGBB` or `#RRGGBBAA`.
 */
export const TRAIL_PALETTE_LIGHT: readonly (string | null)[] = [
  null,        // 0  TRANSPARENT
  '#1E1916',   // 1  OUTLINE_PRIMARY (warm espresso, never #000000)
  '#3A281E',   // 2  OUTLINE_WARM

  '#F5F3EE',   // 3  PARCHMENT_SKY (--bg-parchment-light)
  '#FAF9F5',   // 4  IVORY_CREAM (crisp tee, sneakers, highlights)
  '#ECE8DF',   // 5  BONE_LIGHT (--bg-bone-light)
  '#D6D0C4',   // 6  STONE_MID (--border-stone-light)
  '#9B9284',   // 7  STONE_DARK
  '#6E675F',   // 8  STONE_DEEP (--ink-muted-light)
  '#ECE8DF8C', // 9  MIST_LIGHT (55% parchment mist)
  '#DFDAD0BF', // 10 MIST_MEDIUM (75% parchment mist veil)
  '#D6D0C4E0', // 11 MIST_DENSE (88% dormant veil)

  '#2D1810',   // 12 MAHOGANY_SHADOW
  '#4E2A1B',   // 13 MAHOGANY_BASE
  '#6E3E28',   // 14 MAHOGANY_MID
  '#8F573B',   // 15 MAHOGANY_HIGHLIGHT

  '#3F2114',   // 16 CHESTNUT_SHADOW
  '#6B3B24',   // 17 CHESTNUT_BASE
  '#8E5234',   // 18 CHESTNUT_MID
  '#B3714D',   // 19 CHESTNUT_HIGHLIGHT

  '#56301B',   // 20 AMBER_SHADOW
  '#854F2E',   // 21 AMBER_BASE
  '#AD6D43',   // 22 AMBER_MID
  '#CE8E5F',   // 23 AMBER_HIGHLIGHT

  '#1E1815',   // 24 HAIR_DEEP (warm coily dark espresso, never #000000)
  '#342923',   // 25 HAIR_SHEEN
  '#B8B0A4',   // 26 HAIR_SILVER

  '#8A3022',   // 27 TERRACOTTA_DEEP
  '#B84A39',   // 28 TERRACOTTA_BASE (--accent-terracotta-light)
  '#D46652',   // 29 TERRACOTTA_BRIGHT
  '#C98A6B',   // 30 CLAY_DUST

  '#6B5022',   // 31 BRASS_DEEP
  '#8A6A2F',   // 32 BRASS_OCHRE (--accent-ochre-light)
  '#D4A359',   // 33 BRASS_GOLD
  '#F2D28B',   // 34 LANTERN_GLOW
  '#FFF4D2',   // 35 LANTERN_CORE

  '#202632',   // 36 JEANS_SHADOW
  '#2B3240',   // 37 JEANS_BASE (dark slate tapered jeans)
  '#2A445E',   // 38 WATER_DEEP
  '#345474',   // 39 WATER_BASE (--accent-slate-light)
  '#527799',   // 40 WATER_MID
  '#8FB1C9',   // 41 WATER_SPARKLE

  '#164D28',   // 42 FOLIAGE_DEEP
  '#1F6E38',   // 43 FOLIAGE_BASE (--success-light)
  '#3D7A4F',   // 44 FOLIAGE_SAGE
  '#7BA374',   // 45 FOLIAGE_LIGHT
  '#A6BF9A',   // 46 SAGE_PALE

  '#3A281D',   // 47 TIMBER_DEEP
  '#4A3426',   // 48 TIMBER_BASE
  '#6E4E38',   // 49 TIMBER_MID
  '#8F6A4E',   // 50 TIMBER_LIGHT
  '#B59272',   // 51 TIMBER_PALE

  '#8B6D9C',   // 52 LAVENDER_BASE
  '#C493A8',   // 53 BLOSSOM_ROSE
];

/**
 * Lantern Twilight LUT (Editorial Atlas Dark theme).
 * Shifts daylight parchment/sage/clay into obsidian twilight while keeping
 * warm brass lanterns radiant and melanin ramps warm & luminous.
 */
export const TRAIL_PALETTE_DARK: readonly (string | null)[] = [
  null,        // 0  TRANSPARENT
  '#0D0C0E',   // 1  OUTLINE_PRIMARY (deep obsidian, never #000000)
  '#1C1619',   // 2  OUTLINE_WARM

  '#121214',   // 3  PARCHMENT_SKY (--bg-parchment-dark)
  '#EDE9E0',   // 4  IVORY_CREAM (warm lantern-lit ivory tee & sneakers)
  '#242429',   // 5  BONE_LIGHT (--bg-bone-dark)
  '#3A3A42',   // 6  STONE_MID (--border-stone-dark)
  '#585866',   // 7  STONE_DARK
  '#2E2E36',   // 8  STONE_DEEP
  '#2E2E388C', // 9  MIST_LIGHT (55% obsidian mist)
  '#25252CC7', // 10 MIST_MEDIUM (78% obsidian mist veil)
  '#1C1C22E0', // 11 MIST_DENSE (88% twilight dormant veil)

  '#24120C',   // 12 MAHOGANY_SHADOW (warm umber, never ashy)
  '#442316',   // 13 MAHOGANY_BASE
  '#633622',   // 14 MAHOGANY_MID
  '#844E34',   // 15 MAHOGANY_HIGHLIGHT

  '#351B10',   // 16 CHESTNUT_SHADOW
  '#5E331F',   // 17 CHESTNUT_BASE
  '#81492E',   // 18 CHESTNUT_MID
  '#A86846',   // 19 CHESTNUT_HIGHLIGHT

  '#492816',   // 20 AMBER_SHADOW
  '#774527',   // 21 AMBER_BASE
  '#9F623B',   // 22 AMBER_MID
  '#C28355',   // 23 AMBER_HIGHLIGHT

  '#151214',   // 24 HAIR_DEEP (rich obsidian-espresso, never #000000)
  '#2A2220',   // 25 HAIR_SHEEN
  '#A8A39D',   // 26 HAIR_SILVER

  '#6E342A',   // 27 TERRACOTTA_DEEP
  '#9E4739',   // 28 TERRACOTTA_BASE
  '#E07A5F',   // 29 TERRACOTTA_BRIGHT (--accent-terracotta-dark)
  '#7D4B3A',   // 30 CLAY_DUST

  '#8A6A2F',   // 31 BRASS_DEEP
  '#B88A3D',   // 32 BRASS_OCHRE
  '#D4A359',   // 33 BRASS_GOLD (--accent-ochre-dark)
  '#F3C978',   // 34 LANTERN_GLOW
  '#FFF0C2',   // 35 LANTERN_CORE

  '#1B202C',   // 36 JEANS_SHADOW
  '#2A3346',   // 37 JEANS_BASE
  '#1C2E42',   // 38 WATER_DEEP
  '#23374D',   // 39 WATER_BASE
  '#4A7094',   // 40 WATER_MID
  '#6D9DC5',   // 41 WATER_SPARKLE (--accent-slate-dark)

  '#123622',   // 42 FOLIAGE_DEEP
  '#1A4A2E',   // 43 FOLIAGE_BASE
  '#2F7D4E',   // 44 FOLIAGE_SAGE
  '#4ADE80',   // 45 FOLIAGE_LIGHT (--success-dark)
  '#5E9970',   // 46 SAGE_PALE

  '#241913',   // 47 TIMBER_DEEP
  '#2F221A',   // 48 TIMBER_BASE
  '#453124',   // 49 TIMBER_MID
  '#6B4C38',   // 50 TIMBER_LIGHT
  '#8A6B52',   // 51 TIMBER_PALE

  '#9F83B8',   // 52 LAVENDER_BASE
  '#D4A5BA',   // 53 BLOSSOM_ROSE
];

export const TRAIL_THEME_TOKENS: Readonly<Record<TrailTheme, TrailThemeTokens>> = {
  light: {
    theme: 'light',
    label: 'Golden-Hour Daylight',
    canvasBg: '#F5F3EE',
    canvasFrame: '#ECE8DF',
    mistVeil: '#DFDAD0BF',
    clay: '#B84A39',
    clayHighlight: '#C98A6B',
    brassGlow: '#8A6A2F',
    lanternHalo: '#F2D28B',
    water: '#345474',
    waterHighlight: '#8FB1C9',
    botanicalSage: '#1F6E38',
    botanicalHighlight: '#7BA374',
    timber: '#6E4E38',
    outlineInk: '#1E1916',
    waypointDormant: '#9B9284',
    waypointKindling: '#D4A359',
    waypointBloomed: '#1F6E38',
  },
  dark: {
    theme: 'dark',
    label: 'Lantern Twilight',
    canvasBg: '#121214',
    canvasFrame: '#1A1A1D',
    mistVeil: '#25252CC7',
    clay: '#E07A5F',
    clayHighlight: '#9E4739',
    brassGlow: '#D4A359',
    lanternHalo: '#FFF0C2',
    water: '#23374D',
    waterHighlight: '#6D9DC5',
    botanicalSage: '#2F7D4E',
    botanicalHighlight: '#4ADE80',
    timber: '#453124',
    outlineInk: '#0D0C0E',
    waypointDormant: '#585866',
    waypointKindling: '#F3C978',
    waypointBloomed: '#4ADE80',
  },
};

export function getTrailPalette(theme: TrailTheme): readonly (string | null)[] {
  return theme === 'dark' ? TRAIL_PALETTE_DARK : TRAIL_PALETTE_LIGHT;
}

export function getTrailThemeTokens(theme: TrailTheme): TrailThemeTokens {
  return TRAIL_THEME_TOKENS[theme];
}

export function resolvePaletteColor(
  index: PaletteIndex,
  theme: TrailTheme
): string | null {
  const palette = getTrailPalette(theme);
  if (index < 0 || index >= palette.length) {
    return null;
  }
  return palette[index];
}
