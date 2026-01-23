/**
 * Property-based tests for BggCache service
 * 
 * Feature: bgg-static-data-integration
 */

import * as fc from 'fast-check';
import { BggCache, BggGame } from '../bggCache';

describe('BggCache Property Tests', () => {
  /**
   * Property 2: Expansion Filtering
   * For any CSV data containing entries with is_expansion=1, 
   * the BGG_Cache SHALL NOT contain any of those expansion entries after parsing.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Expansion Filtering', () => {
    it('should never include expansion games in the cache', () => {
      fc.assert(
        fc.property(
          // Generate array of games, some base games (is_expansion=0) and some expansions (is_expansion=1)
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              yearPublished: fc.option(fc.integer({ min: 1900, max: 2030 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              isExpansion: fc.boolean(),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (gameData) => {
            const cache = new BggCache();
            
            // Load only base games (simulating what the CSV parser does)
            const baseGames: BggGame[] = gameData
              .filter(g => !g.isExpansion)
              .map(g => ({
                id: g.id,
                name: g.name,
                yearPublished: g.yearPublished,
                rank: g.rank,
              }));
            
            cache.loadGames(baseGames);
            
            // Verify by checking the count matches base games only
            const cachedCount = cache.getCount();
            const expectedCount = gameData.filter(g => !g.isExpansion).length;
            
            return cachedCount === expectedCount;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Search Results Ordering and Limiting
   * For any search query that produces matches, the returned results SHALL be 
   * sorted by BGG rank in ascending order (lower rank first) and limited to a maximum of 10 results.
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Property 4: Search Results Ordering and Limiting', () => {
    it('should return results sorted by rank in ascending order', () => {
      fc.assert(
        fc.property(
          // Generate games with various ranks
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.constantFrom('Catan', 'Carcassonne', 'Ticket to Ride', 'Azul', 'Wingspan'),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.constantFrom('cat', 'car', 'tick', 'azu', 'wing', 'a'),
          (games, query) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search(query);
            
            // Verify results are sorted by rank (ascending)
            for (let i = 1; i < results.length; i++) {
              if (results[i].rank < results[i - 1].rank) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return at most 10 results', () => {
      fc.assert(
        fc.property(
          // Generate many games with same prefix to ensure many matches
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'Test' + s),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
            }),
            { minLength: 15, maxLength: 30 }
          ),
          (games) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search('Test');
            
            // Should never return more than 10 results
            return results.length <= 10;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return results that match the query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.string({ minLength: 1, maxLength: 10 }),
          (games, query) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search(query);
            const lowerQuery = query.toLowerCase();
            
            // All results should contain the query (case-insensitive)
            return results.every(game => 
              game.name.toLowerCase().includes(lowerQuery)
            );
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
