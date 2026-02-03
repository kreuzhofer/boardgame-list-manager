/**
 * Property-based tests for alternate names filtering
 * Feature: 014-alternate-names-search
 * 
 * Tests Property 11: Game List Filter Includes Alternate Names
 * Validates: Requirements 10.1
 */

import * as fc from 'fast-check';
import { filterByName } from '../filtering';
import { filterGamesByNameWithScores, shouldHighlightGame } from '../gameFiltering';
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

describe('Alternate Names Filtering - Property Tests', () => {
  /**
   * Property 11: Game List Filter Includes Alternate Names
   * For any game with alternateNames, filtering by a query that matches any alternate name
   * SHALL include that game in the results.
   * Validates: Requirements 10.1
   */
  describe('Property 11: Game List Filter Includes Alternate Names', () => {
    it('filterByName finds games by alternate name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          (alternateName) => {
            const game = createTestGame({
              id: '1',
              name: 'Primary Game Name',
              alternateNames: [alternateName],
            });

            const results = filterByName([game], alternateName);
            
            // Should find the game by alternate name
            expect(results.some(g => g.id === '1')).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('filterGamesByNameWithScores finds games by alternate name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          (alternateName) => {
            const game = createTestGame({
              id: '1',
              name: 'Primary Game Name',
              alternateNames: [alternateName],
            });

            const results = filterGamesByNameWithScores([game], alternateName);
            
            // Should find the game by alternate name
            expect(results.some(r => r.game.id === '1')).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('shouldHighlightGame returns true for alternate name match', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          (alternateName) => {
            const game = createTestGame({
              id: '1',
              name: 'Primary Game Name',
              alternateNames: [alternateName],
            });

            const shouldHighlight = shouldHighlightGame(game, alternateName);
            
            // Should highlight the game when alternate name matches
            expect(shouldHighlight).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Filtering by primary name still works', () => {
    it('filterByName finds games by primary name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          (primaryName) => {
            const game = createTestGame({
              id: '1',
              name: primaryName,
              alternateNames: ['Some Alternate'],
            });

            const results = filterByName([game], primaryName);
            
            // Should find the game by primary name
            expect(results.some(g => g.id === '1')).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Non-matching queries exclude games', () => {
    it('filterByName excludes games when query does not match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterByName([game], 'Monopoly');
      
      // Should not find the game
      expect(results.some(g => g.id === '1')).toBe(false);
    });
  });

  describe('matchedAlternateName tracking in filterGamesByNameWithScores', () => {
    it('tracks which alternate name matched', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan', 'Settlers'],
      });

      const results = filterGamesByNameWithScores([game], 'Siedler');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.game.id === '1');
      expect(result).toBeDefined();
      expect(result!.matchedAlternateName).toBe('Die Siedler von Catan');
    });

    it('returns null matchedAlternateName for primary name match', () => {
      const game = createTestGame({
        id: '1',
        name: 'Catan',
        alternateNames: ['Die Siedler von Catan'],
      });

      const results = filterGamesByNameWithScores([game], 'Catan');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.game.id === '1');
      expect(result).toBeDefined();
      expect(result!.matchedAlternateName).toBeNull();
    });
  });
});
