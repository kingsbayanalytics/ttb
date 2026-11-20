/**
 * Canonical 16-bit Pixel Art Definitions for Typing the Bible v3 (Phase 1).
 *
 * Every frame is authored on an exact integer grid using single-character
 * palette glyphs mapped 1:1 to `PALETTE_INDEX` in
 * `client/src/components/trail/trailPalette.ts`.
 *
 * Visual & cultural invariants:
 *   - All human sprites are Black with dimensional 4-step melanin skin ramps
 *     (Deep Mahogany, Rich Chestnut, Warm Amber-Bronze).
 *   - Michael (`traveler-michael`) wears clean modern casual attire:
 *     terracotta open overshirt, ivory crewneck tee, dark slate tapered jeans,
 *     cream-and-terracotta sneakers, modern crossbody sling bag, & brass lantern.
 *   - Selective warm outlines (`o` = #1E1916 / #0D0C0E, `u` = #3A281E / #1C1619)
 *     — zero pure `#000000` pixels anywhere.
 */

export const GLYPH_TO_INDEX = {
  '.': 0,  // TRANSPARENT
  'o': 1,  // OUTLINE_PRIMARY (#1E1916 / #0D0C0E)
  'u': 2,  // OUTLINE_WARM    (#3A281E / #1C1619)

  'P': 3,  // PARCHMENT_SKY
  'I': 4,  // IVORY_CREAM
  'B': 5,  // BONE_LIGHT
  'S': 6,  // STONE_MID
  's': 7,  // STONE_DARK
  'd': 8,  // STONE_DEEP
  '~': 9,  // MIST_LIGHT
  '^': 10, // MIST_MEDIUM
  '=': 11, // MIST_DENSE

  '1': 12, // MAHOGANY_SHADOW
  '2': 13, // MAHOGANY_BASE
  '3': 14, // MAHOGANY_MID
  '4': 15, // MAHOGANY_HIGHLIGHT

  '5': 16, // CHESTNUT_SHADOW
  '6': 17, // CHESTNUT_BASE
  '7': 18, // CHESTNUT_MID
  '8': 19, // CHESTNUT_HIGHLIGHT

  'a': 20, // AMBER_SHADOW
  'b': 21, // AMBER_BASE
  'c': 22, // AMBER_MID
  'e': 23, // AMBER_HIGHLIGHT

  'h': 24, // HAIR_DEEP
  'H': 25, // HAIR_SHEEN
  'x': 26, // HAIR_SILVER

  'r': 27, // TERRACOTTA_DEEP
  'R': 28, // TERRACOTTA_BASE
  'T': 29, // TERRACOTTA_BRIGHT
  'q': 30, // CLAY_DUST

  'y': 31, // BRASS_DEEP
  'Y': 32, // BRASS_OCHRE
  'G': 33, // BRASS_GOLD
  'L': 34, // LANTERN_GLOW
  'W': 35, // LANTERN_CORE

  'j': 36, // JEANS_SHADOW
  'J': 37, // JEANS_BASE
  'n': 38, // WATER_DEEP
  'N': 39, // WATER_BASE
  'w': 40, // WATER_MID
  'Z': 41, // WATER_SPARKLE

  'f': 42, // FOLIAGE_DEEP
  'F': 43, // FOLIAGE_BASE
  'g': 44, // FOLIAGE_SAGE
  'v': 45, // FOLIAGE_LIGHT
  'V': 46, // SAGE_PALE

  'k': 47, // TIMBER_DEEP
  'K': 48, // TIMBER_BASE
  'm': 49, // TIMBER_MID
  'M': 50, // TIMBER_LIGHT
  'p': 51, // TIMBER_PALE

  'l': 52, // LAVENDER_BASE
  'z': 53, // BLOSSOM_ROSE
};

export const PALETTE_LIGHT = [
  null,
  '#1E1916', '#3A281E',
  '#F5F3EE', '#FAF9F5', '#ECE8DF', '#D6D0C4', '#9B9284', '#6E675F',
  '#ECE8DF8C', '#DFDAD0BF', '#D6D0C4E0',
  '#2D1810', '#4E2A1B', '#6E3E28', '#8F573B',
  '#3F2114', '#6B3B24', '#8E5234', '#B3714D',
  '#56301B', '#854F2E', '#AD6D43', '#CE8E5F',
  '#1E1815', '#342923', '#B8B0A4',
  '#8A3022', '#B84A39', '#D46652', '#C98A6B',
  '#6B5022', '#8A6A2F', '#D4A359', '#F2D28B', '#FFF4D2',
  '#202632', '#2B3240', '#2A445E', '#345474', '#527799', '#8FB1C9',
  '#164D28', '#1F6E38', '#3D7A4F', '#7BA374', '#A6BF9A',
  '#3A281D', '#4A3426', '#6E4E38', '#8F6A4E', '#B59272',
  '#8B6D9C', '#C493A8',
];

export const PALETTE_DARK = [
  null,
  '#0D0C0E', '#1C1619',
  '#121214', '#EDE9E0', '#242429', '#3A3A42', '#585866', '#2E2E36',
  '#2E2E388C', '#25252CC7', '#1C1C22E0',
  '#24120C', '#442316', '#633622', '#844E34',
  '#351B10', '#5E331F', '#81492E', '#A86846',
  '#492816', '#774527', '#9F623B', '#C28355',
  '#151214', '#2A2220', '#A8A39D',
  '#6E342A', '#9E4739', '#E07A5F', '#7D4B3A',
  '#8A6A2F', '#B88A3D', '#D4A359', '#F3C978', '#FFF0C2',
  '#1B202C', '#2A3346', '#1C2E42', '#23374D', '#4A7094', '#6D9DC5',
  '#123622', '#1A4A2E', '#2F7D4E', '#4ADE80', '#5E9970',
  '#241913', '#2F221A', '#453124', '#6B4C38', '#8A6B52',
  '#9F83B8', '#D4A5BA',
];

export function parseArtGrid(name, width, height, rows) {
  if (rows.length !== height) {
    throw new Error(`Sprite "${name}" expected ${height} rows, got ${rows.length}`);
  }
  return rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(
        `Sprite "${name}" row ${y} expected length ${width}, got ${row.length}: "${row}"`
      );
    }
    const out = new Array(width);
    for (let x = 0; x < width; x += 1) {
      const ch = row[x];
      const idx = GLYPH_TO_INDEX[ch];
      if (idx === undefined) {
        throw new Error(`Sprite "${name}" unknown glyph "${ch}" at (${x}, ${y})`);
      }
      out[x] = idx;
    }
    return out;
  });
}

// Helper for 32x32 procedural-assisted stamps that still produce crisp hand-tuned pixel art
function createCanvas(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function setPx(grid, x, y, ch) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = ch;
  }
}

function fillRect(grid, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPx(grid, xx, yy, ch);
    }
  }
}

function fillEllipse(grid, cx, cy, rx, ry, ch) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) {
        setPx(grid, x, y, ch);
      }
    }
  }
}

function stampRows(grid, ox, oy, rows) {
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const ch = rows[y][x];
      if (ch !== ' ') {
        setPx(grid, ox + x, oy + y, ch);
      }
    }
  }
}

function toRows(grid) {
  return grid.map((r) => r.join(''));
}

