import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import TypingTest from './TypingTest';
import {
  VerseService,
  ProgressService,
  AuthService,
  MemoryService,
  PlanService,
  CompanionService,
  StatsService,
} from '../services/api';

const mockVerse = {
  _id: '1',
  verseOrder: 1,
  book: 'Genesis',
  chapter: 1,
  verse: 1,
  text: 'In the beginning, God created the heavens and the earth.',
  characters: 56,
  words: 12,
};

// Mock only the API service exports
jest.mock('../services/api', () => ({
  VerseService: {
    getRandomVerse: jest.fn(),
    getVersesByBook: jest.fn(),
    getVersesByBookAndChapter: jest.fn(),
    getBookChapters: jest.fn(),
    getVerseContext: jest.fn(),
    getVerseByOrder: jest.fn(),
    getNextVerse: jest.fn(),
  },
  ProgressService: {
    submitResult: jest.fn(),
    getUserProgress: jest.fn(),
    getBookChapterProgress: jest.fn(),
  },
  AuthService: {
    getCurrentUser: jest.fn(),
  },
  MemoryService: {
    getDeck: jest.fn(),
    saveVerse: jest.fn(),
  },
  PlanService: {
    getPlanDetail: jest.fn(),
    getCustomPlans: jest.fn(),
    getCustomPlanDetail: jest.fn(),
    updateCustomPlan: jest.fn(),
  },
  CompanionService: {
    getChapterCompanion: jest.fn(),
    getBookGuide: jest.fn(),
    searchCompanion: jest.fn(),
  },
  StatsService: {
    getAchievements: jest.fn(),
  },
}));

