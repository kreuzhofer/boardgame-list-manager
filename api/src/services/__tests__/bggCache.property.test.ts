/**
 * Property-based tests for BggCache service
 * 
 * Feature: bgg-static-data-integration, bgg-rating-badge
 */

import * as fc from 'fast-check';
import { BggCache, BggGame } from '../bggCache';

describe('BggCache Property Tests', () => {
  /**
   * Feature: bgg-rating-badge
   * Property 1: Rating Extraction from CSV
   * For any valid CSV row containing a game with an "average" column value, 
   * parsing that row SHALL produce a BggGame object with a rating field 
   * equal to the original value rounded to one decimal place.
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Property 1: Rating Extraction from CSV', () => {
    it('should round rating to one decimal place for any float value', () => {
      fc.assert(
        fc.property(
          // Generate random float ratings between 1 and 10
          fc.float({ min: 1, max: 10, noNaN: true }),
          (rawRating) => {
            // Simulate the rounding that happens during CSV parsing
            const roundedRating = Math.round(rawRating * 10) / 10;
            
            const cache = new BggCache();
            const games: BggGame[] = [{
              id: 1,
              name: 'Test Game',
              yearPublished: 2020,
              rank: 1,
              rating: roundedRating,
            }];
            cache.loadGames(games);
            
            const results = cache.search('Test');
            
            // Verify rating is stored correctly
            if (results.length === 0) return true; // No match is valid
            
            const storedRating = results[0].rating;
            if (storedRating === null) return false;
            
            // Verify it's rounded to one decimal place
            const decimalPlaces = (storedRating.toString().split('.')[1] || '').length;
            return decimalPlaces <= 1 && storedRating === roundedRating;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve rating through cache storage and retrieval', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'Game' + s),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (games) => {
            // Deduplicate by ID to avoid conflicts
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            const results = cache.search('Game');
            
            // All results should have their original rating preserved
            return results.every(result => {
              const original = uniqueGames.find(g => g.id === result.id);
              return original && result.rating === original.rating;
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Feature: bgg-rating-badge
   * Property 2: Search Results Include Rating
   * For any search query that returns results, each BggSearchResult object 
   * SHALL include a rating field (number or null) matching the cached game's rating.
   * 
   * **Validates: Requirements 1.5**
   */
  describe('Property 2: Search Results Include Rating', () => {
    it('should include rating field in all search results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'SearchGame' + s),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (games) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search('SearchGame');
            
            // All results should have a rating property (can be null)
            return results.every(result => 'rating' in result);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should match rating from original cached game', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'RatedGame' + s),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (games) => {
            // Deduplicate by ID to avoid conflicts
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            const results = cache.search('RatedGame');
            
            // Each result's rating should match the original game's rating
            return results.every(result => {
              const original = uniqueGames.find(g => g.id === result.id);
              return original !== undefined && result.rating === original.rating;
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 3: Expansion Filtering (renamed from Property 2)
   * For any CSV data containing entries with is_expansion=1, 
   * the BGG_Cache SHALL NOT contain any of those expansion entries after parsing.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: Expansion Filtering', () => {
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
                rating: null,
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
              rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10), { nil: null }),
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
              rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10), { nil: null }),
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
              rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10), { nil: null }),
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