// ============================================================================
// 1. TRAVELER MICHAEL (16 x 24 px, 10 frames)
// Black man (Rich Chestnut 5/6/7/8), crisp low-fade (h/H), terracotta open
// overshirt (r/R/T), ivory crewneck tee (I/B), crossbody sling (K/m/G),
// dark slate tapered jeans (J/j), cream-and-terracotta sneakers (I/R),
// warm glowing brass lantern (y/G/L/W).
// ============================================================================
const TRAVELER_MICHAEL_FRAMES = [
  {
    name: 'idle-0',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...ohHHHHho.....',
      '...ohhhhhho.....',
      '...oh7887ho.....',
      '...o678766o.....',
      '...o6o77o6o.....',
      '...o567765o.....',
      '....o5hh5o......',
      '...oo5665oo.....',
      '..oTRKIIKRTou...',
      '.oTRRImIIRRTu...',
      '.oTRrIIGIRrTu...',
      '.oRrRIImIRrRuo..',
      '.o67rIIIKr76yGy.',
      '..oojJJJJjooyLy.',
      '...ojJJJJjo.yWy.',
      '...ojJooJjo.yGy.',
      '...oJJooJJo..y..',
      '...oJjo.jJo.....',
      '...oJjo.jJo.....',
      '..oIRIo.oIRIo...',
      '..oooo...oooo...',
    ],
  },
  {
    name: 'idle-1',
    rows: [
      '................',
      '....oooooo......',
      '...ohHHHHho.....',
      '...ohhhhhho.....',
      '...oh7887ho.....',
      '...o678766o.....',
      '...o6o77o6o.....',
      '...o567765o.....',
      '....o5hh5o......',
      '...oo5665oo.....',
      '..oTRKIIKRTo....',
      '.oTRRImIIRRTo...',
      '.oTRrIIGIRrTo...',
      '.oRrRIImIRrRuo..',
      '.o67rIIIKr76yGy.',
      '..oojJJJJjooLWLy',
      '...ojJJJJjo.yWy.',
      '...ojJooJjo.yLy.',
      '...oJJooJJo..y..',
      '...oJJooJJo.....',
      '...oJjo.jJo.....',
      '...oJjo.jJo.....',
      '..oIRIo.oIRIo...',
      '..oooo...oooo...',
    ],
  },
  {
    name: 'walk-side-0',
    rows: [
      '................',
      '................',
      '.....ooooo......',
      '....ohHHHho.....',
      '....ohhhhho.....',
      '....oh7887o.....',
      '....oh6787o.....',
      '....o667o7o.....',
      '....o56776o.....',
      '.....o56hh......',
      '....oo566oo.....',
      '...oTRRKIIRo....',
      '..oTRrRImIRTo...',
      '..oRrRTIGITRuo..',
      '..o67oRImIR76yGy',
      '...ooojJJJoo.yLy',
      '.....ojJJJo..yWy',
      '....ojJJoJJo.yGy',
      '...oJJo..oJJo.y.',
      '..oJJo....oJJo..',
      '..oJjo....ojJo..',
      '.oIRIo....oIRIo.',
      '.oooo......oooo.',
      '................',
    ],
  },
  {
    name: 'walk-side-1',
    rows: [
      '................',
      '.....ooooo......',
      '....ohHHHho.....',
      '....ohhhhho.....',
      '....oh7887o.....',
      '....oh6787o.....',
      '....o667o7o.....',
      '....o56776o.....',
      '.....o56hh......',
      '....oo566oo.....',
      '...oTRRKIIRo....',
      '...oTRrImIRTo...',
      '...oRrRIGITRo...',
      '...oR67ImR76o...',
      '....oojJJJooGy..',
      '.....ojJJJo.yLy.',
      '.....ojJJJo.yWy.',
      '.....oJJJJo.yGy.',
      '.....oJJJo...y..',
      '.....oJJo.......',
      '.....oJjo.......',
      '....oIRIo.......',
      '....ooooo.......',
      '................',
    ],
  },
  {
    name: 'walk-side-2',
    rows: [
      '................',
      '................',
      '.....ooooo......',
      '....ohHHHho.....',
      '....ohhhhho.....',
      '....oh7887o.....',
      '....oh6787o.....',
      '....o667o7o.....',
      '....o56776o.....',
      '.....o56hh......',
      '....oo566oo.....',
      '...oTRRKIIRo....',
      '...oTRrImIRTo...',
      '..oR67RIGITRo...',
      '..o67oRImI67oyGy',
      '...ooojJJJoo.yLy',
      '.....ojJJJo..yWy',
      '....ojJJoJJo.yGy',
      '...oJJo..oJJo.y.',
      '...oJjo...oJJo..',
      '..oJJo....ojJo..',
      '..oIRIo...oIRIo.',
      '..oooo.....oooo.',
      '................',
    ],
  },
  {
    name: 'walk-side-3',
    rows: [
      '................',
      '.....ooooo......',
      '....ohHHHho.....',
      '....ohhhhho.....',
      '....oh7887o.....',
      '....oh6787o.....',
      '....o667o7o.....',
      '....o56776o.....',
      '.....o56hh......',
      '....oo566oo.....',
      '...oTRRKIIRo....',
      '...oTRrImIRTo...',
      '...oRrRIGITRo...',
      '...oR67ImR76oy..',
      '....oojJJJooGy..',
      '.....ojJJJo.yLy.',
      '.....ojJJJo.yWy.',
      '.....oJJJJo.yGy.',
      '.....oJJJo...y..',
      '.....oJJo.......',
      '.....oJjo.......',
      '....oIRIo.......',
      '....ooooo.......',
      '................',
    ],
  },
  {
    name: 'walk-up-0',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...ohHHHHho.....',
      '...ohhhhhho.....',
      '...ohhhhhho.....',
      '...ohHhhHho.....',
      '...o5hhhh5o.....',
      '...o566665o.....',
      '....o5665o......',
      '...oo5665oo.....',
      '..oTRKRRRRTou...',
      '.oTRRKmRRRRTo...',
      '.oTRrKKmRRrTo...',
      '.oRrRRKmKRrRo...',
      '.o67rRRmGR76o...',
      '..oojJJJJjoo....',
      '...ojJJJJjo.....',
      '...ojJooJjo.....',
      '...oJJooJJo.....',
      '...oJjo.oJJo....',
      '...oRRo..ojJo...',
      '..oIRIo..oIRIo..',
      '..oooo....oooo..',
    ],
  },
  {
    name: 'walk-down-0',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...ohHHHHho.....',
      '...ohhhhhho.....',
      '...oh7887ho.....',
      '...o678766o.....',
      '...o6o77o6o.....',
      '...o567765o.....',
      '....o5hh5o......',
      '...oo5665oo.....',
      '..oTRKIIKRTou...',
      '.oTRRImIIRRTo...',
      '.oTRrIIGIRrTu...',
      '.o67rIImIRrRuo..',
      '..oorIIIKr76yGy.',
      '...ojJJJJjooyLy.',
      '...ojJJJJjo.yWy.',
      '...ojJooJjo.yGy.',
      '..oJJo..oJJo.y..',
      '..oJjo...oJJo...',
      '..oIRIo..ojJo...',
      '..oooo...oIRIo..',
      '..........oooo..',
    ],
  },
  {
    name: 'lantern-raise-0',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...ohHHHHho.....',
      '...ohhhhhho.....',
      '...oh7887ho..L..',
      '...o678766o.yGy.',
      '...o6o77o6oLWLy.',
      '...o567765o.yWy.',
      '....o5hh5o..yGy.',
      '...oo5665oo..76o',
      '..oTRKIIKRTorTRo',
      '.oTRRImIIRRTRTo.',
      '.oTRrIIGIRrRTo..',
      '.oRrRIImIRrRo...',
      '.o67rIIIKrRo....',
      '..oojJJJJjoo....',
      '...ojJJJJjo.....',
      '...ojJooJjo.....',
      '...oJJooJJo.....',
      '...oJjo.jJo.....',
      '...oJjo.jJo.....',
      '..oIRIo.oIRIo...',
      '..oooo...oooo...',
    ],
  },
  {
    name: 'lantern-raise-1',
    rows: [
      '............W...',
      '...........LWL..',
      '....oooooo.yGy..',
      '...ohHHHHhoLWLy.',
      '...ohhhhhhoWWWy.',
      '...oh7888hoLWLy.',
      '...o678876o.yGy.',
      '...o6o78o6o..76o',
      '...o567865o.oRTo',
      '....o5hh5o..oRTo',
      '...oo5665oooTRo.',
      '..oTRKIIKRTTRo..',
      '.oTRRImIIRRTTo..',
      '.oTRrIIGIRrRo...',
      '.oRrRIImIRrRo...',
      '.o67rIIIKrRo....',
      '..oojJJJJjoo....',
      '...ojJJJJjo.....',
      '...ojJooJjo.....',
      '...oJJooJJo.....',
      '...oJjo.jJo.....',
      '...oJjo.jJo.....',
      '..oIRIo.oIRIo...',
      '..oooo...oooo...',
    ],
  },
];

