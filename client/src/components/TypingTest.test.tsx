import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import TypingTest from './TypingTest';
import { VerseService, ProgressService, AuthService } from '../services/api';

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

// Mock the API services
jest.mock('../services/api', () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };

  return {
    VerseService: {
      getRandomVerse: jest.fn(() => Promise.resolve(mockVerse)),
      getVersesByBook: jest.fn(() => Promise.resolve({ data: [mockVerse] })),
      getVerseByOrder: jest.fn(() => Promise.resolve(mockVerse)),
    },
    ProgressService: {
      submitResult: jest.fn(() => Promise.resolve({})),
      getUserProgress: jest.fn(() => Promise.resolve([])),
    },
    AuthService: {
      getCurrentUser: jest.fn(() => null),
    },
    // Export mockAxios if other parts of the app directly use it
    api: mockAxios,
  };
});

describe('TypingTest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset mocks before each test
    jest.clearAllMocks();
        (VerseService.getRandomVerse as jest.Mock).mockResolvedValue(mockVerse);
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null); // No user logged in by default
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render loading state initially, then the verse', async () => {
    render(<TypingTest />);
    expect(screen.getByText('Loading verse...')).toBeInTheDocument();

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));
  });

  it('should render the verse after loading', async () => {
    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
  });

  it('should update typed text and calculate WPM/accuracy as user types', async () => {
    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'In the beginning' } });
    });

    expect(textarea.value).toBe('In the beginning');
    await screen.findByText(/WPM:/);
    await screen.findByText(/Accuracy:/);
  });

  it('should mark correct and incorrect characters', async () => {
    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'In the beginninX' } }); // Introduce an error
    });

    // Check for correct/incorrect class names (this requires inspecting the DOM structure)
    // This is a simplified check, a more robust test would query for specific spans with classes
    await waitFor(() => {
      expect(screen.getAllByText('g')[1].closest('span')).toHaveClass('incorrect');
      expect(screen.getByText('I').closest('span')).toHaveClass('correct');
    });
  });

  it('should show results and call submitResult on completion if user is logged in', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    (ProgressService.submitResult as jest.Mock).mockResolvedValue({});

    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: mockVerse.text } }); // Type the full verse
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: /Verse Completed!/i })).toBeInTheDocument());
    await waitFor(() => {
      expect(ProgressService.submitResult).toHaveBeenCalledTimes(1);
      expect(ProgressService.submitResult).toHaveBeenCalledWith(expect.objectContaining({
        user: 'user123',
        verse: mockVerse._id,
        wpm: expect.any(Number),
        accuracy: expect.any(Number),
      }));
    });
  });

  it('should not call submitResult on completion if no user is logged in', async () => {
    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: mockVerse.text } }); // Type the full verse
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: /Verse Completed!/i })).toBeInTheDocument());
    expect(ProgressService.submitResult).not.toHaveBeenCalled();
  });

  it('should display an error message if verse fetching fails', async () => {
    (VerseService.getRandomVerse as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
        await waitFor(() => expect(screen.findByText('Failed to fetch')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('should fetch a new random verse when "Get Another Verse" is clicked', async () => {
    render(<TypingTest />);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));

    // Simulate completion to make the "Try Another Verse" button visible
    const textarea = await screen.findByPlaceholderText('Start typing the verse above...') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: mockVerse.text } });
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: /Verse Completed!/i })).toBeInTheDocument());

    (VerseService.getRandomVerse as jest.Mock).mockResolvedValue({
      ...mockVerse,
      _id: '2',
      text: 'Another verse.',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Try Another Verse/i }));
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('Another verse.'));
    expect(VerseService.getRandomVerse).toHaveBeenCalledTimes(2);
  });

  it('should switch to "By Book" mode and fetch a verse by book', async () => {
    (VerseService.getVersesByBook as jest.Mock).mockResolvedValue({ data: [mockVerse] });

    await act(async () => {
      render(<TypingTest />);
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /By Book/i }));
    });
    expect(screen.getByText('-- Select a Book --')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Genesis' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Get Verse/i }));
      jest.runAllTimers();
    });

    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('In the beginning, God created the heavens and the earth.'));
    expect(VerseService.getVersesByBook).toHaveBeenCalledWith('Genesis');
  });

  it('should disable "Sequential" mode button if no user is logged in', async () => {
    await act(async () => {
      render(<TypingTest />);
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());

    const sequentialButton = screen.getByRole('button', { name: /Sequential/i });
    expect(sequentialButton).toBeDisabled();
    expect(sequentialButton).toHaveAttribute('title', 'Login to use sequential mode');
  });

  it('should enable "Sequential" mode button if a user is logged in', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    await act(async () => {
      render(<TypingTest />);
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());

    const sequentialButton = screen.getByRole('button', { name: /Sequential/i });
    expect(sequentialButton).not.toBeDisabled();
    expect(sequentialButton).not.toHaveAttribute('title');
  });

  it('should switch to "Sequential" mode and fetch the next verse', async () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user123' });
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([{ verseOrder: 1 }]);
    (VerseService.getVerseByOrder as jest.Mock).mockResolvedValue({
      ...mockVerse,
      _id: '2',
      verseOrder: 2,
      text: 'The second verse.',
    });

    await act(async () => {
      render(<TypingTest />);
      jest.runAllTimers();
    });
    await waitFor(() => expect(screen.queryByText('Loading verse...')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sequential/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Get Verse/i }));
      jest.runAllTimers();
    });

    await waitFor(() => expect(screen.getByTestId('verse-display')).toHaveTextContent('The second verse.'));
    expect(ProgressService.getUserProgress).toHaveBeenCalledTimes(1);
    expect(VerseService.getVerseByOrder).toHaveBeenCalledWith(2);
  });
});