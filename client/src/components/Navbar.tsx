import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';
import { useAuthSession } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const { mode, user } = useAuthSession();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="navbar-emblem" aria-hidden="true">
            §
          </span>
          <div className="navbar-title-group">
            <Link to="/" className="navbar-logo">
              Type the Bible
            </Link>
            <span className="navbar-subtitle">
              Scripture Typing &amp; Mastery Atlas
            </span>
          </div>
        </div>

        <div className="navbar-actions-mobile">
          <ThemeToggle />
          <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? (
              <i className="fas fa-times" />
            ) : (
              <i className="fas fa-bars" />
            )}
          </div>
        </div>

        <ul className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/typing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Start Typing
            </Link>
          </li>

          {mode === 'entra' ? (
            <>
              <li className="nav-item">
                <Link to="/memory" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Memory &amp; Plans
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/trail" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Living Trail
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/progress" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Progress
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
              </li>

              <li className="nav-item nav-theme-desktop">
                <ThemeToggle />
              </li>

              <li className="nav-item">
                <span className="nav-user" data-testid="navbar-owner-name">
                  {user?.username || 'Owner'}
                </span>
              </li>

              <li className="nav-item">
                <a
                  href="/.auth/logout"
                  className="nav-link logout-button"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign out
                </a>
              </li>
            </>
          ) : user ? (
            <>
              <li className="nav-item">
                <Link to="/memory" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Memory &amp; Plans
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/trail" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Living Trail
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/progress" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Progress
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
              </li>

              <li className="nav-item nav-theme-desktop">
                <ThemeToggle />
              </li>

              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link logout-button">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item nav-theme-desktop">
                <ThemeToggle />
              </li>

              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/register" className="nav-link register-button" onClick={() => setMobileMenuOpen(false)}>
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
