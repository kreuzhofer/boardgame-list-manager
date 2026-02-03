/**
 * Unit tests for game sorting utilities
 * 
 * **Validates: Requirements 5.2, 5.3**
 */

import { describe, it, expect } from 'vitest';
import { sortGamesByName, toggleSortOrder, DEFAULT_SORT_ORDER } from '../sorting';
import type { Game } from '../../types';

// Helper to create a minimal game object for testing
const createGame = (name: string): Game => ({
  id: `id-${name}`,
  name,
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
});

describe('sorting utilities', () => {
  describe('sortGamesByName', () => {
    it('should sort games alphabetically ascending (A→Z) when order is "asc"', () => {
      const games = [
        createGame('Catan'),
        createGame('Azul'),
        createGame('Brass'),
      ];

      const sorted = sortGamesByName(games, 'asc');

      expect(sorted.map((g) => g.name)).toEqual(['Azul', 'Brass', 'Catan']);
    });

    it('should sort games alphabetically descending (Z→A) when order is "desc"', () => {
      const games = [
        createGame('Azul'),
        createGame('Catan'),
        createGame('Brass'),
      ];

      const sorted = sortGamesByName(games, 'desc');

      expect(sorted.map((g) => g.name)).toEqual(['Catan', 'Brass', 'Azul']);
    });

    it('should not mutate the original array', () => {
      const games = [
        createGame('Catan'),
        createGame('Azul'),
        createGame('Brass'),
      ];
      const originalOrder = games.map((g) => g.name);

      sortGamesByName(games, 'asc');

      expect(games.map((g) => g.name)).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const games: Game[] = [];

      const sortedAsc = sortGamesByName(games, 'asc');
      const sortedDesc = sortGamesByName(games, 'desc');

      expect(sortedAsc).toEqual([]);
      expect(sortedDesc).toEqual([]);
    });

    it('should handle single game array', () => {
      const games = [createGame('Catan')];

      const sortedAsc = sortGamesByName(games, 'asc');
      const sortedDesc = sortGamesByName(games, 'desc');

      expect(sortedAsc.map((g) => g.name)).toEqual(['Catan']);
      expect(sortedDesc.map((g) => g.name)).toEqual(['Catan']);
    });

    it('should handle case-insensitive sorting', () => {
      const games = [
        createGame('catan'),
        createGame('Azul'),
        createGame('BRASS'),
      ];

      const sorted = sortGamesByName(games, 'asc');

      expect(sorted.map((g) => g.name)).toEqual(['Azul', 'BRASS', 'catan']);
    });

    it('should handle German umlauts correctly', () => {
      const games = [
        createGame('Österreich'),
        createGame('Oase'),
        createGame('Überleben'),
        createGame('Uno'),
      ];

      const sorted = sortGamesByName(games, 'asc');

      // German locale should sort Ö after O and Ü after U
      expect(sorted.map((g) => g.name)).toEqual(['Oase', 'Österreich', 'Überleben', 'Uno']);
    });

    it('should handle games with same name', () => {
      const games = [
        createGame('Catan'),
        createGame('Catan'),
        createGame('Azul'),
      ];

      const sorted = sortGamesByName(games, 'asc');

      expect(sorted.map((g) => g.name)).toEqual(['Azul', 'Catan', 'Catan']);
    });
  });

  describe('toggleSortOrder', () => {
    it('should return "desc" when current order is "asc"', () => {
      expect(toggleSortOrder('asc')).toBe('desc');
    });

    it('should return "asc" when current order is "desc"', () => {
      expect(toggleSortOrder('desc')).toBe('asc');
    });
  });

  describe('DEFAULT_SORT_ORDER', () => {
    it('should be "asc" (ascending) per Requirements 5.2', () => {
      expect(DEFAULT_SORT_ORDER).toBe('asc');
    });
  });
});
