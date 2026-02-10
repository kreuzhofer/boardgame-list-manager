/**
 * Property-based tests for AuthGuard JWT authentication
 * Feature: event-auth-jwt
 *
 * Tests that AuthGuard correctly handles JWT tokens stored in localStorage:
 * - Valid (non-expired) tokens render protected content
 * - Expired tokens trigger re-authentication
 * - clearAuthentication removes the token
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { EVENT_TOKEN_KEY } from '../../api/client';
import { AuthGuard, clearAuthentication } from '../AuthGuard';

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
  const signature = 'fake-signature';
  return `${header}.${body}.${signature}`;
}

/**
 * Arbitrary that generates a future expiry timestamp (valid token).
 * Produces exp values between 1 hour and 30 days from now.
 */
const futureExpArbitrary = fc.integer({ min: 3600, max: 30 * 24 * 3600 }).map(
  (offset) => Math.floor(Date.now() / 1000) + offset
);

/**
 * Arbitrary that generates a past expiry timestamp (expired token).
 * Produces exp values between 1 hour and 30 days in the past.
 */
const pastExpArbitrary = fc.integer({ min: 3600, max: 30 * 24 * 3600 }).map(
  (offset) => Math.floor(Date.now() / 1000) - offset
);

/**
 * Arbitrary that generates a valid eventId (UUID-like string).
 */
const eventIdArbitrary = fc.uuid();

describe('AuthGuard Property Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  /**
   * Property 5: Valid token renders protected content
   *
   * For any non-expired JWT string stored in localStorage under EVENT_TOKEN_KEY,
   * the AuthGuard component should render its children and not render the PasswordScreen.
   *
   * **Validates: Requirements 4.3**
   */
  describe('Feature: event-auth-jwt, Property 5: Valid token renders protected content', () => {
    it('renders children when a valid (non-expired) JWT is in localStorage', () => {
      fc.assert(
        fc.property(
          eventIdArbitrary,
          futureExpArbitrary,
          (eventId, exp) => {
            // Arrange: store a non-expired JWT in localStorage
            const token = createFakeJwt({ eventId, type: 'event', exp });
            localStorage.setItem(EVENT_TOKEN_KEY, token);

            // Act: render AuthGuard with children
            const { unmount } = render(
              <AuthGuard>
                <div data-testid="protected-content">Protected</div>
              </AuthGuard>
            );

            try {
              // Assert: protected content is rendered
              expect(screen.getByTestId('protected-content')).toBeDefined();
              // Assert: PasswordScreen is NOT rendered
              expect(screen.queryByTestId('password-screen')).toBeNull();
            } finally {
              unmount();
              cleanup();
              localStorage.clear();
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 6: Expired token triggers re-authentication
   *
   * For any expired JWT string stored in localStorage under EVENT_TOKEN_KEY,
   * the AuthGuard component should remove the token from localStorage
   * and render the PasswordScreen.
   *
   * **Validates: Requirements 5.2**
   */
  describe('Feature: event-auth-jwt, Property 6: Expired token triggers re-authentication', () => {
    it('shows PasswordScreen when an expired JWT is in localStorage', () => {
      fc.assert(
        fc.property(
          eventIdArbitrary,
          pastExpArbitrary,
          (eventId, exp) => {
            // Arrange: store an expired JWT in localStorage
            const token = createFakeJwt({ eventId, type: 'event', exp });
            localStorage.setItem(EVENT_TOKEN_KEY, token);

            // Act: render AuthGuard
            const { unmount } = render(
              <AuthGuard>
                <div data-testid="protected-content">Protected</div>
              </AuthGuard>
            );

            try {
              // Assert: PasswordScreen is rendered
              expect(screen.getByTestId('password-screen')).toBeDefined();
              // Assert: protected content is NOT rendered
              expect(screen.queryByTestId('protected-content')).toBeNull();
              // Assert: expired token was removed from localStorage
              expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBeNull();
            } finally {
              unmount();
              cleanup();
              localStorage.clear();
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 7: clearAuthentication removes token
   *
   * For any JWT string stored in localStorage under EVENT_TOKEN_KEY,
   * calling clearAuthentication() should result in
   * localStorage.getItem(EVENT_TOKEN_KEY) returning null.
   *
   * **Validates: Requirements 4.5**
   */
  describe('Feature: event-auth-jwt, Property 7: clearAuthentication removes token', () => {
    it('clearAuthentication removes the event token from localStorage', () => {
      fc.assert(
        fc.property(
          eventIdArbitrary,
          fc.integer({ min: -86400, max: 86400 }),
          (eventId, expOffset) => {
            // Arrange: store any JWT (valid or expired) in localStorage
            const exp = Math.floor(Date.now() / 1000) + expOffset;
            const token = createFakeJwt({ eventId, type: 'event', exp });
            localStorage.setItem(EVENT_TOKEN_KEY, token);

            // Verify token is stored
            expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBe(token);

            // Act: call clearAuthentication
            clearAuthentication();

            // Assert: token is removed
            expect(localStorage.getItem(EVENT_TOKEN_KEY)).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
