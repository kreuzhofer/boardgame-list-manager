/**
 * Unit tests for useParticipant hook
 * 
 * **Validates: Requirements 5.4, 5.5, 5.6**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useParticipant, PARTICIPANT_ID_STORAGE_KEY, LEGACY_PARTICIPANT_ID_STORAGE_KEY } from '../useParticipant';

// Mock the API client
vi.mock('../../api/client', () => ({
  participantsApi: {
    getById: vi.fn(),
  },
}));

import { participantsApi } from '../../api/client';

const mockParticipantsApi = participantsApi as {
  getById: ReturnType<typeof vi.fn>;
};

describe('useParticipant Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    /**
     * Test initial state with no stored participant
     * Validates: Requirement 5.4
     */
    it('should return null participant when no participantId in localStorage', async () => {
      const { result } = renderHook(() => useParticipant());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.participant).toBeNull();
      expect(result.current.error).toBeNull();
    });

    /**
     * Test loading state when there's a stored participantId
     */
    it('should start with isLoading true when participantId exists in localStorage', async () => {
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, 'some-participant-id');
      // Don't resolve the mock immediately to catch loading state
      mockParticipantsApi.getById.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useParticipant());
      
      // Initially loading when there's a stored participantId
      expect(result.current.isLoading).toBe(true);
    });

    it('should migrate legacy storage key to participant key', async () => {
      localStorage.setItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY, 'legacy-id');
      mockParticipantsApi.getById.mockResolvedValue({ participant: { id: 'legacy-id', name: 'Legacy' } });

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBe('legacy-id');
      expect(localStorage.getItem(LEGACY_PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
      expect(result.current.participant).toEqual({ id: 'legacy-id', name: 'Legacy' });
    });
  });

  describe('localStorage persistence', () => {
    /**
     * Test that setParticipant stores participantId in localStorage
     * Validates: Requirement 5.4
     */
    it('should store participantId in localStorage when setParticipant is called', async () => {
      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const testParticipant = { id: 'test-participant-id', name: 'Test Participant' };

      act(() => {
        result.current.setParticipant(testParticipant);
      });

      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBe('test-participant-id');
      expect(result.current.participant).toEqual(testParticipant);
    });

    /**
     * Test that clearParticipant removes participantId from localStorage
     */
    it('should remove participantId from localStorage when clearParticipant is called', async () => {
      // Pre-set a participant
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, 'existing-participant-id');
      mockParticipantsApi.getById.mockResolvedValue({ participant: { id: 'existing-participant-id', name: 'Existing Participant' } });

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.clearParticipant();
      });

      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
      expect(result.current.participant).toBeNull();
    });
  });

  describe('API validation', () => {
    /**
     * Test that stored participantId is validated via API on mount
     * Validates: Requirement 5.5
     */
    it('should fetch participant from API when participantId exists in localStorage', async () => {
      const storedParticipantId = 'stored-participant-id';
      const mockParticipant = { id: storedParticipantId, name: 'Stored Participant' };
      
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, storedParticipantId);
      mockParticipantsApi.getById.mockResolvedValue({ participant: mockParticipant });

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockParticipantsApi.getById).toHaveBeenCalledWith(storedParticipantId);
      expect(result.current.participant).toEqual(mockParticipant);
    });

    /**
     * Test that invalid/deleted participant clears localStorage
     * Validates: Requirement 5.6
     */
    it('should clear localStorage when stored participant no longer exists', async () => {
      const storedParticipantId = 'deleted-participant-id';
      
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, storedParticipantId);
      mockParticipantsApi.getById.mockRejectedValue(new Error('Participant not found'));

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockParticipantsApi.getById).toHaveBeenCalledWith(storedParticipantId);
      expect(result.current.participant).toBeNull();
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
    });

    /**
     * Test that API returning null clears localStorage
     * Validates: Requirement 5.6
     */
    it('should clear localStorage when API returns null participant', async () => {
      const storedParticipantId = 'invalid-participant-id';
      
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, storedParticipantId);
      mockParticipantsApi.getById.mockResolvedValue({ participant: null });

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.participant).toBeNull();
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
    });
  });

  describe('refreshParticipant', () => {
    /**
     * Test that refreshUser re-fetches user data
     */
    it('should re-fetch participant data when refreshParticipant is called', async () => {
      const participantId = 'refresh-test-id';
      const initialParticipant = { id: participantId, name: 'Initial Name' };
      const updatedParticipant = { id: participantId, name: 'Updated Name' };
      
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, participantId);
      mockParticipantsApi.getById.mockResolvedValueOnce({ participant: initialParticipant });

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.participant).toEqual(initialParticipant);

      // Update mock for refresh
      mockParticipantsApi.getById.mockResolvedValueOnce({ participant: updatedParticipant });

      await act(async () => {
        await result.current.refreshParticipant();
      });

      expect(result.current.participant).toEqual(updatedParticipant);
      expect(mockParticipantsApi.getById).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    /**
     * Test that network errors are handled gracefully
     */
    it('should handle network errors gracefully', async () => {
      const storedParticipantId = 'network-error-id';
      
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, storedParticipantId);
      mockParticipantsApi.getById.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useParticipant());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should clear user and localStorage on error
      expect(result.current.participant).toBeNull();
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
    });
  });
});
