/**
 * Property-based tests for filtering and sorting utilities
 * 
 * **Validates: Requirements 5.2, 5.3, 5.7, 5.8, 5.9**
 * 
 * Property 11: Alphabetical Sort Order
 * Property 12: Search Filter Correctness
 * Property 13: Wunsch Filter Correctness
 * Property 14: My Games Filter Correctness
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterByName,
  filterByPlayer,
  filterByBringer,
  filterWunschGames,
  filterMyGames,
} from '../filtering';
import { sortGamesByName, toggleSortOrder, type SortOrder } from '../sorting';
import type { Game, Player, Bringer } from '../../types';

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
 * Arbitrary for generating a Player object
 */
const playerArbitrary: fc.Arbitrary<Player> = fc.record({
  id: fc.uuid(),
  name: userNameArbitrary,
  addedAt: fc.date(),
});

/**
 * Arbitrary for generating a Bringer object
 */
const bringerArbitrary: fc.Arbitrary<Bringer> = fc.record({
  id: fc.uuid(),
  name: userNameArbitrary,
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

/**
 * Arbitrary for generating search query strings (can be empty or non-empty)
 */
const searchQueryArbitrary = fc.string({ minLength: 0, maxLength: 30 });

/**
 * Arbitrary for sort order
 */
const sortOrderArbitrary: fc.Arbitrary<SortOrder> = fc.constantFrom('asc', 'desc');

// ============================================================================
// Property 11: Alphabetical Sort Order
// ============================================================================

describe('Property 11: Alphabetical Sort Order', () => {
  /**
   * **Validates: Requirements 5.2, 5.3**
   * 
   * For any list of games, the default sort order SHALL be alphabetically 
   * ascending by game name, and toggling SHALL reverse to descending order.
   */

  it('ascending sort should produce games in alphabetical order (A→Z)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const sorted = sortGamesByName(games, 'asc');
          
          // Property: Each consecutive pair should be in ascending order
          for (let i = 0; i < sorted.length - 1; i++) {
            const comparison = sorted[i].name.localeCompare(sorted[i + 1].name, 'de', { sensitivity: 'base' });
            expect(comparison).toBeLessThanOrEqual(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('descending sort should produce games in reverse alphabetical order (Z→A)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const sorted = sortGamesByName(games, 'desc');
          
          // Property: Each consecutive pair should be in descending order
          for (let i = 0; i < sorted.length - 1; i++) {
            const comparison = sorted[i].name.localeCompare(sorted[i + 1].name, 'de', { sensitivity: 'base' });
            expect(comparison).toBeGreaterThanOrEqual(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('toggling sort order should reverse the direction', () => {
    fc.assert(
      fc.property(
        sortOrderArbitrary,
        (order) => {
          const toggled = toggleSortOrder(order);
          
          // Property: Toggling should produce the opposite order
          if (order === 'asc') {
            expect(toggled).toBe('desc');
          } else {
            expect(toggled).toBe('asc');
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('sorting should not change the number of games', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        sortOrderArbitrary,
        (games, order) => {
          const sorted = sortGamesByName(games, order);
          
          // Property: Length should be preserved
          expect(sorted.length).toBe(games.length);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('sorting should not mutate the original array', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        sortOrderArbitrary,
        (games, order) => {
          const originalIds = games.map(g => g.id);
          
          sortGamesByName(games, order);
          
          // Property: Original array should be unchanged
          expect(games.map(g => g.id)).toEqual(originalIds);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('sorting ascending then descending should reverse the order', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const sortedAsc = sortGamesByName(games, 'asc');
          const sortedDesc = sortGamesByName(games, 'desc');
          
          // Property: Descending should be reverse of ascending
          expect(sortedDesc).toEqual([...sortedAsc].reverse());
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Property 12: Search Filter Correctness
// ============================================================================

describe('Property 12: Search Filter Correctness', () => {
  /**
   * **Validates: Requirements 5.7**
   * 
   * For any search query string and game list, filtering by name/player/bringer 
   * SHALL return only games where the respective field contains the query string 
   * (case-insensitive).
   */

  describe('filterByName', () => {
    it('should return only games where name contains query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          gameListArbitrary,
          searchQueryArbitrary,
          (games, query) => {
            const filtered = filterByName(games, query);
            
            if (query.trim() === '') {
              // Empty query should return all games
              expect(filtered).toEqual(games);
            } else {
              // Property: Every returned game must contain the query in its name
              for (const game of filtered) {
                expect(game.name.toLowerCase()).toContain(query.toLowerCase().trim());
              }
              
              // Property: No game that contains the query should be excluded
              for (const game of games) {
                if (game.name.toLowerCase().includes(query.toLowerCase().trim())) {
                  expect(filtered).toContainEqual(game);
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should never return more games than the original list', () => {
      fc.assert(
        fc.property(
          gameListArbitrary,
          searchQueryArbitrary,
          (games, query) => {
            const filtered = filterByName(games, query);
            
            // Property: Filtered list should be a subset
            expect(filtered.length).toBeLessThanOrEqual(games.length);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('filterByPlayer', () => {
    it('should return only games where at least one player name contains query', () => {
      fc.assert(
        fc.property(
          gameListArbitrary,
          searchQueryArbitrary,
          (games, query) => {
            const filtered = filterByPlayer(games, query);
            
            if (query.trim() === '') {
              // Empty query should return all games
              expect(filtered).toEqual(games);
            } else {
              // Property: Every returned game must have at least one player matching
              for (const game of filtered) {
                const hasMatchingPlayer = game.players.some(
                  p => p.name.toLowerCase().includes(query.toLowerCase().trim())
                );
                expect(hasMatchingPlayer).toBe(true);
              }
              
              // Property: No game with matching player should be excluded
              for (const game of games) {
                const hasMatchingPlayer = game.players.some(
                  p => p.name.toLowerCase().includes(query.toLowerCase().trim())
                );
                if (hasMatchingPlayer) {
                  expect(filtered).toContainEqual(game);
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('filterByBringer', () => {
    it('should return only games where at least one bringer name contains query', () => {
      fc.assert(
        fc.property(
          gameListArbitrary,
          searchQueryArbitrary,
          (games, query) => {
            const filtered = filterByBringer(games, query);
            
            if (query.trim() === '') {
              // Empty query should return all games
              expect(filtered).toEqual(games);
            } else {
              // Property: Every returned game must have at least one bringer matching
              for (const game of filtered) {
                const hasMatchingBringer = game.bringers.some(
                  b => b.name.toLowerCase().includes(query.toLowerCase().trim())
                );
                expect(hasMatchingBringer).toBe(true);
              }
              
              // Property: No game with matching bringer should be excluded
              for (const game of games) {
                const hasMatchingBringer = game.bringers.some(
                  b => b.name.toLowerCase().includes(query.toLowerCase().trim())
                );
                if (hasMatchingBringer) {
                  expect(filtered).toContainEqual(game);
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

// ============================================================================
// Property 13: Wunsch Filter Correctness
// ============================================================================

describe('Property 13: Wunsch Filter Correctness', () => {
  /**
   * **Validates: Requirements 5.8**
   * 
   * For any game list, applying the "Gesuchte Spiele" filter SHALL return 
   * only games with zero bringers.
   */

  it('when enabled, should return only games with zero bringers', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const filtered = filterWunschGames(games, true);
          
          // Property: Every returned game must have zero bringers
          for (const game of filtered) {
            expect(game.bringers.length).toBe(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('when enabled, should not exclude any game with zero bringers', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const filtered = filterWunschGames(games, true);
          
          // Property: All games with zero bringers should be included
          const wunschGames = games.filter(g => g.bringers.length === 0);
          expect(filtered.length).toBe(wunschGames.length);
          
          for (const game of wunschGames) {
            expect(filtered).toContainEqual(game);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('when disabled, should return all games unchanged', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const filtered = filterWunschGames(games, false);
          
          // Property: Disabled filter should return all games
          expect(filtered).toEqual(games);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should satisfy biconditional: game in result <=> game has zero bringers (when enabled)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        (games) => {
          const filtered = filterWunschGames(games, true);
          const filteredIds = new Set(filtered.map(g => g.id));
          
          // Property: Biconditional - game is in result if and only if it has zero bringers
          for (const game of games) {
            const isInResult = filteredIds.has(game.id);
            const hasZeroBringers = game.bringers.length === 0;
            expect(isInResult).toBe(hasZeroBringers);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Property 14: My Games Filter Correctness
// ============================================================================

describe('Property 14: My Games Filter Correctness', () => {
  /**
   * **Validates: Requirements 5.9**
   * 
   * For any game list and current user, applying the "Meine Spiele" filter 
   * SHALL return only games where the current user is either a player or a bringer.
   */

  it('when enabled, should return only games where user is player or bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        userNameArbitrary,
        (games, currentUser) => {
          const filtered = filterMyGames(games, currentUser, true);
          
          // Property: Every returned game must have user as player or bringer
          for (const game of filtered) {
            const isPlayer = game.players.some(
              p => p.name.toLowerCase() === currentUser.toLowerCase()
            );
            const isBringer = game.bringers.some(
              b => b.name.toLowerCase() === currentUser.toLowerCase()
            );
            expect(isPlayer || isBringer).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('when enabled, should not exclude any game where user is involved', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        userNameArbitrary,
        (games, currentUser) => {
          const filtered = filterMyGames(games, currentUser, true);
          
          // Property: All games where user is involved should be included
          for (const game of games) {
            const isPlayer = game.players.some(
              p => p.name.toLowerCase() === currentUser.toLowerCase()
            );
            const isBringer = game.bringers.some(
              b => b.name.toLowerCase() === currentUser.toLowerCase()
            );
            
            if (isPlayer || isBringer) {
              expect(filtered).toContainEqual(game);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('when disabled, should return all games unchanged', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        userNameArbitrary,
        (games, currentUser) => {
          const filtered = filterMyGames(games, currentUser, false);
          
          // Property: Disabled filter should return all games
          expect(filtered).toEqual(games);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should be case-insensitive for user name matching', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        userNameArbitrary,
        (games, currentUser) => {
          // Test with different case variations
          const lowerResult = filterMyGames(games, currentUser.toLowerCase(), true);
          const upperResult = filterMyGames(games, currentUser.toUpperCase(), true);
          const originalResult = filterMyGames(games, currentUser, true);
          
          // Property: Case should not affect the result
          expect(lowerResult.length).toBe(originalResult.length);
          expect(upperResult.length).toBe(originalResult.length);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should satisfy biconditional: game in result <=> user is player or bringer (when enabled)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        userNameArbitrary,
        (games, currentUser) => {
          const filtered = filterMyGames(games, currentUser, true);
          const filteredIds = new Set(filtered.map(g => g.id));
          
          // Property: Biconditional - game is in result if and only if user is involved
          for (const game of games) {
            const isInResult = filteredIds.has(game.id);
            const isPlayer = game.players.some(
              p => p.name.toLowerCase() === currentUser.toLowerCase()
            );
            const isBringer = game.bringers.some(
              b => b.name.toLowerCase() === currentUser.toLowerCase()
            );
            const isInvolved = isPlayer || isBringer;
            
            expect(isInResult).toBe(isInvolved);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
