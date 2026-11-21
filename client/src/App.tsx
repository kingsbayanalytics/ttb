import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuthSession } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import TypingTest from './components/TypingTest';
import Progress from './components/Progress';
import Profile from './components/Profile';
import { Dashboard } from './components/dashboard';
import { MemoryStudio } from './components/memory';
import './App.css';

const LivingTrailPage = React.lazy(() => import('./components/trail/LivingTrailPage'));

const AppRoutes: React.FC = () => {
  const { mode } = useAuthSession();

  return (
    <div className="App">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          {mode !== 'entra' && <Route path="/login" element={<Login />} />}
          {mode !== 'entra' && <Route path="/register" element={<Register />} />}
          <Route path="/typing" element={<TypingTest />} />
          <Route path="/memory" element={<MemoryStudio />} />
          <Route
            path="/trail"
            element={
              <Suspense
                fallback={
                  <div className="loading-container" role="status">
                    <div className="loading-text">
                      <h3>Opening the Living Trail…</h3>
                    </div>
                  </div>
                }
              >
                <LivingTrailPage />
              </Suspense>
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <footer>
        <div className="container footer-inner">
          <span className="footer-kicker">WEB · 73 CANONICAL BOOKS</span>
          <p>
            &copy; {new Date().getFullYear()} Type the Bible. Inspired by the original command-line game by{' '}
            <a
              href="https://github.com/kburchfiel/Type_The_Bible"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-attribution-link"
            >
              Kenneth Burchfiel
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
