import React from 'react';
import { Link } from 'react-router-dom';
import { AuthService } from '../services/api';

const Home: React.FC = () => {
  const user = AuthService.getCurrentUser();

  return (
    <div className="home-container">
      <div className="hero">
        <h1>Type the Bible</h1>
        <p className="subtitle">
          Improve your typing skills while engaging with scripture
        </p>
        
        <div className="cta-buttons">
          {user ? (
            <>
              <Link to="/typing" className="primary-button">
                Start Typing
              </Link>
              <Link to="/progress" className="secondary-button">
                View Progress
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="primary-button">
                Log In
              </Link>
              <Link to="/register" className="secondary-button">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <h3>Bible Verses</h3>
          <p>Practice typing with verses from the World English Bible Catholic Edition</p>
        </div>
        
        <div className="feature-card">
          <h3>Track Progress</h3>
          <p>Monitor your typing speed and accuracy across different verses</p>
        </div>
        
        <div className="feature-card">
          <h3>Interactive Statistics</h3>
          <p>View detailed statistics about your typing performance</p>
        </div>
        
        <div className="feature-card">
          <h3>Verse Selection</h3>
          <p>Choose verses randomly, sequentially, or from specific books</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <ol>
          <li>Select a verse or have one randomly selected for you</li>
          <li>Type the verse as accurately and quickly as you can</li>
          <li>Get instant feedback on your typing accuracy</li>
          <li>View your results and track your improvement over time</li>
        </ol>
      </div>
    </div>
  );
};

export default Home; 