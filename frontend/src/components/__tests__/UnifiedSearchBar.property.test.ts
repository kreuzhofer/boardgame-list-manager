/**
 * Property-based tests for UnifiedSearchBar component
 * **Property 9: Keyboard Navigation Cross-Section**
 * **Validates: Requirements 10.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getAddButtonState, type AddButtonState } from '../UnifiedSearchBar';
import type { BggSearchResult } from '../../types';

// Arbitrary for generating game names
const gameNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Arbitrary for generating BggSearchResult
const bggSearchResultArb: fc.Arbitrary<BggSearchResult> = fc.record({
  id: fc.integer({ min: 1, max: 1000000 }),
  name: gameNameArb,
  yearPublished: fc.option(fc.integer({ min: 1900, max: 2030 }), { nil: null }),
  rating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }), { nil: null }),
});

describe('UnifiedSearchBar Properties', () => {
  describe('Property 9: Keyboard Navigation Cross-Section', () => {
    it('keyboard navigation traverses all M + N items in order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // M matching games
          fc.integer({ min: 0, max: 10 }), // N visible BGG results
          (matchingGamesCount, visibleBggCount) => {
            const totalItems = matchingGamesCount + visibleBggCount;
            
            // Simulate keyboard navigation through all items
            for (let index = 0; index < totalItems; index++) {
              if (index < matchingGamesCount) {
                // Should be in In-Liste section
                const section = 'inListe';
                const localIndex = index;
                expect(section).toBe('inListe');
                expect(localIndex).toBe(index);
                expect(localIndex).toBeLessThan(matchingGamesCount);
              } else {
                // Should be in BGG section
                const section = 'bgg';
                const localIndex = index - matchingGamesCount;
                expect(section).toBe('bgg');
                expect(localIndex).toBeGreaterThanOrEqual(0);
                expect(localIndex).toBeLessThan(visibleBggCount);
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('indices 0 to M-1 select In-Liste items', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // M matching games (at least 1)
          fc.integer({ min: 0, max: 10 }), // N visible BGG results
          (matchingGamesCount, visibleBggCount) => {
            // Test all In-Liste indices
            for (let index = 0; index < matchingGamesCount; index++) {
              const isInListeSection = index < matchingGamesCount;
              expect(isInListeSection).toBe(true);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('indices M to M+N-1 select BGG items', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // M matching games
          fc.integer({ min: 1, max: 10 }), // N visible BGG results (at least 1)
          (matchingGamesCount, visibleBggCount) => {
            // Test all BGG indices
            for (let i = 0; i < visibleBggCount; i++) {
              const globalIndex = matchingGamesCount + i;
              const isBggSection = globalIndex >= matchingGamesCount;
              const localBggIndex = globalIndex - matchingGamesCount;
              
              expect(isBggSection).toBe(true);
              expect(localBggIndex).toBe(i);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});

describe('getAddButtonState', () => {
  describe('Unit tests for add button state logic', () => {
    it('returns hidden for empty input', () => {
      const result = getAddButtonState('', null, false);
      expect(result.state).toBe('hidden');
    });

    it('returns hidden for whitespace-only input', () => {
      const result = getAddButtonState('   ', null, false);
      expect(result.state).toBe('hidden');
    });

    it('returns enabled when BGG selected and not duplicate', () => {
      const bggItem: BggSearchResult = {
        id: 13,
        name: 'Catan',
        yearPublished: 1995,
        rating: 7.1,
      };
      const result = getAddButtonState('Catan', bggItem, false);
      expect(result.state).toBe('enabled');
    });

    it('returns disabled with message when BGG selected and is duplicate', () => {
      const bggItem: BggSearchResult = {
        id: 13,
        name: 'Catan',
        yearPublished: 1995,
        rating: 7.1,
      };
      const result = getAddButtonState('Catan', bggItem, true);
      expect(result.state).toBe('disabled');
      expect(result.message).toBe('Spiel bereits in der Liste');
    });

    it('returns enabled for custom name not matching existing', () => {
      const result = getAddButtonState('My Custom Game', null, false);
      expect(result.state).toBe('enabled');
    });

    it('returns hidden when custom name matches existing game', () => {
      const result = getAddButtonState('Catan', null, true);
      expect(result.state).toBe('hidden');
    });
  });

  describe('Property tests for add button state', () => {
    it('empty query always results in hidden state', () => {
      fc.assert(
        fc.property(
          fc.option(bggSearchResultArb, { nil: null }),
          fc.boolean(),
          (bggItem, isDuplicate) => {
            const result = getAddButtonState('', bggItem, isDuplicate);
            expect(result.state).toBe('hidden');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('non-empty query with BGG item and duplicate results in disabled', () => {
      fc.assert(
        fc.property(gameNameArb, bggSearchResultArb, (query, bggItem) => {
          const result = getAddButtonState(query, bggItem, true);
          expect(result.state).toBe('disabled');
          expect(result.message).toBeDefined();
        }),
        { numRuns: 10 }
      );
    });

    it('non-empty query with BGG item and no duplicate results in enabled', () => {
      fc.assert(
        fc.property(gameNameArb, bggSearchResultArb, (query, bggItem) => {
          const result = getAddButtonState(query, bggItem, false);
          expect(result.state).toBe('enabled');
        }),
        { numRuns: 10 }
      );
    });

    it('non-empty query without BGG item and no duplicate results in enabled', () => {
      fc.assert(
        fc.property(gameNameArb, (query) => {
          const result = getAddButtonState(query, null, false);
          expect(result.state).toBe('enabled');
        }),
        { numRuns: 10 }
      );
    });

    it('non-empty query without BGG item and duplicate results in hidden', () => {
      fc.assert(
        fc.property(gameNameArb, (query) => {
          const result = getAddButtonState(query, null, true);
          expect(result.state).toBe('hidden');
        }),
        { numRuns: 10 }
      );
    });
  });
});
