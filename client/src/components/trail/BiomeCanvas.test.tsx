import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  CANONICAL_TOTAL_BOOKS,
  CANONICAL_TOTAL_CHAPTERS,
  GENESIS_TRAIL_LEGS,
  PHASE1_ACTIVE_BOOKS,
  PSALMS_TRAIL_LEGS,
  TRAIL_BIOME_CATALOG,
  findClearingForChapter,
  findLegForChapter,
  getBiomeBookMeta,
  getBiomeById,
  getBiomeForBook,
  getTrailClearingsForBook,
  getTrailLegsForBook,
} from '../../data/trailBiomes';
import {
  TRAIL_LOGICAL_HEIGHT,
  TRAIL_LOGICAL_WIDTH,
  buildClearingSegment,
  buildClearingSegmentForChapter,
  computeIntegerScale,
  getAllClearingSegmentsForBook,
} from './trailLayouts';
import {
  ANIMATION_FRAME_INTERVAL_MS,
  BiomeCanvas,
  BiomeCanvasChapter,
  HD_BACKDROP_PATHS,
  HD_SPRITE_PATHS,
  buildBiomeCanvasAriaLabel,
  clearBiomeCanvasImageCache,
} from './BiomeCanvas';

interface MockCanvasCall {
  readonly fillStyle: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface MockCanvasContextTracker {
  ctx: CanvasRenderingContext2D;
  fillCalls: MockCanvasCall[];
  imageSmoothingAssignments: boolean[];
  reset: () => void;
}

function createMockCanvasContext(): MockCanvasContextTracker {
  const fillCalls: MockCanvasCall[] = [];
  const imageSmoothingAssignments: boolean[] = [];
  let currentFillStyle = '';
  let currentSmoothing = true;

  const mock = {
    globalAlpha: 1,
    get fillStyle() {
      return currentFillStyle;
    },
    set fillStyle(val: string) {
      currentFillStyle = val;
    },
    get imageSmoothingEnabled() {
      return currentSmoothing;
    },
    set imageSmoothingEnabled(val: boolean) {
      currentSmoothing = val;
      imageSmoothingAssignments.push(val);
    },
    fillRect(x: number, y: number, w: number, h: number) {
      fillCalls.push({ fillStyle: currentFillStyle, x, y, w, h });
    },
    drawImage: jest.fn(),
  };

  return {
    ctx: mock as unknown as CanvasRenderingContext2D,
    fillCalls,
    imageSmoothingAssignments,
    reset() {
      fillCalls.length = 0;
      imageSmoothingAssignments.length = 0;
    },
  };
}

function installMatchMediaMock(options: {
  prefersReducedMotion?: boolean;
  prefersDark?: boolean;
  useLegacyListener?: boolean;
}) {
  const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
  let reduced = Boolean(options.prefersReducedMotion);
  let dark = Boolean(options.prefersDark);

  const mockFn = jest.fn((query: string) => {
    const isReducedQuery = query.includes('prefers-reduced-motion');
    const isDarkQuery = query.includes('prefers-color-scheme: dark');

    if (!listeners.has(query)) {
      listeners.set(query, new Set());
    }
    const queryListeners = listeners.get(query)!;

    const mql: Partial<MediaQueryList> = {
      media: query,
      get matches() {
        if (isReducedQuery) return reduced;
        if (isDarkQuery) return dark;
        return false;
      },
      onchange: null,
      dispatchEvent: jest.fn(),
    };

    if (options.useLegacyListener) {
      mql.addListener = jest.fn((cb: (e: MediaQueryListEvent) => void) => {
        queryListeners.add(cb);
      });
      mql.removeListener = jest.fn((cb: (e: MediaQueryListEvent) => void) => {
        queryListeners.delete(cb);
      });
    } else {
      mql.addEventListener = jest.fn((_evt: string, cb: EventListenerOrEventListenerObject) => {
        if (typeof cb === 'function') {
          queryListeners.add(cb as (e: MediaQueryListEvent) => void);
        }
      });
      mql.removeEventListener = jest.fn(
        (_evt: string, cb: EventListenerOrEventListenerObject) => {
          if (typeof cb === 'function') {
            queryListeners.delete(cb as (e: MediaQueryListEvent) => void);
          }
        }
      );
    }

    return mql as MediaQueryList;
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mockFn,
  });

  return {
    mockFn,
    setReducedMotion(next: boolean) {
      reduced = next;
      listeners.forEach((set, query) => {
        if (query.includes('prefers-reduced-motion')) {
          set.forEach((cb) => cb({ matches: next, media: query } as MediaQueryListEvent));
        }
      });
    },
    setDarkMode(next: boolean) {
      dark = next;
      listeners.forEach((set, query) => {
        if (query.includes('prefers-color-scheme: dark')) {
          set.forEach((cb) => cb({ matches: next, media: query } as MediaQueryListEvent));
        }
      });
    },
  };
}

describe('trailBiomes — 9 Canonical Biomes, 73 WEB Books & Genesis/Psalms Clearings', () => {
  it('mirrors all 9 canonical biomes, 73 WEB Catholic books, and 1,328 chapters with zero duplicates', () => {
    expect(TRAIL_BIOME_CATALOG).toHaveLength(9);
    expect(CANONICAL_TOTAL_BOOKS).toBe(73);
    expect(CANONICAL_TOTAL_CHAPTERS).toBe(1328);

    expect(TRAIL_BIOME_CATALOG.map((b) => b.biomeId)).toEqual([
      'eden-root-garden',
      'red-clay-kingdoms',
      'twilight-shepherds-sanctuary',
      'elders-timber-study',
      'watchmans-ridge',
      'crossroads-lanterns',
      'deuterocanonical-groves',
      'galilean-harbor',
      'epistle-post-roads',
    ]);
    expect(TRAIL_BIOME_CATALOG.map((b) => b.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const seenBooks = new Set<string>();
    const seenSectionKeys = new Set<string>();
    const activeBooks: string[] = [];

    for (const biome of TRAIL_BIOME_CATALOG) {
      expect(getBiomeById(biome.biomeId)).toBe(biome);
      for (const bookDef of biome.books) {
        expect(seenBooks.has(bookDef.book)).toBe(false);
        expect(seenSectionKeys.has(bookDef.sectionKey)).toBe(false);
        seenBooks.add(bookDef.book);
        seenSectionKeys.add(bookDef.sectionKey);

        expect(bookDef.sectionKey).toMatch(/^[0-9A-Z]{3}$/);
        expect(bookDef.canonicalChapters).toBeGreaterThanOrEqual(1);
        expect(bookDef.landmarkName.length).toBeGreaterThan(0);
        expect(getBiomeBookMeta(bookDef.book)).toEqual(bookDef);
        expect(getBiomeForBook(bookDef.book)).toBe(biome);

        if (bookDef.phase1Active) {
          activeBooks.push(bookDef.book);
        }
      }
    }

    expect(seenBooks.size).toBe(73);
    expect(seenSectionKeys.size).toBe(73);
    expect(activeBooks).toEqual(['Genesis', 'Psalms']);
    expect(Array.from(PHASE1_ACTIVE_BOOKS)).toEqual(['Genesis', 'Psalms']);
  });

  it('covers Genesis chapters 1..50 across 5 contiguous Trail Legs with zero gaps or duplicates', () => {
    expect(GENESIS_TRAIL_LEGS).toHaveLength(5);
    expect(getTrailLegsForBook('Genesis')).toHaveLength(5);

    const expectedRanges: Array<[number, number]> = [
      [1, 10],
      [11, 20],
      [21, 30],
      [31, 40],
      [41, 50],
    ];

    const coveredChapters: number[] = [];
    GENESIS_TRAIL_LEGS.forEach((leg, idx) => {
      expect([leg.startChapter, leg.endChapter]).toEqual(expectedRanges[idx]);
      expect(leg.clearings).toHaveLength(1);
      for (let ch = leg.startChapter; ch <= leg.endChapter; ch += 1) {
        coveredChapters.push(ch);
      }
    });

    expect(coveredChapters).toHaveLength(50);
    expect(coveredChapters).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));

    expect(findLegForChapter('Genesis', 25).legId).toBe('gen-leg-3');
    expect(findClearingForChapter('Genesis', 50).clearingId).toBe('gen-leg-5');
  });

  it('covers Psalms 1..150 across the 5 Classical Psalter Books and scenic clearings (<= 15 posts each)', () => {
    expect(PSALMS_TRAIL_LEGS).toHaveLength(5);
    expect(PSALMS_TRAIL_LEGS.map((l) => [l.startChapter, l.endChapter])).toEqual([
      [1, 41],
      [42, 72],
      [73, 89],
      [90, 106],
      [107, 150],
    ]);

    const allClearings = getTrailClearingsForBook('Psalms');
    expect(allClearings.length).toBeGreaterThanOrEqual(10);

    const coveredPsalms: number[] = [];
    const clearingIds = new Set<string>();

    for (const clearing of allClearings) {
      expect(clearingIds.has(clearing.clearingId)).toBe(false);
      clearingIds.add(clearing.clearingId);

      const count = clearing.endChapter - clearing.startChapter + 1;
      expect(count).toBeGreaterThanOrEqual(8);
      expect(count).toBeLessThanOrEqual(15);

      for (let ps = clearing.startChapter; ps <= clearing.endChapter; ps += 1) {
        coveredPsalms.push(ps);
      }
    }

    expect(coveredPsalms).toHaveLength(150);
    expect(coveredPsalms).toEqual(Array.from({ length: 150 }, (_, i) => i + 1));

    // Verify Book I Psalm 23 and Book V Psalm 119 resolve cleanly
    expect(findLegForChapter('Psalms', 23).legId).toBe('psa-book-1');
    expect(findClearingForChapter('Psalms', 23).clearingId).toBe('psa-book-1-c2');
    expect(findLegForChapter('Psalms', 119).legId).toBe('psa-book-5');
    expect(findClearingForChapter('Psalms', 119).clearingId).toBe('psa-book-5-c2');
  });
});

describe('trailLayouts — Logical ViewBox, Waypoint Geometry & Integer Scaling', () => {
  it('generates distinct Genesis and Psalms layouts with bounded percentage coordinates and non-overlapping waypoints', () => {
    const genSeg = buildClearingSegment('Genesis', 'gen-leg-1');
    const psaSeg = buildClearingSegmentForChapter('Psalms', 23);

    expect(genSeg.logicalWidth).toBe(TRAIL_LOGICAL_WIDTH);
    expect(genSeg.logicalHeight).toBe(TRAIL_LOGICAL_HEIGHT);
    expect(genSeg.scene.variant).toBe('eden-root-garden');
    expect(genSeg.scene.pathTile).toBe('red-clay-path-straight');
    expect(genSeg.scene.keeperPlacement.framePrefix).toBe('genesis-root-keeper');

    expect(psaSeg.scene.variant).toBe('twilight-shepherds-sanctuary');
    expect(psaSeg.scene.pathTile).toBe('mossy-stone-path');
    expect(psaSeg.scene.hasCreek).toBe(true);
    expect(psaSeg.scene.hasCedarPorch).toBe(true);
    expect(psaSeg.scene.keeperPlacement.framePrefix).toBe('psalms-twilight-psalmist');

    for (const seg of [genSeg, psaSeg]) {
      expect(seg.pathSamples.length).toBeGreaterThan(20);
      for (let i = 0; i < seg.waypoints.length; i += 1) {
        const wp = seg.waypoints[i];
        expect(wp.x).toBeGreaterThanOrEqual(20);
        expect(wp.x).toBeLessThanOrEqual(TRAIL_LOGICAL_WIDTH - 20);
        expect(wp.y).toBeGreaterThanOrEqual(60);
        expect(wp.y).toBeLessThanOrEqual(TRAIL_LOGICAL_HEIGHT - 20);
        expect(wp.xPct).toBeGreaterThan(0);
        expect(wp.xPct).toBeLessThan(100);
        expect(wp.yPct).toBeGreaterThan(0);
        expect(wp.yPct).toBeLessThan(100);

        if (i > 0) {
          const prev = seg.waypoints[i - 1];
          // Serpentine left-to-right flow with comfortable spacing between lantern posts
          expect(wp.x).toBeGreaterThan(prev.x);
          expect(Math.hypot(wp.x - prev.x, wp.y - prev.y)).toBeGreaterThanOrEqual(16);
        }
      }
    }

    // All 10 Story-Arc clearings across Genesis (5) and Psalms (5 Psalter Books -> 14 segments) build cleanly
    const allGenesis = getAllClearingSegmentsForBook('Genesis');
    const allPsalms = getAllClearingSegmentsForBook('Psalms');
    expect(allGenesis).toHaveLength(5);
    expect(allPsalms).toHaveLength(14);

    expect(allGenesis.map((s) => s.scene.variant)).toEqual([
      'eden-root-garden',
      'abrahams-oaks',
      'bethel-ladder-homestead',
      'joseph-granary-ridge',
      'goshen-river-porch',
    ]);

    expect(
      Array.from(new Set(allPsalms.map((s) => s.scene.variant)))
    ).toEqual([
      'twilight-shepherds-sanctuary',
      'mountain-brook-cedars',
      'asaph-watchfire-harp',
      'ancient-hyssop-porch',
      'hallelujah-starlit-courtyard',
    ]);

    for (const seg of [...allGenesis, ...allPsalms]) {
      expect(seg.storyTitle.length).toBeGreaterThan(0);
      expect(seg.storyMotif.length).toBeGreaterThan(0);
      expect(seg.scene.yardHotspots.map((h) => h.id)).toEqual([
        'bottle-tree',
        'herb-rack',
        'river-cairn',
        'elder-keeper',
      ]);
      for (let i = 0; i < seg.waypoints.length; i += 1) {
        const wp = seg.waypoints[i];
        expect(wp.x).toBeGreaterThanOrEqual(20);
        expect(wp.x).toBeLessThanOrEqual(TRAIL_LOGICAL_WIDTH - 20);
        expect(wp.y).toBeGreaterThanOrEqual(60);
        expect(wp.y).toBeLessThanOrEqual(TRAIL_LOGICAL_HEIGHT - 20);
        if (i > 0) {
          const prev = seg.waypoints[i - 1];
          expect(wp.x).toBeGreaterThan(prev.x);
          expect(Math.hypot(wp.x - prev.x, wp.y - prev.y)).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });

  it('computes clean integer pixel scales (2, 3, or 4) on the 640x360 HD logical grid', () => {
    expect(computeIntegerScale(640, 1)).toBe(2);
    expect(computeIntegerScale(960, 2)).toBe(3);
    expect(computeIntegerScale(1920, 1)).toBe(3);
    expect(computeIntegerScale(1200, 2)).toBe(4);
    expect(computeIntegerScale(1280, 2)).toBe(4);
    expect(computeIntegerScale(0, 1)).toBe(2);
  });
});

describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  const ReducedMotionProbe: React.FC = () => {
    const reduced = useReducedMotion();
    return <span data-testid="reduced-motion-value">{String(reduced)}</span>;
  };

  it('safely returns false when window.matchMedia is undefined', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    render(<ReducedMotionProbe />);
    expect(screen.getByTestId('reduced-motion-value').textContent).toBe('false');
  });

  it('reads initial prefers-reduced-motion value and updates live on change events', () => {
    const mm = installMatchMediaMock({ prefersReducedMotion: true });
    render(<ReducedMotionProbe />);
    expect(screen.getByTestId('reduced-motion-value').textContent).toBe('true');

    act(() => {
      mm.setReducedMotion(false);
    });
    expect(screen.getByTestId('reduced-motion-value').textContent).toBe('false');
  });

  it('supports legacy MediaQueryList addListener/removeListener fallback', () => {
    const mm = installMatchMediaMock({
      prefersReducedMotion: false,
      useLegacyListener: true,
    });
    const { unmount } = render(<ReducedMotionProbe />);
    expect(screen.getByTestId('reduced-motion-value').textContent).toBe('false');

    act(() => {
      mm.setReducedMotion(true);
    });
    expect(screen.getByTestId('reduced-motion-value').textContent).toBe('true');
    unmount();
  });
});

describe('<BiomeCanvas /> — JSDOM Rendering, Theme Reactivity & Reduced Motion', () => {
  const originalMatchMedia = window.matchMedia;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;

  const samplePsalmsChapters: BiomeCanvasChapter[] = [
    { chapter: 1, totalVerses: 6, completedVerses: 6, state: 'bloomed', hasCompanion: true },
    { chapter: 2, totalVerses: 12, completedVerses: 12, state: 'bloomed', hasCompanion: true },
    { chapter: 3, totalVerses: 8, completedVerses: 4, state: 'in_progress', hasCompanion: true },
    { chapter: 4, totalVerses: 8, completedVerses: 0, state: 'dormant', hasCompanion: true },
  ];

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('guards cleanly when canvas.getContext("2d") returns null in JSDOM', () => {
    installMatchMediaMock({ prefersReducedMotion: true });
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as unknown as typeof originalGetContext;

    render(
      <ThemeProvider>
        <BiomeCanvas
          book="Genesis"
          clearingId="gen-leg-1"
          chapters={[{ chapter: 1, totalVerses: 31, completedVerses: 31, state: 'bloomed' }]}
          activeChapter={1}
        />
      </ThemeProvider>
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas.getAttribute('aria-label')).toContain('Genesis Ch. 1–10 trail clearing');
    expect(canvas.getAttribute('aria-label')).toContain('1 of 10 chapters bloomed');
  });

  it('configures integer backing dimensions, disables imageSmoothing, sets pixelated CSS, and renders all visual states + book mastery', () => {
    installMatchMediaMock({ prefersReducedMotion: true });
    const tracker = createMockCanvasContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => tracker.ctx
    ) as unknown as typeof originalGetContext;

    const onLayoutResolved = jest.fn();

    render(
      <ThemeProvider>
        <BiomeCanvas
          book="Psalms"
          clearingId="psa-book-1-c1"
          chapters={samplePsalmsChapters}
          activeChapter={3}
          selectedChapter={2}
          bookMastered
          scaleOverride={3}
          onLayoutResolved={onLayoutResolved}
        />
      </ThemeProvider>
    );

    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas.width).toBe(TRAIL_LOGICAL_WIDTH * 3);
    expect(canvas.height).toBe(TRAIL_LOGICAL_HEIGHT * 3);
    expect(canvas.style.imageRendering).toBe('pixelated');
    expect(canvas.getAttribute('aria-label')).toBe(
      buildBiomeCanvasAriaLabel(
        buildClearingSegment('Psalms', 'psa-book-1-c1'),
        samplePsalmsChapters,
        true
      )
    );
    expect(canvas.getAttribute('aria-label')).toContain('2 of 14 chapters bloomed');
    expect(canvas.getAttribute('aria-label')).toContain('1 in progress');
    expect(canvas.getAttribute('aria-label')).toContain('book mastered');

    expect(tracker.imageSmoothingAssignments.length).toBeGreaterThan(0);
    expect(tracker.imageSmoothingAssignments.every((v) => v === false)).toBe(true);
    expect(tracker.fillCalls.length).toBeGreaterThan(200);
    // Warm editorial light palette sky + espresso outline (never pure #000000)
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#F5F3EE')).toBe(true);
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#1E1916')).toBe(true);
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#000000')).toBe(false);
    expect(onLayoutResolved).toHaveBeenCalledTimes(1);
    expect(onLayoutResolved.mock.calls[0][0].waypoints).toHaveLength(14);
  });