// ============================================================================
// 2. PHASE 1 BIOME KEEPERS (16 x 24 px, 4 frames)
// - Genesis Garden Root-Keeper (0-1): Black woman elder, Deep Mahogany ramp
//   (1/2/3/4), sculptural ochre headwrap/gele (y/Y/G/L), ivory linen sleeves,
//   botanical sage apron (F/g/v), holding brass watering can & herb sprig.
// - Psalms Twilight Psalmist (2-3): Black elder, Warm Amber-Bronze ramp
//   (a/b/c/e), silver-crown locs (x/H), indigo & terracotta shawl (N/n/R/T),
//   seated on cedar porch bench plucking a carved cedar/brass harp/lyre.
// ============================================================================
const KEEPERS_PHASE1_FRAMES = [
  {
    name: 'genesis-root-keeper-0',
    rows: [
      '................',
      '.....ooooo......',
      '....oYGLGYo.....',
      '...oYGGYGGYo....',
      '...oyYGGGYyo....',
      '...o134431o.....',
      '...o234322o.....',
      '...o2o33o2o.....',
      '...G123321G.....',
      '....o1221o......',
      '...ooI22Ioo.....',
      '..oIIBggBIIo....',
      '.oIIBgvvgBIIo...',
      '.oIBFgvvgFBIo...',
      '.o23FgFFgF32o...',
      '..ooFggggFooGy..',
      '...omFggFmoGGLy.',
      '...omFggFmoyGGy.',
      '..omKFggFKmooo..',
      '..omKggggKmo....',
      '..oKKmFFmKKo....',
      '..oKKmmmmKKo....',
      '...ooKKKKoo.....',
      '....oo..oo......',
    ],
  },
  {
    name: 'genesis-root-keeper-1',
    rows: [
      '.....ooooo......',
      '....oYGLGYo.....',
      '...oYGGYGGYo....',
      '...oyYGGGYyo....',
      '...o134431o.....',
      '...o234322o.....',
      '...o2o33o2o.....',
      '...G123321G.....',
      '....o1221o......',
      '...ooI22Ioo.....',
      '..oIIBggBIIo....',
      '.oIIBgvvgBIIo...',
      '.oIBFgvvgFBIo...',
      '.o23FgFFgF32oGy.',
      '..ooFggggFooGGLy',
      '...omFggFmoyGGyZ',
      '...omFggFmoooo.w',
      '..omKFggFKmo...Z',
      '..omKggggKmo....',
      '..oKKmFFmKKo....',
      '..oKKmmmmKKo....',
      '..oKKmmmmKKo....',
      '...ooKKKKoo.....',
      '....oo..oo......',
    ],
  },
  {
    name: 'psalms-twilight-psalmist-0',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...oxxHxxxo.....',
      '...oxHHHHxo.....',
      '...oxceecxo.....',
      '...obcecbbo.....',
      '...oboccobo.....',
      '...oabccbao.....',
      '....oaxxxo......',
      '...ooNbbNoo.....',
      '..oNRNIIINRo....',
      '.oNTRNIIINRTu...',
      '.oNnRNIIINnRMG..',
      '.oNbNIBIINbcMLG.',
      '..oonNNNNnbbMLG.',
      '...onNIIINncMMG.',
      '..uMMMMMMMMMmu..',
      '..umMMMMMMMMmu..',
      '..uKKmmmmmmKKu..',
      '..uKko....oKKu..',
      '..uKko....oKKu..',
      '..uKKo....oKKu..',
      '..ooo......ooo..',
    ],
  },
  {
    name: 'psalms-twilight-psalmist-1',
    rows: [
      '................',
      '................',
      '....oooooo......',
      '...oxxHxxxo.....',
      '...oxHHHHxo.....',
      '...oxceecxo.....',
      '...obcecbbo.....',
      '...oboccobo.....',
      '...oabccbao...W.',
      '....oaxxxo...L..',
      '...ooNbbNoo.....',
      '..oNRNIIINRo....',
      '.oNTRNIIINRTu...',
      '.oNnRNIIINnRMG..',
      '.oNbNIBIINbcMWG.',
      '..oonNNNNncbMLG.',
      '...onNIIINnbMMG.',
      '..uMMMMMMMMMmu..',
      '..umMMMMMMMMmu..',
      '..uKKmmmmmmKKu..',
      '..uKko....oKKu..',
      '..uKko....oKKu..',
      '..uKKo....oKKu..',
      '..ooo......ooo..',
    ],
  },
];

