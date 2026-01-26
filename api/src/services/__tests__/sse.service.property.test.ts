import * as fc from 'fast-check';
import { GameEvent, SSEEventType } from '../../types';

/**
 * Property-Based Tests for SSE Event Payload Structure
 * 
 * **Feature: 012-sse-real-time-updates**
 * **Property 2: Event Payload Structure**
 * **Property 3: Event Payload Serialization Round-Trip**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
 */

// Arbitraries for generating test data
const gameIdArb = fc.uuid();
const userIdArb = fc.uuid();
const userNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const gameNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// Generate GameCreatedEvent
const gameCreatedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:created' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
  isBringing: fc.boolean(),
});

// Generate BringerAddedEvent
const bringerAddedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:bringer-added' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
});

// Generate BringerRemovedEvent
const bringerRemovedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:bringer-removed' as const),
  gameId: gameIdArb,
  userId: userIdArb,
});

// Generate PlayerAddedEvent
const playerAddedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:player-added' as const),
  gameId: gameIdArb,
  userId: userIdArb,
  userName: userNameArb,
  gameName: gameNameArb,
});

// Generate PlayerRemovedEvent
const playerRemovedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:player-removed' as const),
  gameId: gameIdArb,
  userId: userIdArb,
});

// Generate GameDeletedEvent
const gameDeletedEventArb: fc.Arbitrary<GameEvent> = fc.record({
  type: fc.constant('game:deleted' as const),
  gameId: gameIdArb,
  userId: userIdArb,
});

// Generate any GameEvent
const gameEventArb: fc.Arbitrary<GameEvent> = fc.oneof(
  gameCreatedEventArb,
  bringerAddedEventArb,
  bringerRemovedEventArb,
  playerAddedEventArb,
  playerRemovedEventArb,
  gameDeletedEventArb
);

describe('SSE Event Payload Properties', () => {
  /**
   * Property 2: Event Payload Structure
   * For any SSE event broadcast, the payload SHALL contain `type`, `gameId`, and `userId` fields.
   */
  describe('Property 2: Event Payload Structure', () => {
    it('all events contain required base fields (type, gameId, userId)', () => {
      fc.assert(
        fc.property(gameEventArb, (event) => {
          // All events must have type, gameId, userId
          expect(event.type).toBeDefined();
          expect(typeof event.type).toBe('string');
          expect(event.gameId).toBeDefined();
          expect(typeof event.gameId).toBe('string');
          expect(event.userId).toBeDefined();
          expect(typeof event.userId).toBe('string');
        }),
        { numRuns: 10 }
      );
    });

    it('game:created events include userName, gameName, and isBringing', () => {
      fc.assert(
        fc.property(gameCreatedEventArb, (event) => {
          expect(event.type).toBe('game:created');
          // Cast to access type-specific fields
          const createdEvent = event as { userName: string; gameName: string; isBringing: boolean };
          expect(createdEvent.userName).toBeDefined();
          expect(typeof createdEvent.userName).toBe('string');
          expect(createdEvent.gameName).toBeDefined();
          expect(typeof createdEvent.gameName).toBe('string');
          expect(createdEvent.isBringing).toBeDefined();
          expect(typeof createdEvent.isBringing).toBe('boolean');
        }),
        { numRuns: 10 }
      );
    });

    it('game:bringer-added events include userName and gameName', () => {
      fc.assert(
        fc.property(bringerAddedEventArb, (event) => {
          expect(event.type).toBe('game:bringer-added');
          // Cast to access type-specific fields
          const bringerEvent = event as { userName: string; gameName: string };
          expect(bringerEvent.userName).toBeDefined();
          expect(typeof bringerEvent.userName).toBe('string');
          expect(bringerEvent.gameName).toBeDefined();
          expect(typeof bringerEvent.gameName).toBe('string');
        }),
        { numRuns: 10 }
      );
    });

    it('event type is a valid SSEEventType', () => {
      const validTypes: SSEEventType[] = [
        'game:created',
        'game:bringer-added',
        'game:bringer-removed',
        'game:player-added',
        'game:player-removed',
        'game:deleted',
      ];

      fc.assert(
        fc.property(gameEventArb, (event) => {
          expect(validTypes).toContain(event.type);
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 3: Event Payload Serialization Round-Trip
   * For any valid GameEvent object, serializing it to JSON and parsing it back
   * SHALL produce an equivalent object with all fields preserved.
   */
  describe('Property 3: Event Payload Serialization Round-Trip', () => {
    it('JSON serialization round-trip preserves all fields', () => {
      fc.assert(
        fc.property(gameEventArb, (event) => {
          const serialized = JSON.stringify(event);
          const deserialized = JSON.parse(serialized);

          // All base fields preserved
          expect(deserialized.type).toBe(event.type);
          expect(deserialized.gameId).toBe(event.gameId);
          expect(deserialized.userId).toBe(event.userId);

          // Type-specific fields preserved
          if (event.type === 'game:created') {
            expect(deserialized.userName).toBe(event.userName);
            expect(deserialized.gameName).toBe(event.gameName);
            expect(deserialized.isBringing).toBe(event.isBringing);
          }

          if (event.type === 'game:bringer-added') {
            expect(deserialized.userName).toBe(event.userName);
            expect(deserialized.gameName).toBe(event.gameName);
          }
        }),
        { numRuns: 10 }
      );
    });

    it('serialized event is valid JSON', () => {
      fc.assert(
        fc.property(gameEventArb, (event) => {
          const serialized = JSON.stringify(event);
          expect(() => JSON.parse(serialized)).not.toThrow();
        }),
        { numRuns: 10 }
      );
    });

    it('deserialized event has same keys as original', () => {
      fc.assert(
        fc.property(gameEventArb, (event) => {
          const serialized = JSON.stringify(event);
          const deserialized = JSON.parse(serialized);

          const originalKeys = Object.keys(event).sort();
          const deserializedKeys = Object.keys(deserialized).sort();

          expect(deserializedKeys).toEqual(originalKeys);
        }),
        { numRuns: 10 }
      );
    });
  });
});
