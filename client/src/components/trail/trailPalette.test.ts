import React from 'react';
import { render } from '@testing-library/react';
import {
  MELANIN_SKIN_RAMPS,
  PALETTE_INDEX,
  PALETTE_SIZE,
  TRAIL_PALETTE_DARK,
  TRAIL_PALETTE_LIGHT,
  TRAIL_THEME_TOKENS,
  getTrailPalette,
  getTrailThemeTokens,
  resolvePaletteColor,
} from './trailPalette';
import {
  KEEPERS_PHASE1_SHEET,
  LANDMARKS_PHASE1_SHEET,
  TERRAIN_TILES_PHASE1_SHEET,
  TRAIL_ATLAS_PATHS,
  TRAIL_SPRITE_SHEETS,
  TRAVELER_MICHAEL_SHEET,
  drawPixelMatrixToContext,
  getAtlasPath,
  getSpriteFrame,
  SpriteSheetId,
} from '../../assets/trail/pixelSprites';
import {
  HerbSprigIcon,
  LENS_MICRO_ICONS_SVG_PATH,
  LanternCircleIcon,
  LensMicroIcon,
  OpenCodexIcon,
} from '../../assets/trail/lensMicroIcons';

function parseRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

describe('trailPalette — Dual-Theme LUT & Melanin Ramps', () => {
  it('defines equal-length Light and Dark LUTs with valid hex entries and zero #000000', () => {
    expect(TRAIL_PALETTE_LIGHT).toHaveLength(PALETTE_SIZE);
    expect(TRAIL_PALETTE_DARK).toHaveLength(PALETTE_SIZE);
    expect(TRAIL_PALETTE_LIGHT[0]).toBeNull();
    expect(TRAIL_PALETTE_DARK[0]).toBeNull();

    const hexRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    for (let i = 1; i < PALETTE_SIZE; i += 1) {
      const lightHex = TRAIL_PALETTE_LIGHT[i];
      const darkHex = TRAIL_PALETTE_DARK[i];
      expect(lightHex).toMatch(hexRegex);
      expect(darkHex).toMatch(hexRegex);
      expect((lightHex as string).toUpperCase().startsWith('#000000')).toBe(false);
      expect((darkHex as string).toUpperCase().startsWith('#000000')).toBe(false);
    }
  });

  it('uses warm selective outlines instead of pure black and anchors to App.css tokens', () => {
    expect(resolvePaletteColor(PALETTE_INDEX.OUTLINE_PRIMARY, 'light')).toBe('#1E1916');
    expect(resolvePaletteColor(PALETTE_INDEX.OUTLINE_PRIMARY, 'dark')).toBe('#0D0C0E');

    // App.css Light & Dark anchors
    expect(resolvePaletteColor(PALETTE_INDEX.PARCHMENT_SKY, 'light')).toBe('#F5F3EE');
    expect(resolvePaletteColor(PALETTE_INDEX.PARCHMENT_SKY, 'dark')).toBe('#121214');
    expect(resolvePaletteColor(PALETTE_INDEX.TERRACOTTA_BASE, 'light')).toBe('#B84A39');
    expect(resolvePaletteColor(PALETTE_INDEX.TERRACOTTA_BRIGHT, 'dark')).toBe('#E07A5F');
    expect(resolvePaletteColor(PALETTE_INDEX.BRASS_OCHRE, 'light')).toBe('#8A6A2F');
    expect(resolvePaletteColor(PALETTE_INDEX.BRASS_GOLD, 'dark')).toBe('#D4A359');
    expect(resolvePaletteColor(PALETTE_INDEX.WATER_BASE, 'light')).toBe('#345474');
    expect(resolvePaletteColor(PALETTE_INDEX.WATER_SPARKLE, 'dark')).toBe('#6D9DC5');
    expect(resolvePaletteColor(PALETTE_INDEX.FOLIAGE_BASE, 'light')).toBe('#1F6E38');
    expect(resolvePaletteColor(PALETTE_INDEX.FOLIAGE_LIGHT, 'dark')).toBe('#4ADE80');
    expect(resolvePaletteColor(PALETTE_INDEX.JEANS_BASE, 'light')).toBe('#2B3240');
    expect(resolvePaletteColor(PALETTE_INDEX.IVORY_CREAM, 'light')).toBe('#FAF9F5');

    expect(getTrailThemeTokens('light')).toEqual(TRAIL_THEME_TOKENS.light);
    expect(getTrailThemeTokens('dark')).toEqual(TRAIL_THEME_TOKENS.dark);
    expect(getTrailPalette('light')).toBe(TRAIL_PALETTE_LIGHT);
    expect(getTrailPalette('dark')).toBe(TRAIL_PALETTE_DARK);
    expect(resolvePaletteColor(-1, 'light')).toBeNull();
    expect(resolvePaletteColor(999, 'dark')).toBeNull();
  });

  it('defines 3 dimensional warm 4-step melanin skin ramps with warm undertones in both themes', () => {
    const ramps = Object.values(MELANIN_SKIN_RAMPS);
    expect(ramps).toHaveLength(3);

    expect(MELANIN_SKIN_RAMPS['deep-mahogany']).toMatchObject({
      shadow: '#2D1810',
      base: '#4E2A1B',
      mid: '#6E3E28',
      highlight: '#8F573B',
    });
    expect(MELANIN_SKIN_RAMPS['rich-chestnut']).toMatchObject({
      shadow: '#3F2114',
      base: '#6B3B24',
      mid: '#8E5234',
      highlight: '#B3714D',
    });
    expect(MELANIN_SKIN_RAMPS['warm-amber-bronze']).toMatchObject({
      shadow: '#56301B',
      base: '#854F2E',
      mid: '#AD6D43',
      highlight: '#CE8E5F',
    });

    for (const ramp of ramps) {
      expect(ramp.indices).toHaveLength(4);
      for (const theme of ['light', 'dark'] as const) {
        let prevLuminance = -1;
        for (const idx of ramp.indices) {
          const hex = resolvePaletteColor(idx, theme);
          expect(hex).not.toBeNull();
          const [r, g, b] = parseRgb(hex as string);
          // Warm melanin undertone invariant: red > green > blue (never greyed out / ashy)
          expect(r).toBeGreaterThan(g);
          expect(g).toBeGreaterThan(b);
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          expect(lum).toBeGreaterThan(prevLuminance);
          prevLuminance = lum;
        }
      }
    }
  });
});