// ============================================================================
// 3. SHARED TERRAIN TILES (16 x 16 px, 24 tiles, 6 cols x 4 rows)
// ============================================================================
const TERRAIN_TILES_PHASE1 = [
  // 0: grass-sage-a
  {
    name: 'grass-sage-a',
    rows: [
      'gggggFggggggggFg',
      'ggvggFggggvggggg',
      'ggggggggggggggvg',
      'gFggggggggFggggg',
      'ggggggvggggggggg',
      'ggggggggggggFggg',
      'ggFggggggggggggg',
      'ggggggFggvgggggg',
      'ggggggggggggggFg',
      'gvgggggggggFgggg',
      'gggggFgggggggggg',
      'ggggggggggvggggg',
      'ggFggggggggggFgg',
      'ggggggvggggggggg',
      'gggggggggggFgggg',
      'gggFggggggggggvg',
    ],
  },
  // 1: grass-sage-b (clover tufts)
  {
    name: 'grass-sage-b',
    rows: [
      'ggggggggFggggggg',
      'gggvVggggggggFgg',
      'ggggvggggggggggg',
      'ggggggggggFggggg',
      'gFggggggggggvVgg',
      'ggggggFggggggvgg',
      'gggggggggggggggg',
      'gggFgggggvVggggg',
      'ggggggggggvgggFg',
      'gggggFgggggggggg',
      'gvVggggggggFgggg',
      'ggvggggggggggggg',
      'ggggggFgggggvVgg',
      'gggggggggggggvgg',
      'ggFgggggFggggggg',
      'ggggggggggggFggg',
    ],
  },
  // 2: grass-wildflowers
  {
    name: 'grass-wildflowers',
    rows: [
      'gggggFgggggggggg',
      'ggvGggggggFggggg',
      'ggfgggggggggvlgg',
      'ggggggFgggggfggg',
      'gggggggggggggggg',
      'gFgggggvLggggFgg',
      'ggggggggfggggggg',
      'gggggggggggggggg',
      'ggvzgggggFgggggg',
      'ggfgggggggggvGgg',
      'ggggggFgggggfggg',
      'gggggggggggggggg',
      'gFggggggggvlgggg',
      'gggggvGggggfggFg',
      'ggggggfggggggggg',
      'gggFggggggggvggg',
    ],
  },
  // 3: red-clay-path-straight
  {
    name: 'red-clay-path-straight',
    rows: [
      'rRRqRRRRRTRRRqRR',
      'RRRRRRRTRRRRRRRR',
      'RRqRRRRRRRRrRRRR',
      'RRRRRTRRRqRRRRRR',
      'rRRRRRRRRRRRTRRr',
      'RRRTRRRrRRRRRRRR',
      'RRRRRRRRRRqRRRRR',
      'RRqRRRRRTRRRRTRR',
      'RRRRrRRRRRRRRRRR',
      'RRRRRRRRqRRrRRRR',
      'rRRTRRRRRRRRRqRR',
      'RRRRRRRTRRRRRRRR',
      'RRqRRRRRRRRTRRRR',
      'RRRRRrRRRRRRRRrR',
      'RRRRRRRRqRRRTRRR',
      'rRRRRTRRRRRRRRRR',
    ],
  },
  // 4: red-clay-path-edge
  {
    name: 'red-clay-path-edge',
    rows: [
      'ggggFgFggRRqRRRR',
      'ggvggFgrRRRRTRRR',
      'gggggFgRRqRRRRRR',
      'gFggggFrrRRRRRTR',
      'gggggFggRRRRqRRR',
      'ggggFFgrRRRTRRRR',
      'ggFgFggRRRRRRRRR',
      'ggggFggrRRqRRTRR',
      'gggggFgRRRRRRRRR',
      'gvggFFgrRRRRqRRR',
      'ggggFggRRTRRRRRR',
      'ggggFggrRRRRRTRR',
      'ggFgFggRRqRRRRRR',
      'ggggFFgrRRRRRRRR',
      'gggggFgRRRRTRRqR',
      'gggFgFgrRRRRRRRR',
    ],
  },
  // 5: mossy-stone-path
  {
    name: 'mossy-stone-path',
    rows: [
      'gFggggggFgggggFg',
      'gduuuugggduuuugg',
      'guBBBSuggdSBSSug',
      'guBSSSugguSSSSug',
      'guSSssugguSSssug',
      'gduuuugggduuuugg',
      'gggFggvggggFgggg',
      'ggggduuuuuugggFg',
      'gFgduBBSSBSugggg',
      'ggguBSSSSSSugFgg',
      'ggguSSSssSSugggg',
      'gggduuuuuuugggvg',
      'gduuuugggggFgggg',
      'guSBSSugggduuugg',
      'guSSssuggguSBsug',
      'gduuuuggggduuugg',
    ],
  },
  // 6: creek-water-0
  {
    name: 'creek-water-0',
    rows: [
      'NNNNNNwNNNNNNNNN',
      'NNwZZwNNNNNNwNNN',
      'NNNNNNNNNNwZZwNN',
      'NNNNnNNNNNNNNNNN',
      'NNNNNNNwZZwNNNNN',
      'NnNNNNNNNNNNNNnN',
      'NNNNwNNNNNNNNNNN',
      'NNwZZwNNNNwNNNNN',
      'NNNNNNNNNwZZwNNN',
      'NNNNNNnNNNNNNNNN',
      'NNnNNNNNNNNNNwNN',
      'NNNNNwZZwNNNNNNN',
      'NNNNNNNNNNNNnNNN',
      'NwNNNNNNNNwZZwNN',
      'NNNNnNNNNNNNNNNN',
      'NNNNNNNwNNNNNnNN',
    ],
  },
  // 7: creek-water-1 (shifted ripple)
  {
    name: 'creek-water-1',
    rows: [
      'NNNNNNNNwNNNNNNN',
      'NNNNwZZwNNNNNNwN',
      'NNNNNNNNNNNNwZZw',
      'NNnNNNNNNNNNNNNN',
      'NNNNNNNNNwZZwNNN',
      'NNNNnNNNNNNNNNNN',
      'NNwNNNNNNNNNNnNN',
      'NNNNwZZwNNNNwNNN',
      'NNNNNNNNNNNwZZwN',
      'NNNNNNNNnNNNNNNN',
      'NNNNnNNNNNNNNNNw',
      'NNNNNNNwZZwNNNNN',
      'NnNNNNNNNNNNNNNN',
      'NNNwNNNNNNNNwZZw',
      'NNNNNNnNNNNNNNNN',
      'NNNNNNNNNwNNNNnN',
    ],
  },
  // 8: creek-bank-top
  {
    name: 'creek-bank-top',
    rows: [
      'ggggFgggggvgFggg',
      'ggvgggggFggggggg',
      'FggggFgggggggvgg',
      'FFgFFggFgggFFggF',
      'fFFffFFfFFffFFff',
      'uKkuuKuuKkuuKuuK',
      'nKnnnKnnKnnnKnnK',
      'nnnnnnnnnnnnnnnn',
      'NNnNNNNnNNNNnNNN',
      'NNNNwZZwNNNNNNwN',
      'NNNNNNNNNNwZZwNN',
      'NNNNNNnNNNNNNNNN',
      'NNwZZwNNNNNNNNNN',
      'NNNNNNNNNNnNNNNN',
      'NNNNwNNNNNNNNwZZ',
      'NNNNNNNNnNNNNNNN',
    ],
  },
  // 9: garden-loam-soil
  {
    name: 'garden-loam-soil',
    rows: [
      'KKKKKKKKKKKKKKKK',
      'kKkkkKkkkKkkkKkk',
      'KmmKKmKKKmmKKmKK',
      'KKKKKKKKKKKKKKKK',
      'kkKkkkKkkkKkkkKk',
      'KKKmKKKmmKKmKKKK',
      'KKKKKKKKKKKKKKKK',
      'kKkkkKkkkKkkkKkk',
      'KmKKKmmKKKmmKKmK',
      'KKKKKKKKKKKKKKKK',
      'kkKkkkKkkkKkkkKk',
      'KKmmKKKmKKKmmKKK',
      'KKKKKKKKKKKKKKKK',
      'kKkkkKkkkKkkkKkk',
      'KmmKKmKKKmKKmmKK',
      'KKKKKKKKKKKKKKKK',
    ],
  },
  // 10: garden-sprouts
  {
    name: 'garden-sprouts',
    rows: [
      'KKKKKKKKKKKKKKKK',
      'kKkvgkKkkkKkkkKk',
      'KmmFgKKKmmKKvgKK',
      'KKKKKKKvgKKKFgKK',
      'kkKkkkKFgKkkkKkk',
      'KKKmKKKmmKKmKKKK',
      'KKKKKKKKKKKKKKKK',
      'kKkkkKkkkKkvgkKk',
      'KmvgKmmKKKmFgKmK',
      'KKFgKKKKKKKKKKKK',
      'kkKkkkKkkkKkkkKk',
      'KKmmKKvgKKKmmKKK',
      'KKKKKKFgKKKKKKKK',
      'kKkkkKkkkKkkkKkk',
      'KmmKKmKKKmKvgKKK',
      'KKKKKKKKKKKFgKKK',
    ],
  },
  // 11: garden-herbs-lush
  {
    name: 'garden-herbs-lush',
    rows: [
      'KKvgFKKKvlvKKvgK',
      'KvVvgFKKgFgKvVgF',
      'KgFFFgKKFFFKgFFg',
      'KKfFfKKKKfKKKfFK',
      'kKkkkKkkkKkkkKkk',
      'KKKKKvgFKKKKvVKK',
      'KKvlvgvgFKKgvgFK',
      'KKgFgFFFgKKgFFgK',
      'KKKfKfFfKKKKfFfK',
      'kkKkkkKkkkKkkkKk',
      'KvgFKKKKvlvKKvgK',
      'vVvgFKKKgFgKvVgF',
      'gFFFgKKKFFFKgFFg',
      'KfFfKKKKKfKKKfFK',
      'KmmKKmKKKmKKmmKK',
      'KKKKKKKKKKKKKKKK',
    ],
  },
  // 12: cedar-porch-deck
  {
    name: 'cedar-porch-deck',
    rows: [
      'mMMMMMMMmMMMMMMM',
      'mMMpMMMMmMMMpMMM',
      'mMMMMMMMmMMMMMMM',
      'kkkkkkkkkkkkkkkk',
      'MMMMmMMMMMMMpMMM',
      'MMpMmMMMMMMMMMMM',
      'MMMMmMMMMMMmMMMM',
      'kkkkkkkkkkkkkkkk',
      'MMMMMMMMMMmMMMMM',
      'MMMpMMMMMMmMMpMM',
      'MMMMMMMMMMmMMMMM',
      'kkkkkkkkkkkkkkkk',
      'mMMMMMpMMMMMMmMM',
      'mMMMMMMMMMMMMmMM',
      'mMMMMMMMpMMMMmMM',
      'kkkkkkkkkkkkkkkk',
    ],
  },
  // 13: cedar-porch-edge
  {
    name: 'cedar-porch-edge',
    rows: [
      'mMMMMMMMmMMMMMMM',
      'mMMpMMMMmMMMpMMM',
      'mMMMMMMMmMMMMMMM',
      'kkkkkkkkkkkkkkkk',
      'pppppppppppppppp',
      'MMMMMMMMMMMMMMMM',
      'mmmmmmmmmmmmmmmm',
      'KKKKKKKKKKKKKKKK',
      'kKKkKKKkKKKkKKKk',
      'kKKkKKKkKKKkKKKk',
      'kkkkkkkkkkkkkkkk',
      'uuKuKKuuKuKKuuKu',
      'ggFggggggggFgggg',
      'ggggvggggggggggg',
      'gFgggggggggvgggg',
      'ggggggFggggggggg',
    ],
  },
  // 14: wooden-fence-h
  {
    name: 'wooden-fence-h',
    rows: [
      'gggggggggggggggg',
      'guuuugggggguuuug',
      'guMpmugggguMpmug',
      'guMMmugggguMMmug',
      'uMMpMMMMMMMMpMMu',
      'uMMMMMMMMMMMMMMu',
      'uKmmmmKmmKmmmmKu',
      'guKMmugggguKMmug',
      'guKMmugggguKMmug',
      'uMMpMMMMMMMMpMMu',
      'uMMMMMMMMMMMMMMu',
      'uKmmmmKmmKmmmmKu',
      'guKMmugggguKMmug',
      'guKKmugggguKKmug',
      'gFuuugggggFuuugg',
      'ggggggFggggggggg',
    ],
  },
  // 15: wooden-fence-post
  {
    name: 'wooden-fence-post',
    rows: [
      'gggggggggggggggg',
      'ggggguuuuuuggggg',
      'ggggguGLLGuggggg',
      'ggggguYGGYuggggg',
      'ggggguMppMuggggg',
      'ggggguMMMMuggggg',
      'ggggguMMmmuggggg',
      'ggggguKMmmuggggg',
      'ggggguKMmmuggggg',
      'ggggguKMmmuggggg',
      'ggggguKMmmuggggg',
      'ggggguKKmmuggggg',
      'ggggguKKKmuggggg',
      'gggggFuuuuFggggg',
      'ggggFFggggFFgggg',
      'gggggggggggggggg',
    ],
  },
  // 16: hedgerow-foliage-a
  {
    name: 'hedgerow-foliage-a',
    rows: [
      'fFFgvvgFFgvvgFFf',
      'FFgvvvvggvvvvgFF',
      'FgvvggvvgvggvvgF',
      'FggFggggggggFggF',
      'FFgFggvvvgFgFgFF',
      'fFFggvvvvvgFFfFf',
      'FFggvvggvvggFFgF',
      'FgvvgFggFgvvggvF',
      'FggFgFFgFFgFgggF',
      'fFFgFFggFFgFFfFf',
      'FFgvvgFFgvvggFFf',
      'FgvvvvggvvvvgFFf',
      'FggvvgFFgvvggFff',
      'fFFggFFFFggFFfff',
      'ffFFFFFFFFFFFFff',
      'ffffffffffffffff',
    ],
  },
  // 17: hedgerow-blossom
  {
    name: 'hedgerow-blossom',
    rows: [
      'fFFgvvgFFgvvgFFf',
      'FFgvTGvggvvzvggF',
      'FgvvRRvvgvzzvvgF',
      'FggFggggggggFggF',
      'FFgFggvLvgFgFgFF',
      'fFFggvGLvvgFFfFf',
      'FFggvvggvvggFFgF',
      'FgvvgFggFgvzggvF',
      'FgTGgFFgFFzzgggF',
      'fFRRgFFggFFgFFfF',
      'FFgvvgFFgvvggFFf',
      'FgvvvvggvTGvgFFf',
      'FggvvgFFgRRggFff',
      'fFFggFFFFggFFfff',
      'ffFFFFFFFFFFFFff',
      'ffffffffffffffff',
    ],
  },
  // 18: mist-veil-dense
  {
    name: 'mist-veil-dense',
    rows: [
      '================',
      '==^=======^=====',
      '=====^=======^==',
      '================',
      '=^======^=======',
      '====^=======^===',
      '================',
      '=======^======^=',
      '==^========^====',
      '================',
      '=====^=======^==',
      '=^=======^======',
      '================',
      '====^=======^===',
      '========^=======',
      '================',
    ],
  },
  // 19: mist-veil-medium
  {
    name: 'mist-veil-medium',
    rows: [
      '^^~^^^~^^^^~^^^^',
      '^^^^~^^^^~^^^~^^',
      '~^^^^^=^^^^^~^^^',
      '^^^~^^^^^~^^^^^^',
      '^^^^^^~^^^^=^^^~',
      '^~^^^^^^^^^^^~^^',
      '^^^^=^^^~^^^^^^^',
      '^^~^^^^^^^~^^^~^',
      '^^^^^^~^^^^^=^^^',
      '~^^^~^^^^^^^^^^^',
      '^^^^^^=^^^~^^^~^',
      '^^~^^^^^^^^^~^^^',
      '^^^^~^^^=^^^^^^^',
      '^~^^^^^^^^~^^^~^',
      '^^^^^~^^^^^^~^^^',
      '^^~^^^^~^^^^^^^~',
    ],
  },
  // 20: mist-veil-edge-left (mist on left fading into clear right)
  {
    name: 'mist-veil-edge-left',
    rows: [
      '===^^~~.........',
      '====^^~~........',
      '===^^^~~........',
      '====^^^~~.......',
      '===^^~~~........',
      '====^^^~~.......',
      '=====^^~~~......',
      '====^^^~~.......',
      '===^^^~~~.......',
      '====^^~~........',
      '=====^^^~~......',
      '====^^~~~.......',
      '===^^^~~........',
      '====^^~~~.......',
      '===^^~~.........',
      '====^^~~........',
    ],
  },
  // 21: mist-veil-edge-right (clear left fading into mist on right)
  {
    name: 'mist-veil-edge-right',
    rows: [
      '.........~~^^===',
      '........~~^^====',
      '........~~^^^===',
      '.......~~^^^====',
      '........~~~^^===',
      '.......~~^^^====',
      '......~~~^^=====',
      '.......~~^^^====',
      '.......~~~^^^===',
      '........~~^^====',
      '......~~^^^=====',
      '.......~~~^^====',
      '........~~^^^===',
      '.......~~~^^====',
      '.........~~^^===',
      '........~~^^====',
    ],
  },
  // 22: dormant-earth
  {
    name: 'dormant-earth',
    rows: [
      'SSSSSsSSSSSSSSSS',
      'SSBSsSSSSSSSSBSS',
      'SSSSSSSSSSsSSSSS',
      'SSSsSSSSSSSSSSSS',
      'SSSSSSSBSSSSSsSS',
      'SSSSSSSSSSSSSSSS',
      'SsSSSSSSSSBSSSSS',
      'SSSSSSsSSSSSSSSS',
      'SSSSSSSSSSSSsSSS',
      'SSBSSSSsSSSSSSSS',
      'SSSSSSSSSSSBSSSS',
      'SSSSsSSSSSSSSSSS',
      'SSSSSSSSSsSSSSSS',
      'SSsSSSSSSSSSSBSS',
      'SSSSSSBSSSSSSSSS',
      'SSSSSSSSSSSsSSSS',
    ],
  },
  // 23: stone-cobble-clearing
  {
    name: 'stone-cobble-clearing',
    rows: [
      'dBBBSsdBBSSsdBBs',
      'dBSSSsdBSSSsdBSs',
      'dSSSSsdSSSSsdSSs',
      'dddddddddddddddd',
      'SSsdBBBSsdBBSSsd',
      'SSsdBSSSsdBSSSsd',
      'sssdSSSSsdSSSSsd',
      'dddddddddddddddd',
      'dBBSSsdBBBSsdBBs',
      'dBSSSsdBSSSsdBSs',
      'dSSSSsdSSSSsdSSs',
      'dddddddddddddddd',
      'SSsdBBSSsdBBBSsd',
      'SSsdBSSSsdBSSSsd',
      'sssdSSSSsdSSSSsd',
      'dddddddddddddddd',
    ],
  },
];

