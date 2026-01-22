/**
 * Custom hook for user name management
 * Reads/writes to localStorage with key 'boardgame_event_user_name'
 * Requirements: 2.2, 2.3
 */

import { useState, useCallback, useEffect } from 'react';

// Storage key for user name
export const USER_NAME_STORAGE_KEY = 'boardgame_event_user_name';

/**
 * Read user name from localStorage
 */
function readUserName(): string | null {
  try {
    return localStorage.getItem(USER_NAME_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to read user name from localStorage');
    return null;
  }
}

/**
 * Write user name to localStorage
 */
function writeUserName(name: string): void {
  try {
    localStorage.setItem(USER_NAME_STORAGE_KEY, name);
  } catch {
    // localStorage might not be available
    console.warn('Unable to store user name in localStorage');
  }
}

/**
 * Remove user name from localStorage
 */
function removeUserName(): void {
  try {
    localStorage.removeItem(USER_NAME_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to remove user name from localStorage');
  }
}

export interface UseUserNameReturn {
  userName: string | null;
  setUserName: (name: string) => void;
  clearUserName: () => void;
}

/**
 * Hook for managing user name in localStorage
 * @returns Object with userName, setUserName, and clearUserName
 */
export function useUserName(): UseUserNameReturn {
  const [userName, setUserNameState] = useState<string | null>(() => {
    return readUserName();
  });

  // Sync with localStorage on mount (in case it changed in another tab)
  useEffect(() => {
    const storedName = readUserName();
    if (storedName !== userName) {
      setUserNameState(storedName);
    }
  }, []);

  const setUserName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      writeUserName(trimmedName);
      setUserNameState(trimmedName);
    }
  }, []);

  const clearUserName = useCallback(() => {
    removeUserName();
    setUserNameState(null);
  }, []);

  return {
    userName,
    setUserName,
    clearUserName,
  };
}

export default useUserName;
