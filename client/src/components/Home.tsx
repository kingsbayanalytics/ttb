import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../context/AuthContext';
import { CANONICAL_BOOKS } from '../data/books';

const Home: React.FC = () => {
  const { mode, user } = useAuthSession();
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<string>('');
  const isSignedIn = mode === 'entra' || Boolean(user);

  const handleBookJump = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBook) return;
    navigate(`/typing?book=${encodeURIComponent(selectedBook)}`);
  };

  return (
    <div className="home-container">
      <div className="hero">
        <h1>Type the Bible</h1>
        <p className="subtitle">
          Improve your typing skills while engaging with scripture
        </p>

        <div className="cta-buttons">
          {isSignedIn ? (
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

      <section className="features-section" aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" className="visually-hidden">
          Explore Features
        </h2>
        <div className="features">
          <article className="feature-card">
            <h3>
              <Link to="/typing" className="card-link">
                Bible Verses
              </Link>
            </h3>
            <p>Practice typing with verses from the World English Bible Catholic Edition</p>
            <footer className="feature-card-footer">
              <span className="feature-card-cue" aria-hidden="true">
                Start typing →
              </span>
            </footer>
          </article>

          <article className="feature-card">
            <h3>
              <Link to={isSignedIn ? '/progress' : '/login'} className="card-link">
                Track Progress
              </Link>
            </h3>
            <p>Monitor your typing speed and accuracy across different verses</p>
            <footer className="feature-card-footer">
              <span className="feature-card-cue" aria-hidden="true">
                {isSignedIn ? 'View progress →' : 'Log in to track →'}
              </span>
            </footer>
          </article>

          <article className="feature-card">
            <h3>
              <Link to={isSignedIn ? '/dashboard' : '/login'} className="card-link">
                Interactive Statistics
              </Link>
            </h3>
            <p>View detailed statistics about your typing performance</p>
            <footer className="feature-card-footer">
              <span className="feature-card-cue" aria-hidden="true">
                {isSignedIn ? 'Open dashboard →' : 'Log in to view →'}
              </span>
            </footer>
          </article>

          <article className="feature-card">
            <h3>
              <Link to="/typing?mode=book" className="card-link">
                Verse Selection
              </Link>
            </h3>
            <p>Choose verses randomly, sequentially, or from specific books</p>
            <footer className="feature-card-footer feature-card-footer-interactive">
              <div className="feature-card-actions">
                <Link to="/typing?mode=random" className="feature-card-chip">
                  Random
                </Link>
                <Link
                  to={isSignedIn ? '/typing?mode=sequential' : '/login'}
                  className="feature-card-chip"
                >
                  Sequential
                </Link>
              </div>
              <form className="feature-card-book-form" onSubmit={handleBookJump}>
                <label htmlFor="home-book-select" className="visually-hidden">
                  Choose a Bible book
                </label>
                <select
                  id="home-book-select"
                  className="feature-card-select"
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                >
                  <option value="">Choose a book…</option>
                  {CANONICAL_BOOKS.map((book) => (
                    <option key={book} value={book}>
                      {book}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="feature-card-go"
                  disabled={!selectedBook}
                  aria-label={
                    selectedBook
                      ? `Start typing ${selectedBook}`
                      : 'Start typing selected book'
                  }
                >
                  Go
                </button>
              </form>
            </footer>
          </article>
        </div>
      </section>

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
