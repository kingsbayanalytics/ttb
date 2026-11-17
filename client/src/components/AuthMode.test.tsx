import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import App from '../App';
import Navbar from './Navbar';
import Home from './Home';
import Progress from './Progress';
import Profile from './Profile';
import { AuthService, VerseService, ProgressService } from '../services/api';

jest.mock('../services/api', () => ({
  AuthService: {
    getAuthSession: jest.fn(),
    getAuthMode: jest.fn(),
    getCachedAuthMode: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  },
  VerseService: {
    getRandomVerse: jest.fn(),
    getVersesByBook: jest.fn(),
    getVerseByOrder: jest.fn(),
  },
  ProgressService: {
    getUserProgress: jest.fn(),
    getProgressSummary: jest.fn(),
    submitResult: jest.fn(),
  },
}));

const mockOwner = {
  _id: 'owner-1',
  username: 'Mike Warren',
  email: 'mike@kingsbayanalytics.com',
  isAdmin: false,
};

const mockLocalUser = {
  _id: 'local-1',
  username: 'localuser',
  email: 'local@example.com',
  isAdmin: false,
};

describe('Client Auth Mode Awareness (Story 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('local');
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'local',
      user: null,
    });
    (AuthService.getAuthMode as jest.Mock).mockResolvedValue('local');
    (VerseService.getRandomVerse as jest.Mock).mockResolvedValue({
      _id: 'v1',
      verseOrder: 1,
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning',
      characters: 16,
      words: 3,
    });
    (ProgressService.getUserProgress as jest.Mock).mockResolvedValue([]);
    (ProgressService.getProgressSummary as jest.Mock).mockResolvedValue({
      totalVerses: 1,
      completedVerses: 0,
      attemptedVerses: 0,
      percentageCompleted: 0,
      averageWPM: 0,
      bestWPM: 0,
      averageAccuracy: 0,
      totalTests: 0,
    });
  });

  describe('local mode', () => {
    it('shows Login and Register in Navbar and Home when unauthenticated', async () => {
      render(
        <>
          <Navbar />
          <Home />
        </>
      );

      expect(await screen.findByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
      expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/register');
      expect(screen.queryByRole('link', { name: 'Sign out' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('navbar-owner-name')).not.toBeInTheDocument();
    });

    it('shows Progress, Profile, and Logout button when authenticated in local mode', async () => {
      (AuthService.getCurrentUser as jest.Mock).mockReturnValue(mockLocalUser);
      (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
        mode: 'local',
        user: mockLocalUser,
      });

      render(
        <>
          <Navbar />
          <Home />
        </>
      );

      expect(await screen.findByRole('link', { name: 'Progress' })).toHaveAttribute(
        'href',
        '/progress'
      );
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
      const logoutBtn = screen.getByRole('button', { name: 'Logout' });
      expect(logoutBtn).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View Progress' })).toHaveAttribute(
        'href',
        '/progress'
      );

      // Avoid window.location.reload error in jsdom while verifying logout call
      const reloadMock = jest.fn();
      const origLocation = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...origLocation, reload: reloadMock },
      });
      fireEvent.click(logoutBtn);
      expect(AuthService.logout).toHaveBeenCalledTimes(1);
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: origLocation,
      });
    });

    it('mounts Login and Register routes in App in local mode', async () => {
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
      expect(screen.queryByText(/Redirecting to localStorage check page/i)).not.toBeInTheDocument();
    });
  });

  describe('entra mode', () => {
    beforeEach(() => {
      (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('entra');
      (AuthService.getCurrentUser as jest.Mock).mockReturnValue(mockOwner);
      (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
        mode: 'entra',
        user: mockOwner,
      });
      (AuthService.getAuthMode as jest.Mock).mockResolvedValue('entra');
    });

    it('hides Login/Register links, displays owner name in Navbar, and links Sign out to /.auth/logout', async () => {
      render(
        <>
          <Navbar />
          <Home />
        </>
      );

      const ownerBadge = await screen.findByTestId('navbar-owner-name');
      expect(ownerBadge).toHaveTextContent('Mike Warren');

      const signOutLink = screen.getByRole('link', { name: 'Sign out' });
      expect(signOutLink).toHaveAttribute('href', '/.auth/logout');

      expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Log In' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
      expect(screen.getByRole('link', { name: 'View Progress' })).toHaveAttribute(
        'href',
        '/progress'
      );
    });

    it('hides /login and /register routes in App when in entra mode', async () => {
      render(<App />);

      const ownerBadge = await screen.findByTestId('navbar-owner-name');
      expect(ownerBadge).toHaveTextContent('Mike Warren');
      expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Register' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Redirecting to localStorage check page/i)).not.toBeInTheDocument();
    });

    it('renders Progress and Profile (without password fields) in entra mode', async () => {
      render(
        <>
          <Progress />
          <Profile />
        </>
      );

      expect(await screen.findByRole('heading', { name: 'Your Typing Progress' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your Profile' })).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toHaveValue('Mike Warren');
      expect(screen.queryByLabelText(/New Password/i)).not.toBeInTheDocument();
    });
  });
});