// ============================================================================
// 4. PHASE 1 LANDMARK PROPS (32 x 32 px, 10 stamps, 5 cols x 2 rows)
// ============================================================================

function buildEdenTreeDormant() {
  const g = createCanvas(32, 32, '.');
  // Quiet stone/sepia ground base with subtle mist
  fillEllipse(g, 16, 27, 11, 3.2, 'S');
  fillEllipse(g, 16, 28, 9, 2.2, 's');

  // Sculptural bare trunk & buttress roots
  fillRect(g, 13, 15, 6, 12, 'K');
  fillRect(g, 14, 15, 3, 11, 'm');
  fillRect(g, 14, 16, 1, 9, 'M');
  // Outlines & gnarled roots
  for (let y = 15; y <= 26; y += 1) {
    setPx(g, 12, y, 'u');
    setPx(g, 19, y, 'u');
  }
  // Flared roots left/right
  stampRows(g, 9, 24, [
    '   uKm  mKu   ',
    '  uKmK  KmKu  ',
    ' uKmKK  KKmKu ',
    'uuKKk    kKKuu',
  ]);
  // Gnarled bare winter branches reaching outward
  const branches = [
    // Main left bough
    [13, 15], [12, 14], [11, 13], [10, 12], [9, 11], [8, 11], [7, 10], [6, 9],
    [11, 12], [10, 10], [9, 9], [8, 8], [9, 7],
    [12, 13], [11, 11], [11, 9], [10, 7], [11, 6],
    // Center crown twigs
    [15, 14], [15, 12], [15, 10], [14, 8], [13, 6], [14, 5],
    [16, 14], [16, 12], [17, 10], [17, 8], [16, 6], [17, 5],
    // Main right bough
    [18, 15], [19, 14], [20, 13], [21, 12], [22, 11], [23, 10], [24, 10], [25, 9],
    [20, 12], [21, 10], [22, 8], [23, 7],
    [19, 13], [20, 11], [20, 9], [21, 7], [20, 6],
  ];
  for (const [bx, by] of branches) {
    setPx(g, bx, by, 'u');
    setPx(g, bx, by + 1, 'K');
    setPx(g, bx + 1, by, 'm');
  }
  // Soft dormant mist wisps curling across roots & lower limbs
  fillEllipse(g, 10, 27, 5, 1.5, '^');
  fillEllipse(g, 22, 26, 5, 1.5, '~');
  fillEllipse(g, 16, 29, 8, 1.3, '~');
  return toRows(g);
}

