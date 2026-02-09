/**
 * Unit tests for AuthGuard component
 * Feature: event-auth-jwt
 *
 * Tests specific example-based scenarios:
 * - No token → shows PasswordScreen (Requirement 4.4)
 * - Valid token → renders children (Requirement 4.3)
 * - clearAuthentication removes token (Requirement 4.5)
 * - Expired token → shows PasswordScreen and removes token (Requirement 5.2)
 * - Malformed token → shows PasswordScreen (Requirement 5.3)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EVENT_TOKEN_KEY } from '../../api/client';
import { AuthGuard, clearAuthentication, isEventAuthenticated } from '../AuthGuard';

// Mock PasswordScreen to avoid rendering the full component tree
vi.mock('../PasswordScreen', () => ({
  PasswordScreen: () => <div data-testid="password-screen">PasswordScreen</div>,
}));

// Re-export actual token helpers (we want real localStorage interaction)
vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client');
  return { ...actual };
});

/**
 * Create a fake JWT with the given payload.
 * AuthGuard only decodes the base64 payload — no signature verification —
 * so a fake signature is sufficient.
 */
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('AuthGuard Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  describe('no token → shows PasswordScreen (Requirement 4.4)', () => {
    it('renders PasswordScreen when no token exists in localStorage', () => {
      render(
        <AuthGuard>
          <div data-testid="protected-content">Protected</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('password-screen')).toBeDefined();
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('isEventAuthenticated returns false when no token exists', () => {
      expect(isEventAuthenticated()).toBe(false);
    });
  });

  describe('valid token → renders children (Requirement 4.3)', () => {
    it('renders children when a valid non-expired token is in localStorage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event', exp: futureExp });
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      render(
        <AuthGuard>
          <div data-testid="protected-content">Protected</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeDefined();
      expect(screen.queryByTestId('password-screen')).toBeNull();
    });

    it('isEventAuthenticated returns true when a valid token exists', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event', exp: futureExp });
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      expect(isEventAuthenticated()).toBe(true);
    });
  });

  describe('clearAuthentication removes token (Requirement 4.5)', () => {
    it('removes the event token from localStorage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event', exp: futureExp });
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      // Verify token is stored
      expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBe(token);

      // Act
      clearAuthentication();

      // Assert
      expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBeNull();
    });

    it('isEventAuthenticated returns false after clearAuthentication', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event', exp: futureExp });
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      expect(isEventAuthenticated()).toBe(true);

      clearAuthentication();

      expect(isEventAuthenticated()).toBe(false);
    });
  });

  describe('expired token → shows PasswordScreen (Requirement 5.2)', () => {
    it('shows PasswordScreen and removes expired token from localStorage', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event', exp: pastExp });
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      render(
        <AuthGuard>
          <div data-testid="protected-content">Protected</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('password-screen')).toBeDefined();
      expect(screen.queryByTestId('protected-content')).toBeNull();
      // Expired token should be cleaned up
      expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBeNull();
    });
  });

  describe('malformed token → shows PasswordScreen (Requirement 5.3)', () => {
    it('shows PasswordScreen when token is not a valid JWT', () => {
      localStorage.setItem(EVENT_TOKEN_KEY, 'not-a-jwt');

      render(
        <AuthGuard>
          <div data-testid="protected-content">Protected</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('password-screen')).toBeDefined();
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('shows PasswordScreen when token payload has no exp claim', () => {
      const token = createFakeJwt({ eventId: 'test-event-id', type: 'event' }); // no exp
      localStorage.setItem(EVENT_TOKEN_KEY, token);

      render(
        <AuthGuard>
          <div data-testid="protected-content">Protected</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('password-screen')).toBeDefined();
      expect(screen.queryByTestId('protected-content')).toBeNull();
      // Token without exp should be cleaned up
      expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBeNull();
    });
  });
});
