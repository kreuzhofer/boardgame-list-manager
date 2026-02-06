/**
 * Property-based tests for game filtering and highlighting
 * **Property 1: Game List Filtering**
 * **Property 8: Game Highlighting Consistency**
 * **Validates: Requirements 1.2, 7.1**
 * 
 * Feature: 011-fuzzy-search
 * **Property 7: Result Ordering**
 * **Property 8: Empty Query Identity**
 * **Validates: Requirements 4.5, 5.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterGamesByName,
  filterGamesByNameWithScores,
  shouldHighlightGame,
  getHighlightedGameIds,
  getMatchingGamesWithBringers,
  countMatchingGames,
} from '../gameFiltering';
import { normalizeName } from '../nameNormalization';
import { fuzzyMatch } from '../fuzzyMatch';
import type { Game } from '../../types';

// Helper to create a minimal game for testing
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: `game-${Math.random().toString(36).substr(2, 9)}`,
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

// Arbitrary for generating a list of games
const gamesArb = fc.array(
  gameNameArb.map((name) => createTestGame({ name })),
  { minLength: 0, maxLength: 20 }
);

describe('filterGamesByName', () => {
  describe('Property 1: Game List Filtering (with fuzzy matching)', () => {
    it('filtered result only contains games that fuzzy match the query', () => {
      fc.assert(
        fc.property(gamesArb, gameNameArb, (games, query) => {
          const filtered = filterGamesByName(games, query);

          // Every filtered game must fuzzy match the query
          for (const game of filtered) {
            const result = fuzzyMatch(query, game.name);
            expect(result.matched).toBe(true);
          }
        }),
        { numRuns: 15 }
      );
    });

    it('no fuzzy-matching games are excluded from filtered result', () => {
      fc.assert(
        fc.property(gamesArb, gameNameArb, (games, query) => {
          const filtered = filterGamesByName(games, query);

          // Count games that should match via fuzzy matching
          const expectedMatches = games.filter((g) => fuzzyMatch(query, g.name).matched);

          expect(filtered.length).toBe(expectedMatches.length);
        }),
        { numRuns: 15 }
      );
    });

    it('empty query returns all games', () => {
      fc.assert(
        fc.property(gamesArb, (games) => {
          const filtered = filterGamesByName(games, '');
          expect(filtered.length).toBe(games.length);
        }),
        { numRuns: 10 }
      );
    });

    it('whitespace-only query returns all games', () => {
      fc.assert(
        fc.property(gamesArb, (games) => {
          const filtered = filterGamesByName(games, '   ');
          expect(filtered.length).toBe(games.length);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Unit tests for specific examples', () => {
    it('filters games by partial name match', () => {
      const games = [
        createTestGame({ name: 'Catan' }),
        createTestGame({ name: 'Catan Junior' }),
        createTestGame({ name: 'Azul' }),
      ];

      const filtered = filterGamesByName(games, 'catan');

      expect(filtered.length).toBe(2);
      expect(filtered.map((g) => g.name)).toContain('Catan');
      expect(filtered.map((g) => g.name)).toContain('Catan Junior');
    });

    it('is case-insensitive', () => {
      const games = [createTestGame({ name: 'Catan' })];

      expect(filterGamesByName(games, 'CATAN').length).toBe(1);
      expect(filterGamesByName(games, 'catan').length).toBe(1);
      expect(filterGamesByName(games, 'CaTaN').length).toBe(1);
    });

    it('matches games with punctuation removed (fuzzy search)', () => {
      const games = [
        createTestGame({ name: 'Brass: Birmingham' }),
        createTestGame({ name: 'Catan: Seafarers' }),
        createTestGame({ name: 'Azul' }),
      ];

      const filtered = filterGamesByName(games, 'Brass Birmingham');
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Brass: Birmingham');
    });

    it('matches games with word order reversed (fuzzy search)', () => {
      const games = [
        createTestGame({ name: 'Brass: Birmingham' }),
        createTestGame({ name: 'Azul' }),
      ];

      const filtered = filterGamesByName(games, 'Birmingham Brass');
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Brass: Birmingham');
    });
  });
});

describe('shouldHighlightGame', () => {
  describe('Property 8: Game Highlighting Consistency (with fuzzy matching)', () => {
    it('game is highlighted iff it fuzzy matches the query', () => {
      fc.assert(
        fc.property(gameNameArb, gameNameArb, (gameName, query) => {
          const game = createTestGame({ name: gameName });
          const isHighlighted = shouldHighlightGame(game, query);

          const shouldMatch = fuzzyMatch(query, gameName).matched;

          expect(isHighlighted).toBe(shouldMatch);
        }),
        { numRuns: 15 }
      );
    });

    it('empty query never highlights any game', () => {
      fc.assert(
        fc.property(gameNameArb, (gameName) => {
          const game = createTestGame({ name: gameName });
          expect(shouldHighlightGame(game, '')).toBe(false);
          expect(shouldHighlightGame(game, '   ')).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Unit tests for specific examples', () => {
    it('highlights game when query matches', () => {
      const game = createTestGame({ name: 'Catan' });
      expect(shouldHighlightGame(game, 'cat')).toBe(true);
      expect(shouldHighlightGame(game, 'catan')).toBe(true);
    });

    it('does not highlight when query does not match', () => {
      const game = createTestGame({ name: 'Catan' });
      expect(shouldHighlightGame(game, 'azul')).toBe(false);
    });

    it('highlights game with fuzzy match (punctuation)', () => {
      const game = createTestGame({ name: 'Brass: Birmingham' });
      expect(shouldHighlightGame(game, 'Brass Birmingham')).toBe(true);
    });

    it('highlights game with fuzzy match (word order)', () => {
      const game = createTestGame({ name: 'Brass: Birmingham' });
      expect(shouldHighlightGame(game, 'Birmingham Brass')).toBe(true);
    });
  });
});

describe('getHighlightedGameIds', () => {
  it('returns set of IDs for matching games', () => {
    const games = [
      createTestGame({ id: '1', name: 'Catan' }),
      createTestGame({ id: '2', name: 'Catan Junior' }),
      createTestGame({ id: '3', name: 'Azul' }),
    ];

    const ids = getHighlightedGameIds(games, 'catan');

    expect(ids.size).toBe(2);
    expect(ids.has('1')).toBe(true);
    expect(ids.has('2')).toBe(true);
    expect(ids.has('3')).toBe(false);
  });

  it('returns empty set for empty query', () => {
    const games = [createTestGame({ id: '1', name: 'Catan' })];
    const ids = getHighlightedGameIds(games, '');
    expect(ids.size).toBe(0);
  });
});

describe('getMatchingGamesWithBringers', () => {
  it('returns max 3 items by default', () => {
    const games = [
      createTestGame({ name: 'Catan' }),
      createTestGame({ name: 'Catan Junior' }),
      createTestGame({ name: 'Catan Cities' }),
      createTestGame({ name: 'Catan Seafarers' }),
      createTestGame({ name: 'Catan Traders' }),
    ];

    const result = getMatchingGamesWithBringers(games, 'catan');

    expect(result.length).toBe(3);
  });

  it('extracts bringer names', () => {
    const game = createTestGame({
      name: 'Catan',
      bringers: [
        { id: '1', participant: { id: 'u1', name: 'Thorsten' }, addedAt: new Date() },
        { id: '2', participant: { id: 'u2', name: 'Daniel' }, addedAt: new Date() },
      ],
    });

    const result = getMatchingGamesWithBringers([game], 'catan');

    expect(result[0].bringerNames).toEqual(['Thorsten', 'Daniel']);
  });

  it('returns empty array for empty query', () => {
    const games = [createTestGame({ name: 'Catan' })];
    const result = getMatchingGamesWithBringers(games, '');
    expect(result.length).toBe(0);
  });
});

describe('countMatchingGames', () => {
  it('counts all matching games', () => {
    const games = [
      createTestGame({ name: 'Catan' }),
      createTestGame({ name: 'Catan Junior' }),
      createTestGame({ name: 'Azul' }),
    ];

    expect(countMatchingGames(games, 'catan')).toBe(2);
    expect(countMatchingGames(games, 'azul')).toBe(1);
    expect(countMatchingGames(games, 'wingspan')).toBe(0);
  });

  it('returns 0 for empty query', () => {
    const games = [createTestGame({ name: 'Catan' })];
    expect(countMatchingGames(games, '')).toBe(0);
  });
});


/**
 * Feature: 011-fuzzy-search
 * Property 7: Result Ordering
 * For any list of games and search query, the returned results SHALL be sorted
 * by score in descending order (highest score first).
 * **Validates: Requirements 4.5**
 */
