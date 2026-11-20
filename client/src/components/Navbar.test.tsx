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

  it('shows Memory & Plans, Living Trail, and Dashboard links in order when user is logged in', () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'u1', username: 'owner' });
    render(<Navbar />);

    const memoryLink = screen.getByRole('link', { name: 'Memory & Plans' });
    expect(memoryLink).toHaveAttribute('href', '/memory');

    const trailLink = screen.getByRole('link', { name: 'Living Trail' });
    expect(trailLink).toHaveAttribute('href', '/trail');

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const allLinks = screen.getAllByRole('link');
    const memoryIdx = allLinks.indexOf(memoryLink);
    const trailIdx = allLinks.indexOf(trailLink);
    const dashboardIdx = allLinks.indexOf(dashboardLink);
    expect(memoryIdx).toBeLessThan(trailIdx);
    expect(trailIdx).toBeLessThan(dashboardIdx);
  });

  it('hides Dashboard, Living Trail, and Memory & Plans links when user is logged out', () => {
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    render(<Navbar />);

    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Living Trail' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Memory & Plans' })).not.toBeInTheDocument();
  });
});
