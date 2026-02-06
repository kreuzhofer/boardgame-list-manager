import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldShowToast, getToastMessage } from '../../utils/toastMessages';
import { calculateBackoffDelay } from '../useSSE';
import type { SSEEvent, GameCreatedEvent, BringerAddedEvent, PlayerAddedEvent } from '../../types';

/**
 * Property-Based Tests for SSE Hook
 * 
 * **Feature: 012-sse-real-time-updates**
 * **Property 5: Toast Filtering**
 * **Property 7: Reconnection Backoff**
 * **Validates: Requirements 1.2, 4.4, 4.8**
 */

// Arbitraries
const participantIdArb = fc.uuid();
const gameIdArb = fc.uuid();
const participantNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const gameNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// Generate toast-triggering events
const toastEventArb: fc.Arbitrary<GameCreatedEvent | BringerAddedEvent | PlayerAddedEvent> = fc.oneof(
  fc.record({
    type: fc.constant('game:created' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
    participantName: participantNameArb,
    gameName: gameNameArb,
    isBringing: fc.boolean(),
  }),
  fc.record({
    type: fc.constant('game:bringer-added' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
    participantName: participantNameArb,
    gameName: gameNameArb,
  }),
  fc.record({
    type: fc.constant('game:player-added' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
    participantName: participantNameArb,
    gameName: gameNameArb,
  })
);

// Generate non-toast events
const nonToastEventArb: fc.Arbitrary<SSEEvent> = fc.oneof(
  fc.record({
    type: fc.constant('game:bringer-removed' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
  }),
  fc.record({
    type: fc.constant('game:player-removed' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
  }),
  fc.record({
    type: fc.constant('game:deleted' as const),
    gameId: gameIdArb,
    participantId: participantIdArb,
  })
);

describe('SSE Hook Property Tests', () => {
  /**
   * Property 5: Toast Filtering
   * For any SSE event, a toast notification SHALL only be displayed if:
   * (1) the event type is game:created or game:bringer-added, AND
   * (2) the event's participantId does not match the current participant's ID.
   */
  describe('Property 5: Toast Filtering', () => {
    it('should show toast only for game:created and game:bringer-added events', () => {
      fc.assert(
        fc.property(toastEventArb, (event) => {
          expect(shouldShowToast(event)).toBe(true);
          expect(getToastMessage(event)).not.toBeNull();
        }),
        { numRuns: 10 }
      );
    });

    it('should NOT show toast for other event types', () => {
      fc.assert(
        fc.property(nonToastEventArb, (event) => {
          expect(shouldShowToast(event)).toBe(false);
          expect(getToastMessage(event)).toBeNull();
        }),
        { numRuns: 10 }
      );
    });

    it('toast filtering is based on event type, not user ID', () => {
      // The shouldShowToast function only checks event type
      // User ID filtering happens in the useSSE hook
      fc.assert(
        fc.property(
          fc.oneof(toastEventArb, nonToastEventArb),
          (event) => {
            const shouldShow = shouldShowToast(event);
            const isToastType = event.type === 'game:created' || event.type === 'game:bringer-added' || event.type === 'game:player-added';
            expect(shouldShow).toBe(isToastType);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 7: Reconnection Backoff
   * For any sequence of N consecutive connection failures (where N >= 1),
   * the delay before the Nth retry attempt SHALL be min(2^(N-1), 30) seconds.
   */
  describe('Property 7: Reconnection Backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            const expectedDelay = Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
            expect(delay).toBe(expectedDelay);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should never exceed 30 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            expect(delay).toBeLessThanOrEqual(30000);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always be at least 1 second for first attempt', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            expect(delay).toBeGreaterThanOrEqual(1000);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should increase monotonically until cap', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Before cap
          (attempt) => {
            const currentDelay = calculateBackoffDelay(attempt);
            const nextDelay = calculateBackoffDelay(attempt + 1);
            // Either increases or stays at cap
            expect(nextDelay).toBeGreaterThanOrEqual(currentDelay);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
