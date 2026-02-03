/**
 * Unit tests for alternate names filtering
 * Feature: 014-alternate-names-search
 * 
 * Tests filtering games by primary and alternate names
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { filterByName } from '../filtering';
import { filterGamesByNameWithScores, shouldHighlightGame, getMatchingGamesWithBringers } from '../gameFiltering';
import type { Game } from '../../types';

// Helper to create a test game
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

describe('Alternate Names Filtering - Unit Tests', () => {
  describe('filterByName', () => {
    it('finds game by primary name', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterByName([game], 'Catan');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('finds game by alternate name', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterByName([game], 'Siedler');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('excludes games that do not match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterByName([game], 'Monopoly');
      
      expect(results).toHaveLength(0);
    });

    it('is case-insensitive', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterByName([game], 'siedler');
      
      expect(results).toHaveLength(1);
    });

    it('handles games with empty alternateNames array', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: [],
      });

      const results = filterByName([game], 'Catan');
      
      expect(results).toHaveLength(1);
    });

    it('handles games with undefined alternateNames', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
      });
      // @ts-ignore - testing undefined case
      game.alternateNames = undefined;

      const results = filterByName([game], 'Catan');
      
      expect(results).toHaveLength(1);
    });
  });

  describe('filterGamesByNameWithScores', () => {
    it('tracks matchedAlternateName when alternate name matches', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan', 'Settlers'],
      });

      const results = filterGamesByNameWithScores([game], 'Siedler');
      
      expect(results).toHaveLength(1);
      expect(results[0].matchedAlternateName).toBe('Die Siedler von Catan');
    });

    it('returns null matchedAlternateName for primary name match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterGamesByNameWithScores([game], 'Catan');
      
      expect(results).toHaveLength(1);
      expect(results[0].matchedAlternateName).toBeNull();
    });

    it('prefers primary name match over alternate name match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Catan Alternate'],
      });

      const results = filterGamesByNameWithScores([game], 'Catan');
      
      expect(results).toHaveLength(1);
      // Primary match takes precedence, so matchedAlternateName should be null
      expect(results[0].matchedAlternateName).toBeNull();
    });
  });

  describe('shouldHighlightGame', () => {
    it('returns true for primary name match', () => {
      const game = createTestGame({
        name: 'Catan',
        alternateNames: [],
      });

      expect(shouldHighlightGame(game, 'Catan')).toBe(true);
    });

    it('returns true for alternate name match', () => {
      const game = createTestGame({
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      expect(shouldHighlightGame(game, 'Siedler')).toBe(true);
    });

    it('returns false for non-matching query', () => {
      const game = createTestGame({
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      expect(shouldHighlightGame(game, 'Monopoly')).toBe(false);
    });

    it('returns false for empty query', () => {
      const game = createTestGame({
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      expect(shouldHighlightGame(game, '')).toBe(false);
    });
  });

  describe('getMatchingGamesWithBringers', () => {
    it('includes matchedAlternateName in results', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
        bringers: [],
      });

      const results = getMatchingGamesWithBringers([game], 'Siedler');
      
      expect(results).toHaveLength(1);
      expect(results[0].matchedAlternateName).toBe('Die Siedler von Catan');
    });

    it('returns null matchedAlternateName for primary match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
        bringers: [],
      });

      const results = getMatchingGamesWithBringers([game], 'Catan');
      
      expect(results).toHaveLength(1);
      expect(results[0].matchedAlternateName).toBeNull();
    });
  });
});
