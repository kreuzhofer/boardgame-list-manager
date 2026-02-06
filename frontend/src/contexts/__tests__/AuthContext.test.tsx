import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as client from '../../api/client';

// Mock the API client
vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client');
  return {
    ...actual,
    accountsApi: {
      login: vi.fn(),
      register: vi.fn(),
      getMe: vi.fn(),
    },
    getToken: vi.fn(),
    setToken: vi.fn(),
    removeToken: vi.fn(),
  };
});

const mockAccount = {
  id: '123',
  email: 'test@example.com',
  role: 'account_owner' as const,
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no token stored
    vi.mocked(client.getToken).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('initial state', () => {
    it('starts with no account and not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.account).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('loads account from token on mount', async () => {
      vi.mocked(client.getToken).mockReturnValue('valid-token');
      vi.mocked(client.accountsApi.getMe).mockResolvedValue({ account: mockAccount });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    it('stores token and sets account on successful login', async () => {
      vi.mocked(client.accountsApi.login).mockResolvedValue({
        token: 'new-token',
        account: mockAccount,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(client.setToken).toHaveBeenCalledWith('new-token');
      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('sets error on failed login with invalid credentials', async () => {
      vi.mocked(client.accountsApi.login).mockRejectedValue(
        new client.ApiError('E-Mail oder Passwort ist falsch.', 'INVALID_CREDENTIALS')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('E-Mail oder Passwort ist falsch.');
      expect(result.current.account).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets generic error for non-API errors', async () => {
      vi.mocked(client.accountsApi.login).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Ein Fehler ist aufgetreten. Bitte später erneut versuchen.');
    });
  });

  describe('logout', () => {
    it('clears token, account, and error state', async () => {
      // First login to set account and then trigger an error scenario
      vi.mocked(client.getToken).mockReturnValue('valid-token');
      vi.mocked(client.accountsApi.getMe).mockResolvedValue({ account: mockAccount });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(client.removeToken).toHaveBeenCalled();
      expect(result.current.account).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('requires re-authentication after logout', async () => {
      // Login first
      vi.mocked(client.accountsApi.login).mockResolvedValue({
        token: 'new-token',
        account: mockAccount,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      act(() => {
        result.current.logout();
      });

      // After logout, user is not authenticated and must re-authenticate
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.account).toBeNull();
    });
  });

  describe('refreshAccount', () => {
    it('validates stored token via API and sets account', async () => {
      // Start with no token so mount completes quickly
      vi.mocked(client.getToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Now simulate a token being present and call refreshAccount
      vi.mocked(client.getToken).mockReturnValue('stored-token');
      vi.mocked(client.accountsApi.getMe).mockResolvedValue({ account: mockAccount });

      await act(async () => {
        await result.current.refreshAccount();
      });

      expect(client.accountsApi.getMe).toHaveBeenCalled();
      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears token silently when token is invalid/expired', async () => {
      vi.mocked(client.getToken).mockReturnValue('expired-token');
      vi.mocked(client.accountsApi.getMe).mockRejectedValue(
        new client.ApiError('Sitzung abgelaufen. Bitte erneut anmelden.', 'INVALID_TOKEN')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // On mount, refreshAccount is called with the expired token
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(client.removeToken).toHaveBeenCalled();
      expect(result.current.account).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      // Error should NOT be set for expired token (silent failure)
      expect(result.current.error).toBeNull();
    });

    it('does nothing when no token is stored', async () => {
      vi.mocked(client.getToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(client.accountsApi.getMe).not.toHaveBeenCalled();
      expect(result.current.account).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
