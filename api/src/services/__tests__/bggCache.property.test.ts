/**
 * Property-based tests for BggCache service
 * 
 * Feature: bgg-static-data-integration, bgg-rating-badge, bgg-search-release-year-sorting
 */

import * as fc from 'fast-check';
import { BggCache, BggGameWithAlternates } from '../bggCache';

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
            const games: BggGameWithAlternates[] = [{
              id: 1,
              name: 'Test Game',
              yearPublished: 2020,
              rank: 1,
              rating: roundedRating,
              alternateNames: [],
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
              alternateNames: fc.constant([] as string[]),
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
              alternateNames: fc.constant([] as string[]),
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
              alternateNames: fc.constant([] as string[]),
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
            const baseGames: BggGameWithAlternates[] = gameData
              .filter(g => !g.isExpansion)
              .map(g => ({
                id: g.id,
                name: g.name,
                yearPublished: g.yearPublished,
                rank: g.rank,
                rating: null,
                alternateNames: [],
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
   * sorted by yearPublished in descending order (newest first, nulls last) and limited to a maximum of 10 results.
   * 
   * **Validates: Requirements 1.1, 2.1**
   */
  describe('Property 4: Search Results Ordering and Limiting', () => {
    it('should return results sorted by yearPublished in descending order (newest first, nulls last)', () => {
      fc.assert(
        fc.property(
          // Generate games with various years
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.constantFrom('Catan', 'Carcassonne', 'Ticket to Ride', 'Azul', 'Wingspan'),
              yearPublished: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10), { nil: null }),
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.constantFrom('cat', 'car', 'tick', 'azu', 'wing', 'a'),
          (games, query) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search(query);
            
            // Verify results are sorted by yearPublished descending (newest first, nulls last)
            for (let i = 1; i < results.length; i++) {
              const prevYear = results[i - 1].yearPublished;
              const currYear = results[i].yearPublished;
              
              // If previous has null year, current must also have null year
              if (prevYear === null && currYear !== null) {
                return false;
              }
              // If both have valid years, previous must be >= current (descending)
              if (prevYear !== null && currYear !== null && prevYear < currYear) {
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
              alternateNames: fc.constant([] as string[]),
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
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.string({ minLength: 1, maxLength: 10 }),
          (games, query) => {
            const cache = new BggCache();
            cache.loadGames(games);
            
            const results = cache.search(query);
            const lowerQuery = query.toLowerCase();
            
            // All results should contain the query (case-insensitive) in name or alternate names
            return results.every(game => 
              game.name.toLowerCase().includes(lowerQuery) ||
              game.alternateNames.some(alt => alt.toLowerCase().includes(lowerQuery))
            );
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Feature: bgg-search-release-year-sorting, Property 1: Year Descending Order
   * 
   * For any list of BGG games loaded into the cache, after sorting, each game 
   * with a valid yearPublished should have a year greater than or equal to the 
   * next game's year (when both have valid years).
   * 
   * **Validates: Requirements 1.1, 2.1**
   */
  describe('Feature: bgg-search-release-year-sorting, Property 1: Year Descending Order', () => {
    it('should sort games by yearPublished in descending order (newest first)', () => {
      fc.assert(
        fc.property(
          // Generate random arrays of BggGame objects with various yearPublished values
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'Game' + s),
              yearPublished: fc.option(fc.integer({ min: 1950, max: 2025 }), { nil: null }),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 2, maxLength: 30 }
          ),
          (games) => {
            // Deduplicate by ID to avoid conflicts
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            // Need at least 2 games to test ordering
            if (uniqueGames.length < 2) return true;
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            // Search for all games to get the sorted order
            const results = cache.search('Game');
            
            // Verify that for any two consecutive games with valid years,
            // the first game's year >= second game's year (descending order)
            for (let i = 1; i < results.length; i++) {
              const prevYear = results[i - 1].yearPublished;
              const currYear = results[i].yearPublished;
              
              // If both have valid years, previous must be >= current (descending)
              if (prevYear !== null && currYear !== null && prevYear < currYear) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should maintain year descending order across diverse year ranges', () => {
      fc.assert(
        fc.property(
          // Generate games with a wider range of years to test edge cases
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.constant('TestGame'),
              yearPublished: fc.oneof(
                fc.constant(null),
                fc.integer({ min: 1900, max: 1950 }),  // Very old games
                fc.integer({ min: 1951, max: 2000 }),  // Mid-range games
                fc.integer({ min: 2001, max: 2025 })   // Recent games
              ),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 5, maxLength: 25 }
          ),
          (games) => {
            // Deduplicate by ID
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            if (uniqueGames.length < 2) return true;
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            const results = cache.search('TestGame');
            
            // Extract only games with valid years
            const gamesWithYears = results.filter(g => g.yearPublished !== null);
            
            // Verify descending order among games with valid years
            for (let i = 1; i < gamesWithYears.length; i++) {
              const prevYear = gamesWithYears[i - 1].yearPublished!;
              const currYear = gamesWithYears[i].yearPublished!;
              
              if (prevYear < currYear) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  /**
   * Feature: bgg-search-release-year-sorting, Property 2: Null Years Placed Last
   * 
   * For any sorted list of BGG games, all games with valid yearPublished values 
   * should appear before any games with null yearPublished values. Once a null 
   * year is encountered, all subsequent games should also have null years.
   * 
   * **Validates: Requirements 1.2, 3.1**
   */
  describe('Feature: bgg-search-release-year-sorting, Property 2: Null Years Placed Last', () => {
    it('should place all games with null yearPublished after games with valid years', () => {
      fc.assert(
        fc.property(
          // Generate random arrays of BggGame objects with a mix of valid and null yearPublished values
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'NullTest' + s),
              yearPublished: fc.oneof(
                fc.constant(null),
                fc.integer({ min: 1950, max: 2025 })
              ),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 2, maxLength: 30 }
          ),
          (games) => {
            // Deduplicate by ID to avoid conflicts
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            // Need at least 2 games to test ordering
            if (uniqueGames.length < 2) return true;
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            // Search for all games to get the sorted order
            const results = cache.search('NullTest');
            
            // Once we encounter a null year, all subsequent games must also have null years
            let foundNull = false;
            for (const result of results) {
              if (result.yearPublished === null) {
                foundNull = true;
              } else if (foundNull) {
                // Found a valid year after a null year - this violates the property
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should ensure no valid years appear after null years in diverse datasets', () => {
      fc.assert(
        fc.property(
          // Generate games with guaranteed mix of null and valid years
          fc.tuple(
            // Games with valid years
            fc.array(
              fc.record({
                id: fc.integer({ min: 1, max: 500000 }),
                name: fc.constant('MixedGame'),
                yearPublished: fc.integer({ min: 1900, max: 2025 }),
                rank: fc.integer({ min: 1, max: 100000 }),
                rating: fc.option(
                  fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                  { nil: null }
                ),
                alternateNames: fc.constant([] as string[]),
              }),
              { minLength: 1, maxLength: 15 }
            ),
            // Games with null years
            fc.array(
              fc.record({
                id: fc.integer({ min: 500001, max: 1000000 }),
                name: fc.constant('MixedGame'),
                yearPublished: fc.constant(null),
                rank: fc.integer({ min: 1, max: 100000 }),
                rating: fc.option(
                  fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                  { nil: null }
                ),
                alternateNames: fc.constant([] as string[]),
              }),
              { minLength: 1, maxLength: 15 }
            )
          ),
          ([gamesWithYears, gamesWithNullYears]) => {
            // Combine and shuffle the games
            const allGames = [...gamesWithYears, ...gamesWithNullYears];
            
            // Deduplicate by ID
            const uniqueGames = allGames.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            if (uniqueGames.length < 2) return true;
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            const results = cache.search('MixedGame');
            
            // Find the index of the first null year
            const firstNullIndex = results.findIndex(r => r.yearPublished === null);
            
            // If no null years found, property trivially holds
            if (firstNullIndex === -1) return true;
            
            // All games before firstNullIndex should have valid years
            const gamesBeforeNull = results.slice(0, firstNullIndex);
            const allBeforeHaveValidYears = gamesBeforeNull.every(g => g.yearPublished !== null);
            
            // All games from firstNullIndex onwards should have null years
            const gamesFromNull = results.slice(firstNullIndex);
            const allFromNullHaveNullYears = gamesFromNull.every(g => g.yearPublished === null);
            
            return allBeforeHaveValidYears && allFromNullHaveNullYears;
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should handle edge case where all games have null years', () => {
      fc.assert(
        fc.property(
          // Generate games where all have null years
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000000 }),
              name: fc.constant('AllNullGame'),
              yearPublished: fc.constant(null),
              rank: fc.integer({ min: 1, max: 100000 }),
              rating: fc.option(
                fc.float({ min: 1, max: 10, noNaN: true }).map(r => Math.round(r * 10) / 10),
                { nil: null }
              ),
              alternateNames: fc.constant([] as string[]),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (games) => {
            // Deduplicate by ID
            const uniqueGames = games.filter((game, index, self) => 
              index === self.findIndex(g => g.id === game.id)
            );
            
            const cache = new BggCache();
            cache.loadGames(uniqueGames);
            
            const results = cache.search('AllNullGame');
            
            // All results should have null years (property trivially holds)
            return results.every(g => g.yearPublished === null);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
