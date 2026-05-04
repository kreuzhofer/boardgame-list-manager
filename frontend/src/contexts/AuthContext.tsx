import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { accountsApi, getToken, setToken, removeToken, clearAllEventSessionData, ApiError } from '../api/client';
import type { Account } from '../types/account';

interface AuthContextValue {
  account: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = account !== null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAccount = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await accountsApi.getMe();
      setAccount(response.account);
    } catch (err) {
      // Token is invalid or expired
      removeToken();
      setAccount(null);
      if (err instanceof ApiError && err.code === 'INVALID_TOKEN') {
        // Silent failure for expired token
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await accountsApi.login(email, password);
      setToken(response.token);
      setAccount(response.account);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte später erneut versuchen.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await accountsApi.register(email, password);
      // Don't auto-login after registration - redirect to login page
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte später erneut versuchen.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    // Account logout also drops every per-event session artefact (event
    // JWTs + cached participant IDs). Without this, a user who entered
    // an event password while logged in could later log out and still
    // breeze past the password gate on the next visit because the event
    // JWT is still cached and the `users` row is still keyed by their
    // (now-orphaned) `participant_id` in localStorage.
    clearAllEventSessionData();
    setAccount(null);
    setError(null);
  }, []);

  const value: AuthContextValue = {
    account,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
