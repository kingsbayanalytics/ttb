import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { AuthMode, AuthService } from '../services/api';

export interface AuthContextValue {
  mode: AuthMode;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveAuthSession(): Promise<{ mode: AuthMode; user: User | null }> {
  if (typeof AuthService?.getAuthSession === 'function') {
    const session = await AuthService.getAuthSession();
    return {
      mode: session?.mode ?? 'local',
      user: session?.user ?? (session?.mode === 'entra' ? null : AuthService.getCurrentUser?.() ?? null),
    };
  }
  if (typeof AuthService?.getAuthMode === 'function') {
    const mode = await AuthService.getAuthMode();
    return {
      mode: mode ?? 'local',
      user: AuthService.getCurrentUser?.() ?? null,
    };
  }
  return {
    mode: AuthService?.getCachedAuthMode?.() ?? 'local',
    user: AuthService?.getCurrentUser?.() ?? null,
  };
}

function hasSessionFetcher(): boolean {
  return (
    typeof AuthService?.getAuthSession === 'function' ||
    typeof AuthService?.getAuthMode === 'function'
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthContextValue>(() => ({
    mode: AuthService?.getCachedAuthMode?.() ?? 'local',
    user: AuthService?.getCurrentUser?.() ?? null,
    loading: hasSessionFetcher(),
  }));

  useEffect(() => {
    let active = true;

    if (hasSessionFetcher()) {
      resolveAuthSession()
        .then((session) => {
          if (active) {
            setState({ mode: session.mode, user: session.user, loading: false });
          }
        })
        .catch(() => {
          if (active) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        });
    }

    const handleAuthChange = () => {
      if (!active) return;
      setState((prev) => ({
        ...prev,
        user: AuthService?.getCurrentUser?.() ?? null,
      }));
    };

    window.addEventListener('ttb-auth-change', handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener('ttb-auth-change', handleAuthChange);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export function useAuthSession(): AuthContextValue {
  const contextValue = useContext(AuthContext);
  const [standaloneState, setStandaloneState] = useState<AuthContextValue>(() => ({
    mode: AuthService?.getCachedAuthMode?.() ?? 'local',
    user: AuthService?.getCurrentUser?.() ?? null,
    loading: hasSessionFetcher(),
  }));

  useEffect(() => {
    if (contextValue) {
      return;
    }

    let active = true;
    if (hasSessionFetcher()) {
      resolveAuthSession()
        .then((session) => {
          if (active) {
            setStandaloneState({ mode: session.mode, user: session.user, loading: false });
          }
        })
        .catch(() => {
          if (active) {
            setStandaloneState((prev) => ({ ...prev, loading: false }));
          }
        });
    }

    const handleAuthChange = () => {
      if (!active) return;
      setStandaloneState((prev) => ({
        ...prev,
        user: AuthService?.getCurrentUser?.() ?? null,
      }));
    };

    window.addEventListener('ttb-auth-change', handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener('ttb-auth-change', handleAuthChange);
    };
  }, [contextValue]);

  return contextValue ?? standaloneState;
}
