#!/usr/bin/env node
/**
 * Deterministic 16-Bit Pixel Trail Asset Generator (Typing the Bible v3 Phase 1)
 *
 * Zero external runtime or build dependencies — uses Node.js built-ins only.
 *
 * Outputs:
 *   - client/public/assets/trail/traveler-michael-{daylight,twilight}.png
 *   - client/public/assets/trail/keepers-phase1-{daylight,twilight}.png
 *   - client/public/assets/trail/terrain-tiles-phase1-{daylight,twilight}.png
 *   - client/public/assets/trail/landmarks-phase1-{daylight,twilight}.png
 *   - client/public/assets/trail/lens-micro-icons.svg
 *   - client/src/assets/trail/pixelSprites.ts
 *
 * Run from repository root:
 *   node scripts/trail-assets/generate-trail-assets.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeIndexedPng } from './pngEncoder.mjs';
import {
  LENS_MICRO_ICON_SPECS,
  PALETTE_DARK,
  PALETTE_LIGHT,
  SPRITE_SHEET_SPECS,
  parseArtGrid,
} from './spriteDefinitions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const PUBLIC_ASSETS_DIR = resolve(REPO_ROOT, 'client', 'public', 'assets', 'trail');
const SRC_SPRITES_PATH = resolve(REPO_ROOT, 'client', 'src', 'assets', 'trail', 'pixelSprites.ts');
const PALETTE_TS_PATH = resolve(REPO_ROOT, 'client', 'src', 'components', 'trail', 'trailPalette.ts');

function assertPaletteIntegrity() {
  if (PALETTE_LIGHT.length !== PALETTE_DARK.length) {
    throw new Error(
      `Light palette length (${PALETTE_LIGHT.length}) !== Dark palette length (${PALETTE_DARK.length})`
    );
  }
  for (const [label, palette] of [
    ['light', PALETTE_LIGHT],
    ['dark', PALETTE_DARK],
  ]) {
    if (palette[0] !== null) {
      throw new Error(`${label} palette index 0 must be null (transparent)`);
    }
    for (let i = 1; i < palette.length; i += 1) {
      const hex = palette[i];
      if (typeof hex !== 'string' || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex)) {
        throw new Error(`Invalid hex color in ${label} palette at index ${i}: ${String(hex)}`);
      }
      if (hex.toUpperCase().startsWith('#000000')) {
        throw new Error(
          `Forbidden pure #000000 detected in ${label} palette at index ${i} (use warm selective outlines)`
        );
      }
    }
  }

  // Verify trailPalette.ts stays in exact sync with spriteDefinitions.mjs
  const paletteTs = readFileSync(PALETTE_TS_PATH, 'utf8');
  for (const color of [...PALETTE_LIGHT, ...PALETTE_DARK]) {
    if (color !== null && !paletteTs.includes(`'${color}'`)) {
      throw new Error(
        `Palette color ${color} missing from client/src/components/trail/trailPalette.ts — keep LUTs synchronized!`
      );
    }
  }
}

function buildSheetPixels(spec) {
  const { id, frameWidth, frameHeight, columns, rows, frames } = spec;
  const expectedFrames = columns * rows;
  if (frames.length !== expectedFrames) {
    throw new Error(
      `Sheet "${id}" expected ${expectedFrames} frames (${columns}x${rows}), got ${frames.length}`
    );
  }

  const sheetWidth = frameWidth * columns;
  const sheetHeight = frameHeight * rows;
  const sheetBuffer = new Uint8Array(sheetWidth * sheetHeight);
  const parsedFrames = [];

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const ox = col * frameWidth;
    const oy = row * frameHeight;
    const matrix = parseArtGrid(`${id}:${frame.name}`, frameWidth, frameHeight, frame.rows);

    let nonTransparent = 0;
    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const idx = matrix[y][x];
        if (idx < 0 || idx >= PALETTE_LIGHT.length) {
          throw new Error(`Index ${idx} out of bounds in ${id}:${frame.name}`);
        }
        if (idx !== 0) {
          nonTransparent += 1;
        }
        sheetBuffer[(oy + y) * sheetWidth + (ox + x)] = idx;
      }
    }

    if (nonTransparent === 0) {
      throw new Error(`Frame ${id}:${frame.name} has 0 non-transparent pixels`);
    }

    parsedFrames.push({
      id: `${id}/${frame.name}`,
      name: frame.name,
      index,
      col,
      row,
      x: ox,
      y: oy,
      width: frameWidth,
      height: frameHeight,
      pixels: matrix,
    });
  }

  return {
    id,
    frameWidth,
    frameHeight,
    columns,
    rows,
    sheetWidth,
    sheetHeight,
    atlasPaths: {
      light: `/assets/trail/${spec.atlasBasename}-daylight.png`,
      dark: `/assets/trail/${spec.atlasBasename}-twilight.png`,
    },
    buffer: sheetBuffer,
    frames: parsedFrames,
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLensMicroIconsSvg() {
  const entries = [
    { key: 'hoodoo-folk', xOffset: 0, primary: '#1F6E38', accent: '#8A6A2F' },
    { key: 'historical-classic', xOffset: 16, primary: '#1E1916', accent: '#345474' },
    { key: 'community', xOffset: 32, primary: '#8A6A2F', accent: '#B84A39' },
  ];

  const symbols = entries.map(({ key, primary, accent }) => {
    const spec = LENS_MICRO_ICON_SPECS[key];
    const rectsXml = spec.rects
      .map(
        (r) =>
          `      <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${
            r.role === 'accent' ? accent : primary
          }" />`
      )
      .join('\n');
    return `    <symbol id="${spec.id}" viewBox="0 0 16 16" shape-rendering="crispEdges">
      <title>${escapeXml(spec.title)}</title>
${rectsXml}
    </symbol>`;
  });

  const uses = entries
    .map(({ key, xOffset }) => {
      const spec = LENS_MICRO_ICON_SPECS[key];
      return `  <use href="#${spec.id}" x="${xOffset}" y="0" width="16" height="16" />`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16" viewBox="0 0 48 16" shape-rendering="crispEdges" role="img" aria-label="Companion Lens Micro-Icons: Hoodoo &amp; Folk, Historical &amp; Classic, Community">
  <defs>
${symbols.join('\n')}
  </defs>
${uses}
</svg>
`;
}

function formatMatrixTs(pixels) {
  const rows = pixels.map((r) => `        [${r.join(', ')}]`);
  return `[\n${rows.join(',\n')},\n      ]`;
}

function formatSheetTs(sheet, constName) {
  const framesTs = sheet.frames
    .map(
      (f) => `    {
      id: '${f.id}',
      name: '${f.name}',
      index: ${f.index},
      col: ${f.col},
      row: ${f.row},
      x: ${f.x},
      y: ${f.y},
      width: ${f.width},
      height: ${f.height},
      pixels: ${formatMatrixTs(f.pixels)},
    }`
    )
    .join(',\n');

  return `export const ${constName}: SpriteSheetMeta = {
  id: '${sheet.id}',
  frameWidth: ${sheet.frameWidth},
  frameHeight: ${sheet.frameHeight},
  columns: ${sheet.columns},
  rows: ${sheet.rows},
  sheetWidth: ${sheet.sheetWidth},
  sheetHeight: ${sheet.sheetHeight},
  atlasPaths: {
    light: '${sheet.atlasPaths.light}',
    dark: '${sheet.atlasPaths.dark}',
  },
  frames: [
${framesTs},
  ],
};`;
}

function buildPixelSpritesTs(builtSheets) {
  const byId = Object.fromEntries(builtSheets.map((s) => [s.id, s]));

  return `/**
 * AUTO-GENERATED BY scripts/trail-assets/generate-trail-assets.mjs
 * Do not edit manually; update scripts/trail-assets/spriteDefinitions.mjs
 * and re-run \`node scripts/trail-assets/generate-trail-assets.mjs\`.
 *
 * Provides the typed Phase 1 16-bit sprite catalog, pre-baked Daylight &
 * Twilight atlas paths, exact frame coordinates, and indexed pixel matrices
 * so \`<BiomeCanvas />\` and Jest/jsdom tests can inspect or render every sprite
 * deterministically with zero external image URLs.
 */

