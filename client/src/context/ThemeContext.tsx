import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'color-scheme';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {}
    return 'system';
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(getSystemPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemPreference : theme;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      document.head.appendChild(meta);
    }
    const root = document.documentElement;

    if (theme === 'system') {
      meta.setAttribute('content', 'light dark');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    } else {
      meta.setAttribute('content', theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {}
    }

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue === 'light' || e.newValue === 'dark') {
          setThemeState(e.newValue);
        } else {
          setThemeState('system');
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const target = resolvedTheme === 'dark' ? 'light' : 'dark';
    if (target === systemPreference) {
      setThemeState('system');
    } else {
      setThemeState(target);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'system',
      resolvedTheme: getSystemPreference(),
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