function buildEdenTreeBloomed() {
  const g = createCanvas(32, 32, '.');
  // Lush moss & cedar shadow ground ring
  fillEllipse(g, 16, 28, 12, 3.0, 'F');
  fillEllipse(g, 16, 28, 9, 2.0, 'g');

  // Thick carved root-trunk
  fillRect(g, 13, 16, 6, 12, 'K');
  fillRect(g, 14, 16, 3, 11, 'm');
  fillRect(g, 14, 17, 1, 9, 'M');
  for (let y = 17; y <= 26; y += 1) {
    setPx(g, 12, y, 'u');
    setPx(g, 19, y, 'u');
  }
  stampRows(g, 9, 25, [
    '   uKm  mKu   ',
    '  uKmK  KmKu  ',
    ' uKmKK  KKmKu ',
  ]);

  // Billowing layered 4-tone emerald/sage canopy
  fillEllipse(g, 16, 12, 13, 8.5, 'f');
  fillEllipse(g, 10, 13, 7, 5.5, 'f');
  fillEllipse(g, 22, 13, 7, 5.5, 'f');

  fillEllipse(g, 16, 11, 11.5, 7.2, 'F');
  fillEllipse(g, 10, 12, 6, 4.5, 'F');
  fillEllipse(g, 22, 12, 6, 4.5, 'F');

  fillEllipse(g, 15, 9.5, 9.5, 5.5, 'g');
  fillEllipse(g, 9.5, 10.5, 4.5, 3.3, 'g');
  fillEllipse(g, 21, 10.5, 4.5, 3.3, 'g');

  // Sunlit crown highlights
  fillEllipse(g, 13, 7, 5.5, 2.8, 'v');
  fillEllipse(g, 20, 8, 3.5, 2.0, 'v');
  fillEllipse(g, 8.5, 9.5, 2.3, 1.5, 'v');

  // Warm terracotta figs/pomegranates & golden sunlit blossoms in canopy
  const fruits = [
    [9, 12], [14, 10], [20, 11], [23, 13], [12, 15], [18, 14],
  ];
  for (const [fx, fy] of fruits) {
    setPx(g, fx, fy, 'R');
    setPx(g, fx + 1, fy, 'T');
    setPx(g, fx, fy + 1, 'r');
    setPx(g, fx + 1, fy + 1, 'R');
  }
  const blossoms = [
    [11, 7], [16, 6], [22, 9], [7, 11], [15, 13], [24, 11],
  ];
  for (const [bx, by] of blossoms) {
    setPx(g, bx, by, 'L');
    setPx(g, bx + 1, by, 'G');
  }
  // Tiny rootwork herbs blooming at tree base
  setPx(g, 9, 27, 'v'); setPx(g, 10, 26, 'z'); setPx(g, 22, 27, 'v'); setPx(g, 23, 26, 'L');
  return toRows(g);
}

function buildCedarHerbBed() {
  const g = createCanvas(32, 32, '.');
  // Soft grass bed shadow
  fillEllipse(g, 16, 27, 13, 3.0, 'F');

  // Raised cedar planter box walls
  fillRect(g, 3, 16, 26, 11, 'u');
  fillRect(g, 4, 17, 24, 9, 'm');
  // Plank seams & cedar highlights
  fillRect(g, 4, 17, 24, 2, 'M');
  fillRect(g, 4, 17, 24, 1, 'p');
  fillRect(g, 4, 20, 24, 1, 'K');
  fillRect(g, 4, 23, 24, 1, 'K');
  fillRect(g, 4, 25, 24, 1, 'k');
  // Corner timber posts with brass nails
  for (const px of [4, 26]) {
    fillRect(g, px, 16, 2, 10, 'K');
    setPx(g, px, 17, 'M');
    setPx(g, px, 19, 'G');
    setPx(g, px, 24, 'G');
  }

  // Rich garden loam interior top
  fillRect(g, 5, 13, 22, 4, 'k');
  fillRect(g, 6, 13, 20, 3, 'K');

  // Left cluster: lush botanical sage
  fillEllipse(g, 9, 12, 3.5, 3.0, 'F');
  fillEllipse(g, 9, 11, 2.5, 2.0, 'g');
  setPx(g, 8, 9, 'v'); setPx(g, 10, 9, 'v'); setPx(g, 9, 8, 'V');

  // Center cluster: fragrant lavender & hyssop stalks
  fillEllipse(g, 16, 12, 3.5, 2.8, 'F');
  fillEllipse(g, 16, 11, 2.6, 2.0, 'g');
  for (const sx of [14, 16, 18]) {
    setPx(g, sx, 9, 'g');
    setPx(g, sx, 8, 'l');
    setPx(g, sx, 7, 'l');
    setPx(g, sx, 6, 'z');
  }
  setPx(g, 15, 7, 'z'); setPx(g, 17, 7, 'l');

  // Right cluster: golden marigold & john-the-conqueror root greens
  fillEllipse(g, 23, 12, 3.4, 2.8, 'F');
  fillEllipse(g, 23, 11, 2.4, 2.0, 'g');
  setPx(g, 22, 9, 'G'); setPx(g, 23, 8, 'L'); setPx(g, 24, 9, 'G');
  setPx(g, 21, 10, 'v'); setPx(g, 25, 10, 'v');

  // Tiny wooden herb label stake on front-right soil
  fillRect(g, 25, 11, 2, 4, 'p');
  setPx(g, 25, 11, 'I');
  return toRows(g);
}

function buildHangingDryingHerbs() {
  const g = createCanvas(32, 32, '.');
  // Support posts left & right
  fillRect(g, 2, 4, 3, 25, 'u');
  fillRect(g, 3, 5, 1, 23, 'M');
  fillRect(g, 27, 4, 3, 25, 'u');
  fillRect(g, 28, 5, 1, 23, 'M');

  // Top cedar crossbeam with overhanging pegs
  fillRect(g, 1, 5, 30, 4, 'u');
  fillRect(g, 2, 6, 28, 2, 'm');
  fillRect(g, 2, 6, 28, 1, 'M');
  setPx(g, 4, 7, 'G');
  setPx(g, 27, 7, 'G');

  // 3 suspended drying herb bundles (Sage, Lavender, Hyssop)
  const bundles = [
    { cx: 9, leaf: 'g', hi: 'V', accent: 'v', tie: 'G' },
    { cx: 16, leaf: 'F', hi: 'l', accent: 'z', tie: 'R' },
    { cx: 23, leaf: 'g', hi: 'v', accent: 'L', tie: 'G' },
  ];
  for (const b of bundles) {
    // Twine cord from beam
    setPx(g, b.cx, 9, 'p');
    setPx(g, b.cx, 10, 'p');
    // Stems & tie band
    setPx(g, b.cx - 1, 11, 'K'); setPx(g, b.cx, 11, 'p'); setPx(g, b.cx + 1, 11, 'K');
    setPx(g, b.cx - 1, 12, b.tie); setPx(g, b.cx, 12, 'L'); setPx(g, b.cx + 1, 12, b.tie);
    // Inverted fan of drying herb leaves
    fillRect(g, b.cx - 2, 13, 5, 6, b.leaf);
    fillRect(g, b.cx - 3, 16, 7, 5, b.leaf);
    fillRect(g, b.cx - 2, 21, 5, 3, 'f');
    // Selective outline & textured sprigs
    setPx(g, b.cx - 3, 15, 'u'); setPx(g, b.cx + 3, 15, 'u');
    setPx(g, b.cx - 2, 14, b.hi); setPx(g, b.cx, 15, b.hi); setPx(g, b.cx + 1, 16, b.hi);
    setPx(g, b.cx - 1, 18, b.accent); setPx(g, b.cx + 1, 19, b.accent); setPx(g, b.cx, 21, b.accent);
    setPx(g, b.cx - 2, 20, b.hi); setPx(g, b.cx + 2, 20, b.hi);
    setPx(g, b.cx, 24, b.accent);
  }
  // Small ground shadows under posts
  fillEllipse(g, 3, 29, 2.5, 1.0, 'K');
  fillEllipse(g, 28, 29, 2.5, 1.0, 'K');
  return toRows(g);
}

