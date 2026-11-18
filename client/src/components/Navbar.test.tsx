import React from 'react';
import { render, screen } from '../test-utils';
import { AuthService } from '../services/api';
import Navbar from './Navbar';

jest.mock('../services/api', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}));

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Dashboard and Memory & Plans links when user is logged in', () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'u1', username: 'owner' });
    render(<Navbar />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const memoryLink = screen.getByRole('link', { name: 'Memory & Plans' });
    expect(memoryLink).toHaveAttribute('href', '/memory');
  });

  it('hides Dashboard and Memory & Plans links when user is logged out', () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    render(<Navbar />);

    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Memory & Plans' })).not.toBeInTheDocument();
  });
});
