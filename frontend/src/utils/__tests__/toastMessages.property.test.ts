import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getToastMessage, shouldShowToast } from '../toastMessages';
import type { SSEEvent, GameCreatedEvent, BringerAddedEvent, PlayerAddedEvent } from '../../types';

/**
 * Property-Based Tests for Toast Message Formatting
 * 
 * **Feature: 012-sse-real-time-updates**
 * **Property 4: Toast Message Formatting**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
 */

// Arbitraries for generating test data
const participantNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const gameNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const gameIdArb = fc.uuid();
const participantIdArb = fc.uuid();

// Generate GameCreatedEvent with isBringing: true
const gameCreatedBringingEventArb: fc.Arbitrary<GameCreatedEvent> = fc.record({
  type: fc.constant('game:created' as const),
  gameId: gameIdArb,
  participantId: participantIdArb,
  participantName: participantNameArb,
  gameName: gameNameArb,
  isBringing: fc.constant(true),
});

// Generate GameCreatedEvent with isBringing: false
const gameCreatedNotBringingEventArb: fc.Arbitrary<GameCreatedEvent> = fc.record({
  type: fc.constant('game:created' as const),
  gameId: gameIdArb,
  participantId: participantIdArb,
  participantName: participantNameArb,
  gameName: gameNameArb,
  isBringing: fc.constant(false),
});

// Generate BringerAddedEvent
const bringerAddedEventArb: fc.Arbitrary<BringerAddedEvent> = fc.record({
  type: fc.constant('game:bringer-added' as const),
  gameId: gameIdArb,
  participantId: participantIdArb,
  participantName: participantNameArb,
  gameName: gameNameArb,
});

// Generate PlayerAddedEvent
const playerAddedEventArb: fc.Arbitrary<PlayerAddedEvent> = fc.record({
  type: fc.constant('game:player-added' as const),
  gameId: gameIdArb,
  participantId: participantIdArb,
  participantName: participantNameArb,
  gameName: gameNameArb,
});

// Generate events that should NOT trigger toasts
const noToastEventArb: fc.Arbitrary<SSEEvent> = fc.oneof(
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

describe('Toast Message Formatting Properties', () => {
  /**
   * Property 4: Toast Message Formatting
   * For any game:created event with isBringing: true, the toast message SHALL be
   * formatted as "{participantName} bringt {gameName} mit".
   */
  describe('Property 4.1: game:created with isBringing: true', () => {
    it('should format message as "NAME bringt GAME_NAME mit"', () => {
      fc.assert(
        fc.property(gameCreatedBringingEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.participantName} bringt ${event.gameName} mit`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Toast Message Formatting
   * For any game:created event with isBringing: false, the toast message SHALL be
   * formatted as "{participantName} wünscht sich {gameName}".
   */
  describe('Property 4.2: game:created with isBringing: false', () => {
    it('should format message as "NAME wünscht sich GAME_NAME"', () => {
      fc.assert(
        fc.property(gameCreatedNotBringingEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.participantName} wünscht sich ${event.gameName}`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4.3: game:bringer-added
   * For any game:bringer-added event, the toast message SHALL be
   * formatted as "{participantName} bringt {gameName} mit".
   */
  describe('Property 4.3: game:bringer-added', () => {
    it('should format message as "NAME bringt GAME_NAME mit"', () => {
      fc.assert(
        fc.property(bringerAddedEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.participantName} bringt ${event.gameName} mit`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4.4: game:player-added
   * For any game:player-added event, the toast message SHALL be
   * formatted as "{participantName} spielt mit bei {gameName}".
   */
  describe('Property 4.4: game:player-added', () => {
    it('should format message as "NAME spielt mit bei GAME_NAME"', () => {
      fc.assert(
        fc.property(playerAddedEventArb, (event) => {
          const message = getToastMessage(event);
          
          expect(message).not.toBeNull();
          expect(message).toBe(`${event.participantName} spielt mit bei ${event.gameName}`);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4.5: No toast for other events
   * For any event that is not game:created, game:bringer-added, or game:player-added,
   * getToastMessage SHALL return null.
   */
  describe('Property 4.5: No toast for other events', () => {
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

    it('should return true for game:player-added events', () => {
      fc.assert(
        fc.property(playerAddedEventArb, (event) => {
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
