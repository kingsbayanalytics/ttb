import React, {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as RouterDom from 'react-router-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrailBookOverview,
  TrailBookResponse,
  TrailChapterWaypoint,
  TrailOverviewResponse,
} from '../../types';
import { AuthService, TrailService } from '../../services/api';
import { useAuthSession } from '../../context/AuthContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  BiomeDefinition,
  CANONICAL_TOTAL_BOOKS,
  CANONICAL_TOTAL_CHAPTERS,
  PHASE1_ACTIVE_BOOKS,
  TRAIL_BIOME_CATALOG,
  TrailClearingDefinition,
  TrailLegDefinition,
  findClearingForChapter,
  getBiomeForBook,
  getTrailClearingsForBook,
  getTrailLegsForBook,
} from '../../data/trailBiomes';
import { BiomeCanvas } from './BiomeCanvas';
import { ClearingSegment, buildClearingSegment } from './trailLayouts';
import {
  WaypointFocusRequest,
  WaypointOverlay,
  formatTrailChapterTitle,
} from './WaypointOverlay';
import { TrailChapterList } from './TrailChapterList';
import type { CompanionDrawerMode } from '../companion/CompanionDrawer';
import './LivingTrail.css';

const LazyCompanionDrawer = React.lazy(() => import('../companion/CompanionDrawer'));

function normalizePhase1Book(raw?: string | null): 'Genesis' | 'Psalms' | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'genesis' || trimmed === 'gen') return 'Genesis';
  if (trimmed === 'psalms' || trimmed === 'psalm' || trimmed === 'psa') return 'Psalms';
  return null;
}

function resolveClearingParam(
  book: string,
  rawLegOrClearing: string | null,
  clearings: readonly TrailClearingDefinition[]
): TrailClearingDefinition | undefined {
  if (!rawLegOrClearing || clearings.length === 0) return undefined;
  const normalized = rawLegOrClearing.trim().toLowerCase();

  const exact = clearings.find(
    (c) =>
      c.clearingId.toLowerCase() === normalized || c.legId.toLowerCase() === normalized
  );
  if (exact) return exact;

  // Support legacy aliases such as genesis-leg-2 -> gen-leg-2 or psalms-book-2 -> psa-book-2
  const canonicalAlias = normalized
    .replace(/^genesis-leg-/, 'gen-leg-')
    .replace(/^psalms-book-/, 'psa-book-');
  return clearings.find(
    (c) =>
      c.clearingId.toLowerCase() === canonicalAlias ||
      c.legId.toLowerCase() === canonicalAlias
  );
}

interface HydratedAtlasBook extends TrailBookOverview {
  readonly canonicalChapters: number;
}

interface HydratedAtlasBiome {
  readonly biomeId: string;
  readonly order: number;
  readonly name: string;
  readonly shortName: string;
  readonly phase: 1 | 2 | 3;
  readonly motif: string;
  readonly books: readonly HydratedAtlasBook[];
}

/**
 * Merges the canonical 9-biome / 73-book registry (`TRAIL_BIOME_CATALOG`) with live
 * API overview progress so all 9 regions and 73 books always render in canonical order
 * even when running against compact mock fixtures.
 */
