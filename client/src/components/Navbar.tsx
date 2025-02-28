import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';

const Navbar: React.FC = () => {
  const user = AuthService.getCurrentUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/');
    // Force a page reload to clear any user-dependent states
    window.location.reload();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Type the Bible
        </Link>

        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? (
            <i className="fas fa-times" />
          ) : (
            <i className="fas fa-bars" />
          )}
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
          
          {user ? (
            <>
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
              
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link logout-button">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
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