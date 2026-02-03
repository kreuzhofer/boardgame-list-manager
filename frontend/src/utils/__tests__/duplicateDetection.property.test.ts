/**
 * Property-based tests for duplicate detection
 * **Property 6: Duplicate Detection Priority**
 * **Validates: Requirements 5.1, 5.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  checkDuplicate,
  getExistingBggIds,
  getExistingNormalizedNames,
} from '../duplicateDetection';
import { normalizeName } from '../nameNormalization';
import type { Game } from '../../types';

// Helper to create a minimal game for testing
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-id',
    name: 'Test Game',
    owner: null,
    bggId: null,
    yearPublished: null,
    bggRating: null,
    addedAsAlternateName: null,
    alternateNames: [],
    isPrototype: false,
    isHidden: false,
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date(),
    ...overrides,
  };
}

// Arbitrary for generating game names
const gameNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Arbitrary for generating BGG IDs
const bggIdArb = fc.integer({ min: 1, max: 1000000 });

describe('checkDuplicate', () => {
  describe('Property 6: Duplicate Detection Priority', () => {
    it('bggId match takes priority over name match', () => {
      fc.assert(
        fc.property(bggIdArb, gameNameArb, gameNameArb, (bggId, existingName, inputName) => {
          // Create a game with both bggId and name
          const existingGame = createTestGame({ bggId, name: existingName });
          const games = [existingGame];

          // Check with matching bggId but different name
          const result = checkDuplicate(bggId, inputName, games);

          expect(result.isDuplicate).toBe(true);
          expect(result.matchedBy).toBe('bggId');
          expect(result.existingGame).toBe(existingGame);
        }),
        { numRuns: 15 }
      );
    });

    it('name match is used when no bggId match exists', () => {
      fc.assert(
        fc.property(gameNameArb, (name) => {
          // Create a game without bggId
          const existingGame = createTestGame({ bggId: null, name });
          const games = [existingGame];

          // Check with null bggId and matching name
          const result = checkDuplicate(null, name, games);

          expect(result.isDuplicate).toBe(true);
          expect(result.matchedBy).toBe('name');
          expect(result.existingGame).toBe(existingGame);
        }),
        { numRuns: 15 }
      );
    });

    it('returns not duplicate when neither bggId nor name matches', () => {
      fc.assert(
        fc.property(bggIdArb, bggIdArb, gameNameArb, gameNameArb, (existingBggId, inputBggId, existingName, inputName) => {
          // Ensure they are different
          fc.pre(existingBggId !== inputBggId);
          fc.pre(normalizeName(existingName) !== normalizeName(inputName));

          const existingGame = createTestGame({ bggId: existingBggId, name: existingName });
          const games = [existingGame];

          const result = checkDuplicate(inputBggId, inputName, games);

          expect(result.isDuplicate).toBe(false);
          expect(result.matchedBy).toBeNull();
          expect(result.existingGame).toBeNull();
        }),
        { numRuns: 15 }
      );
    });

    it('name matching is case-insensitive', () => {
      fc.assert(
        fc.property(gameNameArb, (name) => {
          const existingGame = createTestGame({ bggId: null, name: name.toLowerCase() });
          const games = [existingGame];

          // Check with uppercase version
          const result = checkDuplicate(null, name.toUpperCase(), games);

          expect(result.isDuplicate).toBe(true);
          expect(result.matchedBy).toBe('name');
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Unit tests for specific examples', () => {
    it('finds duplicate by bggId', () => {
      const game = createTestGame({ bggId: 13, name: 'Catan' });
      const result = checkDuplicate(13, 'Different Name', [game]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedBy).toBe('bggId');
      expect(result.existingGame).toBe(game);
    });

    it('finds duplicate by name when bggId is null', () => {
      const game = createTestGame({ bggId: null, name: 'Catan' });
      const result = checkDuplicate(null, 'catan', [game]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedBy).toBe('name');
      expect(result.existingGame).toBe(game);
    });

    it('finds duplicate by name when input bggId does not match', () => {
      const game = createTestGame({ bggId: 13, name: 'Catan' });
      const result = checkDuplicate(999, 'Catan', [game]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedBy).toBe('name');
    });

    it('returns no duplicate for empty games list', () => {
      const result = checkDuplicate(13, 'Catan', []);

      expect(result.isDuplicate).toBe(false);
      expect(result.matchedBy).toBeNull();
      expect(result.existingGame).toBeNull();
    });

    it('handles whitespace in name comparison', () => {
      const game = createTestGame({ bggId: null, name: 'Catan Junior' });
      const result = checkDuplicate(null, '  catan   junior  ', [game]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedBy).toBe('name');
    });
  });
});

describe('getExistingBggIds', () => {
  it('returns set of all non-null bggIds', () => {
    const games = [
      createTestGame({ bggId: 13 }),
      createTestGame({ bggId: null }),
      createTestGame({ bggId: 42 }),
    ];

    const ids = getExistingBggIds(games);

    expect(ids.size).toBe(2);
    expect(ids.has(13)).toBe(true);
    expect(ids.has(42)).toBe(true);
  });

  it('returns empty set for empty games list', () => {
    const ids = getExistingBggIds([]);
    expect(ids.size).toBe(0);
  });
});

describe('getExistingNormalizedNames', () => {
  it('returns set of normalized names', () => {
    const games = [
      createTestGame({ name: 'Catan' }),
      createTestGame({ name: 'AZUL' }),
    ];

    const names = getExistingNormalizedNames(games);

    expect(names.size).toBe(2);
    expect(names.has('catan')).toBe(true);
    expect(names.has('azul')).toBe(true);
  });

  it('returns empty set for empty games list', () => {
    const names = getExistingNormalizedNames([]);
    expect(names.size).toBe(0);
  });
});