describe('pixelSprites — Phase 1 Atlas Dimensions, Frame Counts & Matrix Bounds', () => {
  it('matches exact Phase 1 manifest dimensions and frame counts', () => {
    expect(TRAVELER_MICHAEL_SHEET.frameWidth).toBe(16);
    expect(TRAVELER_MICHAEL_SHEET.frameHeight).toBe(24);
    expect(TRAVELER_MICHAEL_SHEET.frames).toHaveLength(10);
    expect(TRAVELER_MICHAEL_SHEET.sheetWidth).toBe(160);
    expect(TRAVELER_MICHAEL_SHEET.sheetHeight).toBe(24);

    expect(KEEPERS_PHASE1_SHEET.frameWidth).toBe(16);
    expect(KEEPERS_PHASE1_SHEET.frameHeight).toBe(24);
    expect(KEEPERS_PHASE1_SHEET.frames).toHaveLength(4);
    expect(KEEPERS_PHASE1_SHEET.sheetWidth).toBe(64);
    expect(KEEPERS_PHASE1_SHEET.sheetHeight).toBe(24);

    expect(TERRAIN_TILES_PHASE1_SHEET.frameWidth).toBe(16);
    expect(TERRAIN_TILES_PHASE1_SHEET.frameHeight).toBe(16);
    expect(TERRAIN_TILES_PHASE1_SHEET.frames).toHaveLength(24);
    expect(TERRAIN_TILES_PHASE1_SHEET.sheetWidth).toBe(96);
    expect(TERRAIN_TILES_PHASE1_SHEET.sheetHeight).toBe(64);

    expect(LANDMARKS_PHASE1_SHEET.frameWidth).toBe(32);
    expect(LANDMARKS_PHASE1_SHEET.frameHeight).toBe(32);
    expect(LANDMARKS_PHASE1_SHEET.frames).toHaveLength(10);
    expect(LANDMARKS_PHASE1_SHEET.sheetWidth).toBe(160);
    expect(LANDMARKS_PHASE1_SHEET.sheetHeight).toBe(64);
  });

  it('validates matrix dimensions, coordinates, LUT bounds, and non-zero pixel coverage for every frame', () => {
    const sheetIds = Object.keys(TRAIL_SPRITE_SHEETS) as SpriteSheetId[];
    expect(sheetIds).toHaveLength(4);

    for (const sheetId of sheetIds) {
      const sheet = TRAIL_SPRITE_SHEETS[sheetId];
      // Same-origin CSP-safe atlas paths only (zero external URLs)
      expect(getAtlasPath(sheetId, 'light')).toMatch(/^\/assets\/trail\/[a-z0-9-]+-daylight\.png$/);
      expect(getAtlasPath(sheetId, 'dark')).toMatch(/^\/assets\/trail\/[a-z0-9-]+-twilight\.png$/);
      expect(TRAIL_ATLAS_PATHS[sheetId].light).toBe(sheet.atlasPaths.light);
      expect(TRAIL_ATLAS_PATHS[sheetId].dark).toBe(sheet.atlasPaths.dark);

      for (let i = 0; i < sheet.frames.length; i += 1) {
        const frame = sheet.frames[i];
        expect(frame.index).toBe(i);
        expect(frame.width).toBe(sheet.frameWidth);
        expect(frame.height).toBe(sheet.frameHeight);
        expect(frame.x).toBe(frame.col * sheet.frameWidth);
        expect(frame.y).toBe(frame.row * sheet.frameHeight);
        expect(frame.x + frame.width).toBeLessThanOrEqual(sheet.sheetWidth);
        expect(frame.y + frame.height).toBeLessThanOrEqual(sheet.sheetHeight);
        expect(frame.pixels).toHaveLength(sheet.frameHeight);

        let nonZeroCount = 0;
        for (let y = 0; y < frame.pixels.length; y += 1) {
          const row = frame.pixels[y];
          expect(row).toHaveLength(sheet.frameWidth);
          for (let x = 0; x < row.length; x += 1) {
            const idx = row[x];
            expect(Number.isInteger(idx)).toBe(true);
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(PALETTE_SIZE);
            if (idx !== 0) {
              nonZeroCount += 1;
              expect(resolvePaletteColor(idx, 'light')).not.toBeNull();
              expect(resolvePaletteColor(idx, 'dark')).not.toBeNull();
            }
          }
        }
        expect(nonZeroCount).toBeGreaterThan(0);
      }
    }

    expect(TRAIL_ATLAS_PATHS.lensMicroIconsSvg).toBe('/assets/trail/lens-micro-icons.svg');
  });

  it('encodes universal Black melanin ramps and Michael modern casual attire in cast sprites', () => {
    const flatten = (pixels: readonly (readonly number[])[]): Set<number> => {
      const set = new Set<number>();
      for (let y = 0; y < pixels.length; y += 1) {
        for (let x = 0; x < pixels[y].length; x += 1) {
          set.add(pixels[y][x]);
        }
      }
      return set;
    };

    // Michael: Rich Chestnut melanin ramp, terracotta overshirt, tapered slate jeans, sneakers
    for (const frame of TRAVELER_MICHAEL_SHEET.frames) {
      const used = flatten(frame.pixels);
      const chestnutMatches = MELANIN_SKIN_RAMPS['rich-chestnut'].indices.filter((idx) =>
        used.has(idx)
      );
      expect(chestnutMatches.length).toBeGreaterThanOrEqual(2);
      expect(used.has(PALETTE_INDEX.TERRACOTTA_BASE)).toBe(true);
      expect(used.has(PALETTE_INDEX.JEANS_BASE)).toBe(true);
      expect(used.has(PALETTE_INDEX.IVORY_CREAM)).toBe(true);
      expect(used.has(PALETTE_INDEX.OUTLINE_PRIMARY)).toBe(true);
    }

    // Genesis Root-Keeper: Deep Mahogany ramp + ochre headwrap + sage apron
    for (const name of ['genesis-root-keeper-0', 'genesis-root-keeper-1']) {
      const used = flatten(getSpriteFrame('keepers-phase1', name).pixels);
      const mahoganyMatches = MELANIN_SKIN_RAMPS['deep-mahogany'].indices.filter((idx) =>
        used.has(idx)
      );
      expect(mahoganyMatches.length).toBeGreaterThanOrEqual(3);
      expect(used.has(PALETTE_INDEX.BRASS_GOLD)).toBe(true);
      expect(used.has(PALETTE_INDEX.FOLIAGE_SAGE)).toBe(true);
    }

    // Psalms Twilight Psalmist: Warm Amber-Bronze ramp + silver elder hair + cedar/brass harp
    for (const name of ['psalms-twilight-psalmist-0', 'psalms-twilight-psalmist-1']) {
      const used = flatten(getSpriteFrame('keepers-phase1', name).pixels);
      const amberMatches = MELANIN_SKIN_RAMPS['warm-amber-bronze'].indices.filter((idx) =>
        used.has(idx)
      );
      expect(amberMatches.length).toBeGreaterThanOrEqual(3);
      expect(used.has(PALETTE_INDEX.HAIR_SILVER)).toBe(true);
      expect(used.has(PALETTE_INDEX.BRASS_GOLD)).toBe(true);
    }
  });

  it('supports lookup by name/index and deterministic canvas rendering in both themes', () => {
    expect(getSpriteFrame('traveler-michael', 'lantern-raise-1').index).toBe(9);
    expect(getSpriteFrame('traveler-michael', 0).name).toBe('idle-0');
    expect(getSpriteFrame('landmarks-phase1', 'waypoint-bloomed').index).toBe(9);
    expect(() => getSpriteFrame('traveler-michael', 'nonexistent')).toThrow();

    const calls: Array<{ fillStyle: string; x: number; y: number; w: number; h: number }> = [];
    const mockCtxObj = {
      fillStyle: '',
      fillRect(x: number, y: number, w: number, h: number) {
        calls.push({ fillStyle: mockCtxObj.fillStyle, x, y, w, h });
      },
    };
    const mockCtx = mockCtxObj as unknown as CanvasRenderingContext2D;

    const frame = getSpriteFrame('traveler-michael', 'idle-0');
    drawPixelMatrixToContext(mockCtx, frame.pixels, 'light', 10, 20, 2, false);
    expect(calls.length).toBeGreaterThan(100);
    expect(calls.every((c) => c.w === 2 && c.h === 2)).toBe(true);
    expect(calls.some((c) => c.fillStyle === '#1E1916')).toBe(true);
    expect(calls.some((c) => c.fillStyle === '#000000')).toBe(false);

    calls.length = 0;
    drawPixelMatrixToContext(mockCtx, frame.pixels, 'dark', 0, 0, 3, true);
    expect(calls.length).toBeGreaterThan(100);
    expect(calls.some((c) => c.fillStyle === '#0D0C0E')).toBe(true);
  });
});

