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
      const mockAccount = {
        id: '123',
        email: 'test@example.com',
        role: 'account_owner' as const,
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

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
      const mockAccount = {
        id: '123',
        email: 'test@example.com',
        role: 'account_owner' as const,
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

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

    it('sets error on failed login', async () => {
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
    });
  });

  describe('register', () => {
    it('calls register API', async () => {
      const mockAccount = {
        id: '123',
        email: 'new@example.com',
        role: 'account_owner' as const,
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(client.accountsApi.register).mockResolvedValue({
        account: mockAccount,
        message: 'Konto erfolgreich erstellt.',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123');
      });

      expect(client.accountsApi.register).toHaveBeenCalledWith('new@example.com', 'password123');
      // Register doesn't auto-login
      expect(result.current.account).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears token and account', async () => {
      const mockAccount = {
        id: '123',
        email: 'test@example.com',
        role: 'account_owner' as const,
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

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
    });
  });
});
