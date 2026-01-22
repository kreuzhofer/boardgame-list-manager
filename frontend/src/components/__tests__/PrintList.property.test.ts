/**
 * Property-based tests for PrintList component
 * 
 * **Validates: Requirements 7.2**
 * 
 * Property 15: Print List Contains User's Games
 * For any user and game list, the print output SHALL contain exactly 
 * the games where the user is listed as a bringer.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterGamesUserIsBringing } from '../PrintList';
import type { Game, Player, Bringer, User } from '../../types';

// ============================================================================
// Custom Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid user names (non-empty strings)
 */
const userNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating valid game names (non-empty strings)
 */
const gameNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating a User object
 */
const userArbitrary: fc.Arbitrary<User> = fc.record({
  id: fc.uuid(),
  name: userNameArbitrary,
});

/**
 * Arbitrary for generating a Player object with user
 */
const playerArbitrary: fc.Arbitrary<Player> = fc.record({
  id: fc.uuid(),
  user: userArbitrary,
  addedAt: fc.date(),
});

/**
 * Arbitrary for generating a Bringer object with user
 */
const bringerArbitrary: fc.Arbitrary<Bringer> = fc.record({
  id: fc.uuid(),
  user: userArbitrary,
  addedAt: fc.date(),
});

/**
 * Arbitrary for generating a Game object
 */
const gameArbitrary: fc.Arbitrary<Game> = fc.record({
  id: fc.uuid(),
  name: gameNameArbitrary,
  players: fc.array(playerArbitrary, { minLength: 0, maxLength: 10 }),
  bringers: fc.array(bringerArbitrary, { minLength: 0, maxLength: 10 }),
  createdAt: fc.date(),
}).map(game => ({
  ...game,
  status: game.bringers.length === 0 ? 'wunsch' as const : 'verfuegbar' as const,
}));

/**
 * Arbitrary for generating a list of games
 */
const gameListArbitrary = fc.array(gameArbitrary, { minLength: 0, maxLength: 20 });

// ============================================================================
// Property 15: Print List Contains User's Games
// ============================================================================

describe('Property 15: Print List Contains User\'s Games', () => {
  /**
   * **Validates: Requirements 7.2**
   * 
   * For any user and game list, the print output SHALL contain exactly 
   * the games where the user is listed as a bringer (by user ID).
   */

  it('should return only games where user is a bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          const filtered = filterGamesUserIsBringing(games, userId);
          
          // Property: Every returned game must have the user as a bringer
          for (const game of filtered) {
            const userIsBringer = game.bringers.some(b => b.user.id === userId);
            expect(userIsBringer).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not exclude any game where user is a bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          const filtered = filterGamesUserIsBringing(games, userId);
          
          // Property: All games where user is a bringer should be included
          for (const game of games) {
            const userIsBringer = game.bringers.some(b => b.user.id === userId);
            if (userIsBringer) {
              expect(filtered).toContainEqual(game);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should satisfy biconditional: game in result <=> user is bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          const filtered = filterGamesUserIsBringing(games, userId);
          const filteredIds = new Set(filtered.map(g => g.id));
          
          // Property: Biconditional - game is in result if and only if user is a bringer
          for (const game of games) {
            const isInResult = filteredIds.has(game.id);
            const userIsBringer = game.bringers.some(b => b.user.id === userId);
            expect(isInResult).toBe(userIsBringer);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return exactly the count of games where user is bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          const filtered = filterGamesUserIsBringing(games, userId);
          
          // Property: Count should match exactly
          const expectedCount = games.filter(
            g => g.bringers.some(b => b.user.id === userId)
          ).length;
          
          expect(filtered.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not include games where user is only a player (not bringer)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          const filtered = filterGamesUserIsBringing(games, userId);
          
          // Property: Games where user is only a player should NOT be included
          for (const game of games) {
            const userIsPlayer = game.players.some(p => p.user.id === userId);
            const userIsBringer = game.bringers.some(b => b.user.id === userId);
            
            if (userIsPlayer && !userIsBringer) {
              expect(filtered).not.toContainEqual(game);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return empty array when user is not a bringer of any game', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          // Filter out games where user might be a bringer
          const gamesWithoutUser = games.map(game => ({
            ...game,
            bringers: game.bringers.filter(b => b.user.id !== userId),
          }));
          
          const filtered = filterGamesUserIsBringing(gamesWithoutUser, userId);
          
          // Property: Should return empty array
          expect(filtered).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve game data integrity (no mutation)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, userId) => {
          // Deep copy to compare
          const originalGames = JSON.stringify(games);
          
          filterGamesUserIsBringing(games, userId);
          
          // Property: Original array should be unchanged
          expect(JSON.stringify(games)).toBe(originalGames);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty games list', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const filtered = filterGamesUserIsBringing([], userId);
          
          // Property: Empty input should return empty output
          expect(filtered).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