function buildBrassPorchLantern(lit) {
  const g = createCanvas(32, 32, '.');
  // Ground stone plinth
  fillEllipse(g, 11, 29, 5, 1.8, 's');
  fillRect(g, 8, 26, 6, 3, 'u');
  fillRect(g, 9, 27, 4, 1, 'S');

  // Cedar lamp post
  fillRect(g, 9, 4, 4, 23, 'u');
  fillRect(g, 10, 5, 2, 21, 'm');
  fillRect(g, 10, 5, 1, 21, 'M');
  // Post cap
  fillRect(g, 8, 3, 6, 2, 'u');
  fillRect(g, 9, 3, 4, 1, 'M');

  // Curved wrought-bronze hanging arm
  fillRect(g, 13, 6, 9, 2, 'o');
  fillRect(g, 13, 6, 8, 1, 'y');
  setPx(g, 14, 8, 'y'); setPx(g, 15, 8, 'o');
  setPx(g, 20, 8, 'y'); setPx(g, 20, 9, 'G'); // hook

  // Optional golden glow halo behind lit lantern
  if (lit) {
    fillEllipse(g, 20, 15, 7.5, 7.5, 'L');
    // Dither outer halo softly to transparent for warm 16-bit radiance
    for (let y = 7; y <= 23; y += 1) {
      for (let x = 12; x <= 28; x += 1) {
        const dx = x - 20;
        const dy = y - 15;
        const d2 = dx * dx + dy * dy;
        if (d2 > 22 && (x + y) % 2 === 0 && g[y][x] === 'L') {
          g[y][x] = '.';
        }
      }
    }
    fillEllipse(g, 20, 15, 4.5, 4.5, 'W');
  }

  // Peaked antique brass lantern hood
  fillRect(g, 18, 10, 5, 1, 'o');
  fillRect(g, 17, 11, 7, 2, 'y');
  fillRect(g, 18, 11, 5, 1, 'G');

  // Lantern glass chamber
  fillRect(g, 17, 13, 7, 6, 'o');
  if (lit) {
    fillRect(g, 18, 13, 5, 5, 'L');
    fillRect(g, 19, 14, 3, 3, 'W');
    setPx(g, 20, 15, 'W');
    setPx(g, 18, 13, 'G');
    setPx(g, 22, 13, 'G');
  } else {
    fillRect(g, 18, 13, 5, 5, 's');
    fillRect(g, 19, 13, 2, 4, 'S');
    setPx(g, 19, 14, 'B');
  }
  // Vertical brass ribs
  setPx(g, 17, 15, 'y'); setPx(g, 23, 15, 'y');

  // Lantern base & finial
  fillRect(g, 17, 19, 7, 2, 'y');
  fillRect(g, 18, 19, 5, 1, 'G');
  fillRect(g, 19, 21, 3, 1, 'o');
  setPx(g, 20, 22, 'y');

  // Warm bounce highlights on cedar post when lit
  if (lit) {
    for (let y = 12; y <= 19; y += 1) {
      setPx(g, 12, y, 'G');
    }
    setPx(g, 12, 15, 'L');
    setPx(g, 12, 16, 'L');
  }
  return toRows(g);
}

function buildShepherdsSanctuaryPorch() {
  const g = createCanvas(32, 32, '.');
  // Mossy stone garden verge below porch
  fillRect(g, 1, 27, 30, 4, 'g');
  fillRect(g, 10, 27, 12, 4, 'S');
  fillRect(g, 11, 28, 10, 2, 'B');

  // Pitched cedar-shingle porch roof (rows 3..11)
  for (let row = 0; row < 8; row += 1) {
    const x0 = Math.max(1, 7 - row);
    const x1 = Math.min(30, 24 + row);
    for (let x = x0; x <= x1; x += 1) {
      let ch = row % 2 === 0 ? 'R' : 'r';
      if (x === x0 || x === x1 || row === 0) ch = 'u';
      else if (row === 1) ch = 'T';
      else if ((x + row) % 4 === 0) ch = 'T';
      setPx(g, x, 3 + row, ch);
    }
  }
  // Roof fascia trim beam
  fillRect(g, 1, 11, 30, 2, 'u');
  fillRect(g, 2, 11, 28, 1, 'M');

  // Shaded interior porch backdrop
  fillRect(g, 4, 13, 24, 11, 'k');
  fillRect(g, 5, 14, 22, 9, 'K');
  // Warm cottage window pane on back wall
  fillRect(g, 7, 15, 6, 5, 'u');
  fillRect(g, 8, 16, 4, 3, 'G');
  setPx(g, 9, 17, 'L'); setPx(g, 10, 17, 'L');

  // Hanging drying herbs tucked under right eave
  for (const hx of [21, 24]) {
    setPx(g, hx, 13, 'p');
    setPx(g, hx - 1, 14, 'g'); setPx(g, hx, 14, 'v'); setPx(g, hx + 1, 14, 'g');
    setPx(g, hx - 1, 15, 'F'); setPx(g, hx, 15, hx === 21 ? 'l' : 'V'); setPx(g, hx + 1, 15, 'F');
    setPx(g, hx, 16, hx === 21 ? 'z' : 'v');
  }

  // Glowing brass porch lantern hanging center-right
  setPx(g, 16, 13, 'y');
  fillEllipse(g, 16, 16, 2.5, 2.5, 'L');
  setPx(g, 16, 15, 'G');
  setPx(g, 16, 16, 'W');
  setPx(g, 15, 16, 'L'); setPx(g, 17, 16, 'L');
  setPx(g, 16, 17, 'G');

  // Cedar porch pillars left & right
  fillRect(g, 3, 13, 3, 12, 'u');
  fillRect(g, 4, 13, 1, 11, 'M');
  fillRect(g, 26, 13, 3, 12, 'u');
  fillRect(g, 27, 13, 1, 11, 'M');

  // Cedar railing left & right with central step opening
  fillRect(g, 6, 19, 6, 1, 'M');
  fillRect(g, 6, 20, 6, 3, 'm');
  fillRect(g, 20, 19, 6, 1, 'M');
  fillRect(g, 20, 20, 6, 3, 'm');

  // Warm cedar porch deck & front steps
  fillRect(g, 2, 23, 28, 3, 'u');
  fillRect(g, 3, 23, 26, 2, 'm');
  fillRect(g, 3, 23, 26, 1, 'M');
  // Front wooden steps
  fillRect(g, 11, 25, 10, 2, 'M');
  fillRect(g, 10, 27, 12, 2, 'p');
  setPx(g, 10, 27, 'u'); setPx(g, 21, 27, 'u');

  // Sage & lavender tufts flanking the steps
  setPx(g, 7, 26, 'F'); setPx(g, 8, 25, 'v'); setPx(g, 9, 26, 'l');
  setPx(g, 22, 26, 'F'); setPx(g, 23, 25, 'v'); setPx(g, 24, 26, 'z');
  return toRows(g);
}

function buildWaypoint(state) {
  const g = createCanvas(32, 32, '.');
  // Ground clearing circle
  if (state === 'dormant') {
    fillEllipse(g, 16, 27, 10, 3.0, 's');
    fillEllipse(g, 16, 27, 8, 2.0, 'S');
  } else if (state === 'kindling') {
    fillEllipse(g, 16, 27, 10, 3.2, 'F');
    fillEllipse(g, 16, 27, 8, 2.2, 'g');
  } else {
    fillEllipse(g, 16, 27, 12, 3.5, 'F');
    fillEllipse(g, 16, 27, 9.5, 2.5, 'g');
    fillEllipse(g, 16, 27, 6, 1.5, 'v');
  }

  // Carved stone waypoint monolith (x: 11..20, y: 12..26)
  fillRect(g, 11, 13, 10, 14, 'o');
  fillRect(g, 12, 12, 8, 1, 'o');
  const stoneMain = state === 'dormant' ? 's' : 'S';
  const stoneHi = state === 'dormant' ? 'S' : 'B';
  const stoneShade = state === 'dormant' ? 'd' : 's';

  fillRect(g, 12, 13, 8, 13, stoneMain);
  fillRect(g, 12, 13, 2, 12, stoneHi);
  fillRect(g, 18, 14, 2, 12, stoneShade);
  fillRect(g, 13, 12, 6, 1, stoneHi);
  // Base plinth
  fillRect(g, 10, 24, 12, 3, 'o');
  fillRect(g, 11, 25, 10, 1, stoneHi);

  // Carved lantern niche inside stone pillar
  fillRect(g, 14, 16, 4, 5, 'o');
  if (state === 'dormant') {
    fillRect(g, 15, 17, 2, 3, 'd');
    // Unlit brass cap on crown
    fillRect(g, 14, 10, 4, 2, 'y');
    setPx(g, 15, 9, 'o'); setPx(g, 16, 9, 'o');
    // Bare twig beside stone + soft mist veil across base
    setPx(g, 8, 22, 'u'); setPx(g, 9, 23, 'u'); setPx(g, 10, 24, 'u');
    setPx(g, 7, 21, 'K');
    fillEllipse(g, 16, 26, 11, 2.5, '^');
    fillEllipse(g, 16, 28, 9, 1.8, '~');
  } else if (state === 'kindling') {
    // Warm kindling ember inside niche
    fillRect(g, 15, 17, 2, 3, 'R');
    setPx(g, 15, 18, 'G'); setPx(g, 16, 18, 'L');
    setPx(g, 16, 19, 'G');
    // Brass cap warming up
    fillRect(g, 14, 10, 4, 2, 'Y');
    setPx(g, 15, 10, 'G'); setPx(g, 16, 10, 'L');
    setPx(g, 15, 9, 'y'); setPx(g, 16, 9, 'y');
    // Emerging fresh green sprouts around base
    setPx(g, 8, 24, 'v'); setPx(g, 9, 25, 'g'); setPx(g, 10, 26, 'F');
    setPx(g, 22, 25, 'g'); setPx(g, 23, 24, 'v'); setPx(g, 21, 26, 'F');
    // Small mist wisp retreating at far edge
    setPx(g, 6, 27, '~'); setPx(g, 7, 27, '~'); setPx(g, 25, 27, '~');
  } else {
    // Bloomed! Full radiant brass lantern halo + floating golden ✦ seal crown
    fillEllipse(g, 16, 9, 5.5, 4.5, 'L');
    for (let y = 4; y <= 14; y += 1) {
      for (let x = 10; x <= 22; x += 1) {
        if ((x + y) % 2 === 0 && g[y][x] === 'L') {
          g[y][x] = '.';
        }
      }
    }
    // Floating ✦ brass star seal above crown (rows 2..6)
    setPx(g, 16, 2, 'G');
    setPx(g, 16, 3, 'L');
    setPx(g, 14, 4, 'G'); setPx(g, 15, 4, 'L'); setPx(g, 16, 4, 'W'); setPx(g, 17, 4, 'L'); setPx(g, 18, 4, 'G');
    setPx(g, 16, 5, 'L');
    setPx(g, 16, 6, 'G');

    // Radiant brass lantern crown
    fillRect(g, 13, 9, 6, 3, 'y');
    fillRect(g, 14, 9, 4, 2, 'G');
    fillRect(g, 15, 10, 2, 1, 'W');

    // Blazing niche flame
    fillRect(g, 15, 17, 2, 3, 'L');
    setPx(g, 15, 18, 'W'); setPx(g, 16, 18, 'W');
    setPx(g, 15, 19, 'G'); setPx(g, 16, 19, 'G');

    // Lush botanical sage, terracotta blossoms & lavender wreathing the base
    fillEllipse(g, 8, 25, 3, 2.2, 'F');
    fillEllipse(g, 24, 25, 3, 2.2, 'F');
    setPx(g, 7, 24, 'v'); setPx(g, 9, 23, 'R'); setPx(g, 9, 24, 'T');
    setPx(g, 24, 24, 'v'); setPx(g, 22, 23, 'l'); setPx(g, 23, 23, 'z');
    setPx(g, 12, 27, 'v'); setPx(g, 19, 27, 'v'); setPx(g, 16, 28, 'L');
  }

  return toRows(g);
}

