import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '../../test-utils';
import { AuthService, StatsService } from '../../services/api';
import { CANONICAL_BOOKS } from '../../data/books';
import { CoverageData } from '../../types';
import Dashboard from './Dashboard';
import { buildCalendarWeeks, getActivityLevel } from './ActivityHeatmap';

jest.mock('../../services/api', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
  },
  StatsService: {
    getTrend: jest.fn(),
    getActivity: jest.fn(),
    getCoverage: jest.fn(),
    getWeakness: jest.fn(),
    getAchievements: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Link: ({ children, to, ...rest }: any) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

function buildSampleCoverage(): CoverageData {
  return {
    overall: { totalVerses: 12, completedVerses: 6, percentage: 50 },
    testaments: [
      { testament: 'Old Testament', totalVerses: 8, completedVerses: 4, percentage: 50 },
      { testament: 'New Testament', totalVerses: 4, completedVerses: 2, percentage: 50 },
    ],
    books: CANONICAL_BOOKS.map((book, index) => {
      if (book === 'Genesis') {
        return {
          book,
          testament: 'Old Testament',
          totalVerses: 4,
          completedVerses: 4,
          percentage: 100,
        };
      }
      if (book === 'Exodus') {
        return {
          book,
          testament: 'Old Testament',
          totalVerses: 4,
          completedVerses: 0,
          percentage: 0,
        };
      }
      if (book === 'Matthew') {
        return {
          book,
          testament: 'New Testament',
          totalVerses: 4,
          completedVerses: 2,
          percentage: 50,
        };
      }
      return {
        book,
        testament: index < 46 ? 'Old Testament' : 'New Testament',
        totalVerses: 0,
        completedVerses: 0,
        percentage: 0,
      };
    }),
  };
}

describe('Dashboard & chart components (Stories 2.3–2.5)', () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'owner1', username: 'owner' });
    (StatsService.getTrend as jest.Mock).mockResolvedValue([
      { date: '2026-11-15', avgWpm: 58.4, avgAccuracy: 96.2, attempts: 3 },
      { date: '2026-11-16', avgWpm: 62.1, avgAccuracy: 97.5, attempts: 5 },
    ]);
    (StatsService.getActivity as jest.Mock).mockResolvedValue([
      { date: `${currentYear}-01-02`, attempts: 4 },
    ]);
    (StatsService.getCoverage as jest.Mock).mockResolvedValue(buildSampleCoverage());
    (StatsService.getWeakness as jest.Mock).mockResolvedValue({
      topCharacters: [
        { char: ';', label: 'Semicolon (;)', count: 4 },
        { char: "'", label: "Apostrophe (')", count: 2 },
      ],
      topWords: [
        { word: 'righteousness', count: 3 },
        { word: "doesn't", count: 2 },
      ],
      totalTrackedAttempts: 5,
      suggestedDrillText: "righteousness doesn't righteousness doesn't",
    });
    (StatsService.getAchievements as jest.Mock).mockResolvedValue({
      streak: {
        currentStreakDays: 3,
        longestStreakDays: 7,
        lastActiveDate: '2026-11-18',
        activeToday: true,
      },
      milestones: {
        totalAttempts: 18,
        bestWpm: 84,
        flawlessCount: 6,
        uniqueVersesCompleted: 12,
        psalmsCompletedCount: 4,
      },
      badges: [
        {
          id: 'first-scribe',
          title: 'First Scribe',
          description: 'Complete your first scripture typing transcription.',
          category: 'consistency',
          unlocked: true,
          progressCurrent: 18,
          progressTarget: 1,
          progressPct: 100,
        },
        {
          id: 'speed-100',
          title: 'Chariot of Fire (100 WPM)',
          description: 'Reach 100 WPM or higher on any verse.',
          category: 'velocity',
          unlocked: false,
          progressCurrent: 84,
          progressTarget: 100,
          progressPct: 84,
        },
      ],
    });
  });

  it('redirects to /login when unauthenticated', () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    render(<Dashboard />);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(StatsService.getTrend).not.toHaveBeenCalled();
  });

  it('renders trend chart, switches range (30/90/365/all), toggles accessible table, and shows empty state', async () => {
    render(<Dashboard />);

    expect(
      await screen.findByRole('heading', { name: 'Statistics Dashboard', level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart-container')).toBeInTheDocument();
    expect(screen.getByText('58.4')).toBeInTheDocument();

    const toggleTableBtn = screen.getByRole('button', { name: /Show data table/i });
    expect(toggleTableBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggleTableBtn);
    expect(toggleTableBtn).toHaveAttribute('aria-expanded', 'true');

    (StatsService.getTrend as jest.Mock).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: '90 Days' }));

    await waitFor(() => {
      expect(StatsService.getTrend).toHaveBeenCalledWith('90');
    });
    expect(
      await screen.findByText(/No typing attempts recorded in this range yet/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '365 Days' }));
    await waitFor(() => expect(StatsService.getTrend).toHaveBeenCalledWith('365'));

    fireEvent.click(screen.getByRole('button', { name: 'All Time' }));
    await waitFor(() => expect(StatsService.getTrend).toHaveBeenCalledWith('all'));
  });

  it('renders activity heatmap with tooltips, non-color labels, year selector, and expandable table', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { name: /Daily Practice Activity/i });

    const activeCell = screen.getByRole('gridcell', {
      name: `${currentYear}-01-02: 4 attempts`,
    });
    expect(activeCell).toHaveAttribute('title', `${currentYear}-01-02: 4 attempts`);
    expect(activeCell).toHaveAttribute('data-level', '2');

    const emptyCell = screen.getByRole('gridcell', {
      name: `${currentYear}-01-01: 0 attempts`,
    });
    expect(emptyCell).toHaveAttribute('data-level', '0');

    fireEvent.focus(activeCell);
    expect(screen.getByText(new RegExp(`${currentYear}-01-02:`))).toBeInTheDocument();

    const yearSelect = screen.getByLabelText('Activity year');
    (StatsService.getActivity as jest.Mock).mockResolvedValueOnce([
      { date: '2025-05-01', attempts: 12 },
    ]);
    fireEvent.change(yearSelect, { target: { value: '2025' } });

    await waitFor(() => {
      expect(StatsService.getActivity).toHaveBeenCalledWith(2025);
    });
    expect(
      await screen.findByRole('gridcell', { name: '2025-05-01: 12 attempts' })
    ).toHaveAttribute('data-level', '4');
  });

  it('renders Bible coverage in canonical order with Complete badge and Continue links', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { name: 'Bible Coverage', level: 3 });

    expect(screen.getByTestId('overall-coverage-percentage')).toHaveTextContent('50.0%');

    const bookList = screen.getByRole('list', { name: /Book coverage list/i });
    const rows = within(bookList).getAllByRole('listitem');
    expect(rows).toHaveLength(73);
    expect(rows[0]).toHaveAttribute('data-testid', 'book-row-Genesis');
    expect(rows[72]).toHaveAttribute('data-testid', 'book-row-Revelation');

    // Genesis is 100% complete -> shows Complete badge, no Continue link
    const genesisRow = screen.getByTestId('book-row-Genesis');
    expect(within(genesisRow).getByText('Complete')).toBeInTheDocument();
    expect(within(genesisRow).queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();

    // Matthew is 50% complete -> shows Continue link to /typing?book=Matthew
    const matthewRow = screen.getByTestId('book-row-Matthew');
    const continueLink = within(matthewRow).getByRole('link', { name: 'Continue' });
    expect(continueLink).toHaveAttribute('href', '/typing?book=Matthew');

    // Filter by New Testament
    fireEvent.click(screen.getByRole('button', { name: 'New Testament' }));
    expect(within(bookList).getAllByRole('listitem')).toHaveLength(27);
  });

  it('shows error state and retries when loading fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      (StatsService.getTrend as jest.Mock).mockRejectedValueOnce(new Error('Network down'));
      render(<Dashboard />);

      expect(
        await screen.findByText(/Failed to load dashboard statistics/i)
      ).toBeInTheDocument();

      (StatsService.getTrend as jest.Mock).mockResolvedValueOnce([]);
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

      expect(
        await screen.findByRole('heading', { name: 'Statistics Dashboard', level: 2 })
      ).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('builds exact calendar cells for leap and non-leap years', () => {
    expect(getActivityLevel(0)).toBe(0);
    expect(getActivityLevel(1)).toBe(1);
    expect(getActivityLevel(3)).toBe(2);
    expect(getActivityLevel(6)).toBe(3);
    expect(getActivityLevel(11)).toBe(4);

    const weeks2024 = buildCalendarWeeks(2024, [{ date: '2024-02-29', attempts: 7 }]);
    const cells2024 = weeks2024.flat().filter(Boolean);
    expect(cells2024).toHaveLength(366);
    expect(cells2024.find((c) => c?.date === '2024-02-29')?.level).toBe(3);

    const weeks2026 = buildCalendarWeeks(2026, []);
    const cells2026 = weeks2026.flat().filter(Boolean);
    expect(cells2026).toHaveLength(365);
  });

  it('renders Streaks, Milestones & Badges and Weakness Analytics with interactive Weak Words Drill (Epics 6 & 8)', async () => {
    render(<Dashboard />);

    expect(
      await screen.findByRole('heading', { name: /Streaks, Milestones & Badges/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('current-streak-value')).toHaveTextContent('3 Days');
    expect(screen.getByTestId('longest-streak-value')).toHaveTextContent('7 Days');
    expect(screen.getByTestId('best-wpm-value')).toHaveTextContent('84 WPM');
    expect(screen.getByTestId('flawless-verses-value')).toHaveTextContent('6');
    expect(screen.getByTestId('badge-card-first-scribe')).toHaveClass('is-unlocked');
    expect(screen.getByTestId('badge-card-speed-100')).toHaveClass('is-locked');

    expect(
      screen.getByRole('heading', { name: /Per-Word & Per-Character Weakness Analytics/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('weak-char-;')).toHaveTextContent('Semicolon (;)');
    expect(screen.getByTestId('weak-word-righteousness')).toHaveTextContent('righteousness');

    // Open and complete the interactive Weak Words Drill
    fireEvent.click(screen.getByTestId('toggle-weak-words-drill'));
    const drillInput = screen.getByLabelText('Weak words drill input');
    fireEvent.change(drillInput, {
      target: { value: "righteousness doesn't righteousness doesn't" },
    });

    expect(await screen.findByTestId('weakness-drill-result')).toHaveTextContent(
      /Drill Complete/i
    );
  });
});
