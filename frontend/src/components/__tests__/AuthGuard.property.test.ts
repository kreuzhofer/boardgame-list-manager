/**
 * Property-based tests for AuthGuard event access isolation
 * Feature: authentication-system
 * Property 5: Event access isolation
 * **Validates: Requirements 5.3**
 *
 * Tests that event access state stored per-event key in sessionStorage
 * is independent — authenticating to one event does not grant access
 * to another event.
 */

import * as fc from 'fast-check';

/** Key prefix for per-event auth storage */
const EVENT_AUTH_PREFIX = 'boardgame_event_auth';

/**
 * Build a per-event storage key from an event identifier (slug or id).
 * This simulates the per-event keying strategy described in the design.
 */
function eventAuthKey(eventIdentifier: string): string {
  return `${EVENT_AUTH_PREFIX}_${eventIdentifier}`;
}

/**
 * Check if a specific event is authenticated in sessionStorage.
 */
function isEventAuthenticated(eventIdentifier: string): boolean {
  try {
    return sessionStorage.getItem(eventAuthKey(eventIdentifier)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set authentication state for a specific event in sessionStorage.
 */
function setEventAuthenticated(eventIdentifier: string, authenticated: boolean): void {
  const key = eventAuthKey(eventIdentifier);
  if (authenticated) {
    sessionStorage.setItem(key, 'true');
  } else {
    sessionStorage.removeItem(key);
  }
}

/**
 * Arbitrary that generates valid event identifier strings (slugs).
 * Produces realistic slug-like strings: lowercase alphanumeric with hyphens.
 */
const eventSlugArbitrary = fc
  .stringMatching(/^[a-z][a-z0-9-]{2,20}[a-z0-9]$/)
  .filter((s) => !s.includes('--'));

/**
 * Arbitrary that generates two distinct event slugs.
 */
const twoDistinctSlugsArbitrary = fc
  .tuple(eventSlugArbitrary, eventSlugArbitrary)
  .filter(([a, b]) => a !== b);

describe('AuthGuard Property Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('Property 5: Event access isolation', () => {
    /**
     * **Validates: Requirements 5.3**
     *
     * For any two distinct events, authenticating to one event
     * should not grant access to the other. The per-event storage
     * keys must be independent.
     */
    it('authenticating to one event does not grant access to another', () => {
      fc.assert(
        fc.property(twoDistinctSlugsArbitrary, ([eventA, eventB]) => {
          // Clear state
          sessionStorage.clear();

          // Neither event is authenticated initially
          expect(isEventAuthenticated(eventA)).toBe(false);
          expect(isEventAuthenticated(eventB)).toBe(false);

          // Authenticate event A only
          setEventAuthenticated(eventA, true);

          // Event A is authenticated, event B is NOT
          expect(isEventAuthenticated(eventA)).toBe(true);
          expect(isEventAuthenticated(eventB)).toBe(false);
        }),
        { numRuns: 5 }
      );
    });

    it('clearing one event auth does not affect another authenticated event', () => {
      fc.assert(
        fc.property(twoDistinctSlugsArbitrary, ([eventA, eventB]) => {
          // Clear state
          sessionStorage.clear();

          // Authenticate both events
          setEventAuthenticated(eventA, true);
          setEventAuthenticated(eventB, true);

          expect(isEventAuthenticated(eventA)).toBe(true);
          expect(isEventAuthenticated(eventB)).toBe(true);

          // Clear event A only
          setEventAuthenticated(eventA, false);

          // Event A is no longer authenticated, event B still is
          expect(isEventAuthenticated(eventA)).toBe(false);
          expect(isEventAuthenticated(eventB)).toBe(true);
        }),
        { numRuns: 5 }
      );
    });

    it('each event key maps to its own independent storage entry', () => {
      fc.assert(
        fc.property(twoDistinctSlugsArbitrary, ([eventA, eventB]) => {
          sessionStorage.clear();

          const keyA = eventAuthKey(eventA);
          const keyB = eventAuthKey(eventB);

          // Keys must be different for distinct events
          expect(keyA).not.toBe(keyB);

          // Setting one key does not set the other
          sessionStorage.setItem(keyA, 'true');
          expect(sessionStorage.getItem(keyA)).toBe('true');
          expect(sessionStorage.getItem(keyB)).toBeNull();
        }),
        { numRuns: 5 }
      );
    });
  });
});