function hydrateMacroAtlas(
  overview: TrailOverviewResponse | null,
  activeBookTrail: TrailBookResponse | null
): readonly HydratedAtlasBiome[] {
  const apiBookMap = new Map<string, TrailBookOverview>();
  if (overview?.biomes) {
    for (const b of overview.biomes) {
      for (const bookEntry of b.books) {
        apiBookMap.set(bookEntry.book, bookEntry);
      }
    }
  }

  return TRAIL_BIOME_CATALOG.map((biomeDef: BiomeDefinition) => ({
    biomeId: biomeDef.biomeId,
    order: biomeDef.order,
    name: biomeDef.name,
    shortName: biomeDef.shortName,
    phase: biomeDef.phase,
    motif: biomeDef.motif,
    books: biomeDef.books.map((bookDef) => {
      const fromApi = apiBookMap.get(bookDef.book);
      const isLiveLoaded = activeBookTrail?.book === bookDef.book;

      const totalChapters = isLiveLoaded
        ? activeBookTrail.totalChapters
        : fromApi?.totalChapters ?? bookDef.canonicalChapters;
      const bloomedChapters = isLiveLoaded
        ? activeBookTrail.bloomedChapters
        : fromApi?.bloomedChapters ?? 0;
      const inProgressChapters = fromApi?.inProgressChapters ?? 0;
      const totalVerses = isLiveLoaded
        ? activeBookTrail.totalVerses
        : fromApi?.totalVerses ?? 0;
      const completedVerses = isLiveLoaded
        ? activeBookTrail.completedVerses
        : fromApi?.completedVerses ?? 0;
      const bookMastered = isLiveLoaded
        ? activeBookTrail.bookMastered
        : fromApi?.bookMastered ?? false;

      return {
        book: bookDef.book,
        sectionKey: bookDef.sectionKey,
        landmarkName: fromApi?.landmarkName ?? bookDef.landmarkName,
        phase1Active: PHASE1_ACTIVE_BOOKS.has(bookDef.book),
        canonicalChapters: bookDef.canonicalChapters,
        totalChapters,
        bloomedChapters,
        inProgressChapters,
        totalVerses,
        completedVerses,
        state: isLiveLoaded
          ? activeBookTrail.state
          : fromApi?.state ?? (bloomedChapters > 0 ? 'in_progress' : 'dormant'),
        bookMastered,
        companionChapterCount: fromApi?.companionChapterCount ?? 0,
      };
    }),
  }));
}

interface DrawerState {
  readonly isOpen: boolean;
  readonly book: string;
  readonly chapter: number | null;
  readonly mode: CompanionDrawerMode;
}

type TrailSearchParamsUpdater = (
  nextInit: Record<string, string>,
  opts?: { replace?: boolean }
) => void;

function useNativeRouterSearchParams(): readonly [URLSearchParams, TrailSearchParamsUpdater] {
  const [params, setParams] = useSearchParams();
  const updateParams: TrailSearchParamsUpdater = useCallback(
    (nextInit, opts) => {
      setParams(nextInit, opts);
    },
    [setParams]
  );
  return [params, updateParams] as const;
}

function useLocationFallbackSearchParams(): readonly [
  URLSearchParams,
  TrailSearchParamsUpdater
] {
  const location = useLocation();
  const navigate = useNavigate();
  const parsed = useMemo(
    () => new URLSearchParams(location?.search || ''),
    [location?.search]
  );
  const updateSearchParams: TrailSearchParamsUpdater = useCallback(
    (nextInit, opts) => {
      const qs = new URLSearchParams(nextInit).toString();
      const pathname = location?.pathname || '/trail';
      navigate(qs ? `${pathname}?${qs}` : pathname, opts);
    },
    [location?.pathname, navigate]
  );
  return [parsed, updateSearchParams] as const;
}

const useTrailSearchParams: () => readonly [URLSearchParams, TrailSearchParamsUpdater] =
  typeof RouterDom.useSearchParams === 'function'
    ? useNativeRouterSearchParams
    : useLocationFallbackSearchParams;

