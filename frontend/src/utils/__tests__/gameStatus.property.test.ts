/**
 * Property-based tests for game status derivation
 * 
 * **Validates: Requirements 4.1, 4.2**
 * 
 * Property 9: Game Status Derivation
 * For any game, the status SHALL be "Wunsch" if and only if the game has 
 * at least one player AND zero bringers; otherwise the status SHALL be 
 * "Verfügbar" if the game has at least one bringer.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { deriveGameStatus } from '../gameStatus';
import type { GameStatus } from '../../types';

describe('gameStatus - Property-Based Tests', () => {
  /**
   * Property 9: Game Status Derivation
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any game, the status SHALL be "Wunsch" if and only if the game has 
   * at least one player AND zero bringers; otherwise the status SHALL be 
   * "Verfügbar" if the game has at least one bringer.
   */
  describe('Property 9: Game Status Derivation', () => {
    // Custom arbitrary for generating player counts (non-negative integers)
    const playerCountArbitrary = fc.nat({ max: 100 });
    
    // Custom arbitrary for generating bringer counts (non-negative integers)
    const bringerCountArbitrary = fc.nat({ max: 100 });

    it('should return "wunsch" if and only if bringersCount is 0', () => {
      fc.assert(
        fc.property(
          bringerCountArbitrary,
          (bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // Property: status is "wunsch" if and only if bringersCount === 0
            if (bringersCount === 0) {
              expect(status).toBe('wunsch');
            } else {
              expect(status).toBe('verfuegbar');
            }
            
            return true;
          }
        ),
        { numRuns: 20 } // Pure function - use 20 runs per workspace guidelines
      );
    });

    it('should return "verfuegbar" if and only if bringersCount > 0', () => {
      fc.assert(
        fc.property(
          // Generate only positive bringer counts (at least 1)
          fc.integer({ min: 1, max: 100 }),
          (bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // Property: status is "verfuegbar" when there is at least one bringer
            expect(status).toBe('verfuegbar');
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should derive status correctly for games with varying players and bringers', () => {
      fc.assert(
        fc.property(
          playerCountArbitrary,
          bringerCountArbitrary,
          (playersCount, bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // The status derivation depends ONLY on bringers count, not players count
            // This validates the core property:
            // - "wunsch" when bringersCount === 0 (regardless of players)
            // - "verfuegbar" when bringersCount > 0 (regardless of players)
            
            const expectedStatus: GameStatus = bringersCount === 0 ? 'wunsch' : 'verfuegbar';
            expect(status).toBe(expectedStatus);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should satisfy the biconditional: status === "wunsch" <=> bringersCount === 0', () => {
      fc.assert(
        fc.property(
          bringerCountArbitrary,
          (bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // Biconditional property test:
            // (status === 'wunsch') if and only if (bringersCount === 0)
            const isWunsch = status === 'wunsch';
            const hasNoBringers = bringersCount === 0;
            
            // Both conditions must be equivalent (biconditional)
            expect(isWunsch).toBe(hasNoBringers);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should satisfy the biconditional: status === "verfuegbar" <=> bringersCount > 0', () => {
      fc.assert(
        fc.property(
          bringerCountArbitrary,
          (bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // Biconditional property test:
            // (status === 'verfuegbar') if and only if (bringersCount > 0)
            const isVerfuegbar = status === 'verfuegbar';
            const hasBringers = bringersCount > 0;
            
            // Both conditions must be equivalent (biconditional)
            expect(isVerfuegbar).toBe(hasBringers);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return exactly one of the two valid statuses', () => {
      fc.assert(
        fc.property(
          bringerCountArbitrary,
          (bringersCount) => {
            const status = deriveGameStatus(bringersCount);
            
            // Property: status must be exactly one of the two valid values
            const validStatuses: GameStatus[] = ['wunsch', 'verfuegbar'];
            expect(validStatuses).toContain(status);
            
            // Mutual exclusivity: cannot be both
            expect(status === 'wunsch' && status === 'verfuegbar').toBe(false);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
