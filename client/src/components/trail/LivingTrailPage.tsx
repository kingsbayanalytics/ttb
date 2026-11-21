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
  AchievementsData,
  TrailBookResponse,
  TrailChapterWaypoint,
  TrailOverviewResponse,
} from '../../types';
import { AuthService, StatsService, TrailService } from '../../services/api';
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
import { createMockAchievementsData } from '../../data/trailBadges';
import { BiomeCanvas } from './BiomeCanvas';
import { ClearingSegment, YardPropId, buildClearingSegment } from './trailLayouts';
import {
  WaypointFocusRequest,
  WaypointOverlay,
  formatTrailChapterTitle,
} from './WaypointOverlay';
import { TrailChapterList } from './TrailChapterList';
import { TrailBadgesModal } from './TrailBadgesModal';
import {
  HydratedAtlasBiome,
  WorldAtlasDrawer,
} from './WorldAtlasDrawer';
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

function hydrateMacroAtlas(
  overview: TrailOverviewResponse | null,
  activeBookTrail: TrailBookResponse | null
): readonly HydratedAtlasBiome[] {
  const apiBookMap = new Map<string, TrailOverviewResponse['biomes'][number]['books'][number]>();
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
  const urlBadgesParam = searchParams.get('badges');

  const [overview, setOverview] = useState<TrailOverviewResponse | null>(null);
  const [bookTrail, setBookTrail] = useState<TrailBookResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
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
  const [selectedYardPropId, setSelectedYardPropId] = useState<YardPropId | null>(null);
  const [bloomedOnly, setBloomedOnly] = useState<boolean>(false);
  const [showChapterList, setShowChapterList] = useState<boolean>(false);
  const [motionPaused, setMotionPaused] = useState<boolean>(false);
  const [focusRequest, setFocusRequest] = useState<WaypointFocusRequest | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState<boolean>(urlBadgesParam === 'open');
  const [atlasDrawerOpen, setAtlasDrawerOpen] = useState<boolean>(false);
  const [atlasFocusBiomeId, setAtlasFocusBiomeId] = useState<string | null>(null);

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

    const fetchOptionalAchievements = async (): Promise<AchievementsData | null> => {
      if (typeof StatsService?.getAchievements !== 'function') {
        return null;
      }
      try {
        return await StatsService.getAchievements();
      } catch {
        return null;
      }
    };

    try {
      setLoading(true);
      setError(null);

      if (urlBook) {
        const [overviewRes, bookRes, achievementsRes] = await Promise.all([
          TrailService.getOverview(),
          TrailService.getBookTrail(urlBook),
          fetchOptionalAchievements(),
        ]);
        setOverview(overviewRes);
        setSelectedBook(urlBook);
        setBookTrail(bookRes);
        if (achievementsRes) {
          setAchievements(achievementsRes);
        }
        applyInitialClearingForBook(bookRes, urlChapterRaw, urlLegRaw);
      } else {
        const [overviewRes, achievementsRes] = await Promise.all([
          TrailService.getOverview(),
          fetchOptionalAchievements(),
        ]);
        setOverview(overviewRes);
        if (achievementsRes) {
          setAchievements(achievementsRes);
        }
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
      setSelectedYardPropId(null);
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

  const resolvedSegment = useMemo<ClearingSegment>(
    () => buildClearingSegment(selectedBook, activeClearingId, bookTrail?.totalChapters),
    [selectedBook, activeClearingId, bookTrail?.totalChapters]
  );

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
    setSelectedYardPropId(null);
  };

  const handleLegSelect = (leg: TrailLegDefinition) => {
    const firstClearing = leg.clearings[0];
    if (firstClearing) {
      setActiveClearingId(firstClearing.clearingId);
      setSelectedWaypointChapter(null);
      setSelectedYardPropId(null);
    }
  };

  const handleSelectWaypointChapter = useCallback((nextChapter: number | null) => {
    setSelectedWaypointChapter(nextChapter);
    if (nextChapter !== null) {
      setSelectedYardPropId(null);
    }
  }, []);

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
    setSelectedYardPropId(null);
    requestWaypointFocus(targetChapter);
  };

  const handleToggleBloomedOnly = () => {
    const next = !bloomedOnly;
    setBloomedOnly(next);
    setSelectedWaypointChapter(null);
    setSelectedYardPropId(null);

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
    setSelectedYardPropId(null);
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

  const playableBooksOverview = useMemo(() => {
    const map = new Map<'Genesis' | 'Psalms', { bloomed: number; total: number }>();
    for (const biome of hydratedBiomes) {
      for (const bk of biome.books) {
        if (bk.book === 'Genesis' || bk.book === 'Psalms') {
          map.set(bk.book, { bloomed: bk.bloomedChapters, total: bk.totalChapters });
        }
      }
    }
    return map;
  }, [hydratedBiomes]);

  const resolvedAchievements = useMemo<AchievementsData>(() => {
    if (achievements && achievements.badges.length > 0) {
      return achievements;
    }
    return createMockAchievementsData({
      bloomedChaptersCount: totalCanonBloomed,
      maxClearingBloomedCount: countBloomedInRange(
        resolvedSegment.startChapter,
        resolvedSegment.endChapter
      ),
      bestClearingTotal: resolvedSegment.endChapter - resolvedSegment.startChapter + 1,
    });
  }, [achievements, totalCanonBloomed, countBloomedInRange, resolvedSegment]);

  const unlockedBadgeCount = useMemo(
    () => resolvedAchievements.badges.filter((b) => b.unlocked).length,
    [resolvedAchievements]
  );

  const totalBadgeCount = resolvedAchievements.badges.length || 14;

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
      <h1 className="sr-only">Living Scripture Trail</h1>

      {/* Tier 1 (Gallery Plate First): Artwork Stage Immediately Above the Fold */}
      <section
        className="trail-clearing-section"
        aria-labelledby="trail-clearing-heading"
        aria-busy={bookSwitching}
        data-testid="trail-clearing-section"
      >
        {/* Slim 1-Row Cinema Header Bar */}
        <header className="trail-cinema-bar" data-testid="trail-cinema-bar">
          <div className="trail-cinema-left">
            <div
              className="trail-book-switcher"
              role="group"
              aria-label="Playable books"
            >
              {(['Genesis', 'Psalms'] as const).map((bookName) => {
                const counts = playableBooksOverview.get(bookName) ?? {
                  bloomed: 0,
                  total: bookName === 'Genesis' ? 50 : 150,
                };
                const isSelected = selectedBook === bookName;
                return (
                  <button
                    key={bookName}
                    type="button"
                    className="trail-book-tab"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectBook(bookName)}
                    data-testid={`trail-book-tab-${bookName}`}
                  >
                    <span>{bookName}</span>
                    <span className="trail-book-tab-count">
                      {counts.bloomed}/{counts.total}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="trail-cinema-title-group">
              <span className="trail-cinema-kicker">
                {activeBiomeMeta?.shortName ?? 'Biome'}
              </span>
              <div className="trail-cinema-heading-row">
                <h2 id="trail-clearing-heading">
                  {selectedBook} · {resolvedSegment.label}
                </h2>
                <span className="trail-story-arc-chip" data-testid="trail-story-arc-title">
                  {resolvedSegment.storyTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="trail-cinema-actions">
            {bookTrail?.bookMastered && (
              <div className="trail-mastery-banner" data-testid="trail-book-mastery-banner">
                <span aria-hidden="true">✦</span>
                <span>
                  {bookTrail.landmarkName} Illuminated ·{' '}
                  {activeBiomeMeta?.keeperName ?? 'Keeper'} Present
                </span>
              </div>
            )}

            <button
              type="button"
              className="trail-toolbar-btn trail-cinema-action-btn"
              onClick={() => setBadgeModalOpen(true)}
              data-testid="trail-btn-badges"
            >
              <span aria-hidden="true">✦</span>
              <span>
                Badges ({unlockedBadgeCount}/{totalBadgeCount})
              </span>
            </button>

            <button
              type="button"
              className="trail-toolbar-btn trail-cinema-action-btn"
              onClick={() => {
                setAtlasFocusBiomeId(activeBiomeMeta?.biomeId ?? null);
                setAtlasDrawerOpen(true);
              }}
              data-testid="trail-btn-world-atlas"
            >
              Atlas ({overview?.totalBooks ?? CANONICAL_TOTAL_BOOKS})
            </button>

            <button
              type="button"
              className="trail-toolbar-btn trail-toolbar-btn--guide trail-cinema-action-btn"
              onClick={handleOpenBookGuide}
              data-testid="trail-btn-book-guide"
            >
              <span aria-hidden="true">✦</span>
              <span>Book Guide</span>
            </button>
          </div>
        </header>

        {error && bookTrail && (
          <div className="error-container" role="alert">
            <p className="error-message">{error}</p>
          </div>
        )}

        {/* Hero 16:9 Aspect-Locked Pixel Stage + Semantic Flush-Stone Overlay */}
        <div className="trail-stage-shell">
          <div className="trail-stage-frame" data-testid="trail-stage-frame">
            <BiomeCanvas
              book={selectedBook}
              clearingId={activeClearingId}
              chapters={chapters}
              activeChapter={bookTrail?.activeChapter}
              selectedChapter={selectedWaypointChapter}
              selectedYardPropId={selectedYardPropId}
              bookMastered={bookTrail?.bookMastered ?? false}
              animationPaused={motionPaused}
              className="trail-stage-canvas"
            />

            <WaypointOverlay
              book={selectedBook}
              segment={resolvedSegment}
              chapters={chapters}
              activeChapter={bookTrail?.activeChapter}
              selectedChapter={selectedWaypointChapter}
              onSelectChapter={handleSelectWaypointChapter}
              onOpenCompanion={handleOpenChapterCompanion}
              selectedYardPropId={selectedYardPropId}
              onSelectYardProp={setSelectedYardPropId}
              onOpenBookGuide={handleOpenBookGuide}
              bookMastered={bookTrail?.bookMastered ?? false}
              bloomedOnly={bloomedOnly}
              onDisableBloomedOnly={() => setBloomedOnly(false)}
              focusRequest={focusRequest}
            />
          </div>
        </div>

        {/* Museum Plaque Dock Directly Under the Canvas */}
        <div className="trail-plaque-dock" data-testid="trail-plaque-dock">
          <div className="trail-dock-controls">
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
                      title={leg.storyTitle}
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
                  <span className="trail-subclearing-kicker">Clearings:</span>
                  {activeLeg.clearings.map((clearing) => {
                    const isCurrentClearing =
                      resolvedSegment.clearingId === clearing.clearingId;
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

            {/* Compact Quick-Jump Toolbar */}
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
                    {selectedBook === 'Psalms' ? 'Clearing' : 'Leg'}
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
                aria-label="Accessibility views and animation"
                className="trail-toolbar-group"
              >
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
          </div>

          {/* Non-Color State Legend & Story Caption */}
          <div className="trail-legend-bar" aria-label="Story clearing status and key">
            <div className="trail-legend-caption">
              <span>{resolvedSegment.storyMotif}</span>
              <span className="trail-clearing-subtitle">
                · {bookTrail?.bloomedChapters ?? bookBloomedCount}/
                {bookTrail?.totalChapters ?? chapters.length} ch. bloomed ·{' '}
                {bookTrail?.completedVerses ?? 0}/{bookTrail?.totalVerses ?? 0} verses
              </span>
            </div>
            <div className="trail-legend-items">
              <span className="trail-legend-item">
                <span aria-hidden="true">◇</span> Dormant
              </span>
              <span className="trail-legend-item">
                <span aria-hidden="true">◐</span> Kindling
              </span>
              <span className="trail-legend-item">
                <span aria-hidden="true">✦</span> Bloomed &amp; Props Awake
              </span>
            </div>
          </div>
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

      {/* Tier 2 (Below the Fold): Slim 1-Row 9-Region Horizon Ribbon */}
      <section
        className="trail-horizon-ribbon"
        aria-labelledby="trail-horizon-heading"
        data-testid="trail-horizon-ribbon"
      >
        <div className="trail-horizon-header">
          <div className="trail-horizon-title-row">
            <h2 id="trail-horizon-heading">Canonical Pilgrimage Horizon</h2>
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

          <button
            type="button"
            className="trail-toolbar-btn"
            onClick={() => {
              setAtlasFocusBiomeId(null);
              setAtlasDrawerOpen(true);
            }}
            data-testid="trail-horizon-open-atlas-btn"
          >
            Open Full 73-Book Atlas →
          </button>
        </div>

        <ol className="trail-horizon-strip" aria-label="9 Canonical Bible Regions">
          {hydratedBiomes.map((biome) => {
            const hasPlayablePhase1 = biome.books.some((b) => b.phase1Active);
            const containsActiveBook = biome.books.some((b) => b.book === selectedBook);
            const regionBloomed = biome.books.reduce((sum, b) => sum + b.bloomedChapters, 0);
            const playableInRegion = biome.books.find((b) => b.phase1Active);

            return (
              <li key={biome.biomeId} className="trail-horizon-item">
                <button
                  type="button"
                  className={`trail-horizon-pill ${
                    containsActiveBook ? 'is-active' : ''
                  } ${hasPlayablePhase1 ? 'is-playable' : 'is-veiled'}`}
                  aria-current={containsActiveBook ? 'location' : undefined}
                  onClick={() => {
                    if (
                      playableInRegion &&
                      (playableInRegion.book === 'Genesis' ||
                        playableInRegion.book === 'Psalms')
                    ) {
                      handleSelectBook(playableInRegion.book);
                    } else {
                      setAtlasFocusBiomeId(biome.biomeId);
                      setAtlasDrawerOpen(true);
                    }
                  }}
                  data-testid={`trail-horizon-region-${biome.biomeId}`}
                >
                  <span className="trail-horizon-step">
                    {biome.order}. {biome.shortName}
                  </span>
                  <span className="trail-horizon-meta">
                    {hasPlayablePhase1 && playableInRegion
                      ? `✦ ${regionBloomed}/${playableInRegion.totalChapters} ch.`
                      : `◌ Phase ${biome.phase}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Code-Split & Native Modal / Drawer Overlays */}
      <TrailBadgesModal
        isOpen={badgeModalOpen}
        achievements={resolvedAchievements}
        onClose={() => setBadgeModalOpen(false)}
      />

      <WorldAtlasDrawer
        isOpen={atlasDrawerOpen}
        biomes={hydratedBiomes}
        selectedBook={selectedBook}
        totalCanonBloomed={totalCanonBloomed}
        totalCanonChapters={overview?.totalChapters ?? CANONICAL_TOTAL_CHAPTERS}
        totalCanonBooks={overview?.totalBooks ?? CANONICAL_TOTAL_BOOKS}
        travelerSummary={travelerSummary}
        focusBiomeId={atlasFocusBiomeId}
        onSelectBook={(nextBook) => {
          handleSelectBook(nextBook);
        }}
        onClose={() => setAtlasDrawerOpen(false)}
      />

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
