import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getToastMessage, shouldShowToast } from '../toastMessages';
import type { SSEEvent, GameCreatedEvent, BringerAddedEvent } from '../../types';

/**
 * Property-Based Tests for Toast Message Formatting
 * 
 * **Feature: 012-sse-real-time-updates**
 * **Property 4: Toast Message Formatting**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */

// Arbitraries for generating test data
const userNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const gameNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const gameIdArb = fc.uuid();
const userIdArb = fc.uuid();

// Generate GameCreatedEvent with isBringing: true
const gameCreatedBringingEventArb: fc.Arbitrary<GameCreatedEvent> = fc.record({
  type: fc.constant('game:created' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
  isBringing: fc.constant(true),
});

// Generate GameCreatedEvent with isBringing: false
const gameCreatedNotBringingEventArb: fc.Arbitrary<GameCreatedEvent> = fc.record({
  type: fc.constant('game:created' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
  isBringing: fc.constant(false),
});

// Generate BringerAddedEvent
const bringerAddedEventArb: fc.Arbitrary<BringerAddedEvent> = fc.record({
  type: fc.constant('game:bringer-added' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
});

// Generate events that should NOT trigger toasts
const noToastEventArb: fc.Arbitrary<SSEEvent> = fc.oneof(
  fc.record({
    type: fc.constant('game:bringer-removed' as const),
    gameId: gameIdArb,
    userId: userIdArb,
  }),
  fc.record({
    type: fc.constant('game:player-added' as const),
    gameId: gameIdArb,
    userId: userIdArb,
  }),
  fc.record({
    type: fc.constant('game:player-removed' as const),
    gameId: gameIdArb,
    userId: userIdArb,
  }),
  fc.record({
    type: fc.constant('game:deleted' as const),
    gameId: gameIdArb,
    userId: userIdArb,
  })
);

describe('Toast Message Formatting Properties', () => {
  /**
   * Property 4: Toast Message Formatting
   * For any game:created event with isBringing: true, the toast message SHALL be
   * formatted as "{userName} bringt {gameName} mit".
   */
  describe('Property 4.1: game:created with isBringing: true', () => {
    it('should format message as "NAME bringt GAME_NAME mit"', () => {
      fc.assert(
        fc.property(gameCreatedBringingEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.userName} bringt ${event.gameName} mit`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Toast Message Formatting
   * For any game:created event with isBringing: false, the toast message SHALL be
   * formatted as "{userName} wünscht sich {gameName}".
   */
  describe('Property 4.2: game:created with isBringing: false', () => {
    it('should format message as "NAME wünscht sich GAME_NAME"', () => {
      fc.assert(
        fc.property(gameCreatedNotBringingEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.userName} wünscht sich ${event.gameName}`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Toast Message Formatting
   * For any game:bringer-added event, the toast message SHALL be
   * formatted as "{userName} bringt {gameName} mit".
   */
  describe('Property 4.3: game:bringer-added', () => {
    it('should format message as "NAME bringt GAME_NAME mit"', () => {
      fc.assert(
        fc.property(bringerAddedEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.userName} bringt ${event.gameName} mit`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4.4: No toast for other events
   * For any event that is not game:created or game:bringer-added,
   * getToastMessage SHALL return null.
   */
  describe('Property 4.4: No toast for other events', () => {
    it('should return null for non-toast events', () => {
      fc.assert(
        fc.property(noToastEventArb, (event) => {
          const message = getToastMessage(event);
          expect(message).toBeNull();
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * shouldShowToast helper function tests
   */
  describe('shouldShowToast helper', () => {
    it('should return true for game:created events', () => {
      fc.assert(
        fc.property(
          fc.oneof(gameCreatedBringingEventArb, gameCreatedNotBringingEventArb),
          (event) => {
            expect(shouldShowToast(event)).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return true for game:bringer-added events', () => {
      fc.assert(
        fc.property(bringerAddedEventArb, (event) => {
          expect(shouldShowToast(event)).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should return false for non-toast events', () => {
      fc.assert(
        fc.property(noToastEventArb, (event) => {
          expect(shouldShowToast(event)).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });
});
