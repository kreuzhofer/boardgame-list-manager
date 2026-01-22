/**
 * Custom hook for user management
 * Stores userId in localStorage and fetches user data from API
 * Requirements: 5.4, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from 'react';
import { usersApi } from '../api/client';
import type { User } from '../types';

// Storage key for user ID
export const USER_ID_STORAGE_KEY = 'boardgame_event_user_id';

/**
 * Read user ID from localStorage
 */
function readUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to read user ID from localStorage');
    return null;
  }
}

/**
 * Write user ID to localStorage
 */
function writeUserId(id: string): void {
  try {
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
  } catch {
    // localStorage might not be available
    console.warn('Unable to store user ID in localStorage');
  }
}

/**
 * Remove user ID from localStorage
 */
function removeUserId(): void {
  try {
    localStorage.removeItem(USER_ID_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to remove user ID from localStorage');
  }
}

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  refreshUser: () => Promise<void>;
}

/**
 * Hook for managing user in localStorage with API validation
 * @returns Object with user, isLoading, error, setUser, clearUser, and refreshUser
 * 
 * Requirements:
 * - 5.4: Store user ID in localStorage
 * - 5.5: Verify user still exists via API on load
 * - 5.6: Clear localStorage if user no longer exists
 */
export function useUser(): UseUserReturn {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user data from API and validate
   */
  const fetchUser = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const response = await usersApi.getById(userId);
      return response.user;
    } catch (err) {
      // User not found or other error
      console.warn('Failed to fetch user:', err);
      return null;
    }
  }, []);

  /**
   * Refresh user data from API
   * Requirement 5.5: Verify user still exists via API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    const storedUserId = readUserId();
    
    if (!storedUserId) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchedUser = await fetchUser(storedUserId);
    
    if (fetchedUser) {
      setUserState(fetchedUser);
    } else {
      // Requirement 5.6: Clear localStorage if user no longer exists
      removeUserId();
      setUserState(null);
    }
    
    setIsLoading(false);
  }, [fetchUser]);

  /**
   * Set user and store ID in localStorage
   * Requirement 5.4: Store user ID in localStorage
   */
  const setUser = useCallback((newUser: User) => {
    writeUserId(newUser.id);
    setUserState(newUser);
    setError(null);
  }, []);

  /**
   * Clear user from state and localStorage
   */
  const clearUser = useCallback(() => {
    removeUserId();
    setUserState(null);
    setError(null);
  }, []);

  // Initialize on mount - validate stored user
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    user,
    isLoading,
    error,
    setUser,
    clearUser,
    refreshUser,
  };
}

export default useUser;
