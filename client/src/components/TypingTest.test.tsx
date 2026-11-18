import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import TypingTest from './TypingTest';
import { VerseService, ProgressService, AuthService, MemoryService, PlanService } from '../services/api';

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
    getVerseByOrder: jest.fn(),
    getNextVerse: jest.fn(),
  },
  ProgressService: {
    submitResult: jest.fn(),
    getUserProgress: jest.fn(),
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
  },
}));

describe('TypingTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (VerseService.getRandomVerse as jest.Mock).mockResolvedValue(mockVerse);
    (VerseService.getVersesByBook as jest.Mock).mockResolvedValue({ data: [mockVerse] });
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValue(mockVerse);
    (VerseService.getNextVerse as jest.Mock).mockResolvedValue({ complete: false, verse: mockVerse });
    (ProgressService.submitResult as jest.Mock).mockResolvedValue({});
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([]);
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (MemoryService.getDeck as jest.Mock).mockResolvedValue([]);
    (MemoryService.saveVerse as jest.Mock).mockResolvedValue({});
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

      const select = screen.getByRole('combobox') as HTMLSelectElement;
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
});
