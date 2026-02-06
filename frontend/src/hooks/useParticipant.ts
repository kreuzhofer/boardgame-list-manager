/**
 * Custom hook for participant management
 * Stores participantId in localStorage and fetches participant data from API
 * Requirements: 5.4, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from 'react';
import { participantsApi } from '../api/client';
import type { Participant } from '../types';

// Storage key for participant ID
export const PARTICIPANT_ID_STORAGE_KEY = 'boardgame_event_participant_id';
export const LEGACY_PARTICIPANT_ID_STORAGE_KEY = 'boardgame_event_user_id';

/**
 * Read participant ID from localStorage
 */
function readParticipantId(): string | null {
  try {
    const current = localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY);
    if (current) {
      return current;
    }

    const legacy = localStorage.getItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY);
    if (legacy) {
      // Migrate legacy key forward
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY);
      return legacy;
    }

    return null;
  } catch {
    // localStorage might not be available
    console.warn('Unable to read participant ID from localStorage');
    return null;
  }
}

/**
 * Write participant ID to localStorage
 */
function writeParticipantId(id: string): void {
  try {
    localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, id);
    localStorage.removeItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to store participant ID in localStorage');
  }
}

/**
 * Remove participant ID from localStorage
 */
function removeParticipantId(): void {
  try {
    localStorage.removeItem(PARTICIPANT_ID_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY);
  } catch {
    // localStorage might not be available
    console.warn('Unable to remove participant ID from localStorage');
  }
}

export interface UseParticipantReturn {
  participant: Participant | null;
  isLoading: boolean;
  error: string | null;
  setParticipant: (participant: Participant) => void;
  clearParticipant: () => void;
  refreshParticipant: () => Promise<void>;
}

/**
 * Hook for managing participant in localStorage with API validation
 * @returns Object with participant, isLoading, error, setParticipant, clearParticipant, and refreshParticipant
 * 
 * Requirements:
 * - 5.4: Store participant ID in localStorage
 * - 5.5: Verify participant still exists via API on load
 * - 5.6: Clear localStorage if participant no longer exists
 */
export function useParticipant(): UseParticipantReturn {
  const [participant, setParticipantState] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch participant data from API and validate
   */
  const fetchParticipant = useCallback(async (participantId: string): Promise<Participant | null> => {
    try {
      const response = await participantsApi.getById(participantId);
      return response.participant;
    } catch (err) {
      // Participant not found or other error
      console.warn('Failed to fetch participant:', err);
      return null;
    }
  }, []);

  /**
   * Refresh participant data from API
   * Requirement 5.5: Verify participant still exists via API
   */
  const refreshParticipant = useCallback(async (): Promise<void> => {
    const storedParticipantId = readParticipantId();
    
    if (!storedParticipantId) {
      setParticipantState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchedParticipant = await fetchParticipant(storedParticipantId);
    
    if (fetchedParticipant) {
      setParticipantState(fetchedParticipant);
    } else {
      // Requirement 5.6: Clear localStorage if participant no longer exists
      removeParticipantId();
      setParticipantState(null);
    }
    
    setIsLoading(false);
  }, [fetchParticipant]);

  /**
   * Set participant and store ID in localStorage
   * Requirement 5.4: Store participant ID in localStorage
   */
  const setParticipant = useCallback((newParticipant: Participant) => {
    writeParticipantId(newParticipant.id);
    setParticipantState(newParticipant);
    setError(null);
  }, []);

  /**
   * Clear participant from state and localStorage
   */
  const clearParticipant = useCallback(() => {
    removeParticipantId();
    setParticipantState(null);
    setError(null);
  }, []);

  // Initialize on mount - validate stored participant
  useEffect(() => {
    refreshParticipant();
  }, [refreshParticipant]);

  return {
    participant,
    isLoading,
    error,
    setParticipant,
    clearParticipant,
    refreshParticipant,
  };
}

export default useParticipant;