  it('redraws immediately with Lantern Twilight LUT when ThemeContext switches Light -> Dark', () => {
    installMatchMediaMock({ prefersReducedMotion: true, prefersDark: false });
    const tracker = createMockCanvasContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => tracker.ctx
    ) as unknown as typeof originalGetContext;

    const ThemeHarness: React.FC = () => {
      const { toggleTheme, resolvedTheme } = useTheme();
      return (
        <div>
          <button type="button" onClick={toggleTheme}>
            Switch Theme ({resolvedTheme})
          </button>
          <BiomeCanvas
            book="Genesis"
            clearingId="gen-leg-1"
            chapters={[
              { chapter: 1, totalVerses: 31, completedVerses: 31, state: 'bloomed' },
              { chapter: 2, totalVerses: 25, completedVerses: 10, state: 'in_progress' },
            ]}
            activeChapter={2}
            scaleOverride={2}
          />
        </div>
      );
    };

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    // Light theme (Golden-Hour Daylight)
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#F5F3EE')).toBe(true);
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#121214')).toBe(false);

    tracker.reset();
    fireEvent.click(screen.getByRole('button', { name: /Switch Theme/i }));

    // Dark theme (Lantern Twilight) painted immediately with zero reload
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#121214')).toBe(true);
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#0D0C0E')).toBe(true);
    expect(tracker.fillCalls.some((c) => c.fillStyle === '#F5F3EE')).toBe(false);
  });

  it('NEVER calls requestAnimationFrame when prefers-reduced-motion: reduce is active', () => {
    installMatchMediaMock({ prefersReducedMotion: true });
    const tracker = createMockCanvasContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => tracker.ctx
    ) as unknown as typeof originalGetContext;

    const rafSpy = jest.fn(() => 42);
    const cancelRafSpy = jest.fn();
    window.requestAnimationFrame = rafSpy;
    window.cancelAnimationFrame = cancelRafSpy;

    const { rerender } = render(
      <ThemeProvider>
        <BiomeCanvas
          book="Genesis"
          clearingId="gen-leg-1"
          chapters={[{ chapter: 1, totalVerses: 31, completedVerses: 15, state: 'in_progress' }]}
          activeChapter={1}
          scaleOverride={2}
        />
      </ThemeProvider>
    );

    expect(rafSpy).not.toHaveBeenCalled();
    expect(tracker.fillCalls.length).toBeGreaterThan(200);

    // Prop update still triggers a crisp static redraw without starting rAF
    tracker.reset();
    rerender(
      <ThemeProvider>
        <BiomeCanvas
          book="Genesis"
          clearingId="gen-leg-1"
          chapters={[{ chapter: 1, totalVerses: 31, completedVerses: 31, state: 'bloomed' }]}
          activeChapter={1}
          scaleOverride={2}
        />
      </ThemeProvider>
    );

    expect(rafSpy).not.toHaveBeenCalled();
    expect(tracker.fillCalls.length).toBeGreaterThan(200);
  });

  it('runs throttled requestAnimationFrame when motion is allowed, pauses on document hidden, and cancels cleanly on unmount', () => {
    installMatchMediaMock({ prefersReducedMotion: false });
    const tracker = createMockCanvasContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => tracker.ctx
    ) as unknown as typeof originalGetContext;

    let scheduledCallback: FrameRequestCallback | null = null;
    let nextRafId = 100;
    const rafSpy = jest.fn((cb: FrameRequestCallback) => {
      scheduledCallback = cb;
      nextRafId += 1;
      return nextRafId;
    });
    const cancelRafSpy = jest.fn();
    window.requestAnimationFrame = rafSpy;
    window.cancelAnimationFrame = cancelRafSpy;

    const { unmount } = render(
      <ThemeProvider>
        <BiomeCanvas
          book="Psalms"
          clearingId="psa-book-1-c1"
          chapters={samplePsalmsChapters}
          activeChapter={1}
          scaleOverride={2}
        />
      </ThemeProvider>
    );

    expect(rafSpy).toHaveBeenCalledTimes(1);

    // Advance one animation tick past ANIMATION_FRAME_INTERVAL_MS
    tracker.reset();
    act(() => {
      scheduledCallback?.(100);
      scheduledCallback?.(100 + ANIMATION_FRAME_INTERVAL_MS + 10);
    });
    expect(tracker.fillCalls.length).toBeGreaterThan(200);

    // Simulate background tab visibilitychange -> hidden pauses animation loop
    const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState'
    );
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(cancelRafSpy).toHaveBeenCalled();

    // Returning to visible resumes loop
    const rafCountBeforeVisible = rafSpy.mock.calls.length;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(rafSpy.mock.calls.length).toBeGreaterThan(rafCountBeforeVisible);

    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    } else {
      delete (document as unknown as Record<string, unknown>).visibilityState;
    }

    unmount();
    expect(cancelRafSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('draws unified 1280x720 HD backdrop and chroma-keyed sprites when images load cleanly in Light and Dark themes', () => {
    installMatchMediaMock({ prefersReducedMotion: true });
    clearBiomeCanvasImageCache();
    const originalImage = window.Image;
    const tracker = createMockCanvasContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => tracker.ctx
    ) as unknown as typeof originalGetContext;

    class MockLoadedImage {
      public decoding = 'async';
      public complete = true;
      public naturalWidth = 1280;
      public naturalHeight = 720;
      public onload: (() => void) | null = null;
      private _src = '';

      get src() {
        return this._src;
      }

      set src(value: string) {
        this._src = value;
      }
    }

    Object.defineProperty(window, 'Image', {
      writable: true,
      configurable: true,
      value: MockLoadedImage,
    });

    try {
      const { rerender } = render(
        <ThemeProvider>
          <BiomeCanvas
            book="Psalms"
            clearingId="psa-book-1-c2"
            chapters={[
              { chapter: 15, totalVerses: 5, completedVerses: 5, state: 'bloomed' },
              { chapter: 16, totalVerses: 11, completedVerses: 4, state: 'in_progress' },
              { chapter: 17, totalVerses: 15, completedVerses: 0, state: 'dormant' },
            ]}
            activeChapter={16}
            themeOverride="light"
            scaleOverride={2}
          />
        </ThemeProvider>
      );

      const drawImageMock = tracker.ctx.drawImage as unknown as jest.Mock;
      const drawnSrcsLight = drawImageMock.mock.calls.map(
        (call) => (call[0] as { src?: string })?.src ?? ''
      );
      expect(drawnSrcsLight).toContain(HD_BACKDROP_PATHS['twilight-shepherds-sanctuary'].light);
      expect(drawnSrcsLight).toContain(HD_SPRITE_PATHS.bloomed);
      expect(drawnSrcsLight).toContain(HD_SPRITE_PATHS.kindling);
      expect(drawnSrcsLight).toContain(HD_SPRITE_PATHS.dormant);
      expect(drawnSrcsLight).toContain(HD_SPRITE_PATHS.michael);
      // Light backdrop call uses full backing resolution (640*2 = 1280 x 720)
      expect(drawImageMock).toHaveBeenCalledWith(
        expect.objectContaining({ src: HD_BACKDROP_PATHS['twilight-shepherds-sanctuary'].light }),
        0,
        0,
        1280,
        720
      );

      drawImageMock.mockClear();
      rerender(
        <ThemeProvider>
          <BiomeCanvas
            book="Genesis"
            clearingId="gen-leg-1"
            chapters={[{ chapter: 1, totalVerses: 31, completedVerses: 31, state: 'bloomed' }]}
            activeChapter={1}
            themeOverride="dark"
            scaleOverride={2}
          />
        </ThemeProvider>
      );

      const drawnSrcsDark = drawImageMock.mock.calls.map(
        (call) => (call[0] as { src?: string })?.src ?? ''
      );
      expect(drawnSrcsDark).toContain(HD_BACKDROP_PATHS['eden-root-garden'].dark);
      expect(drawnSrcsDark).toContain(HD_SPRITE_PATHS.michael);
      expect(drawnSrcsDark).toContain(HD_SPRITE_PATHS.bottleTreeBloomed);

      // Progressive waking threshold verification:
      //  - 0 bloomed: dormant bottle tree ONLY (no herb rack, cairn, or elder keeper)
      //  - 4/10 bloomed in Gen Arc 3 (Bethel): bottleTreeBloomed + herbRack + riverCairn
      //  - bookMastered=true: elder keeper also wakes!
      drawImageMock.mockClear();
      rerender(
        <ThemeProvider>
          <BiomeCanvas
            book="Genesis"
            clearingId="gen-leg-3"
            chapters={[{ chapter: 21, totalVerses: 34, completedVerses: 0, state: 'dormant' }]}
            activeChapter={21}
            themeOverride="light"
            scaleOverride={2}
          />
        </ThemeProvider>
      );
      const zeroBloomSrcs = drawImageMock.mock.calls.map(
        (call) => (call[0] as { src?: string })?.src ?? ''
      );
      expect(zeroBloomSrcs).toContain(HD_BACKDROP_PATHS['bethel-ladder-homestead'].light);
      expect(zeroBloomSrcs).toContain(HD_SPRITE_PATHS.bottleTreeDormant);
      expect(zeroBloomSrcs).not.toContain(HD_SPRITE_PATHS.herbRack);
      expect(zeroBloomSrcs).not.toContain(HD_SPRITE_PATHS.riverCairn);
      expect(zeroBloomSrcs).not.toContain(HD_SPRITE_PATHS.keeperGenesis);

      drawImageMock.mockClear();
      rerender(
        <ThemeProvider>
          <BiomeCanvas
            book="Genesis"
            clearingId="gen-leg-3"
            chapters={[21, 22, 23, 24].map((ch) => ({
              chapter: ch,
              totalVerses: 20,
              completedVerses: 20,
              state: 'bloomed' as const,
            }))}
            activeChapter={25}
            themeOverride="light"
            scaleOverride={2}
          />
        </ThemeProvider>
      );
      const midBloomSrcs = drawImageMock.mock.calls.map(
        (call) => (call[0] as { src?: string })?.src ?? ''
      );
      expect(midBloomSrcs).toContain(HD_SPRITE_PATHS.bottleTreeBloomed);
      expect(midBloomSrcs).toContain(HD_SPRITE_PATHS.herbRack);
      expect(midBloomSrcs).toContain(HD_SPRITE_PATHS.riverCairn);
      expect(midBloomSrcs).not.toContain(HD_SPRITE_PATHS.keeperGenesis);

      drawImageMock.mockClear();
      rerender(
        <ThemeProvider>
          <BiomeCanvas
            book="Psalms"
            clearingId="psa-book-3-c1"
            chapters={[{ chapter: 73, totalVerses: 28, completedVerses: 28, state: 'bloomed' }]}
            activeChapter={73}
            bookMastered
            themeOverride="dark"
            scaleOverride={2}
          />
        </ThemeProvider>
      );
      const masteredSrcs = drawImageMock.mock.calls.map(
        (call) => (call[0] as { src?: string })?.src ?? ''
      );
      expect(masteredSrcs).toContain(HD_BACKDROP_PATHS['asaph-watchfire-harp'].dark);
      expect(masteredSrcs).toContain(HD_SPRITE_PATHS.keeperPsalms);
    } finally {
      clearBiomeCanvasImageCache();
      Object.defineProperty(window, 'Image', {
        writable: true,
        configurable: true,
        value: originalImage,
      });
    }
  });
});
