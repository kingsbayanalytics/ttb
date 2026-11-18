import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme, theme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-button"
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <>
          <svg
            className="theme-toggle-icon theme-toggle-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <span className="theme-toggle-label">Light</span>
        </>
      ) : (
        <>
          <svg
            className="theme-toggle-icon theme-toggle-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <span className="theme-toggle-label">Dark</span>
        </>
      )}
      {theme === 'system' && <span className="theme-toggle-auto">auto</span>}
    </button>
  );
};

export default ThemeToggle;