export const LivingTrailPage: React.FC = () => {
  const { mode: authMode, user, loading: authLoading } = useAuthSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useTrailSearchParams();
  const osReducedMotion = useReducedMotion();

  const clearingSelectId = useId();

  const urlBook = normalizePhase1Book(searchParams.get('book'));
  const urlChapterRaw = searchParams.get('chapter');
  const urlLegRaw = searchParams.get('leg') ?? searchParams.get('clearing');

  const [overview, setOverview] = useState<TrailOverviewResponse | null>(null);
  const [bookTrail, setBookTrail] = useState<TrailBookResponse | null>(null);
  const [selectedBook, setSelectedBook] = useState<'Genesis' | 'Psalms'>(
    urlBook ?? 'Genesis'
  );
  const [activeClearingId, setActiveClearingId] = useState<string>(() =>
    buildClearingSegment(urlBook ?? 'Genesis').clearingId
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [bookSwitching, setBookSwitching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWaypointChapter, setSelectedWaypointChapter] = useState<number | null>(null);
  const [bloomedOnly, setBloomedOnly] = useState<boolean>(false);
  const [showChapterList, setShowChapterList] = useState<boolean>(false);
  const [motionPaused, setMotionPaused] = useState<boolean>(false);
  const [focusRequest, setFocusRequest] = useState<WaypointFocusRequest | null>(null);

  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    book: urlBook ?? 'Genesis',
    chapter: null,
    mode: 'chapter',
  });
  const [drawerEverOpened, setDrawerEverOpened] = useState<boolean>(false);

  const focusSeqRef = useRef<number>(0);
  const initialLoadDoneRef = useRef<boolean>(false);

  const requestWaypointFocus = useCallback((chapter: number) => {
    focusSeqRef.current += 1;
    setFocusRequest({ chapter, seq: focusSeqRef.current });
  }, []);

  const applyInitialClearingForBook = useCallback(
    (
      bookData: TrailBookResponse,
      explicitChapterParam?: string | null,
      explicitLegParam?: string | null
    ) => {
      const clearings = getTrailClearingsForBook(bookData.book, bookData.totalChapters);
      const parsedCh = explicitChapterParam ? Number(explicitChapterParam) : NaN;

      if (Number.isInteger(parsedCh) && parsedCh >= 1 && parsedCh <= bookData.totalChapters) {
        const chClearing = findClearingForChapter(
          bookData.book,
          parsedCh,
          bookData.totalChapters
        );
        setActiveClearingId(chClearing.clearingId);
        setSelectedWaypointChapter(parsedCh);
        return;
      }

      const matchedLegClearing = resolveClearingParam(
        bookData.book,
        explicitLegParam ?? null,
        clearings
      );
      if (matchedLegClearing) {
        setActiveClearingId(matchedLegClearing.clearingId);
        setSelectedWaypointChapter(null);
        return;
      }

      const activeCh =
        bookData.activeChapter && bookData.activeChapter >= 1
          ? bookData.activeChapter
          : 1;
      const defaultClearing = findClearingForChapter(
        bookData.book,
        activeCh,
        bookData.totalChapters
      );
      setActiveClearingId(defaultClearing.clearingId);
      setSelectedWaypointChapter(null);
    },
    []
  );

  const loadTrailInitial = useCallback(async () => {
    if (!TrailService?.getOverview || !TrailService?.getBookTrail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (urlBook) {
        const [overviewRes, bookRes] = await Promise.all([
          TrailService.getOverview(),
          TrailService.getBookTrail(urlBook),
        ]);
        setOverview(overviewRes);
        setSelectedBook(urlBook);
        setBookTrail(bookRes);
        applyInitialClearingForBook(bookRes, urlChapterRaw, urlLegRaw);
      } else {
        const overviewRes = await TrailService.getOverview();
        setOverview(overviewRes);
        const preferredBook =
          normalizePhase1Book(overviewRes.activeTraveler?.book) ?? 'Genesis';
        setSelectedBook(preferredBook);
        const bookRes = await TrailService.getBookTrail(preferredBook);
        setBookTrail(bookRes);
        applyInitialClearingForBook(bookRes, urlChapterRaw, urlLegRaw);
      }
      initialLoadDoneRef.current = true;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load the Living Trail right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [urlBook, urlChapterRaw, urlLegRaw, applyInitialClearingForBook]);

  // Auth guard + initial load
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const hasExplicitAuthMock = typeof AuthService?.getCurrentUser === 'function';
    if (hasExplicitAuthMock && authMode !== 'entra' && !user) {
      navigate('/login');
      return;
    }

    if (!initialLoadDoneRef.current) {
      loadTrailInitial();
    }
  }, [authLoading, authMode, user, navigate, loadTrailInitial]);

  const handleSelectBook = useCallback(
    async (nextBook: 'Genesis' | 'Psalms') => {
      if (nextBook === selectedBook && bookTrail?.book === nextBook) {
        return;
      }

      setSelectedBook(nextBook);
      setSelectedWaypointChapter(null);
      setBloomedOnly(false);
      setSearchParams({ book: nextBook }, { replace: true });

      try {
        setBookSwitching(true);
        setError(null);
        const nextTrail = await TrailService.getBookTrail(nextBook);
        setBookTrail(nextTrail);
        applyInitialClearingForBook(nextTrail, null, null);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            `Unable to load ${nextBook} trail waypoints.`
        );
      } finally {
        setBookSwitching(false);
      }
    },
    [selectedBook, bookTrail?.book, setSearchParams, applyInitialClearingForBook]
  );

  // Sync external URL ?book= navigation changes after initial load
  const prevUrlBookRef = useRef<'Genesis' | 'Psalms' | null>(urlBook);
  useEffect(() => {
    if (prevUrlBookRef.current === urlBook) {
      return;
    }
    prevUrlBookRef.current = urlBook;
    if (!initialLoadDoneRef.current) return;
    if (urlBook && urlBook !== selectedBook) {
      handleSelectBook(urlBook);
    }
  }, [urlBook, selectedBook, handleSelectBook]);

  const legs = useMemo<readonly TrailLegDefinition[]>(
    () => getTrailLegsForBook(selectedBook, bookTrail?.totalChapters),
    [selectedBook, bookTrail?.totalChapters]
  );

  const clearings = useMemo<readonly TrailClearingDefinition[]>(
    () => getTrailClearingsForBook(selectedBook, bookTrail?.totalChapters),
    [selectedBook, bookTrail?.totalChapters]
  );

  const [resolvedSegment, setResolvedSegment] = useState<ClearingSegment>(() =>
    buildClearingSegment(selectedBook, activeClearingId, bookTrail?.totalChapters)
  );

  useEffect(() => {
    setResolvedSegment(
      buildClearingSegment(selectedBook, activeClearingId, bookTrail?.totalChapters)
    );
  }, [selectedBook, activeClearingId, bookTrail?.totalChapters]);

  const handleLayoutResolved = useCallback((segment: ClearingSegment) => {
    setResolvedSegment(segment);
  }, []);

  const chapters = useMemo<readonly TrailChapterWaypoint[]>(
    () => bookTrail?.chapters ?? [],
    [bookTrail?.chapters]
  );

  const chapterByNumber = useMemo(() => {
    const map = new Map<number, TrailChapterWaypoint>();
    for (const ch of chapters) {
      map.set(ch.chapter, ch);
    }
    return map;
  }, [chapters]);

  const countBloomedInRange = useCallback(
    (startCh: number, endCh: number): number => {
      let count = 0;
      for (let ch = startCh; ch <= endCh; ch += 1) {
        if (chapterByNumber.get(ch)?.state === 'bloomed') {
          count += 1;
        }
      }
      return count;
    },
    [chapterByNumber]
  );

  const bookBloomedCount = useMemo(
    () => chapters.filter((ch) => ch.state === 'bloomed').length,
    [chapters]
  );

  const activeLeg = useMemo(
    () => legs.find((l) => l.legId === resolvedSegment.legId) ?? legs[0],
    [legs, resolvedSegment.legId]
  );

  const handleClearingChange = (nextClearingId: string) => {
    setActiveClearingId(nextClearingId);
    setSelectedWaypointChapter(null);
  };

  const handleLegSelect = (leg: TrailLegDefinition) => {
    const firstClearing = leg.clearings[0];
    if (firstClearing) {
      setActiveClearingId(firstClearing.clearingId);
      setSelectedWaypointChapter(null);
    }
  };

  const handleJumpNextActive = () => {
    if (!bookTrail) return;
    const targetChapter =
      bookTrail.activeChapter && bookTrail.activeChapter >= 1
        ? bookTrail.activeChapter
        : chapters.find((c) => c.state !== 'bloomed')?.chapter ?? 1;

    const targetData = chapterByNumber.get(targetChapter);
    if (bloomedOnly && targetData?.state !== 'bloomed') {
      setBloomedOnly(false);
    }

    const targetClearing = findClearingForChapter(
      selectedBook,
      targetChapter,
      bookTrail.totalChapters
    );
    setActiveClearingId(targetClearing.clearingId);
    setSelectedWaypointChapter(null);
    requestWaypointFocus(targetChapter);
  };

  const handleToggleBloomedOnly = () => {
    const next = !bloomedOnly;
    setBloomedOnly(next);
    setSelectedWaypointChapter(null);

    if (next && bookTrail) {
      const currentHasBloomed =
        countBloomedInRange(resolvedSegment.startChapter, resolvedSegment.endChapter) > 0;
      if (!currentHasBloomed) {
        const firstBloomedChapter = chapters.find((c) => c.state === 'bloomed');
        if (firstBloomedChapter) {
          const clearingWithBloom = findClearingForChapter(
            selectedBook,
            firstBloomedChapter.chapter,
            bookTrail.totalChapters
          );
          setActiveClearingId(clearingWithBloom.clearingId);
        }
      }
    }
  };

  const handleOpenChapterCompanion = useCallback((targetBook: string, chapter: number) => {
    setDrawerEverOpened(true);
    setDrawerState({
      isOpen: true,
      book: targetBook,
      chapter,
      mode: 'chapter',
    });
  }, []);

  const handleOpenBookGuide = useCallback(() => {
    setSelectedWaypointChapter(null);
    setDrawerEverOpened(true);
    setDrawerState({
      isOpen: true,
      book: selectedBook,
      chapter: null,
      mode: 'guide',
    });
  }, [selectedBook]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleDrawerNavigateChapter = useCallback(
    (targetBook: string, targetChapter: number) => {
      setDrawerState({
        isOpen: true,
        book: targetBook,
        chapter: targetChapter,
        mode: 'chapter',
      });
      if (targetBook === selectedBook) {
        const nextClearing = findClearingForChapter(
          selectedBook,
          targetChapter,
          bookTrail?.totalChapters
        );
        setActiveClearingId(nextClearing.clearingId);
      }
    },
    [selectedBook, bookTrail?.totalChapters]
  );

  const hydratedBiomes = useMemo(
    () => hydrateMacroAtlas(overview, bookTrail),
    [overview, bookTrail]
  );

  const activeBiomeMeta = useMemo(
    () => getBiomeForBook(selectedBook),
    [selectedBook]
  );

  const totalCanonBloomed = useMemo(() => {
    if (overview) return overview.bloomedChapters;
    return hydratedBiomes.reduce(
      (sum, b) => sum + b.books.reduce((s, bk) => s + bk.bloomedChapters, 0),
      0
    );
  }, [overview, hydratedBiomes]);

  if (loading && !bookTrail) {
    return (
      <div className="loading-container" role="status" data-testid="trail-loading">
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
        <div className="loading-text">
          <h3>Charting the Living Scripture Trail…</h3>
          <p>Loading canonical biomes, lantern waypoints, and companion seals.</p>
        </div>
      </div>
    );
  }

  if (error && !bookTrail) {
    return (
      <div className="error-container" role="alert" data-testid="trail-error">
        <p className="error-message">{error}</p>
        <button type="button" onClick={loadTrailInitial} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  const travelerSummary = overview?.activeTraveler
    ? formatTrailChapterTitle(
        overview.activeTraveler.book,
        overview.activeTraveler.chapter
      )
    : formatTrailChapterTitle(selectedBook, bookTrail?.activeChapter ?? 1);

  return (
    <div className="living-trail-page" data-testid="living-trail-page">
      {/* Masthead */}
      <header className="trail-masthead">
        <div className="trail-masthead-copy">
          <span className="trail-kicker">LIVING PIXEL TRAIL · WORLD ENGLISH BIBLE</span>
          <h1>Living Scripture Trail</h1>
          <p className="trail-masthead-subtitle">
            Walk the illuminated 16-bit scripture atlas—every completed chapter blooms its lantern
            clearing and unlocks multi-lens Companion study notes.
          </p>
        </div>

        <div className="trail-masthead-stats">
          <span className="trail-stat-pill" data-testid="trail-canon-summary">
            ✦ {totalCanonBloomed} / {overview?.totalChapters ?? CANONICAL_TOTAL_CHAPTERS} Chapters
            Bloomed · {overview?.totalBooks ?? CANONICAL_TOTAL_BOOKS} Books
          </span>
          <span
            className="trail-stat-pill trail-stat-pill--traveler"
            data-testid="trail-active-traveler"
          >
            Traveler at {travelerSummary}
          </span>
        </div>
      </header>

      {/* Tier 1: Macro Atlas Trail Strip (All 9 Biomes / 73 Books) */}
      <section
        className="trail-atlas-section"
        aria-labelledby="trail-macro-atlas-heading"
        data-testid="trail-macro-atlas"
      >
        <div className="trail-section-header">
          <h2 id="trail-macro-atlas-heading">Canonical Biome Atlas</h2>
          <span className="trail-section-meta">
            9 Regions · 73 Canonical Books · Phase 1 Playable: Genesis &amp; Psalms
          </span>
        </div>

        <ol className="atlas-biome-strip">
          {hydratedBiomes.map((biome: HydratedAtlasBiome) => {
            const containsActiveBook = biome.books.some((b) => b.book === selectedBook);
            const hasPlayablePhase1 = biome.books.some((b) => b.phase1Active);

            const cardClasses = [
              'atlas-biome-card',
              containsActiveBook ? 'atlas-biome-card--active' : '',
              !hasPlayablePhase1 ? 'atlas-biome-card--horizon' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li
                key={biome.biomeId}
                className={cardClasses}
                data-biome-id={biome.biomeId}
                data-testid={`atlas-biome-${biome.biomeId}`}
              >
                <div className="atlas-biome-card-top">
                  <span className="atlas-biome-order">Region {biome.order}</span>
                  <span
                    className={
                      hasPlayablePhase1
                        ? 'atlas-phase-badge atlas-phase-badge--playable'
                        : 'atlas-phase-badge'
                    }
                  >
                    {hasPlayablePhase1
                      ? 'Phase 1 Playable'
                      : `Phase ${biome.phase} · Mist-Veiled`}
                  </span>
                </div>

                <div>
                  <h3 className="atlas-biome-title">{biome.name}</h3>
                  <p className="atlas-biome-motif">{biome.motif}</p>
                </div>

                <ul className="atlas-biome-books">
                  {biome.books.map((bk) => {
                    if (bk.phase1Active) {
                      const isSelected = selectedBook === bk.book;
                      return (
                        <li
                          key={bk.book}
                          style={{ width: '100%' }}
                          data-book={bk.book}
                          data-phase1-active="true"
                        >
                          <button
                            type="button"
                            className="atlas-playable-book-btn"
                            aria-pressed={isSelected}
                            onClick={() =>
                              handleSelectBook(bk.book as 'Genesis' | 'Psalms')
                            }
                            data-testid={`atlas-book-btn-${bk.book}`}
                          >
                            <span className="atlas-playable-book-row">
                              <span className="atlas-playable-book-name">
                                {bk.bookMastered ? '✦ ' : ''}
                                {bk.book}
                              </span>
                              <span className="atlas-playable-book-bloom">
                                {bk.book} · {bk.bloomedChapters} / {bk.totalChapters} Chapters
                                Bloomed
                              </span>
                            </span>
                            <span className="atlas-playable-book-landmark">
                              Landmark: {bk.landmarkName}
                              {bk.bookMastered ? ' · Sanctuary Illuminated' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={bk.book}
                        className="atlas-book-chip--veiled"
                        data-book={bk.book}
                        data-phase1-active="false"
                        title={`${bk.book} (${bk.totalChapters} ch.) — Mist-veiled future horizon`}
                      >
                        <span className="atlas-veiled-glyph" aria-hidden="true">
                          ◌
                        </span>
                        <span>{bk.book}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Tier 2: Playable Biome Clearing Stage */}
      <section
        className="trail-clearing-section"
        aria-labelledby="trail-clearing-heading"
        aria-busy={bookSwitching}
        data-testid="trail-clearing-section"
      >
        <div className="trail-clearing-header">
          <div className="trail-clearing-title-group">
            <span className="trail-kicker">
              {activeBiomeMeta?.name ?? 'Playable Biome Clearing'}
            </span>
            <h2 id="trail-clearing-heading">
              {selectedBook} · {resolvedSegment.label}
            </h2>
            <p className="trail-clearing-subtitle">
              {bookTrail?.bloomedChapters ?? bookBloomedCount} of{' '}
              {bookTrail?.totalChapters ?? chapters.length} chapters bloomed in {selectedBook} ·{' '}
              {bookTrail?.completedVerses ?? 0} / {bookTrail?.totalVerses ?? 0} verses completed
            </p>
          </div>

          {bookTrail?.bookMastered && (
            <div className="trail-mastery-banner" data-testid="trail-book-mastery-banner">
              <span aria-hidden="true">✦</span>
              <span>
                {bookTrail.landmarkName} Illuminated · {activeBiomeMeta?.keeperName ?? 'Keeper'}{' '}
                Present
              </span>
            </div>
          )}
        </div>

        {error && bookTrail && (
          <div className="error-container" role="alert">
            <p className="error-message">{error}</p>
          </div>
        )}

        {/* Quick-Jump Toolbar */}
        <div
          role="toolbar"
          aria-label="Living Trail quick-jump and view controls"
          className="trail-toolbar"
          data-testid="trail-quick-jump-toolbar"
        >
          <div
            role="group"
            aria-label="Waypoint navigation and filters"
            className="trail-toolbar-group"
          >
            <button
              type="button"
              className="trail-toolbar-btn"
              onClick={handleJumpNextActive}
              data-testid="trail-btn-next-active"
            >
              Next Active
            </button>

            <button
              type="button"
              className="trail-toolbar-btn"
              aria-pressed={bloomedOnly}
              onClick={handleToggleBloomedOnly}
              data-testid="trail-btn-bloomed-only"
            >
              Bloomed Only ({bookBloomedCount})
            </button>
          </div>

          <span
            role="separator"
            aria-orientation="vertical"
            className="trail-toolbar-sep"
          />

          <div
            role="group"
            aria-label="Leg and clearing selector"
            className="trail-toolbar-group"
          >
            <div className="trail-clearing-select-wrap">
              <label htmlFor={clearingSelectId} className="trail-clearing-select-label">
                {selectedBook === 'Psalms' ? 'Psalter Clearing' : 'Trail Leg'}
              </label>
              <select
                id={clearingSelectId}
                className="trail-clearing-select"
                value={resolvedSegment.clearingId}
                onChange={(e) => handleClearingChange(e.target.value)}
                data-testid="trail-clearing-selector"
              >
                {selectedBook === 'Psalms'
                  ? legs.map((leg) => (
                      <optgroup key={leg.legId} label={leg.label}>
                        {leg.clearings.map((clearing) => {
                          const bloomedInClearing = countBloomedInRange(
                            clearing.startChapter,
                            clearing.endChapter
                          );
                          const totalInClearing =
                            clearing.endChapter - clearing.startChapter + 1;
                          return (
                            <option key={clearing.clearingId} value={clearing.clearingId}>
                              {clearing.label} ({bloomedInClearing}/{totalInClearing} bloomed)
                            </option>
                          );
                        })}
                      </optgroup>
                    ))
                  : clearings.map((clearing) => {
                      const bloomedInClearing = countBloomedInRange(
                        clearing.startChapter,
                        clearing.endChapter
                      );
                      const totalInClearing =
                        clearing.endChapter - clearing.startChapter + 1;
                      return (
                        <option key={clearing.clearingId} value={clearing.clearingId}>
                          {clearing.label} ({bloomedInClearing}/{totalInClearing} bloomed)
                        </option>
                      );
                    })}
              </select>
            </div>
          </div>

          <span
            role="separator"
            aria-orientation="vertical"
            className="trail-toolbar-sep"
          />

          <div
            role="group"
            aria-label="Companion guide and accessibility views"
            className="trail-toolbar-group"
          >
            <button
              type="button"
              className="trail-toolbar-btn trail-toolbar-btn--guide"
              onClick={handleOpenBookGuide}
              data-testid="trail-btn-book-guide"
            >
              <span aria-hidden="true">✦</span>
              <span>Book Guide</span>
            </button>

            <button
              type="button"
              className="trail-toolbar-btn"
              aria-expanded={showChapterList}
              aria-controls="trail-chapter-list-panel"
              onClick={() => setShowChapterList((prev) => !prev)}
              data-testid="trail-btn-chapter-list"
            >
              Accessible Chapter List
            </button>

            {!osReducedMotion && (
              <button
                type="button"
                className="trail-toolbar-btn"
                onClick={() => setMotionPaused((prev) => !prev)}
                data-testid="trail-btn-pause-motion"
              >
                {motionPaused ? 'Play Motion' : 'Pause Motion'}
              </button>
            )}
          </div>
        </div>

        {/* Classical Psalter Books I–V / Genesis Legs Strip + Sub-Clearings */}
        <div className="trail-leg-strip" data-testid="trail-leg-strip">
          <div
            className="trail-leg-pills"
            role="group"
            aria-label={
              selectedBook === 'Psalms'
                ? 'Classical Books of the Psalter'
                : 'Genesis Trail Legs'
            }
          >
            {legs.map((leg) => {
              const isCurrentLeg = activeLeg?.legId === leg.legId;
              const legBloomed = countBloomedInRange(leg.startChapter, leg.endChapter);
              const legTotal = leg.endChapter - leg.startChapter + 1;
              return (
                <button
                  key={leg.legId}
                  type="button"
                  className="trail-leg-pill"
                  aria-pressed={isCurrentLeg}
                  onClick={() => handleLegSelect(leg)}
                  data-testid={`trail-leg-btn-${leg.legId}`}
                >
                  {leg.shortLabel} · {legBloomed}/{legTotal}
                </button>
              );
            })}
          </div>

          {activeLeg && activeLeg.clearings.length > 1 && (
            <div
              className="trail-subclearing-pills"
              role="group"
              aria-label={`${activeLeg.shortLabel} scenic clearings`}
              data-testid="trail-subclearing-pills"
            >
              <span className="trail-subclearing-kicker">Scenic Clearings:</span>
              {activeLeg.clearings.map((clearing) => {
                const isCurrentClearing = resolvedSegment.clearingId === clearing.clearingId;
                return (
                  <button
                    key={clearing.clearingId}
                    type="button"
                    className="trail-leg-pill"
                    aria-pressed={isCurrentClearing}
                    onClick={() => handleClearingChange(clearing.clearingId)}
                    data-testid={`trail-clearing-pill-${clearing.clearingId}`}
                  >
                    {clearing.shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Responsive 16:9 Aspect-Locked Pixel Stage + Semantic Waypoint Overlay */}
        <div className="trail-stage-frame" data-testid="trail-stage-frame">
          <BiomeCanvas
            book={selectedBook}
            clearingId={resolvedSegment.clearingId}
            chapters={chapters}
            activeChapter={bookTrail?.activeChapter}
            selectedChapter={selectedWaypointChapter}
            bookMastered={bookTrail?.bookMastered ?? false}
            animationPaused={motionPaused}
            className="trail-stage-canvas"
            onLayoutResolved={handleLayoutResolved}
          />

          <WaypointOverlay
            book={selectedBook}
            segment={resolvedSegment}
            chapters={chapters}
            activeChapter={bookTrail?.activeChapter}
            selectedChapter={selectedWaypointChapter}
            onSelectChapter={setSelectedWaypointChapter}
            onOpenCompanion={handleOpenChapterCompanion}
            bloomedOnly={bloomedOnly}
            onDisableBloomedOnly={() => setBloomedOnly(false)}
            focusRequest={focusRequest}
          />
        </div>

        {/* Non-Color State Legend & Keyboard Hint */}
        <div className="trail-legend-bar" aria-label="Waypoint status key">
          <div className="trail-legend-items">
            <span className="trail-legend-item">
              <span aria-hidden="true">◇</span> Dormant (Mist)
            </span>
            <span className="trail-legend-item">
              <span aria-hidden="true">◐</span> In Progress (Kindling)
            </span>
            <span className="trail-legend-item">
              <span aria-hidden="true">✦</span> Bloomed (Companion Ready)
            </span>
          </div>
          <span>Arrow keys navigate waypoints · Enter opens chapter · Esc closes</span>
        </div>
      </section>

      {/* WCAG 2.1 AA Semantic Table Alternative (NFR-2 / NFR-V3-3) */}
      {showChapterList && (
        <TrailChapterList
          id="trail-chapter-list-panel"
          book={selectedBook}
          chapters={chapters}
          legs={legs}
          onOpenCompanion={handleOpenChapterCompanion}
        />
      )}

      {/* Code-Split Slide-Over Companion Reading Room & Book Guide */}
      {(drawerEverOpened || drawerState.isOpen) && (
        <Suspense
          fallback={
            <div className="sr-only" role="status">
              Opening Companion Reading Room…
            </div>
          }
        >
          <LazyCompanionDrawer
            isOpen={drawerState.isOpen}
            book={drawerState.book}
            chapter={drawerState.chapter}
            mode={drawerState.mode}
            initialMode={drawerState.mode}
            maxChapter={bookTrail?.totalChapters}
            onClose={handleCloseDrawer}
            onNavigateChapter={handleDrawerNavigateChapter}
          />
        </Suspense>
      )}
    </div>
  );
};

export default LivingTrailPage;