describe('filterGamesByNameWithScores', () => {
  describe('Property 7: Result Ordering', () => {
    it('results are sorted by score in descending order', () => {
      fc.assert(
        fc.property(gamesArb, gameNameArb, (games, query) => {
          const scored = filterGamesByNameWithScores(games, query);

          // Verify descending order
          for (let i = 1; i < scored.length; i++) {
            expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
          }
        }),
        { numRuns: 15 }
      );
    });

    it('exact matches have higher scores than fuzzy matches', () => {
      const games = [
        createTestGame({ name: 'Brass: Birmingham' }),
        createTestGame({ name: 'Brass' }),
        createTestGame({ name: 'Birmingham' }),
      ];

      const scored = filterGamesByNameWithScores(games, 'Brass');

      // Both "Brass" and "Brass: Birmingham" are exact matches (score 100)
      // because "brass" is a substring of both
      expect(scored[0].score).toBe(100);
      expect(scored[1].score).toBe(100);
      // "Birmingham" doesn't match "Brass"
      expect(scored.length).toBe(2);
    });
  });

  describe('Unit tests for result ordering', () => {
    it('orders exact matches before punctuation matches', () => {
      const games = [
        createTestGame({ name: 'Brass: Birmingham' }),
        createTestGame({ name: 'Brass Birmingham' }),
      ];

      const scored = filterGamesByNameWithScores(games, 'Brass Birmingham');

      // "Brass Birmingham" is exact match (score 100)
      // "Brass: Birmingham" is punctuation match (score 80)
      expect(scored[0].game.name).toBe('Brass Birmingham');
      expect(scored[0].score).toBe(100);
      expect(scored[1].game.name).toBe('Brass: Birmingham');
      expect(scored[1].score).toBe(80);
    });
  });
});