const LANDMARKS_PHASE1 = [
  { name: 'eden-tree-dormant', rows: buildEdenTreeDormant() },
  { name: 'eden-tree-bloomed', rows: buildEdenTreeBloomed() },
  { name: 'cedar-herb-bed', rows: buildCedarHerbBed() },
  { name: 'hanging-drying-herbs', rows: buildHangingDryingHerbs() },
  { name: 'brass-porch-lantern-unlit', rows: buildBrassPorchLantern(false) },
  { name: 'brass-porch-lantern-lit', rows: buildBrassPorchLantern(true) },
  { name: 'shepherds-sanctuary-porch', rows: buildShepherdsSanctuaryPorch() },
  { name: 'waypoint-dormant', rows: buildWaypoint('dormant') },
  { name: 'waypoint-kindling', rows: buildWaypoint('kindling') },
  { name: 'waypoint-bloomed', rows: buildWaypoint('bloomed') },
];

export const SPRITE_SHEET_SPECS = [
  {
    id: 'traveler-michael',
    frameWidth: 16,
    frameHeight: 24,
    columns: 10,
    rows: 1,
    atlasBasename: 'traveler-michael',
    frames: TRAVELER_MICHAEL_FRAMES,
  },
  {
    id: 'keepers-phase1',
    frameWidth: 16,
    frameHeight: 24,
    columns: 4,
    rows: 1,
    atlasBasename: 'keepers-phase1',
    frames: KEEPERS_PHASE1_FRAMES,
  },
  {
    id: 'terrain-tiles-phase1',
    frameWidth: 16,
    frameHeight: 16,
    columns: 6,
    rows: 4,
    atlasBasename: 'terrain-tiles-phase1',
    frames: TERRAIN_TILES_PHASE1,
  },
  {
    id: 'landmarks-phase1',
    frameWidth: 32,
    frameHeight: 32,
    columns: 5,
    rows: 2,
    atlasBasename: 'landmarks-phase1',
    frames: LANDMARKS_PHASE1,
  },
];

/**
 * Pixel-crisp 16x16 inline SVG lens micro-icons (integer pixel rectangles).
 * Shared between `client/public/assets/trail/lens-micro-icons.svg` and
 * `client/src/assets/trail/lensMicroIcons.tsx`.
 */
export const LENS_MICRO_ICON_SPECS = {
  'hoodoo-folk': {
    id: 'icon-hoodoo-folk',
    title: 'Hoodoo & Folk — Herb Sprig',
    rects: [
      // Central hyssop/sage stem
      { x: 7, y: 3, w: 2, h: 11, role: 'primary' },
      // Top crown bud
      { x: 7, y: 1, w: 2, h: 2, role: 'accent' },
      // Upper left & right leaves
      { x: 4, y: 3, w: 3, h: 2, role: 'primary' },
      { x: 3, y: 4, w: 1, h: 1, role: 'primary' },
      { x: 9, y: 3, w: 3, h: 2, role: 'primary' },
      { x: 12, y: 4, w: 1, h: 1, role: 'primary' },
      // Mid left & right leaves
      { x: 3, y: 7, w: 4, h: 2, role: 'primary' },
      { x: 2, y: 8, w: 1, h: 1, role: 'primary' },
      { x: 9, y: 7, w: 4, h: 2, role: 'primary' },
      { x: 13, y: 8, w: 1, h: 1, role: 'primary' },
      // Warm ochre twine binding bow at base
      { x: 5, y: 11, w: 6, h: 2, role: 'accent' },
      { x: 6, y: 13, w: 1, h: 2, role: 'accent' },
      { x: 9, y: 13, w: 1, h: 2, role: 'accent' },
    ],
  },
  'historical-classic': {
    id: 'icon-historical-classic',
    title: 'Historical & Classic — Open Codex',
    rects: [
      // Outer cover edges (left, right, bottom)
      { x: 1, y: 3, w: 1, h: 10, role: 'primary' },
      { x: 14, y: 3, w: 1, h: 10, role: 'primary' },
      { x: 1, y: 12, w: 14, h: 2, role: 'primary' },
      // Top edges of left and right open pages
      { x: 2, y: 2, w: 5, h: 1, role: 'primary' },
      { x: 9, y: 2, w: 5, h: 1, role: 'primary' },
      // Center binding spine
      { x: 7, y: 3, w: 2, h: 10, role: 'primary' },
      // Crisp scripture text bars on left page
      { x: 3, y: 5, w: 3, h: 1, role: 'primary' },
      { x: 3, y: 7, w: 3, h: 1, role: 'primary' },
      { x: 3, y: 9, w: 3, h: 1, role: 'primary' },
      // Crisp scripture text bars on right page
      { x: 10, y: 5, w: 3, h: 1, role: 'primary' },
      { x: 10, y: 7, w: 3, h: 1, role: 'primary' },
      { x: 10, y: 9, w: 3, h: 1, role: 'primary' },
      // Slate-blue illuminated bookmark ribbon hanging at spine bottom
      { x: 7, y: 13, w: 2, h: 2, role: 'accent' },
      { x: 7, y: 15, w: 1, h: 1, role: 'accent' },
    ],
  },
  community: {
    id: 'icon-community',
    title: 'Community r/Bible — Lantern Circle',
    rects: [
      // Ring of welcoming fellowship lantern sparks
      { x: 7, y: 1, w: 2, h: 1, role: 'accent' },
      { x: 2, y: 3, w: 2, h: 2, role: 'accent' },
      { x: 12, y: 3, w: 2, h: 2, role: 'accent' },
      { x: 1, y: 7, w: 1, h: 2, role: 'accent' },
      { x: 14, y: 7, w: 1, h: 2, role: 'accent' },
      { x: 2, y: 11, w: 2, h: 2, role: 'accent' },
      { x: 12, y: 11, w: 2, h: 2, role: 'accent' },
      { x: 7, y: 14, w: 2, h: 1, role: 'accent' },
      // Central brass lantern frame
      { x: 6, y: 3, w: 4, h: 1, role: 'primary' },
      { x: 5, y: 4, w: 6, h: 1, role: 'primary' },
      { x: 5, y: 5, w: 1, h: 6, role: 'primary' },
      { x: 10, y: 5, w: 1, h: 6, role: 'primary' },
      { x: 5, y: 11, w: 6, h: 1, role: 'primary' },
      { x: 6, y: 12, w: 4, h: 1, role: 'primary' },
      // Warm flame core inside lantern
      { x: 7, y: 6, w: 2, h: 4, role: 'accent' },
      { x: 6, y: 7, w: 4, h: 2, role: 'accent' },
    ],
  },
};
