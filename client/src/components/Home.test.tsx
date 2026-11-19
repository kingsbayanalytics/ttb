import React from 'react';
import * as router from 'react-router-dom';
import { render, screen, fireEvent } from '../test-utils';
import Home from './Home';
import { AuthService } from '../services/api';

jest.mock('../services/api', () => ({
  AuthService: {
    getAuthSession: jest.fn(),
    getAuthMode: jest.fn(),
    getCachedAuthMode: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

const mockOwner = {
  _id: 'owner-1',
  username: 'Mike Warren',
  email: 'mike@kingsbayanalytics.com',
  isAdmin: false,
};

describe('Home interactive feature cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('entra');
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(mockOwner);
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'entra',
      user: mockOwner,
    });
    (AuthService.getAuthMode as jest.Mock).mockResolvedValue('entra');
  });

  it('links all four feature cards to their destinations when signed in', async () => {
    render(<Home />);

    expect(await screen.findByRole('link', { name: 'Bible Verses' })).toHaveAttribute(
      'href',
      '/typing'
    );
    expect(screen.getByRole('link', { name: 'Track Progress' })).toHaveAttribute(
      'href',
      '/progress'
    );
    expect(screen.getByRole('link', { name: 'Interactive Statistics' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('link', { name: 'Verse Selection' })).toHaveAttribute(
      'href',
      '/typing?mode=book'
    );
    expect(screen.getByRole('link', { name: 'Random' })).toHaveAttribute(
      'href',
      '/typing?mode=random'
    );
    expect(screen.getByRole('link', { name: 'Sequential' })).toHaveAttribute(
      'href',
      '/typing?mode=sequential'
    );
  });

  it('routes protected feature cards to /login when logged out in local mode', async () => {
    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('local');
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'local',
      user: null,
    });
    (AuthService.getAuthMode as jest.Mock).mockResolvedValue('local');

    render(<Home />);

    expect(await screen.findByRole('link', { name: 'Bible Verses' })).toHaveAttribute(
      'href',
      '/typing'
    );
    expect(screen.getByRole('link', { name: 'Track Progress' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Interactive Statistics' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Sequential' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Random' })).toHaveAttribute(
      'href',
      '/typing?mode=random'
    );
  });

  it('navigates directly to the chosen book when submitting the Verse Selection book picker', async () => {
    const navigateMock = jest.fn();
    const useNavigateSpy = jest.spyOn(router, 'useNavigate').mockReturnValue(navigateMock);

    try {
      render(<Home />);

      const select = await screen.findByLabelText('Choose a Bible book');
      const goButton = screen.getByRole('button', { name: /Start typing selected book/i });
      expect(goButton).toBeDisabled();

      fireEvent.change(select, { target: { value: 'Psalms' } });
      expect(goButton).not.toBeDisabled();

      fireEvent.click(goButton);
      expect(navigateMock).toHaveBeenCalledWith('/typing?book=Psalms');
    } finally {
      useNavigateSpy.mockRestore();
    }
  });
});
