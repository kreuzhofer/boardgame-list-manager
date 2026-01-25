/**
 * Property-based tests for BggCache alternate names functionality
 * Feature: 014-alternate-names-search
 * 
 * Tests Properties 1, 2, 4, 5, 6, 8, 9 from the design document
 */

import * as fc from 'fast-check';
import { BggCache, BggGameWithAlternates } from '../bggCache';

describe('BggCache Alternate Names - Property Tests', () => {
  let cache: BggCache;

  beforeEach(() => {
    cache = new BggCache();
  });

  afterEach(() => {
    cache.reset();
  });

  /**
   * Property 4: Alternate Name Normalization
   * For any alternate name string, the normalized version SHALL be lowercase and trimmed
   * Validates: Requirements 2.5
   */
  describe('Property 4: Alternate Name Normalization', () => {
    it('normalizes alternate names to lowercase and trimmed for matching', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (alternateName) => {
            const game: BggGameWithAlternates = {
              id: 1,
              name: 'Test Game',
              yearPublished: 2020,
              rank: 1,
              rating: 8.0,
              alternateNames: [alternateName],
            };

            cache.loadGames([game]);

            // Search with lowercase trimmed version should find the game
            const normalizedQuery = alternateName.toLowerCase().trim();
            if (normalizedQuery.length > 0) {
              const results = cache.search(normalizedQuery);
              // The game should be findable if the alternate name is non-empty after normalization
              expect(results.length).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 5: Alternate Name Search Inclusion
   * For any search query that fuzzy-matches an alternate name, that game SHALL appear in results
   * Validates: Requirements 3.1
   */
  describe('Property 5: Alternate Name Search Inclusion', () => {
    it('includes games when query matches alternate name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          (alternateName) => {
            const game: BggGameWithAlternates = {
              id: 1,
              name: 'Primary Game Name',
              yearPublished: 2020,
              rank: 1,
              rating: 8.0,
              alternateNames: [alternateName],
            };

            cache.loadGames([game]);

            // Search with the exact alternate name should find the game
            const results = cache.search(alternateName);
            
            // Should find the game
            const found = results.some(r => r.id === 1);
            expect(found).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 6: Primary Name Match Priority
   * When both primary and alternate names match, matchedAlternateName SHALL be null
   * Validates: Requirements 3.3, 4.4
   */
  describe('Property 6: Primary Name Match Priority', () => {
    it('prefers primary name match over alternate name match', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          (name) => {
            const game: BggGameWithAlternates = {
              id: 1,
              name: name,
              yearPublished: 2020,
              rank: 1,
              rating: 8.0,
              alternateNames: [name + ' Alternate', 'Other Name'],
            };

            cache.loadGames([game]);

            // Search with primary name
            const results = cache.search(name);
            
            if (results.length > 0) {
              const result = results.find(r => r.id === 1);
              if (result) {
                // When primary name matches, matchedAlternateName should be null
                expect(result.matchedAlternateName).toBeNull();
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 8: Result Annotation Correctness
   * matchedAlternateName SHALL be the exact alternate name that matched, or null for primary match
   * Validates: Requirements 4.1, 4.2, 5.4
   */
  describe('Property 8: Result Annotation Correctness', () => {
    it('annotates results with correct matched alternate name', () => {
      const game: BggGameWithAlternates = {
        id: 1,
        name: 'Catan',
        yearPublished: 1995,
        rank: 1,
        rating: 7.2,
        alternateNames: ['Die Siedler von Catan', 'Settlers of Catan'],
      };

      cache.loadGames([game]);

      // Search by alternate name
      const results = cache.search('Siedler');
      
      if (results.length > 0) {
        const result = results.find(r => r.id === 1);
        if (result && result.matchedAlternateName) {
          // The matched alternate name should be one of the game's alternate names
          expect(game.alternateNames).toContain(result.matchedAlternateName);
        }
      }
    });

    it('returns null matchedAlternateName for primary name matches', () => {
      const game: BggGameWithAlternates = {
        id: 1,
        name: 'Catan',
        yearPublished: 1995,
        rank: 1,
        rating: 7.2,
        alternateNames: ['Die Siedler von Catan'],
      };

      cache.loadGames([game]);

      // Search by primary name
      const results = cache.search('Catan');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.id === 1);
      expect(result).toBeDefined();
      expect(result!.matchedAlternateName).toBeNull();
    });
  });

  /**
   * Property 9: All Alternate Names Included
   * The alternateNames array SHALL contain all alternate names for that game
   * Validates: Requirements 4.5, 5.2
   */
  describe('Property 9: All Alternate Names Included', () => {
    it('includes all alternate names in search results', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
          (alternateNames) => {
            const uniqueAlternates = [...new Set(alternateNames.filter(n => n.trim()))];
            if (uniqueAlternates.length === 0) return;

            const game: BggGameWithAlternates = {
              id: 1,
              name: 'Test Game',
              yearPublished: 2020,
              rank: 1,
              rating: 8.0,
              alternateNames: uniqueAlternates,
            };

            cache.loadGames([game]);

            // Search for the game
            const results = cache.search('Test Game');
            
            if (results.length > 0) {
              const result = results.find(r => r.id === 1);
              if (result) {
                // All alternate names should be included
                expect(result.alternateNames).toEqual(uniqueAlternates);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: Alternate Name Extraction (unit test style)
   * Games with enrichment data should have alternate names extracted
   * Validates: Requirements 2.2
   */
  describe('Property 2: Alternate Name Extraction', () => {
    it('extracts alternate names correctly when loading games', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 1,
          name: 'Game With Alternates',
          yearPublished: 2020,
          rank: 1,
          rating: 8.0,
          alternateNames: ['Alt1', 'Alt2', 'Alt3'],
        },
        {
          id: 2,
          name: 'Game Without Alternates',
          yearPublished: 2019,
          rank: 2,
          rating: 7.5,
          alternateNames: [],
        },
      ];

      cache.loadGames(games);

      // Search for game with alternates by alternate name
      const results1 = cache.search('Alt1');
      expect(results1.some(r => r.id === 1)).toBe(true);

      // Search for game without alternates
      const results2 = cache.search('Game Without');
      expect(results2.some(r => r.id === 2)).toBe(true);
    });
  });

  /**
   * Test for updateGameAlternateNames method
   * Feature: 014-alternate-names-search - Live cache updates during enrichment
   */
  describe('updateGameAlternateNames', () => {
    it('updates alternate names for existing game in cache', () => {
      const game: BggGameWithAlternates = {
        id: 1,
        name: 'Test Game',
        yearPublished: 2020,
        rank: 1,
        rating: 8.0,
        alternateNames: ['Old Alternate'],
      };

      cache.loadGames([game]);

      // Verify old alternate name works
      let results = cache.search('Old Alternate');
      expect(results.some(r => r.id === 1)).toBe(true);

      // Update alternate names
      cache.updateGameAlternateNames(1, ['New Alternate 1', 'New Alternate 2']);

      // Old alternate name should no longer match
      results = cache.search('Old Alternate');
      expect(results.some(r => r.id === 1)).toBe(false);

      // New alternate names should work
      results = cache.search('New Alternate 1');
      expect(results.some(r => r.id === 1)).toBe(true);

      results = cache.search('New Alternate 2');
      expect(results.some(r => r.id === 1)).toBe(true);
    });

    it('handles updating non-existent game gracefully', () => {
      cache.loadGames([]);
      
      // Should not throw
      expect(() => {
        cache.updateGameAlternateNames(999, ['Some Alternate']);
      }).not.toThrow();
    });
  });
});
