/**
 * Unit tests for filtering utilities
 * 
 * Tests the filtering functions for game name, player, bringer,
 * Wunsch games, and My Games filters.
 * 
 * Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { describe, it, expect } from 'vitest';
import {
  filterByName,
  filterByPlayer,
  filterByBringer,
  filterWunschGames,
  filterMyGames,
  applyAllFilters,
  hasActiveFilters,
  DEFAULT_FILTER_STATE,
  type FilterState,
} from '../filtering';
import type { Game } from '../../types';

// Helper to create test games
function createGame(
  id: string,
  name: string,
  players: string[] = [],
  bringers: string[] = []
): Game {
  return {
    id,
    name,
    players: players.map((p, i) => ({
      id: `player-${id}-${i}`,
      name: p,
      addedAt: new Date(),
    })),
    bringers: bringers.map((b, i) => ({
      id: `bringer-${id}-${i}`,
      name: b,
      addedAt: new Date(),
    })),
    status: bringers.length > 0 ? 'verfuegbar' : 'wunsch',
    createdAt: new Date(),
  };
}

describe('filterByName', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice'], ['Bob']),
    createGame('2', 'Carcassonne', ['Charlie'], []),
    createGame('3', 'Ticket to Ride', ['Alice', 'Bob'], ['Charlie']),
    createGame('4', 'Azul', ['Dave'], ['Eve']),
  ];

  it('returns all games when query is empty', () => {
    expect(filterByName(games, '')).toEqual(games);
    expect(filterByName(games, '   ')).toEqual(games);
  });

  it('filters games by name (case-insensitive)', () => {
    const result = filterByName(games, 'catan');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Catan');
  });

  it('filters games by partial name match', () => {
    const result = filterByName(games, 'ca');
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Catan');
    expect(result.map((g) => g.name)).toContain('Carcassonne');
  });

  it('returns empty array when no games match', () => {
    const result = filterByName(games, 'xyz');
    expect(result).toHaveLength(0);
  });

  it('handles uppercase query', () => {
    const result = filterByName(games, 'AZUL');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Azul');
  });
});

describe('filterByPlayer', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice', 'Bob'], ['Charlie']),
    createGame('2', 'Carcassonne', ['Charlie'], []),
    createGame('3', 'Ticket to Ride', ['Alice'], ['Dave']),
    createGame('4', 'Azul', ['Eve'], ['Frank']),
  ];

  it('returns all games when query is empty', () => {
    expect(filterByPlayer(games, '')).toEqual(games);
    expect(filterByPlayer(games, '   ')).toEqual(games);
  });

  it('filters games by player name (case-insensitive)', () => {
    const result = filterByPlayer(games, 'alice');
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Catan');
    expect(result.map((g) => g.name)).toContain('Ticket to Ride');
  });

  it('filters games by partial player name match', () => {
    const result = filterByPlayer(games, 'li');
    expect(result).toHaveLength(3); // Alice (2 games) and Charlie (1 game)
  });

  it('returns empty array when no players match', () => {
    const result = filterByPlayer(games, 'xyz');
    expect(result).toHaveLength(0);
  });
});

describe('filterByBringer', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice'], ['Bob', 'Charlie']),
    createGame('2', 'Carcassonne', ['Dave'], []),
    createGame('3', 'Ticket to Ride', ['Eve'], ['Charlie']),
    createGame('4', 'Azul', ['Frank'], ['Grace']),
  ];

  it('returns all games when query is empty', () => {
    expect(filterByBringer(games, '')).toEqual(games);
    expect(filterByBringer(games, '   ')).toEqual(games);
  });

  it('filters games by bringer name (case-insensitive)', () => {
    const result = filterByBringer(games, 'charlie');
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Catan');
    expect(result.map((g) => g.name)).toContain('Ticket to Ride');
  });

  it('filters games by partial bringer name match', () => {
    const result = filterByBringer(games, 'ob');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Catan');
  });

  it('returns empty array when no bringers match', () => {
    const result = filterByBringer(games, 'xyz');
    expect(result).toHaveLength(0);
  });

  it('excludes games with no bringers when searching', () => {
    const result = filterByBringer(games, 'a'); // Matches Charlie, Grace
    expect(result.map((g) => g.name)).not.toContain('Carcassonne');
  });
});

describe('filterWunschGames', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice'], ['Bob']),
    createGame('2', 'Carcassonne', ['Charlie'], []),
    createGame('3', 'Ticket to Ride', ['Dave'], []),
    createGame('4', 'Azul', ['Eve'], ['Frank']),
  ];

  it('returns all games when filter is disabled', () => {
    expect(filterWunschGames(games, false)).toEqual(games);
  });

  it('returns only games with zero bringers when filter is enabled', () => {
    const result = filterWunschGames(games, true);
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Carcassonne');
    expect(result.map((g) => g.name)).toContain('Ticket to Ride');
  });

  it('returns empty array when all games have bringers', () => {
    const gamesWithBringers = [
      createGame('1', 'Catan', ['Alice'], ['Bob']),
      createGame('2', 'Azul', ['Eve'], ['Frank']),
    ];
    const result = filterWunschGames(gamesWithBringers, true);
    expect(result).toHaveLength(0);
  });
});

describe('filterMyGames', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice', 'Bob'], ['Charlie']),
    createGame('2', 'Carcassonne', ['Dave'], ['Alice']),
    createGame('3', 'Ticket to Ride', ['Eve'], ['Frank']),
    createGame('4', 'Azul', ['Alice'], []),
  ];

  it('returns all games when filter is disabled', () => {
    expect(filterMyGames(games, 'Alice', false)).toEqual(games);
  });

  it('returns games where user is a player', () => {
    const result = filterMyGames(games, 'Alice', true);
    expect(result).toHaveLength(3);
    expect(result.map((g) => g.name)).toContain('Catan');
    expect(result.map((g) => g.name)).toContain('Carcassonne');
    expect(result.map((g) => g.name)).toContain('Azul');
  });

  it('returns games where user is a bringer', () => {
    const result = filterMyGames(games, 'Charlie', true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Catan');
  });

  it('is case-insensitive for user name matching', () => {
    const result = filterMyGames(games, 'ALICE', true);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when user is not involved in any game', () => {
    const result = filterMyGames(games, 'Unknown', true);
    expect(result).toHaveLength(0);
  });
});

describe('applyAllFilters', () => {
  const games: Game[] = [
    createGame('1', 'Catan', ['Alice', 'Bob'], ['Charlie']),
    createGame('2', 'Carcassonne', ['Alice'], []),
    createGame('3', 'Ticket to Ride', ['Dave'], ['Eve']),
    createGame('4', 'Azul', ['Alice'], []),
  ];

  it('returns all games with default filter state', () => {
    const result = applyAllFilters(games, DEFAULT_FILTER_STATE, 'Alice');
    expect(result).toEqual(games);
  });

  it('applies name filter', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTER_STATE,
      nameQuery: 'ca',
    };
    const result = applyAllFilters(games, filters, 'Alice');
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Catan');
    expect(result.map((g) => g.name)).toContain('Carcassonne');
  });

  it('applies multiple filters together', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTER_STATE,
      playerQuery: 'Alice',
      wunschOnly: true,
    };
    const result = applyAllFilters(games, filters, 'Alice');
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Carcassonne');
    expect(result.map((g) => g.name)).toContain('Azul');
  });

  it('applies all filters in sequence', () => {
    const filters: FilterState = {
      nameQuery: 'a',
      playerQuery: 'Alice',
      bringerQuery: '',
      wunschOnly: true,
      myGamesOnly: true,
    };
    const result = applyAllFilters(games, filters, 'Alice');
    // Name contains 'a': Catan, Carcassonne, Azul
    // Player is Alice: Catan, Carcassonne, Azul
    // Wunsch only: Carcassonne, Azul
    // My games (Alice): Carcassonne, Azul
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.name)).toContain('Carcassonne');
    expect(result.map((g) => g.name)).toContain('Azul');
  });
});

describe('hasActiveFilters', () => {
  it('returns false for default filter state', () => {
    expect(hasActiveFilters(DEFAULT_FILTER_STATE)).toBe(false);
  });

  it('returns true when name query is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, nameQuery: 'test' })).toBe(true);
  });

  it('returns true when player query is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, playerQuery: 'test' })).toBe(true);
  });

  it('returns true when bringer query is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, bringerQuery: 'test' })).toBe(true);
  });

  it('returns true when wunschOnly is enabled', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, wunschOnly: true })).toBe(true);
  });

  it('returns true when myGamesOnly is enabled', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, myGamesOnly: true })).toBe(true);
  });

  it('returns false for whitespace-only queries', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, nameQuery: '   ' })).toBe(false);
  });
});

describe('DEFAULT_FILTER_STATE', () => {
  it('has all filters cleared', () => {
    expect(DEFAULT_FILTER_STATE.nameQuery).toBe('');
    expect(DEFAULT_FILTER_STATE.playerQuery).toBe('');
    expect(DEFAULT_FILTER_STATE.bringerQuery).toBe('');
    expect(DEFAULT_FILTER_STATE.wunschOnly).toBe(false);
    expect(DEFAULT_FILTER_STATE.myGamesOnly).toBe(false);
  });
});