import {
  TrailTheme,
  getTrailPalette,
} from '../../components/trail/trailPalette';

export type PixelMatrix = readonly (readonly number[])[];

export type SpriteSheetId =
  | 'traveler-michael'
  | 'keepers-phase1'
  | 'terrain-tiles-phase1'
  | 'landmarks-phase1';

export interface SpriteFrameMeta {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly col: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: PixelMatrix;
}

export interface SpriteSheetMeta {
  readonly id: SpriteSheetId;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly atlasPaths: Readonly<Record<TrailTheme, string>>;
  readonly frames: readonly SpriteFrameMeta[];
}

export const TRAIL_ATLAS_PATHS: Readonly<
  Record<SpriteSheetId, Readonly<Record<TrailTheme, string>>>
> & { readonly lensMicroIconsSvg: string } = {
  'traveler-michael': {
    light: '/assets/trail/traveler-michael-daylight.png',
    dark: '/assets/trail/traveler-michael-twilight.png',
  },
  'keepers-phase1': {
    light: '/assets/trail/keepers-phase1-daylight.png',
    dark: '/assets/trail/keepers-phase1-twilight.png',
  },
  'terrain-tiles-phase1': {
    light: '/assets/trail/terrain-tiles-phase1-daylight.png',
    dark: '/assets/trail/terrain-tiles-phase1-twilight.png',
  },
  'landmarks-phase1': {
    light: '/assets/trail/landmarks-phase1-daylight.png',
    dark: '/assets/trail/landmarks-phase1-twilight.png',
  },
  lensMicroIconsSvg: '/assets/trail/lens-micro-icons.svg',
};

