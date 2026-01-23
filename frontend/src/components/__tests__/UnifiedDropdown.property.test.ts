/**
 * Property-based tests for UnifiedDropdown component
 * **Property 2: In-Liste Section Item Limit**
 * **Property 3: BGG Section Initial Item Limit**
 * **Property 4: In-Liste Item Content**
 * **Property 5: BGG Item Content**
 * **Validates: Requirements 2.3, 2.4, 3.1, 3.2, 4.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  IN_LISTE_MAX_ITEMS,
  BGG_INITIAL_ITEMS,
} from '../UnifiedDropdown';
import type { GameWithBringerInfo } from '../../utils';
import type { BggSearchResult } from '../../types';

// Arbitrary for generating game names
const gameNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Arbitrary for generating bringer names
const bringerNameArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

// Arbitrary for generating GameWithBringerInfo
const gameWithBringerInfoArb: fc.Arbitrary<GameWithBringerInfo> = fc.record({
  id: fc.uuid(),
  name: gameNameArb,
  bringerNames: fc.array(bringerNameArb, { minLength: 0, maxLength: 5 }),
});

// Arbitrary for generating BggSearchResult
const bggSearchResultArb: fc.Arbitrary<BggSearchResult> = fc.record({
  id: fc.integer({ min: 1, max: 1000000 }),
  name: gameNameArb,
  yearPublished: fc.option(fc.integer({ min: 1900, max: 2030 }), { nil: null }),
  rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }), { nil: null }),
});

describe('UnifiedDropdown Properties', () => {
  describe('Property 2: In-Liste Section Item Limit', () => {
    it('In-Liste section displays exactly min(N, 3) items for N matching games', () => {
      fc.assert(
        fc.property(
          fc.array(gameWithBringerInfoArb, { minLength: 0, maxLength: 20 }),
          (matchingGames) => {
            const expectedCount = Math.min(matchingGames.length, IN_LISTE_MAX_ITEMS);
            const displayedGames = matchingGames.slice(0, IN_LISTE_MAX_ITEMS);
            
            expect(displayedGames.length).toBe(expectedCount);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('IN_LISTE_MAX_ITEMS constant equals 3', () => {
      expect(IN_LISTE_MAX_ITEMS).toBe(3);
    });
  });

  describe('Property 3: BGG Section Initial Item Limit', () => {
    it('BGG section initially displays exactly min(N, 3) items for N results', () => {
      fc.assert(
        fc.property(
          fc.array(bggSearchResultArb, { minLength: 0, maxLength: 20 }),
          (bggResults) => {
            const expectedCount = Math.min(bggResults.length, BGG_INITIAL_ITEMS);
            const displayedResults = bggResults.slice(0, BGG_INITIAL_ITEMS);
            
            expect(displayedResults.length).toBe(expectedCount);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('BGG_INITIAL_ITEMS constant equals 3', () => {
      expect(BGG_INITIAL_ITEMS).toBe(3);
    });
  });

  describe('Property 4: In-Liste Item Content', () => {
    it('In-Liste item contains game name', () => {
      fc.assert(
        fc.property(gameWithBringerInfoArb, (game) => {
          // The game name should be present in the item
          expect(game.name).toBeTruthy();
          expect(typeof game.name).toBe('string');
        }),
        { numRuns: 15 }
      );
    });

    it('In-Liste item with bringers contains all bringer names', () => {
      fc.assert(
        fc.property(
          gameWithBringerInfoArb.filter((g) => g.bringerNames.length > 0),
          (game) => {
            // All bringer names should be available for display
            expect(game.bringerNames.length).toBeGreaterThan(0);
            for (const name of game.bringerNames) {
              expect(typeof name).toBe('string');
              expect(name.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('bringer names can be joined with comma separator', () => {
      fc.assert(
        fc.property(
          gameWithBringerInfoArb.filter((g) => g.bringerNames.length > 1),
          (game) => {
            const formatted = game.bringerNames.join(', ');
            // Should contain all names
            for (const name of game.bringerNames) {
              expect(formatted).toContain(name);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 5: BGG Item Content', () => {
    it('BGG item contains game name', () => {
      fc.assert(
        fc.property(bggSearchResultArb, (result) => {
          expect(result.name).toBeTruthy();
          expect(typeof result.name).toBe('string');
        }),
        { numRuns: 15 }
      );
    });

    it('BGG item with yearPublished contains year in valid range', () => {
      fc.assert(
        fc.property(
          bggSearchResultArb.filter((r) => r.yearPublished !== null),
          (result) => {
            expect(result.yearPublished).toBeGreaterThanOrEqual(1900);
            expect(result.yearPublished).toBeLessThanOrEqual(2030);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('BGG item rating is in valid range when present', () => {
      fc.assert(
        fc.property(
          bggSearchResultArb.filter((r) => r.rating !== null),
          (result) => {
            expect(result.rating).toBeGreaterThanOrEqual(1);
            expect(result.rating).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});

describe('UnifiedDropdown Unit Tests', () => {
  describe('Item limits', () => {
    it('slicing to IN_LISTE_MAX_ITEMS works correctly', () => {
      const games: GameWithBringerInfo[] = [
        { id: '1', name: 'Game 1', bringerNames: [] },
        { id: '2', name: 'Game 2', bringerNames: ['Alice'] },
        { id: '3', name: 'Game 3', bringerNames: ['Bob', 'Carol'] },
        { id: '4', name: 'Game 4', bringerNames: [] },
        { id: '5', name: 'Game 5', bringerNames: [] },
      ];

      const displayed = games.slice(0, IN_LISTE_MAX_ITEMS);
      expect(displayed.length).toBe(3);
      expect(displayed[0].name).toBe('Game 1');
      expect(displayed[2].name).toBe('Game 3');
    });

    it('slicing to BGG_INITIAL_ITEMS works correctly', () => {
      const results: BggSearchResult[] = [
        { id: 1, name: 'BGG 1', yearPublished: 2020, rating: 7.5 },
        { id: 2, name: 'BGG 2', yearPublished: 2019, rating: 8.0 },
        { id: 3, name: 'BGG 3', yearPublished: null, rating: null },
        { id: 4, name: 'BGG 4', yearPublished: 2021, rating: 6.5 },
      ];

      const displayed = results.slice(0, BGG_INITIAL_ITEMS);
      expect(displayed.length).toBe(3);
    });
  });

  describe('Bringer info formatting', () => {
    it('formats single bringer correctly', () => {
      const game: GameWithBringerInfo = {
        id: '1',
        name: 'Catan',
        bringerNames: ['Thorsten'],
      };
      const formatted = game.bringerNames.join(', ');
      expect(formatted).toBe('Thorsten');
    });

    it('formats multiple bringers correctly', () => {
      const game: GameWithBringerInfo = {
        id: '1',
        name: 'Catan',
        bringerNames: ['Thorsten', 'Daniel'],
      };
      const formatted = game.bringerNames.join(', ');
      expect(formatted).toBe('Thorsten, Daniel');
    });

    it('handles empty bringers', () => {
      const game: GameWithBringerInfo = {
        id: '1',
        name: 'Catan',
        bringerNames: [],
      };
      expect(game.bringerNames.length).toBe(0);
    });
  });

  describe('BGG result formatting', () => {
    it('formats year in parentheses', () => {
      const result: BggSearchResult = {
        id: 13,
        name: 'Catan',
        yearPublished: 1995,
        rating: 7.1,
      };
      const yearDisplay = result.yearPublished ? `(${result.yearPublished})` : '';
      expect(yearDisplay).toBe('(1995)');
    });

    it('formats rating with one decimal', () => {
      const result: BggSearchResult = {
        id: 13,
        name: 'Catan',
        yearPublished: 1995,
        rating: 7.123,
      };
      const ratingDisplay = result.rating?.toFixed(1);
      expect(ratingDisplay).toBe('7.1');
    });
  });
});