describe('lensMicroIcons — Crisp 16x16 Inline SVG Micro-Icons', () => {
  it('renders HerbSprigIcon, OpenCodexIcon, and LanternCircleIcon with crisp 16x16 integer rects', () => {
    expect(LENS_MICRO_ICONS_SVG_PATH).toBe('/assets/trail/lens-micro-icons.svg');

    const cases = [
      {
        Component: HerbSprigIcon,
        lens: 'hoodoo-folk' as const,
        label: 'Hoodoo & Folk lens',
      },
      {
        Component: OpenCodexIcon,
        lens: 'historical-classic' as const,
        label: 'Historical & Classic lens',
      },
      {
        Component: LanternCircleIcon,
        lens: 'community' as const,
        label: 'Community r/Bible lens',
      },
    ];

    for (const { Component, lens, label } of cases) {
      // Decorative default (no label/title -> aria-hidden="true")
      const { container: decContainer } = render(React.createElement(Component));
      const decSvg = decContainer.querySelector('svg');
      expect(decSvg).not.toBeNull();
      expect(decSvg?.getAttribute('viewBox')).toBe('0 0 16 16');
      expect(decSvg?.getAttribute('width')).toBe('16');
      expect(decSvg?.getAttribute('height')).toBe('16');
      expect(decSvg?.getAttribute('shape-rendering')).toBe('crispEdges');
      expect(decSvg?.getAttribute('data-lens-icon')).toBe(lens);
      expect(decSvg?.getAttribute('aria-hidden')).toBe('true');

      const rects = decContainer.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThanOrEqual(8);
      rects.forEach((rect) => {
        expect(Number.isInteger(Number(rect.getAttribute('x')))).toBe(true);
        expect(Number.isInteger(Number(rect.getAttribute('y')))).toBe(true);
        expect(Number.isInteger(Number(rect.getAttribute('width')))).toBe(true);
        expect(Number.isInteger(Number(rect.getAttribute('height')))).toBe(true);
      });

      // Accessible labeled mode via LensMicroIcon dispatcher
      const { container: accContainer } = render(
        React.createElement(LensMicroIcon, {
          lens,
          size: 24,
          'aria-label': label,
          title: label,
        })
      );
      const accSvg = accContainer.querySelector('svg');
      expect(accSvg?.getAttribute('role')).toBe('img');
      expect(accSvg?.getAttribute('aria-label')).toBe(label);
      expect(accSvg?.getAttribute('aria-hidden')).toBeNull();
      expect(accSvg?.getAttribute('width')).toBe('24');
      expect(accSvg?.querySelector('title')?.textContent).toBe(label);
      // Zero external URLs anywhere inside the SVG markup (excluding standard SVG xmlns)
      const withoutXmlns = accContainer.innerHTML.replace(
        /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g,
        ''
      );
      expect(withoutXmlns).not.toMatch(/https?:\/\//i);
    }
  });
});