describe('TypingTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (VerseService.getRandomVerse as jest.Mock).mockResolvedValue(mockVerse);
    (VerseService.getVersesByBook as jest.Mock).mockResolvedValue({ data: [mockVerse] });
    (VerseService.getVersesByBookAndChapter as jest.Mock).mockResolvedValue([mockVerse]);
    (VerseService.getBookChapters as jest.Mock).mockResolvedValue([
      { chapter: 1, verseCount: 31 },
      { chapter: 23, verseCount: 6 },
    ]);
    (VerseService.getVerseContext as jest.Mock).mockResolvedValue({ prev: null, next: null });
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValue(mockVerse);
    (VerseService.getNextVerse as jest.Mock).mockResolvedValue({ complete: false, verse: mockVerse });
    (PlanService.getCustomPlans as jest.Mock).mockResolvedValue([]);
    (ProgressService.submitResult as jest.Mock).mockResolvedValue({});
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([]);
    (StatsService.getAchievements as jest.Mock).mockResolvedValue({
      streak: {
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActiveDate: null,
        activeToday: false,
      },
      milestones: {
        totalAttempts: 0,
        bestWpm: 0,
        flawlessCount: 0,
        uniqueVersesCompleted: 0,
        psalmsCompletedCount: 0,
        bloomedChaptersCount: 0,
        completedClearingsCount: 0,
      },
      badges: [],
    });
    (ProgressService.getBookChapterProgress as jest.Mock).mockResolvedValue({
      book: 'Genesis',
      chapter: 1,
      chapterCompleted: 21,
      chapterTotal: 31,
      chapterPercentage: 67.7,
      bookCompleted: 21,
      bookTotal: 1533,
      bookPercentage: 1.4,
    });
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (MemoryService.getDeck as jest.Mock).mockResolvedValue([]);
    (MemoryService.saveVerse as jest.Mock).mockResolvedValue({});
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValue({
      workId: 'web-bible',
      book: 'Psalms',
      chapter: 23,
      unlocked: true,
      progress: {
        completedVerses: 6,
        totalVerses: 6,
        state: 'bloomed',
        bestWPM: 70,
        bestAccuracy: 99,
        unlockedAt: '2026-11-20T00:00:00.000Z',
      },
      lensCounts: { 'hoodoo-folk': 1, 'historical-classic': 1, community: 0 },
      lenses: {
        'hoodoo-folk': [
          {
            id: 'mock-ps23',
            upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:mock:0',
            workId: 'web-bible',
            sectionKey: 'PSA',
            book: 'Psalms',
            chapter: 23,
            entryType: 'chapter-companion',
            lens: 'hoodoo-folk',
            visibility: 'public-domain',
            sortOrder: 0,
            title: 'Psalm 23 Folk Study Sample',
            summary: 'Sample summary.',
            body: 'Sample body.',
            purposes: [],
            indexPurposes: [],
            ritualTags: [],
            citedVerses: [],
            dailySchedule: [],
            source: { sourceId: 'mock', title: 'Public-Domain Sample' },
          },
        ],
        'historical-classic': [],
        community: [],
      },
    });
  });

  it('should render loading state initially, then the verse', async () => {
    render(<TypingTest />);
    expect(screen.getByText('Loading verse...')).toBeInTheDocument();

    const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
    expect(verseDisplay).toHaveTextContent(mockVerse.text);
  });

  it('should render the verse after loading', async () => {
    render(<TypingTest />);

    const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
    expect(verseDisplay).toHaveTextContent(mockVerse.text);

    const textarea = await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    );
    expect(textarea).toBeInTheDocument();
  });

  it('should update typed text and calculate WPM/accuracy as user types', async () => {
    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'In the beginning' } });

    expect(textarea.value).toBe('In the beginning');
    expect(await screen.findByText(/WPM:/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(await screen.findByText(/Accuracy:/, {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('should mark correct and incorrect characters', async () => {
    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'In the beginninX' } });

    await waitFor(
      () => {
        expect(screen.getAllByText('g')[1].closest('span')).toHaveClass('incorrect');
        expect(screen.getByText('I').closest('span')).toHaveClass('correct');
      },
      { timeout: 2000 }
    );
  });

  it('should show 0% accuracy when all typed characters are incorrect', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'XXXXX' } });

    const accuracyLabel = await screen.findByText(/Accuracy:/, {}, { timeout: 2000 });
    expect(accuracyLabel.parentElement).toHaveTextContent('Accuracy: 0%');

    const allWrongVerse = 'X'.repeat(mockVerse.text.length);
    fireEvent.change(textarea, { target: { value: allWrongVerse } });

    expect(
      await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
        expect(ProgressService.submitResult).toHaveBeenCalledWith(
          expect.objectContaining({
            accuracy: 0,
            incorrectCharacters: mockVerse.text.length,
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should show results and call submitResult on single-change completion if user is logged in', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    expect(
      await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
    ).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
        expect(ProgressService.submitResult).toHaveBeenCalledWith(
          expect.objectContaining({
            user: 'user123',
            verse: mockVerse._id,
            verseOrder: mockVerse.verseOrder,
            wpm: expect.any(Number),
            cps: expect.any(Number),
            accuracy: 100,
            incorrectCharacters: 0,
            totalCharacters: mockVerse.characters,
          })
        );
      },
      { timeout: 2000 }
    );

    const submitted = (ProgressService.submitResult as jest.Mock).mock.calls[0][0];
    expect(Number.isFinite(submitted.wpm)).toBe(true);
    expect(Number.isFinite(submitted.cps)).toBe(true);
    expect(submitted.duration).toBeGreaterThanOrEqual(0);
  });

  it('should compute exact non-zero wpm, cps, duration, and Time display on two-step completion', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    const RealDate = global.Date;
    let currentTime = new RealDate('2026-01-01T00:00:00.000Z').getTime();
    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(currentTime);
        } else {
          super(...(args as [any]));
        }
      }
    }

    global.Date = MockDate as unknown as DateConstructor;
    try {
      render(<TypingTest />);
      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'I' } });
      await screen.findByText(/WPM:/, {}, { timeout: 2000 });

      currentTime += 30000;
      fireEvent.change(textarea, { target: { value: mockVerse.text } });

      expect(
        await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
      ).toBeInTheDocument();

      expect(screen.getByText('Words Per Minute:').nextElementSibling).toHaveTextContent('24');
      expect(screen.getByText('Accuracy:').nextElementSibling).toHaveTextContent('100%');
      expect(screen.getByText('Time:').nextElementSibling).toHaveTextContent('30.0 seconds');

      await waitFor(
        () => {
          expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      const submitted = (ProgressService.submitResult as jest.Mock).mock.calls[0][0];
      expect(submitted).toEqual(
        expect.objectContaining({
          user: 'user123',
          verse: mockVerse._id,
          verseOrder: mockVerse.verseOrder,
          duration: 30000,
          wpm: 24,
          accuracy: 100,
          incorrectCharacters: 0,
          totalCharacters: mockVerse.characters,
        })
      );
      expect(submitted.cps).toBeCloseTo(56 / 30, 10);
    } finally {
      global.Date = RealDate;
    }
  });

  it('should count overshoot characters on completion when typedText exceeds verse.text', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: mockVerse.text + '!' } });

    expect(
      await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
        expect(ProgressService.submitResult).toHaveBeenCalledWith(
          expect.objectContaining({
            incorrectCharacters: 1,
            accuracy: 98,
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should not crash if submitResult rejects on completion', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);
    (ProgressService.submitResult as jest.Mock).mockRejectedValueOnce(new Error('Submit failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<TypingTest />);
      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: mockVerse.text } });

      expect(
        await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
      ).toBeInTheDocument();

      await waitFor(
        () => {
          expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to submit result:',
            expect.any(Error)
          );
        },
        { timeout: 2000 }
      );

      expect(screen.getByRole('button', { name: /Try Another Verse/i })).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should not call submitResult on completion if no user is logged in', async () => {
    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    expect(
      await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
    ).toBeInTheDocument();
    expect(ProgressService.submitResult).not.toHaveBeenCalled();
  });

  it('should display an error message if verse fetching fails and retry on "Try Again"', async () => {
    (VerseService.getRandomVerse as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<TypingTest />);

      expect(await screen.findByText('Failed to fetch', {}, { timeout: 2000 })).toBeInTheDocument();
      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      expect(tryAgainButton).toBeInTheDocument();

      fireEvent.click(tryAgainButton);

      const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
      expect(verseDisplay).toHaveTextContent(mockVerse.text);
      expect(VerseService.getRandomVerse).toHaveBeenCalledTimes(2);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should fetch a new random verse and reset wpm/accuracy when "Try Another Verse" is clicked', async () => {
    const RealDate = global.Date;
    let currentTime = new RealDate('2026-01-01T00:00:00.000Z').getTime();
    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(currentTime);
        } else {
          super(...(args as [any]));
        }
      }
    }

    global.Date = MockDate as unknown as DateConstructor;
    try {
      render(<TypingTest />);
      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'I' } });
      await screen.findByText(/WPM:/, {}, { timeout: 2000 });

      currentTime += 30000;
      fireEvent.change(textarea, { target: { value: mockVerse.text } });
      expect(
        await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
      ).toBeInTheDocument();
      expect(screen.getByText('Words Per Minute:').nextElementSibling).toHaveTextContent('24');

      (VerseService.getRandomVerse as jest.Mock).mockResolvedValueOnce({
        ...mockVerse,
        _id: '2',
        text: 'Another verse.',
      });

      fireEvent.click(screen.getByRole('button', { name: /Try Another Verse/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('verse-display')).toHaveTextContent('Another verse.');
        },
        { timeout: 2000 }
      );
      expect(VerseService.getRandomVerse).toHaveBeenCalledTimes(2);

      const nextTextarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;
      fireEvent.change(nextTextarea, { target: { value: 'A' } });

      const wpmLabel = await screen.findByText(/WPM:/, {}, { timeout: 2000 });
      expect(wpmLabel.parentElement).toHaveTextContent('WPM: 0');
      expect(screen.getByText(/Accuracy:/).parentElement).toHaveTextContent('Accuracy: 100%');
    } finally {
      global.Date = RealDate;
    }
  });

  it('should reset accuracy and typed text when "Get Another Verse" is clicked mid-typing', async () => {
    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'X' } });
    const accuracyLabel = await screen.findByText(/Accuracy:/, {}, { timeout: 2000 });
    expect(accuracyLabel.parentElement).toHaveTextContent('Accuracy: 0%');

    (VerseService.getRandomVerse as jest.Mock).mockResolvedValueOnce({
      ...mockVerse,
      _id: '2',
      text: 'Another verse.',
    });

    fireEvent.click(screen.getByRole('button', { name: /Get Another Verse/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId('verse-display')).toHaveTextContent('Another verse.');
      },
      { timeout: 2000 }
    );

    const nextTextarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;
    expect(nextTextarea.value).toBe('');

    fireEvent.change(nextTextarea, { target: { value: 'A' } });
    const nextAccuracyLabel = await screen.findByText(/Accuracy:/, {}, { timeout: 2000 });
    expect(nextAccuracyLabel.parentElement).toHaveTextContent('Accuracy: 100%');
  });

  it('should switch to "By Book" mode and fetch a verse by book', async () => {
    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: /By Book/i }));
    expect(screen.getByText('-- Select a Book --')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Genesis' } });
    fireEvent.click(screen.getByRole('button', { name: /Get Verse/i }));

    await waitFor(
      () => {
        expect(VerseService.getVersesByBook).toHaveBeenCalledWith('Genesis');
        expect(screen.getByTestId('verse-display')).toHaveTextContent(mockVerse.text);
      },
      { timeout: 2000 }
    );
  });

  it('should disable "Sequential" mode button if no user is logged in', async () => {
    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    const sequentialButton = screen.getByRole('button', { name: /Sequential/i });
    expect(sequentialButton).toBeDisabled();
    expect(sequentialButton).toHaveAttribute('title', 'Login to use sequential mode');
  });

  it('should enable "Sequential" mode button if a user is logged in', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    const sequentialButton = screen.getByRole('button', { name: /Sequential/i });
    expect(sequentialButton).not.toBeDisabled();
    expect(sequentialButton).toHaveAttribute('title', '');
  });

  it('should switch to "Sequential" mode and fetch the next verse', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([{ verseOrder: 1 }]);
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValue({
      ...mockVerse,
      _id: '2',
      verseOrder: 2,
      text: 'The second verse.',
    });

    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: /Sequential/i }));
    fireEvent.click(screen.getByRole('button', { name: /Get Verse/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId('verse-display')).toHaveTextContent('The second verse.');
      },
      { timeout: 2000 }
    );
    expect(ProgressService.getUserProgress).toHaveBeenCalledTimes(1);
    expect(VerseService.getVerseByOrder).toHaveBeenCalledWith(2);
  });

  it('honors ?book= query param via VerseService.getNextVerse and renders canonical 73 books without duplicate keys', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest
      .spyOn(router, 'useLocation')
      .mockReturnValue({ pathname: '/typing', search: '?book=Psalms' });

    const psalmVerse = {
      ...mockVerse,
      _id: 'ps1',
      verseOrder: 13940,
      book: 'Psalms',
      chapter: 23,
      verse: 1,
      text: 'The LORD is my shepherd.',
      characters: 24,
      words: 5,
    };
    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: false,
      verse: psalmVerse,
    });

    try {
      render(<TypingTest />);

      const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
      expect(verseDisplay).toHaveTextContent(psalmVerse.text);
      expect(VerseService.getNextVerse).toHaveBeenCalledWith('Psalms');

      const select = screen.getByRole('combobox', {
        name: 'Select a Bible book',
      }) as HTMLSelectElement;
      expect(select.value).toBe('Psalms');
      // 73 canonical books + 1 placeholder option
      expect(select.options).toHaveLength(74);
      const optionValues = Array.from(select.options).map((o) => o.value);
      expect(new Set(optionValues).size).toBe(optionValues.length);
      expect(optionValues).toContain('1 John');
      expect(optionValues).toContain('Tobit');
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('shows book-complete state when VerseService.getNextVerse reports complete', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest
      .spyOn(router, 'useLocation')
      .mockReturnValue({ pathname: '/typing', search: '?book=Genesis' });

    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: true,
      verse: null,
    });

    try {
      render(<TypingTest />);

      const completeState = await screen.findByTestId('book-complete-state', {}, { timeout: 2000 });
      expect(completeState).toHaveTextContent('Genesis Complete!');
      expect(screen.getByRole('link', { name: /Back to Dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard'
      );
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('auto-advances to the next verse in the book after completing a verse in By Book mode', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest
      .spyOn(router, 'useLocation')
      .mockReturnValue({ pathname: '/typing', search: '?book=Psalms' });

    const psalm1 = {
      ...mockVerse,
      _id: 'ps1',
      verseOrder: 13594,
      book: 'Psalms',
      chapter: 1,
      verse: 1,
      text: "Blessed is the man who doesn't walk in the counsel of the wicked;",
      characters: 65,
      words: 13,
    };
    const psalm2 = {
      ...mockVerse,
      _id: 'ps2',
      verseOrder: 13595,
      book: 'Psalms',
      chapter: 1,
      verse: 2,
      text: "but his delight is in Yahweh's law.",
      characters: 35,
      words: 7,
    };

    (VerseService.getNextVerse as jest.Mock)
      .mockResolvedValueOnce({ complete: false, verse: psalm1 })
      .mockResolvedValueOnce({ complete: false, verse: psalm2 });

    try {
      render(<TypingTest />);

      const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
      expect(verseDisplay).toHaveTextContent(psalm1.text);

      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: psalm1.text } });

      await waitFor(
        () => {
          expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
          expect(VerseService.getNextVerse).toHaveBeenCalledWith('Psalms', 13594);
          expect(screen.getByTestId('verse-display')).toHaveTextContent(psalm2.text);
        },
        { timeout: 2000 }
      );

      expect(screen.getByTestId('last-completed-banner')).toHaveTextContent(
        'Completed Psalms 1:1'
      );
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('saves the active verse to the Memory Deck when "★ Save to Memory Deck" is clicked', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });

    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    const saveBtn = screen.getByTestId('save-memory-button');
    expect(saveBtn).toHaveTextContent('★ Save to Memory Deck');

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(MemoryService.saveVerse).toHaveBeenCalledWith(
        expect.objectContaining({
          verseId: mockVerse._id,
          book: mockVerse.book,
          chapter: mockVerse.chapter,
          verse: mockVerse.verse,
        })
      );
      expect(screen.getByTestId('save-memory-button')).toHaveTextContent(
        '✓ Saved in Memory Deck'
      );
    });
  });

  it('honors ?plan=<planId> query param and advances sequentially through the curated plan', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest
      .spyOn(router, 'useLocation')
      .mockReturnValue({ pathname: '/typing', search: '?plan=psalms-mantras' });

    const planV1 = {
      ...mockVerse,
      _id: 'pm-1',
      verseOrder: 13594,
      book: 'Psalms',
      chapter: 1,
      verse: 1,
      text: 'Blessed is the man.',
      characters: 19,
      words: 4,
    };
    const planV2 = {
      ...mockVerse,
      _id: 'pm-2',
      verseOrder: 13940,
      book: 'Psalms',
      chapter: 23,
      verse: 1,
      text: 'The LORD is my shepherd.',
      characters: 24,
      words: 5,
    };

    (PlanService.getPlanDetail as jest.Mock).mockResolvedValueOnce({
      id: 'psalms-mantras',
      title: 'Psalms for Daily Mantras & Focus',
      verses: [planV1, planV2],
      completedVerseIds: [],
    });

    try {
      render(<TypingTest />);

      const banner = await screen.findByTestId('active-plan-banner', {}, { timeout: 2000 });
      expect(banner).toHaveTextContent('Curated Plan: Psalms for Daily Mantras & Focus');
      expect(banner).toHaveTextContent('Verse 1 of 2');
      expect(screen.getByTestId('verse-display')).toHaveTextContent(planV1.text);

      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: planV1.text } });

      await waitFor(() => {
        expect(screen.getByTestId('active-plan-banner')).toHaveTextContent('Verse 2 of 2');
        expect(screen.getByTestId('verse-display')).toHaveTextContent(planV2.text);
      });
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('tracks keystroke mismatch indices during typing and submits missedChars and missedWords to ProgressService.submitResult', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    // Mistype comma after "beginning" as semicolon, then fix and complete
    fireEvent.change(textarea, { target: { value: 'In the beginning;' } });
    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    await waitFor(
      () => {
        expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
        expect(ProgressService.submitResult).toHaveBeenCalledWith(
          expect.objectContaining({
            missedChars: [{ char: ',', count: 1 }],
            missedWords: [{ word: 'beginning', count: 1 }],
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('starts in sequential mode with auto-advance when navigated to /typing?mode=sequential', async () => {
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?mode=sequential',
      hash: '',
      state: null,
      key: 'seq-mode-test',
    });

    try {
      const loggedInUser = { _id: 'user123' };
      (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);
      (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([
        { verseOrder: 10 },
      ]);
      const seqVerse = {
        ...mockVerse,
        _id: 'v11',
        verseOrder: 11,
        text: 'God said, Let the earth yield grass.',
      };
      (VerseService.getVerseByOrder as jest.Mock).mockResolvedValue(seqVerse);

      render(<TypingTest />);

      const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
      expect(verseDisplay).toHaveTextContent(seqVerse.text);
      expect(VerseService.getVerseByOrder).toHaveBeenCalledWith(11);
      expect(screen.getByRole('button', { name: 'Sequential' })).toHaveClass('active');
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('opens the book selector cleanly when navigated to /typing?mode=book without a book param', async () => {
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?mode=book',
      hash: '',
      state: null,
      key: 'book-mode-test',
    });

    try {
      render(<TypingTest />);

      const bookSelect = await screen.findByLabelText('Select a Bible book', {}, { timeout: 2000 });
      expect(bookSelect).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'By Book' })).toHaveClass('active');
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('displays live chapter and book completion percentages and refreshes after completing a verse', async () => {
    const loggedInUser = { _id: 'user123' };
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(loggedInUser);
    (ProgressService.getBookChapterProgress as jest.Mock)
      .mockResolvedValueOnce({
        book: 'Genesis',
        chapter: 1,
        chapterCompleted: 21,
        chapterTotal: 31,
        chapterPercentage: 67.7,
        bookCompleted: 21,
        bookTotal: 1533,
        bookPercentage: 1.4,
      })
      .mockResolvedValueOnce({
        book: 'Genesis',
        chapter: 1,
        chapterCompleted: 22,
        chapterTotal: 31,
        chapterPercentage: 71.0,
        bookCompleted: 22,
        bookTotal: 1533,
        bookPercentage: 1.4,
      });

    render(<TypingTest />);

    const strip = await screen.findByTestId('chapter-book-progress', {}, { timeout: 2000 });
    expect(strip).toHaveTextContent('Chapter 1');
    expect(strip).toHaveTextContent('21 / 31 verses');
    expect(strip).toHaveTextContent('67.7%');
    expect(strip).toHaveTextContent('Genesis');
    expect(strip).toHaveTextContent('21 / 1,533 verses');
    expect(strip).toHaveTextContent('1.4%');

    const chapterBar = screen.getByLabelText('Chapter 1') as HTMLProgressElement;
    const bookBar = screen.getByLabelText('Genesis') as HTMLProgressElement;
    expect(chapterBar.value).toBe(21);
    expect(chapterBar.max).toBe(31);
    expect(bookBar.value).toBe(21);
    expect(bookBar.max).toBe(1533);

    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    await waitFor(
      () => {
        expect(screen.getByTestId('chapter-book-progress')).toHaveTextContent('22 / 31 verses');
        expect(screen.getByTestId('chapter-book-progress')).toHaveTextContent('71.0%');
        expect(screen.getByTestId('chapter-book-progress')).toHaveTextContent('22 / 1,533 verses');
      },
      { timeout: 2000 }
    );
  });

  it('supports Chapter/Verse picker, Passage Flow previews, Strict Mode typo gating, and Zen Mode (Esc)', async () => {
    const psalm23v1 = {
      _id: 'p23-1',
      verseOrder: 13940,
      book: 'Psalms',
      chapter: 23,
      verse: 1,
      text: 'Yahweh is my shepherd.',
      characters: 22,
      words: 4,
    };
    const psalm23v2 = {
      _id: 'p23-2',
      verseOrder: 13941,
      book: 'Psalms',
      chapter: 23,
      verse: 2,
      text: 'He makes me lie down in green pastures.',
      characters: 39,
      words: 8,
    };
    (VerseService.getVersesByBookAndChapter as jest.Mock).mockResolvedValue([psalm23v1, psalm23v2]);
    (VerseService.getVerseContext as jest.Mock).mockResolvedValue({
      prev: { verseOrder: 13940, book: 'Psalms', chapter: 23, verse: 1, text: psalm23v1.text },
      next: { verseOrder: 13942, book: 'Psalms', chapter: 23, verse: 3, text: 'He restores my soul.' },
    });

    render(<TypingTest />);
    await screen.findByTestId('verse-display', {}, { timeout: 2000 });

    // Switch to By Book -> select Psalms -> pick Chapter 23 -> pick v. 2
    fireEvent.click(screen.getByRole('button', { name: 'By Book' }));
    const bookSelect = screen.getByLabelText('Select a Bible book');
    fireEvent.change(bookSelect, { target: { value: 'Psalms' } });

    const chapterSelect = await screen.findByLabelText('Select a chapter', {}, { timeout: 2000 });
    fireEvent.change(chapterSelect, { target: { value: '23' } });

    const verseSelect = await screen.findByLabelText('Select a verse', {}, { timeout: 2000 });
    fireEvent.change(verseSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByTestId('verse-display')).toHaveTextContent(psalm23v2.text);
    });

    // Passage Flow shows prev & next verses
    expect(await screen.findByTestId('passage-context-prev')).toHaveTextContent(psalm23v1.text);
    expect(screen.getByTestId('passage-context-next')).toHaveTextContent('He restores my soul.');

    // Enable Strict Mode & turn off Auto-advance to verify typo gating
    fireEvent.click(screen.getByLabelText('Auto-advance'));
    fireEvent.click(screen.getByLabelText('Strict Mode'));

    const input = screen.getByPlaceholderText('Start typing the verse above...');
    const wrongText = 'X' + psalm23v2.text.slice(1);
    fireEvent.change(input, { target: { value: wrongText } });

    expect(await screen.findByTestId('strict-mode-alert')).toHaveTextContent(
      'Strict Mode: fix 1 highlighted typo'
    );
    expect(screen.queryByRole('heading', { name: /Verse Completed!/i })).not.toBeInTheDocument();

    // Fix typo -> completes cleanly
    fireEvent.change(input, { target: { value: psalm23v2.text } });
    expect(await screen.findByRole('heading', { name: /Verse Completed!/i })).toBeInTheDocument();

    // Zen Mode toggle & Escape exit
    fireEvent.click(screen.getByTestId('enter-zen-button'));
    expect(document.documentElement.dataset.zen).toBe('true');
    expect(screen.getByTestId('zen-topbar')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(document.documentElement.dataset.zen).toBeUndefined();
    });
  });

  it('loads and practices a custom playlist when navigated to /typing?customPlan=<id>', async () => {
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?customPlan=cp-1',
      hash: '',
      state: null,
      key: 'custom-plan-test',
    });

    try {
      const v1 = {
        _id: 'cp-v1',
        verseOrder: 13940,
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'Yahweh is my shepherd.',
        characters: 22,
        words: 4,
      };
      (PlanService.getCustomPlanDetail as jest.Mock).mockResolvedValue({
        _id: 'cp-1',
        title: 'My Morning Mantras',
        description: 'Focus verses',
        totalVerses: 1,
        completedVerses: 0,
        inMemoryDeckCount: 0,
        verseRefs: [{ book: 'Psalms', chapter: 23, verse: 1 }],
        verses: [v1],
        completedVerseIds: [],
      });

      render(<TypingTest />);

      const banner = await screen.findByTestId('active-plan-banner', {}, { timeout: 2000 });
      expect(banner).toHaveTextContent('Custom Playlist: My Morning Mantras');
      expect(screen.getByTestId('verse-display')).toHaveTextContent(v1.text);
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('deep-links /typing?book=Psalms&chapter=23 via VerseService.getNextVerse(book, { chapter }) and starts at next untyped verse', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?book=Psalms&chapter=23',
      hash: '',
      state: null,
      key: 'deep-link-ch23',
    });

    const psalm23v4 = {
      _id: 'ps23-4',
      verseOrder: 13943,
      book: 'Psalms',
      chapter: 23,
      verse: 4,
      text: 'Even though I walk through the valley of the shadow of death.',
      characters: 61,
      words: 12,
    };
    const psalm23v5 = {
      _id: 'ps23-5',
      verseOrder: 13944,
      book: 'Psalms',
      chapter: 23,
      verse: 5,
      text: 'You prepare a table before me.',
      characters: 30,
      words: 6,
    };

    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: false,
      chapterComplete: false,
      verse: psalm23v4,
    });
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValueOnce(psalm23v5);

    try {
      render(<TypingTest />);

      const verseDisplay = await screen.findByTestId('verse-display', {}, { timeout: 2000 });
      expect(verseDisplay).toHaveTextContent(psalm23v4.text);
      expect(VerseService.getNextVerse).toHaveBeenCalledWith('Psalms', { chapter: 23 });

      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: psalm23v4.text } });

      await waitFor(() => {
        expect(VerseService.getVerseByOrder).toHaveBeenCalledWith(13944);
        expect(screen.getByTestId('verse-display')).toHaveTextContent(psalm23v5.text);
      });
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('preserves .typing-input-inline focus and renders quiet Chapter Bloom whisper pill without auto-opening drawer in Auto-Advance', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?book=Psalms&chapter=23',
      hash: '',
      state: null,
      key: 'bloom-autoadvance',
    });

    const ps23v6 = {
      _id: 'ps23-6',
      verseOrder: 13945,
      book: 'Psalms',
      chapter: 23,
      verse: 6,
      text: 'Surely goodness and loving kindness shall follow me.',
      characters: 52,
      words: 8,
    };
    const ps24v1 = {
      _id: 'ps24-1',
      verseOrder: 13946,
      book: 'Psalms',
      chapter: 24,
      verse: 1,
      text: 'The earth is Yahweh’s, with its fullness.',
      characters: 41,
      words: 7,
    };

    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: false,
      chapterComplete: false,
      verse: ps23v6,
    });
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValueOnce(ps24v1);
    (ProgressService.submitResult as jest.Mock).mockResolvedValueOnce({
      result: { _id: 'r1' },
      progress: { _id: 'p1', completed: true },
      chapterJustUnlocked: {
        workId: 'web-bible',
        book: 'Psalms',
        chapter: 23,
        totalVerses: 6,
        unlockedAt: '2026-11-20T00:00:00.000Z',
        companionCount: 3,
        availableLenses: ['hoodoo-folk', 'historical-classic', 'community'],
      },
    });

    try {
      render(<TypingTest />);

      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;
      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      // Complete final verse of Psalm 23
      fireEvent.change(textarea, { target: { value: ps23v6.text } });

      const whisperPill = await screen.findByTestId(
        'chapter-bloom-whisper-pill',
        {},
        { timeout: 2000 }
      );
      expect(whisperPill).toHaveTextContent('Psalm 23 Bloomed');
      expect(whisperPill).toHaveTextContent('Companion Unlocked');

      // Polite atomic live region wraps the whisper pill
      const liveRegion = screen.getByTestId('chapter-bloom-live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      // Drawer NEVER auto-opens, and keyboard focus stays strictly inside .typing-input-inline!
      expect(screen.queryByTestId('companion-drawer')).not.toBeInTheDocument();
      const activeInput = screen.getByPlaceholderText('Start typing the verse above...');
      expect(activeInput).toHaveClass('typing-input-inline');
      expect(document.activeElement).toBe(activeInput);

      // Clicking "Open Reading Room" lazy-mounts CompanionDrawer on user cadence
      fireEvent.click(screen.getByTestId('chapter-bloom-open-btn'));
      const drawer = await screen.findByTestId('companion-drawer', {}, { timeout: 2000 });
      expect(drawer).toHaveTextContent('Psalm 23');
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('queues multiple chapter blooms into a deduplicated Session Harvest Strip', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?book=Psalms&chapter=23',
      hash: '',
      state: null,
      key: 'multi-bloom-queue',
    });

    const ps23v6 = {
      _id: 'ps23-6',
      verseOrder: 13945,
      book: 'Psalms',
      chapter: 23,
      verse: 6,
      text: 'Goodness and mercy.',
      characters: 19,
      words: 3,
    };
    const ps24v10 = {
      _id: 'ps24-10',
      verseOrder: 13955,
      book: 'Psalms',
      chapter: 24,
      verse: 10,
      text: 'Who is this King of glory?',
      characters: 26,
      words: 6,
    };
    const ps25v1 = {
      _id: 'ps25-1',
      verseOrder: 13956,
      book: 'Psalms',
      chapter: 25,
      verse: 1,
      text: 'To you, Yahweh, I lift up my soul.',
      characters: 34,
      words: 8,
    };

    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: false,
      chapterComplete: false,
      verse: ps23v6,
    });
    (VerseService.getVerseByOrder as jest.Mock)
      .mockResolvedValueOnce(ps24v10)
      .mockResolvedValueOnce(ps25v1);

    (ProgressService.submitResult as jest.Mock)
      .mockResolvedValueOnce({
        result: { _id: 'r1' },
        progress: { _id: 'p1', completed: true },
        chapterJustUnlocked: {
          workId: 'web-bible',
          book: 'Psalms',
          chapter: 23,
          totalVerses: 6,
          unlockedAt: '2026-11-20T00:00:00.000Z',
          companionCount: 3,
          availableLenses: ['hoodoo-folk'],
        },
      })
      .mockResolvedValueOnce({
        result: { _id: 'r2' },
        progress: { _id: 'p2', completed: true },
        chapterJustUnlocked: {
          workId: 'web-bible',
          book: 'Psalms',
          chapter: 24,
          totalVerses: 10,
          unlockedAt: '2026-11-20T00:01:00.000Z',
          companionCount: 2,
          availableLenses: ['hoodoo-folk'],
        },
      });

    try {
      render(<TypingTest />);

      const textarea = (await screen.findByPlaceholderText(
        'Start typing the verse above...',
        {},
        { timeout: 2000 }
      )) as HTMLTextAreaElement;

      // Unlock #1: Psalm 23
      fireEvent.change(textarea, { target: { value: ps23v6.text } });
      await waitFor(() => {
        expect(screen.getByTestId('verse-display')).toHaveTextContent(ps24v10.text);
      });

      // Unlock #2: Psalm 24
      fireEvent.change(textarea, { target: { value: ps24v10.text } });

      const harvestStrip = await screen.findByTestId(
        'session-harvest-strip',
        {},
        { timeout: 2000 }
      );
      expect(harvestStrip).toHaveTextContent('✦ 2 Chapters Unlocked This Session');
      expect(screen.getByTestId('session-harvest-chip-Psalms-23')).toHaveTextContent('Psalm 23');
      expect(screen.getByTestId('session-harvest-chip-Psalms-24')).toHaveTextContent('Psalm 24');
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('shows Zen Mode unlock chip in .zen-topbar and enforces Escape precedence (closes CompanionDrawer before exiting Zen Mode)', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    const router = require('react-router-dom');
    const useLocationSpy = jest.spyOn(router, 'useLocation').mockReturnValue({
      pathname: '/typing',
      search: '?book=Psalms&chapter=23',
      hash: '',
      state: null,
      key: 'zen-escape-precedence',
    });

    const ps23v6 = {
      _id: 'ps23-6',
      verseOrder: 13945,
      book: 'Psalms',
      chapter: 23,
      verse: 6,
      text: 'My cup runs over.',
      characters: 17,
      words: 4,
    };
    const ps24v1 = {
      _id: 'ps24-1',
      verseOrder: 13946,
      book: 'Psalms',
      chapter: 24,
      verse: 1,
      text: 'The earth is Yahweh’s.',
      characters: 22,
      words: 4,
    };

    (VerseService.getNextVerse as jest.Mock).mockResolvedValueOnce({
      complete: false,
      chapterComplete: false,
      verse: ps23v6,
    });
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValueOnce(ps24v1);
    (ProgressService.submitResult as jest.Mock).mockResolvedValueOnce({
      result: { _id: 'r1' },
      progress: { _id: 'p1', completed: true },
      chapterJustUnlocked: {
        workId: 'web-bible',
        book: 'Psalms',
        chapter: 23,
        totalVerses: 6,
        unlockedAt: '2026-11-20T00:00:00.000Z',
        companionCount: 3,
        availableLenses: ['hoodoo-folk'],
      },
    });

    try {
      render(<TypingTest />);
      await screen.findByTestId('verse-display', {}, { timeout: 2000 });

      // Enter Zen Mode
      fireEvent.click(screen.getByTestId('enter-zen-button'));
      expect(document.documentElement.dataset.zen).toBe('true');

      const textarea = screen.getByPlaceholderText('Start typing the verse above...');
      textarea.focus();

      // Complete Psalm 23 in Zen Mode
      fireEvent.change(textarea, { target: { value: ps23v6.text } });

      const zenChip = await screen.findByTestId('zen-bloom-chip', {}, { timeout: 2000 });
      expect(zenChip).toHaveTextContent('✦ Psalm 23 Unlocked (1)');
      expect(screen.queryByTestId('companion-drawer')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText('Start typing the verse above...')
      );

      // Click Zen chip to open CompanionDrawer while staying in Zen Mode
      fireEvent.click(zenChip);
      const drawer = await screen.findByTestId('companion-drawer', {}, { timeout: 2000 });
      expect(drawer).toBeInTheDocument();
      expect(document.documentElement.dataset.zen).toBe('true');

      // First Escape closes CompanionDrawer WITHOUT exiting Zen Mode
      fireEvent.keyDown(drawer, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByTestId('companion-drawer')).not.toBeInTheDocument();
      });
      expect(document.documentElement.dataset.zen).toBe('true');
      expect(screen.getByTestId('zen-topbar')).toBeInTheDocument();

      // Second Escape (with drawer closed) exits Zen Mode
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(document.documentElement.dataset.zen).toBeUndefined();
      });
    } finally {
      useLocationSpy.mockRestore();
    }
  });

  it('renders inline Chapter Bloom Banner inside .results-container when !autoAdvance && !zenMode', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    (ProgressService.submitResult as jest.Mock).mockResolvedValueOnce({
      result: { _id: 'r1' },
      progress: { _id: 'p1', completed: true },
      chapterJustUnlocked: {
        workId: 'web-bible',
        book: 'Genesis',
        chapter: 1,
        totalVerses: 31,
        unlockedAt: '2026-11-20T00:00:00.000Z',
        companionCount: 2,
        availableLenses: ['hoodoo-folk', 'historical-classic'],
      },
    });

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    expect(
      await screen.findByRole('heading', { name: /Verse Completed!/i }, { timeout: 2000 })
    ).toBeInTheDocument();

    const banner = await screen.findByTestId('chapter-bloom-banner', {}, { timeout: 2000 });
    expect(banner).toHaveTextContent('Genesis 1');
    expect(screen.getByTestId('results-open-companion-btn')).toHaveTextContent(
      'Open Companion Reading Room'
    );
    expect(screen.getByTestId('results-view-trail-link')).toHaveAttribute(
      'href',
      '/trail?book=Genesis'
    );
  });

  it('surfaces a celebratory Living Trail badge toast outside Zen Mode and a Zen badge chip inside Zen Mode when a medallion unlocks', async () => {
    const lockedData = {
      streak: { currentStreakDays: 0, longestStreakDays: 0, lastActiveDate: null, activeToday: false },
      milestones: {
        totalAttempts: 0,
        bestWpm: 0,
        flawlessCount: 0,
        uniqueVersesCompleted: 0,
        psalmsCompletedCount: 0,
        bloomedChaptersCount: 0,
        completedClearingsCount: 0,
      },
      badges: [
        {
          id: 'trail-first-bloom',
          title: 'First Bloom',
          description: 'Bloom your first complete scripture chapter on the Living Trail.',
          category: 'trail' as const,
          unlocked: false,
          progressCurrent: 0,
          progressTarget: 1,
          progressPct: 0,
        },
      ],
    };
    const unlockedData = {
      ...lockedData,
      milestones: { ...lockedData.milestones, bloomedChaptersCount: 1 },
      badges: [
        {
          ...lockedData.badges[0],
          unlocked: true,
          progressCurrent: 1,
          progressPct: 100,
        },
      ],
    };

    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    (StatsService.getAchievements as jest.Mock)
      .mockResolvedValueOnce(lockedData)
      .mockResolvedValueOnce(unlockedData);
    (ProgressService.submitResult as jest.Mock).mockResolvedValueOnce({
      result: { _id: 'r-badge' },
      progress: { _id: 'p-badge', completed: true },
      chapterJustUnlocked: null,
    });

    render(<TypingTest />);
    const textarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(StatsService.getAchievements).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(textarea, { target: { value: mockVerse.text } });

    const toast = await screen.findByTestId(
      'badge-unlock-toast-trail-first-bloom',
      {},
      { timeout: 2000 }
    );
    expect(toast).toHaveTextContent('First Bloom');
    fireEvent.click(screen.getByTestId('badge-toast-open-case-trail-first-bloom'));

    const badgesModal = await screen.findByTestId('trail-badges-modal', {}, { timeout: 2000 });
    expect(badgesModal).toHaveAttribute('open');
    expect(badgesModal).toHaveTextContent('First Bloom');
    fireEvent.click(screen.getByTestId('trail-badges-close-btn'));
    expect(badgesModal).not.toHaveAttribute('open');

    // Second scenario: Zen Mode suppresses overlay toast and surfaces ZenBadgeChip instead
    const secondUnlockData = {
      ...unlockedData,
      badges: [
        ...unlockedData.badges,
        {
          id: 'trail-bottle-tree',
          title: 'Bottle Tree Lit',
          description: "Awaken a clearing's Hoodoo Bottle Tree by blooming a chapter in Genesis or Psalms.",
          category: 'trail' as const,
          unlocked: true,
          progressCurrent: 1,
          progressTarget: 1,
          progressPct: 100,
        },
      ],
    };

    (StatsService.getAchievements as jest.Mock).mockResolvedValueOnce(secondUnlockData);
    (ProgressService.submitResult as jest.Mock).mockResolvedValueOnce({
      result: { _id: 'r-badge-zen' },
      progress: { _id: 'p-badge-zen', completed: true },
      chapterJustUnlocked: null,
    });

    // Clear first toast before entering Zen Mode, then trigger Zen Mode unlock flow
    fireEvent.click(screen.getByTestId('badge-toast-dismiss-trail-first-bloom'));

    fireEvent.click(screen.getByRole('button', { name: /Try Another Verse/i }));
    const nextTextarea = (await screen.findByPlaceholderText(
      'Start typing the verse above...',
      {},
      { timeout: 2000 }
    )) as HTMLTextAreaElement;
    fireEvent.click(screen.getByTestId('enter-zen-button'));
    fireEvent.change(nextTextarea, { target: { value: mockVerse.text } });

    const zenBadgeChip = await screen.findByTestId('zen-badge-chip', {}, { timeout: 2000 });
    expect(zenBadgeChip).toHaveTextContent('✦ Bottle Tree Lit Earned');
    expect(screen.queryByTestId('badge-unlock-toast-trail-bottle-tree')).not.toBeInTheDocument();
  });
});