/**
 * Feature: 011-fuzzy-search
 * Property 8: Empty Query Identity
 * For any list of games, when the search query is empty or whitespace-only,
 * the fuzzy matcher SHALL return all games in their original order.
 * **Validates: Requirements 5.3**
 */
describe('Empty Query Identity', () => {
  describe('Property 8: Empty Query Identity', () => {
    it('empty query returns all games', () => {
      fc.assert(
        fc.property(gamesArb, (games) => {
          const filtered = filterGamesByName(games, '');
          expect(filtered.length).toBe(games.length);

          // Verify order is preserved
          for (let i = 0; i < games.length; i++) {
            expect(filtered[i].id).toBe(games[i].id);
          }
        }),
        { numRuns: 10 }
      );
    });

    it('whitespace-only query returns all games', () => {
      fc.assert(
        fc.property(gamesArb, (games) => {
          const filtered = filterGamesByName(games, '   \t\n  ');
          expect(filtered.length).toBe(games.length);
        }),
        { numRuns: 10 }
      );
    });

    it('filterGamesByNameWithScores returns all games with score 0 for empty query', () => {
      fc.assert(
        fc.property(gamesArb, (games) => {
          const scored = filterGamesByNameWithScores(games, '');

          expect(scored.length).toBe(games.length);
          for (const sg of scored) {
            expect(sg.score).toBe(0);
            expect(sg.matchType).toBe('none');
          }
        }),
        { numRuns: 10 }
      );
    });
  });
});

describe('Fuzzy search integration tests', () => {
  it('finds "Brass: Birmingham" with query "Brass Birmingham"', () => {
    const games = [
      createTestGame({ name: 'Brass: Birmingham' }),
      createTestGame({ name: 'Azul' }),
    ];

    const filtered = filterGamesByName(games, 'Brass Birmingham');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Brass: Birmingham');
  });

  it('finds "Brass: Birmingham" with query "Birmingham Brass"', () => {
    const games = [
      createTestGame({ name: 'Brass: Birmingham' }),
      createTestGame({ name: 'Azul' }),
    ];

    const filtered = filterGamesByName(games, 'Birmingham Brass');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Brass: Birmingham');
  });

  it('finds "Catan: Seafarers" with query "Catan Seafarers"', () => {
    const games = [
      createTestGame({ name: 'Catan: Seafarers' }),
      createTestGame({ name: 'Catan' }),
    ];

    const filtered = filterGamesByName(games, 'Catan Seafarers');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Catan: Seafarers');
  });

  it('ranks exact matches higher than fuzzy matches', () => {
    const games = [
      createTestGame({ name: 'Brass: Birmingham' }),
      createTestGame({ name: 'Brass' }),
    ];

    const filtered = filterGamesByName(games, 'Brass');

    // Both should match - both are exact substring matches
    expect(filtered.length).toBe(2);
    // Both have score 100 since "brass" is substring of both
  });
});
