/**
 * Custom hook for participant name management
 * Reads/writes to localStorage with key 'boardgame_event_participant_name'
 * Requirements: 2.2, 2.3
 */

import { useState, useCallback, useEffect } from 'react';

// Storage key for participant name
export const PARTICIPANT_NAME_STORAGE_KEY = 'boardgame_event_participant_name';
export const LEGACY_PARTICIPANT_NAME_STORAGE_KEY = 'boardgame_event_user_name';

/**
 * Read participant name from localStorage
 */
function readParticipantName(): string | null {
  try {
    const current = localStorage.getItem(PARTICIPANT_NAME_STORAGE_KEY);
    if (current) {
      return current;
    }

    const legacy = localStorage.getItem(LEGACY_PARTICIPANT_NAME_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(PARTICIPANT_NAME_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_PARTICIPANT_NAME_STORAGE_KEY);
      return legacy;
    }

    return null;
  } catch {
    // localStorage might not be available
    console.warn('Unable to read participant name from localStorage');
    return null;
  }
}

/**
 * Write participant name to localStorage
 */
function writeParticipantName(name: string): void {
  try {
    localStorage.setItem(PARTICIPANT_NAME_STORAGE_KEY, name);
    localStorage.removeItem(LEGACY_PARTICIPANT_NAME_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to store participant name in localStorage');
  }
}

/**
 * Remove participant name from localStorage
 */
function removeParticipantName(): void {
  try {
    localStorage.removeItem(PARTICIPANT_NAME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PARTICIPANT_NAME_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to remove participant name from localStorage');
  }
}

export interface UseParticipantNameReturn {
  participantName: string | null;
  setParticipantName: (name: string) => void;
  clearParticipantName: () => void;
}

/**
 * Hook for managing participant name in localStorage
 * @returns Object with participantName, setParticipantName, and clearParticipantName
 */
export function useParticipantName(): UseParticipantNameReturn {
  const [participantName, setParticipantNameState] = useState<string | null>(() => {
    return readParticipantName();
  });

  // Sync with localStorage on mount (in case it changed in another tab)
  useEffect(() => {
    const storedName = readParticipantName();
    if (storedName !== participantName) {
      setParticipantNameState(storedName);
    }
  }, []);

  const setParticipantName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      writeParticipantName(trimmedName);
      setParticipantNameState(trimmedName);
    }
  }, []);

  const clearParticipantName = useCallback(() => {
    removeParticipantName();
    setParticipantNameState(null);
  }, []);

  return {
    participantName,
    setParticipantName,
    clearParticipantName,
  };
}

export default useParticipantName;
