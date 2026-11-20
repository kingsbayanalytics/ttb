import React from 'react';
import * as router from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '../../test-utils';
import { ThemeProvider } from '../../context/ThemeContext';
import { AuthService, CompanionService, TrailService } from '../../services/api';
import {
  getMockBookGuide,
  getMockChapterCompanion,
} from '../../data/mockCompanion';
import {
  TrailBookResponse,
  TrailChapterWaypoint,
  TrailOverviewResponse,
} from '../../types';
import { LivingTrailPage } from './LivingTrailPage';

// Mock ONLY services/api.ts (AD-6)
jest.mock('../../services/api', () => ({
  AuthService: {
    getAuthSession: jest.fn(),
    getAuthMode: jest.fn(),
    getCachedAuthMode: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  TrailService: {
    getOverview: jest.fn(),
    getBookTrail: jest.fn(),
  },
  CompanionService: {
    getChapterCompanion: jest.fn(),
    getBookGuide: jest.fn(),
    searchCompanion: jest.fn(),
  },
}));

const mockOwner = {
  _id: 'owner-1',
  username: 'Mike Warren',
  email: 'mike@kingsbayanalytics.com',
  isAdmin: false,
};

function buildOverviewFixture(): TrailOverviewResponse {
  return {
    workId: 'web-bible',
    totalBooks: 73,
    totalChapters: 1328,
    bloomedChapters: 14,
    inProgressChapters: 2,
    activeTraveler: {
      biomeId: 'twilight-shepherds-sanctuary',
      book: 'Psalms',
      chapter: 24,
    },
    biomes: [
      {
        biomeId: 'eden-root-garden',
        order: 1,
        name: 'Eden Root-Garden & Covenant Plains',
        phase: 1,
        books: [
          {
            book: 'Genesis',
            sectionKey: 'GEN',
            landmarkName: 'Eden Tree of Roots',
            phase1Active: true,
            totalChapters: 50,
            bloomedChapters: 2,
            inProgressChapters: 1,
            totalVerses: 1533,
            completedVerses: 70,
            state: 'in_progress',
            bookMastered: false,
            companionChapterCount: 16,
          },
        ],
      },
      {
        biomeId: 'twilight-shepherds-sanctuary',
        order: 3,
        name: "Twilight Shepherd's Sanctuary",
        phase: 1,
        books: [
          {
            book: 'Psalms',
            sectionKey: 'PSA',
            landmarkName: "Shepherd's Sanctuary Porch",
            phase1Active: true,
            totalChapters: 150,
            bloomedChapters: 12,
            inProgressChapters: 1,
            totalVerses: 2461,
            completedVerses: 180,
            state: 'in_progress',
            bookMastered: false,
            companionChapterCount: 150,
          },
        ],
      },
    ],
  };
}

function buildGenesisTrailFixture(): TrailBookResponse {
  const chapters: TrailChapterWaypoint[] = Array.from({ length: 50 }, (_, idx) => {
    const ch = idx + 1;
    if (ch === 1 || ch === 2) {
      const totalVerses = ch === 1 ? 31 : 25;
      return {
        chapter: ch,
        totalVerses,
        completedVerses: totalVerses,
        state: 'bloomed',
        bestWPM: 68,
        bestAccuracy: 98,
        unlockedAt: '2026-11-19T12:00:00.000Z',
        hasCompanion: true,
        lensCounts: {
          'hoodoo-folk': 1,
          'historical-classic': 1,
          community: 0,
        },
      };
    }
    if (ch === 3) {
      return {
        chapter: 3,
        totalVerses: 24,
        completedVerses: 10,
        state: 'in_progress',
        bestWPM: 61,
        bestAccuracy: 96,
        unlockedAt: null,
        hasCompanion: true,
        lensCounts: {
          'hoodoo-folk': 1,
          'historical-classic': 1,
          community: 0,
        },
      };
    }
    return {
      chapter: ch,
      totalVerses: ch === 4 ? 26 : 22,
      completedVerses: 0,
      state: 'dormant',
      bestWPM: 0,
      bestAccuracy: 0,
      unlockedAt: null,
      hasCompanion: ch <= 15,
      lensCounts: {
        'hoodoo-folk': 0,
        'historical-classic': ch <= 15 ? 1 : 0,
        community: 0,
      },
    };
  });

  return {
    workId: 'web-bible',
    book: 'Genesis',
    sectionKey: 'GEN',
    biomeId: 'eden-root-garden',
    landmarkName: 'Eden Tree of Roots',
    phase1Active: true,
    state: 'in_progress',
    bookMastered: false,
    totalChapters: 50,
    bloomedChapters: 2,
    totalVerses: 1533,
    completedVerses: 66,
    hasBookGuide: true,
    activeChapter: 3,
    legs: [
      { legId: 'gen-leg-1', label: 'Ch. 1–10', startChapter: 1, endChapter: 10, bloomedCount: 2, totalCount: 10 },
      { legId: 'gen-leg-2', label: 'Ch. 11–20', startChapter: 11, endChapter: 20, bloomedCount: 0, totalCount: 10 },
      { legId: 'gen-leg-3', label: 'Ch. 21–30', startChapter: 21, endChapter: 30, bloomedCount: 0, totalCount: 10 },
      { legId: 'gen-leg-4', label: 'Ch. 31–40', startChapter: 31, endChapter: 40, bloomedCount: 0, totalCount: 10 },
      { legId: 'gen-leg-5', label: 'Ch. 41–50', startChapter: 41, endChapter: 50, bloomedCount: 0, totalCount: 10 },
    ],
    chapters,
  };
}

function buildPsalmsTrailFixture(): TrailBookResponse {
  const bloomedSet = new Set([1, 2, 3, 8, 15, 19, 22, 23, 46, 91, 121, 150]);
  const chapters: TrailChapterWaypoint[] = Array.from({ length: 150 }, (_, idx) => {
    const ch = idx + 1;
    if (bloomedSet.has(ch)) {
      const totalVerses = ch === 23 ? 6 : 12;
      return {
        chapter: ch,
        totalVerses,
        completedVerses: totalVerses,
        state: 'bloomed',
        bestWPM: ch === 23 ? 74 : 70,
        bestAccuracy: ch === 23 ? 99 : 97,
        unlockedAt: '2026-11-19T12:00:00.000Z',
        hasCompanion: true,
        lensCounts: {
          'hoodoo-folk': 1,
          'historical-classic': 1,
          community: ch === 23 ? 1 : 0,
        },
      };
    }
    if (ch === 24) {
      return {
        chapter: 24,
        totalVerses: 10,
        completedVerses: 3,
        state: 'in_progress',
        bestWPM: 65,
        bestAccuracy: 96,
        unlockedAt: null,
        hasCompanion: true,
        lensCounts: {
          'hoodoo-folk': 1,
          'historical-classic': 1,
          community: 0,
        },
      };
    }
    return {
      chapter: ch,
      totalVerses: 14,
      completedVerses: 0,
      state: 'dormant',
      bestWPM: 0,
      bestAccuracy: 0,
      unlockedAt: null,
      hasCompanion: true,
      lensCounts: {
        'hoodoo-folk': 1,
        'historical-classic': 0,
        community: 0,
      },
    };
  });

  return {
    workId: 'web-bible',
    book: 'Psalms',
    sectionKey: 'PSA',
    biomeId: 'twilight-shepherds-sanctuary',
    landmarkName: "Shepherd's Sanctuary Porch",
    phase1Active: true,
    state: 'in_progress',
    bookMastered: false,
    totalChapters: 150,
    bloomedChapters: 12,
    totalVerses: 2461,
    completedVerses: 180,
    hasBookGuide: true,
    activeChapter: 24,
    legs: [
      { legId: 'psa-book-1', label: 'Book I · Psalms 1–41', startChapter: 1, endChapter: 41, bloomedCount: 8, totalCount: 41 },
      { legId: 'psa-book-2', label: 'Book II · Psalms 42–72', startChapter: 42, endChapter: 72, bloomedCount: 1, totalCount: 31 },
      { legId: 'psa-book-3', label: 'Book III · Psalms 73–89', startChapter: 73, endChapter: 89, bloomedCount: 0, totalCount: 17 },
      { legId: 'psa-book-4', label: 'Book IV · Psalms 90–106', startChapter: 90, endChapter: 106, bloomedCount: 1, totalCount: 17 },
      { legId: 'psa-book-5', label: 'Book V · Psalms 107–150', startChapter: 107, endChapter: 150, bloomedCount: 2, totalCount: 44 },
    ],
    chapters,
  };
}

let activeLocationSearch = '';

function renderTrailRoute(initialEntry = '/trail') {
  const qIndex = initialEntry.indexOf('?');
  activeLocationSearch = qIndex >= 0 ? initialEntry.slice(qIndex) : '';
  return render(
    <ThemeProvider>
      <LivingTrailPage />
    </ThemeProvider>
  );
}

describe('LivingTrailPage, WaypointOverlay & TrailChapterList (Story 12.3)', () => {
  let useLocationSpy: jest.SpyInstance;
  let navigateMock: jest.Mock;
  let useNavigateSpy: jest.SpyInstance;
  let canvasContextSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    activeLocationSearch = '';
    navigateMock = jest.fn();
    canvasContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    useLocationSpy = jest.spyOn(router, 'useLocation').mockImplementation(
      () =>
        ({
          pathname: '/trail',
          search: activeLocationSearch,
          hash: '',
          state: null,
          key: 'trail-test',
        }) as any
    );
    useNavigateSpy = jest.spyOn(router, 'useNavigate').mockReturnValue(navigateMock);

    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('entra');
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(mockOwner);
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'entra',
      user: mockOwner,
    });
    (AuthService.getAuthMode as jest.Mock).mockResolvedValue('entra');

    (TrailService.getOverview as jest.Mock).mockResolvedValue(buildOverviewFixture());
    (TrailService.getBookTrail as jest.Mock).mockImplementation(async (book: string) =>
      book === 'Genesis' ? buildGenesisTrailFixture() : buildPsalmsTrailFixture()
    );
    (CompanionService.getChapterCompanion as jest.Mock).mockImplementation(
      async (book: string, chapter: number) => getMockChapterCompanion(book, chapter)
    );
    (CompanionService.getBookGuide as jest.Mock).mockImplementation(async (book: string) =>
      getMockBookGuide(book)
    );
  });

  afterEach(() => {
    useLocationSpy.mockRestore();
    useNavigateSpy.mockRestore();
    canvasContextSpy.mockRestore();
  });

  it('renders Macro Atlas strip with all 9 biomes and 73 books (Genesis & Psalms interactive, 71 mist-veiled)', async () => {
    renderTrailRoute('/trail');

    const atlasSection = await screen.findByTestId('trail-macro-atlas');
    const biomeCards = atlasSection.querySelectorAll('[data-biome-id]');
    expect(biomeCards).toHaveLength(9);

    const allBookNodes = atlasSection.querySelectorAll('[data-book]');
    expect(allBookNodes).toHaveLength(73);

    const playableNodes = atlasSection.querySelectorAll('[data-phase1-active="true"]');
    const veiledNodes = atlasSection.querySelectorAll('[data-phase1-active="false"]');
    expect(playableNodes).toHaveLength(2);
    expect(veiledNodes).toHaveLength(71);

    const genesisBtn = screen.getByTestId('atlas-book-btn-Genesis');
    const psalmsBtn = screen.getByTestId('atlas-book-btn-Psalms');
    expect(genesisBtn).toHaveTextContent('Genesis · 2 / 50 Chapters Bloomed');
    expect(psalmsBtn).toHaveTextContent('Psalms · 12 / 150 Chapters Bloomed');
    // Active traveler in overview is Psalms ch. 24 -> defaults to Psalms
    expect(psalmsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(genesisBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches between Genesis and Psalms and navigates Psalter Books I–V clearings & Quick-Jump controls', async () => {
    renderTrailRoute('/trail?book=Psalms');

    // Psalms activeChapter is 24 -> opens in Book I · Ps. 15–28 clearing
    const clearingHeading = await screen.findByRole('heading', {
      name: /Psalms · Book I · Psalms 1–41 · Ps\. 15–28/i,
    });
    expect(clearingHeading).toBeInTheDocument();

    // Switch across Psalter Books I–V using leg pills
    const book2Btn = screen.getByTestId('trail-leg-btn-psa-book-2');
    fireEvent.click(book2Btn);
    expect(book2Btn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('heading', { name: /Psalms · Book II · Psalms 42–72 · Ps\. 42–52/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Psalm 46, Bloomed, 12 of 12 verses, Companion Ready' })
    ).toBeInTheDocument();

    // Switch to Book V via the clearing <select>
    const clearingSelect = screen.getByTestId('trail-clearing-selector');
    fireEvent.change(clearingSelect, { target: { value: 'psa-book-5-c4' } });
    expect(
      screen.getByRole('heading', { name: /Psalms · Book V · Psalms 107–150 · Ps\. 140–150/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Psalm 150, Bloomed, 12 of 12 verses, Companion Ready' })
    ).toBeInTheDocument();

    // "[Next Active]" jumps back to activeChapter (Psalm 24 in Ps. 15–28) and focuses that waypoint
    fireEvent.click(screen.getByTestId('trail-btn-next-active'));
    const psalm24Btn = await screen.findByRole('button', {
      name: 'Psalm 24, In Progress, 3 of 10 verses',
    });
    expect(document.activeElement).toBe(psalm24Btn);

    // "[Bloomed Only (12)]" filters waypoints in the clearing to bloomed chapters only
    const bloomedOnlyBtn = screen.getByTestId('trail-btn-bloomed-only');
    expect(bloomedOnlyBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bloomedOnlyBtn);
    expect(bloomedOnlyBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Psalm 23, Bloomed, 6 of 6 verses, Companion Ready' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Psalm 24, In Progress, 3 of 10 verses' })
    ).not.toBeInTheDocument();

    // Switch to Genesis from the Macro Atlas strip
    fireEvent.click(screen.getByTestId('atlas-book-btn-Genesis'));
    expect(await screen.findByRole('heading', { name: /Genesis · Ch\. 1–10/i })).toBeInTheDocument();
    expect(TrailService.getBookTrail).toHaveBeenCalledWith('Genesis');
    expect(
      screen.getByRole('button', { name: 'Genesis 1, Bloomed, 31 of 31 verses, Companion Ready' })
    ).toBeInTheDocument();
  });

  it('implements keyboard roving tabindex (ArrowRight/ArrowLeft/Home/End), Enter to open popover, and Escape to close & restore focus', async () => {
    renderTrailRoute('/trail?book=Genesis');

    const gen1Btn = await screen.findByRole('button', {
      name: 'Genesis 1, Bloomed, 31 of 31 verses, Companion Ready',
    });
    const gen2Btn = screen.getByRole('button', {
      name: 'Genesis 2, Bloomed, 25 of 25 verses, Companion Ready',
    });
    const gen10Btn = screen.getByRole('button', {
      name: 'Genesis 10, Dormant, 0 of 22 verses',
    });

    // Initially first waypoint in clearing is the single tab stop
    expect(gen1Btn).toHaveAttribute('tabIndex', '0');
    expect(gen2Btn).toHaveAttribute('tabIndex', '-1');

    gen1Btn.focus();
    expect(document.activeElement).toBe(gen1Btn);

    // ArrowRight moves focus and roving tabIndex=0 to Genesis 2
    fireEvent.keyDown(gen1Btn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(gen2Btn);
    expect(gen2Btn).toHaveAttribute('tabIndex', '0');
    expect(gen1Btn).toHaveAttribute('tabIndex', '-1');

    // ArrowLeft moves focus back to Genesis 1
    fireEvent.keyDown(gen2Btn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(gen1Btn);
    expect(gen1Btn).toHaveAttribute('tabIndex', '0');

    // End jumps to Genesis 10; Home jumps back to Genesis 1
    fireEvent.keyDown(gen1Btn, { key: 'End' });
    expect(document.activeElement).toBe(gen10Btn);
    fireEvent.keyDown(gen10Btn, { key: 'Home' });
    expect(document.activeElement).toBe(gen1Btn);

    // Enter opens the chapter popover and sets aria-expanded="true"
    expect(gen1Btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(gen1Btn, { key: 'Enter' });
    expect(gen1Btn).toHaveAttribute('aria-expanded', 'true');
    const popover = screen.getByTestId('waypoint-popover');
    expect(within(popover).getByRole('heading', { name: 'Genesis 1' })).toBeInTheDocument();

    // Escape closes the popover and restores focus to the Genesis 1 waypoint button
    fireEvent.keyDown(popover, { key: 'Escape' });
    expect(screen.queryByTestId('waypoint-popover')).not.toBeInTheDocument();
    expect(gen1Btn).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(gen1Btn);
  });

  it('renders contextual CTAs & /typing?book=&chapter= links for Dormant, In-Progress, and Bloomed waypoints', async () => {
    renderTrailRoute('/trail?book=Psalms');

    // 1. In-Progress waypoint (Psalm 24: 3 / 10 verses -> 7 verses left)
    const psalm24Btn = await screen.findByRole('button', {
      name: 'Psalm 24, In Progress, 3 of 10 verses',
    });
    fireEvent.click(psalm24Btn);

    let popover = screen.getByTestId('waypoint-popover');
    expect(within(popover).getByTestId('waypoint-popover-state-badge')).toHaveTextContent(
      '◐In Progress'
    );
    expect(popover).toHaveTextContent('3 / 10 verses');
    expect(within(popover).getByTestId('waypoint-locked-companion-teaser')).toHaveTextContent(
      'Unlocks upon chapter completion — 7 verses left'
    );
    const continueLink = within(popover).getByRole('link', { name: /Continue Typing/i });
    expect(continueLink).toHaveAttribute('href', '/typing?book=Psalms&chapter=24');

    // 2. Dormant waypoint (Psalm 25: 0 / 14 verses)
    const psalm25Btn = screen.getByRole('button', {
      name: 'Psalm 25, Dormant, 0 of 14 verses',
    });
    fireEvent.click(psalm25Btn);

    popover = screen.getByTestId('waypoint-popover');
    expect(within(popover).getByTestId('waypoint-popover-state-badge')).toHaveTextContent(
      '◇Dormant'
    );
    expect(popover).toHaveTextContent('0 / 14 verses');
    const dormantLink = within(popover).getByRole('link', { name: 'Type Chapter 25 →' });
    expect(dormantLink).toHaveAttribute('href', '/typing?book=Psalms&chapter=25');

    // 3. Bloomed waypoint (Psalm 23: 6 / 6 verses, 3 lenses)
    const psalm23Btn = screen.getByRole('button', {
      name: 'Psalm 23, Bloomed, 6 of 6 verses, Companion Ready',
    });
    fireEvent.click(psalm23Btn);

    popover = screen.getByTestId('waypoint-popover');
    expect(within(popover).getByTestId('waypoint-popover-state-badge')).toHaveTextContent(
      '✦Bloomed'
    );
    expect(popover).toHaveTextContent('6 / 6 verses');
    expect(popover).toHaveTextContent('Best 74 WPM · 99% Acc');
    const openCompanionBtn = within(popover).getByRole('button', {
      name: /Open Companion Reading Room/i,
    });
    expect(openCompanionBtn).toHaveTextContent('✦ 3 Lenses');
    const retypeLink = within(popover).getByRole('link', { name: 'Re-type Chapter' });
    expect(retypeLink).toHaveAttribute('href', '/typing?book=Psalms&chapter=23');
  });

  it('opens code-split CompanionDrawer in both Chapter Reading Room mode and Book Guide mode over /trail', async () => {
    renderTrailRoute('/trail?book=Psalms');

    const psalm23Btn = await screen.findByRole('button', {
      name: 'Psalm 23, Bloomed, 6 of 6 verses, Companion Ready',
    });
    fireEvent.click(psalm23Btn);

    const openCompanionBtn = within(screen.getByTestId('waypoint-popover')).getByRole('button', {
      name: /Open Companion Reading Room/i,
    });
    fireEvent.click(openCompanionBtn);

    // Lazy-loaded CompanionDrawer opens in chapter Reading Room mode
    const dialog = await screen.findByRole('dialog', { name: /Psalm 23/i });
    expect(dialog).toBeInTheDocument();
    expect(CompanionService.getChapterCompanion).toHaveBeenCalledWith(
      'Psalms',
      23,
      'web-bible'
    );
    expect(
      await within(dialog).findByRole('tablist', { name: /Companion study lenses/i })
    ).toBeInTheDocument();

    // Escape closes CompanionDrawer and restores focus to the Psalm 23 waypoint button on /trail
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => {
      expect(dialog).not.toHaveAttribute('open');
    });
    expect(document.activeElement).toBe(psalm23Btn);

    // Clicking "[Book Guide]" in toolbar opens CompanionDrawer in guide mode with 14-slot prayer schedule
    const bookGuideBtn = screen.getByTestId('trail-btn-book-guide');
    fireEvent.click(bookGuideBtn);

    const guideDialog = await screen.findByRole('dialog', { name: /Psalms — Book Guide/i });
    expect(CompanionService.getBookGuide).toHaveBeenCalledWith('Psalms', 'web-bible');
    expect(
      await within(guideDialog).findByText(/Sunday morning/i)
    ).toBeInTheDocument();
    expect(
      within(guideDialog).getByText(/Introduction to the Five Books of the Psalter/i)
    ).toBeInTheDocument();
  });

  it('toggles Accessible Chapter List semantic table and filters by status and leg', async () => {
    renderTrailRoute('/trail?book=Genesis');

    const listToggleBtn = await screen.findByTestId('trail-btn-chapter-list');
    expect(listToggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('trail-chapter-list')).not.toBeInTheDocument();

    fireEvent.click(listToggleBtn);
    expect(listToggleBtn).toHaveAttribute('aria-expanded', 'true');

    const tableSection = screen.getByTestId('trail-chapter-list');
    const table = within(tableSection).getByRole('table', {
      name: /Genesis chapter waypoints in canonical order/i,
    });
    expect(table).toBeInTheDocument();

    // Filter to Bloomed (2 chapters: Genesis 1 and Genesis 2)
    fireEvent.click(screen.getByTestId('chapter-filter-bloomed'));
    expect(screen.getByTestId('chapter-list-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-list-row-2')).toBeInTheDocument();
    expect(screen.queryByTestId('chapter-list-row-3')).not.toBeInTheDocument();

    // Filter to In Progress (1 chapter: Genesis 3)
    fireEvent.click(screen.getByTestId('chapter-filter-in-progress'));
    expect(screen.getByTestId('chapter-list-row-3')).toHaveTextContent('10 / 24 verses');
    expect(screen.getByTestId('list-type-chapter-3')).toHaveAttribute(
      'href',
      '/typing?book=Genesis&chapter=3'
    );

    // Reset to All and filter by Leg 2 (Ch. 11–20)
    fireEvent.click(screen.getByTestId('chapter-filter-all'));
    fireEvent.change(screen.getByTestId('chapter-list-leg-select'), {
      target: { value: 'gen-leg-2' },
    });
    expect(screen.getByTestId('chapter-list-row-11')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-list-row-20')).toBeInTheDocument();
    expect(screen.queryByTestId('chapter-list-row-1')).not.toBeInTheDocument();

    // Switch back to All Legs and open Companion directly from Genesis 1 row
    fireEvent.change(screen.getByTestId('chapter-list-leg-select'), {
      target: { value: 'all' },
    });
    fireEvent.click(screen.getByTestId('list-read-companion-1'));
    expect(await screen.findByRole('dialog', { name: /Genesis 1/i })).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated in local mode', async () => {
    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('local');
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'local',
      user: null,
    });
    (AuthService.getAuthMode as jest.Mock).mockResolvedValue('local');

    renderTrailRoute('/trail');
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login');
    });
    expect(TrailService.getOverview).not.toHaveBeenCalled();
  });

  it('supports ?chapter= and ?leg= deep-link query params and retries cleanly after an initial API error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      (TrailService.getOverview as jest.Mock).mockRejectedValueOnce(
        new Error('Temporary network outage')
      );

      renderTrailRoute('/trail?book=Genesis&leg=gen-leg-3');
      expect(await screen.findByTestId('trail-error')).toHaveTextContent(
        /Temporary network outage/i
      );

      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
      expect(
        await screen.findByRole('heading', { name: /Genesis · Ch\. 21–30/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Genesis 21, Dormant, 0 of 22 verses' })
      ).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('switches Psalms clearings cleanly under React.StrictMode when starting from an active middle clearing', async () => {
    (TrailService.getOverview as jest.Mock).mockResolvedValue({
      ...buildOverviewFixture(),
      activeTraveler: { biomeId: 'twilight-shepherds-sanctuary', book: 'Psalms', chapter: 23 },
    });
    (TrailService.getBookTrail as jest.Mock).mockResolvedValue({
      ...buildPsalmsTrailFixture(),
      activeChapter: 27,
    });

    activeLocationSearch = '';
    render(
      <React.StrictMode>
        <ThemeProvider>
          <LivingTrailPage />
        </ThemeProvider>
      </React.StrictMode>
    );

    expect(
      await screen.findByRole('heading', { name: /Psalms · Book I · Psalms 1–41 · Ps\. 15–28/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('waypoint-btn-23')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('trail-clearing-pill-psa-book-1-c1'));
    expect(
      screen.getByRole('heading', { name: /Psalms · Book I · Psalms 1–41 · Ps\. 1–14/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('waypoint-btn-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('trail-clearing-pill-psa-book-1-c2'));
    expect(
      screen.getByRole('heading', { name: /Psalms · Book I · Psalms 1–41 · Ps\. 15–28/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('waypoint-btn-23')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('trail-clearing-pill-psa-book-1-c3'));
    expect(
      screen.getByRole('heading', { name: /Psalms · Book I · Psalms 1–41 · Ps\. 29–41/i })
    ).toBeInTheDocument();
  });
});
