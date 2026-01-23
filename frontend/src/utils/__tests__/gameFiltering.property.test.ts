/**
 * Property-based tests for game filtering and highlighting
 * **Property 1: Game List Filtering**
 * **Property 8: Game Highlighting Consistency**
 * **Validates: Requirements 1.2, 7.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterGamesByName,
  shouldHighlightGame,
  getHighlightedGameIds,
  getMatchingGamesWithBringers,
  countMatchingGames,
} from '../gameFiltering';
import { normalizeName } from '../nameNormalization';
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
  describe('Property 1: Game List Filtering', () => {
    it('filtered result only contains games whose normalized names include normalized query', () => {
      fc.assert(
        fc.property(gamesArb, gameNameArb, (games, query) => {
          const filtered = filterGamesByName(games, query);
          const normalizedQuery = normalizeName(query);

          // Every filtered game must contain the query
          for (const game of filtered) {
            const normalizedName = normalizeName(game.name);
            expect(normalizedName).toContain(normalizedQuery);
          }
        }),
        { numRuns: 15 }
      );
    });

    it('no matching games are excluded from filtered result', () => {
      fc.assert(
        fc.property(gamesArb, gameNameArb, (games, query) => {
          const filtered = filterGamesByName(games, query);
          const normalizedQuery = normalizeName(query);

          // Count games that should match
          const expectedMatches = games.filter((g) =>
            normalizeName(g.name).includes(normalizedQuery)
          );

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
  });
});

describe('shouldHighlightGame', () => {
  describe('Property 8: Game Highlighting Consistency', () => {
    it('game is highlighted iff normalized name includes normalized query', () => {
      fc.assert(
        fc.property(gameNameArb, gameNameArb, (gameName, query) => {
          const game = createTestGame({ name: gameName });
          const isHighlighted = shouldHighlightGame(game, query);

          const normalizedName = normalizeName(gameName);
          const normalizedQuery = normalizeName(query);
          const shouldMatch = normalizedName.includes(normalizedQuery);

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
        { id: '1', user: { id: 'u1', name: 'Thorsten' }, addedAt: new Date() },
        { id: '2', user: { id: 'u2', name: 'Daniel' }, addedAt: new Date() },
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
