import React from 'react';
import { render, screen } from '../test-utils';
import { AuthService, ProgressService } from '../services/api';
import Progress from './Progress';

jest.mock('../services/api', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
  },
  ProgressService: {
    getProgressSummary: jest.fn(),
    getUserProgress: jest.fn(),
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
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([]);
  });

  it('links from the Summary tab to the Statistics Dashboard', async () => {
    render(<Progress />);

    const link = await screen.findByRole('link', { name: /Open Statistics Dashboard/i });
    expect(link).toHaveAttribute('href', '/dashboard');
  });
});
