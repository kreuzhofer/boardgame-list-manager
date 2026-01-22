/**
 * Unit tests for useUser hook
 * 
 * **Validates: Requirements 5.4, 5.5, 5.6**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser, USER_ID_STORAGE_KEY } from '../useUser';

// Mock the API client
vi.mock('../../api/client', () => ({
  usersApi: {
    getById: vi.fn(),
  },
}));

import { usersApi } from '../../api/client';

const mockUsersApi = usersApi as {
  getById: ReturnType<typeof vi.fn>;
};

describe('useUser Hook', () => {
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
     * Test initial state with no stored user
     * Validates: Requirement 5.4
     */
    it('should return null user when no userId in localStorage', async () => {
      const { result } = renderHook(() => useUser());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    /**
     * Test loading state when there's a stored userId
     */
    it('should start with isLoading true when userId exists in localStorage', async () => {
      localStorage.setItem(USER_ID_STORAGE_KEY, 'some-user-id');
      // Don't resolve the mock immediately to catch loading state
      mockUsersApi.getById.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useUser());
      
      // Initially loading when there's a stored userId
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    /**
     * Test that setUser stores userId in localStorage
     * Validates: Requirement 5.4
     */
    it('should store userId in localStorage when setUser is called', async () => {
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const testUser = { id: 'test-user-id', name: 'Test User' };

      act(() => {
        result.current.setUser(testUser);
      });

      expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBe('test-user-id');
      expect(result.current.user).toEqual(testUser);
    });

    /**
     * Test that clearUser removes userId from localStorage
     */
    it('should remove userId from localStorage when clearUser is called', async () => {
      // Pre-set a user
      localStorage.setItem(USER_ID_STORAGE_KEY, 'existing-user-id');
      mockUsersApi.getById.mockResolvedValue({ user: { id: 'existing-user-id', name: 'Existing User' } });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.clearUser();
      });

      expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('API validation', () => {
    /**
     * Test that stored userId is validated via API on mount
     * Validates: Requirement 5.5
     */
    it('should fetch user from API when userId exists in localStorage', async () => {
      const storedUserId = 'stored-user-id';
      const mockUser = { id: storedUserId, name: 'Stored User' };
      
      localStorage.setItem(USER_ID_STORAGE_KEY, storedUserId);
      mockUsersApi.getById.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUsersApi.getById).toHaveBeenCalledWith(storedUserId);
      expect(result.current.user).toEqual(mockUser);
    });

    /**
     * Test that invalid/deleted user clears localStorage
     * Validates: Requirement 5.6
     */
    it('should clear localStorage when stored user no longer exists', async () => {
      const storedUserId = 'deleted-user-id';
      
      localStorage.setItem(USER_ID_STORAGE_KEY, storedUserId);
      mockUsersApi.getById.mockRejectedValue(new Error('User not found'));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUsersApi.getById).toHaveBeenCalledWith(storedUserId);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBeNull();
    });

    /**
     * Test that API returning null clears localStorage
     * Validates: Requirement 5.6
     */
    it('should clear localStorage when API returns null user', async () => {
      const storedUserId = 'invalid-user-id';
      
      localStorage.setItem(USER_ID_STORAGE_KEY, storedUserId);
      mockUsersApi.getById.mockResolvedValue({ user: null });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBeNull();
    });
  });

  describe('refreshUser', () => {
    /**
     * Test that refreshUser re-fetches user data
     */
    it('should re-fetch user data when refreshUser is called', async () => {
      const userId = 'refresh-test-id';
      const initialUser = { id: userId, name: 'Initial Name' };
      const updatedUser = { id: userId, name: 'Updated Name' };
      
      localStorage.setItem(USER_ID_STORAGE_KEY, userId);
      mockUsersApi.getById.mockResolvedValueOnce({ user: initialUser });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(initialUser);

      // Update mock for refresh
      mockUsersApi.getById.mockResolvedValueOnce({ user: updatedUser });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(mockUsersApi.getById).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    /**
     * Test that network errors are handled gracefully
     */
    it('should handle network errors gracefully', async () => {
      const storedUserId = 'network-error-id';
      
      localStorage.setItem(USER_ID_STORAGE_KEY, storedUserId);
      mockUsersApi.getById.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should clear user and localStorage on error
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBeNull();
    });
  });
});