${formatSheetTs(byId['traveler-michael'], 'TRAVELER_MICHAEL_SHEET')}

${formatSheetTs(byId['keepers-phase1'], 'KEEPERS_PHASE1_SHEET')}

${formatSheetTs(byId['terrain-tiles-phase1'], 'TERRAIN_TILES_PHASE1_SHEET')}

${formatSheetTs(byId['landmarks-phase1'], 'LANDMARKS_PHASE1_SHEET')}

export const TRAIL_SPRITE_SHEETS: Readonly<Record<SpriteSheetId, SpriteSheetMeta>> = {
  'traveler-michael': TRAVELER_MICHAEL_SHEET,
  'keepers-phase1': KEEPERS_PHASE1_SHEET,
  'terrain-tiles-phase1': TERRAIN_TILES_PHASE1_SHEET,
  'landmarks-phase1': LANDMARKS_PHASE1_SHEET,
};

export function getAtlasPath(sheetId: SpriteSheetId, theme: TrailTheme): string {
  return TRAIL_SPRITE_SHEETS[sheetId].atlasPaths[theme];
}

export function getSpriteFrame(
  sheetId: SpriteSheetId,
  nameOrIndex: string | number
): SpriteFrameMeta {
  const sheet = TRAIL_SPRITE_SHEETS[sheetId];
  const frame =
    typeof nameOrIndex === 'number'
      ? sheet.frames[nameOrIndex]
      : sheet.frames.find((f) => f.name === nameOrIndex);
  if (!frame) {
    throw new Error(
      \`Sprite frame "\${String(nameOrIndex)}" not found in sheet "\${sheetId}"\`
    );
  }
  return frame;
}

/**
 * Deterministic direct-matrix renderer onto a 2D canvas context.
 * Useful as an instant zero-latency fallback before pre-baked PNGs load
 * and in jsdom unit tests.
 */
export function drawPixelMatrixToContext(
  ctx: CanvasRenderingContext2D,
  pixels: PixelMatrix,
  theme: TrailTheme,
  dx: number,
  dy: number,
  scale = 1,
  flipX = false
): void {
  const palette = getTrailPalette(theme);
  const height = pixels.length;
  if (height === 0) return;
  const width = pixels[0].length;
  const pxScale = Math.max(1, Math.floor(scale));

  for (let y = 0; y < height; y += 1) {
    const row = pixels[y];
    for (let x = 0; x < width; x += 1) {
      const idx = row[x];
      if (idx === 0) continue;
      const color = palette[idx];
      if (!color) continue;
      const drawX = flipX ? dx + (width - 1 - x) * pxScale : dx + x * pxScale;
      ctx.fillStyle = color;
      ctx.fillRect(drawX, dy + y * pxScale, pxScale, pxScale);
    }
  }
}
`;
}

function main() {
  assertPaletteIntegrity();
  mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
  mkdirSync(dirname(SRC_SPRITES_PATH), { recursive: true });

  const builtSheets = SPRITE_SHEET_SPECS.map(buildSheetPixels);

  for (const sheet of builtSheets) {
    const daylightPng = encodeIndexedPng(
      sheet.sheetWidth,
      sheet.sheetHeight,
      sheet.buffer,
      PALETTE_LIGHT
    );
    const twilightPng = encodeIndexedPng(
      sheet.sheetWidth,
      sheet.sheetHeight,
      sheet.buffer,
      PALETTE_DARK
    );

    const daylightPath = resolve(PUBLIC_ASSETS_DIR, `${sheet.id}-daylight.png`);
    const twilightPath = resolve(PUBLIC_ASSETS_DIR, `${sheet.id}-twilight.png`);
    writeFileSync(daylightPath, daylightPng);
    writeFileSync(twilightPath, twilightPng);

    console.log(
      `[trail-assets] ${sheet.id}: ${sheet.sheetWidth}x${sheet.sheetHeight} (${sheet.frames.length} frames @ ${sheet.frameWidth}x${sheet.frameHeight}) -> daylight ${daylightPng.length}B, twilight ${twilightPng.length}B`
    );
  }

  const svgContent = buildLensMicroIconsSvg();
  const svgPath = resolve(PUBLIC_ASSETS_DIR, 'lens-micro-icons.svg');
  writeFileSync(svgPath, svgContent, 'utf8');
  console.log(`[trail-assets] lens-micro-icons.svg -> ${Buffer.byteLength(svgContent)}B`);

  const tsContent = buildPixelSpritesTs(builtSheets);
  writeFileSync(SRC_SPRITES_PATH, tsContent, 'utf8');
  console.log(`[trail-assets] pixelSprites.ts -> ${Buffer.byteLength(tsContent)}B`);
}

main();
