import React from 'react';
import { fireEvent, render, screen, waitFor } from '../test-utils';
import { AuthService, ProgressService } from '../services/api';
import Progress from './Progress';

jest.mock('../services/api', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
  },
  ProgressService: {
    getProgressSummary: jest.fn(),
    getUserProgress: jest.fn(),
    getUserResults: jest.fn(),
    updateResult: jest.fn(),
    deleteResult: jest.fn(),
    deleteVerseProgress: jest.fn(),
  },
}));

describe('Progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'user1' });
    (ProgressService.getProgressSummary as jest.Mock).mockResolvedValue({
      completedVerses: 4,
      attemptedVerses: 5,
      totalVerses: 10,
      percentageCompleted: 40,
      averageWPM: 55.2,
      bestWPM: 68.0,
      averageAccuracy: 96.4,
      totalTests: 12,
    });
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([
      {
        _id: 'prog-1',
        user: 'user1',
        verse: { _id: 'v-1k', book: '1 Kings', chapter: 16, verse: 17 },
        verseOrder: 9001,
        completed: true,
        attempts: 1,
        bestWPM: 8842,
        bestAccuracy: 100,
        lastAttemptDate: '2026-11-18T16:07:00Z',
      },
    ]);
    (ProgressService.getUserResults as jest.Mock).mockResolvedValue([
      {
        _id: 'res-outlier',
        user: 'user1',
        verse: { _id: 'v-1k', book: '1 Kings', chapter: 16, verse: 17 },
        verseOrder: 9001,
        startTime: '2026-11-18T16:07:00Z',
        endTime: '2026-11-18T16:07:00.100Z',
        duration: 100,
        wpm: 8842,
        cps: 790,
        accuracy: 100,
        incorrectCharacters: 0,
        totalCharacters: 79,
      },
    ]);
    (ProgressService.updateResult as jest.Mock).mockResolvedValue({ result: {}, progress: {} });
    (ProgressService.deleteResult as jest.Mock).mockResolvedValue({
      deletedResultId: 'res-outlier',
      progress: null,
    });
    (ProgressService.deleteVerseProgress as jest.Mock).mockResolvedValue({
      verseId: 'v-1k',
      deletedResultsCount: 1,
    });
  });

  it('links from the Summary tab to the Statistics Dashboard', async () => {
    render(<Progress />);

    const link = await screen.findByRole('link', { name: /Open Statistics Dashboard/i });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('allows modifying an attempt from the Manage History tab', async () => {
    render(<Progress />);

    const historyTab = await screen.findByRole('button', { name: /Manage History/i });
    fireEvent.click(historyTab);

    expect(screen.getByTestId('history-row-res-outlier')).toHaveTextContent('1 Kings 16:17');
    expect(screen.getByTestId('history-row-res-outlier')).toHaveTextContent('8842.0');

    fireEvent.click(screen.getByRole('button', { name: /Edit attempt for 1 Kings 16:17/i }));

    const wpmInput = screen.getByLabelText(/Words Per Minute/i);
    fireEvent.change(wpmInput, { target: { value: '58' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(ProgressService.updateResult).toHaveBeenCalledWith('res-outlier', {
        wpm: 58,
        accuracy: 100,
        duration: 100,
      });
    });
    expect(await screen.findByTestId('progress-status-message')).toHaveTextContent(
      'Updated attempt for 1 Kings 16:17'
    );
  });

  it('allows deleting an outlier attempt via confirmation dialog from Manage History', async () => {
    render(<Progress />);

    const historyTab = await screen.findByRole('button', { name: /Manage History/i });
    fireEvent.click(historyTab);

    fireEvent.click(screen.getByRole('button', { name: /Delete attempt for 1 Kings 16:17/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(ProgressService.deleteResult).toHaveBeenCalledWith('res-outlier');
    });
    expect(await screen.findByTestId('progress-status-message')).toHaveTextContent(
      'Deleted attempt for 1 Kings 16:17'
    );
  });
});
