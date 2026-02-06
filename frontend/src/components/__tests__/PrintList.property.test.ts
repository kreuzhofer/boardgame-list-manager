/**
 * Property-based tests for PrintList component
 * 
 * **Validates: Requirements 7.2**
 * 
 * Property 15: Print List Contains Participant's Games
 * For any participant and game list, the print output SHALL contain exactly 
 * the games where the participant is listed as a bringer.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterGamesParticipantIsBringing } from '../PrintList';
import type { Game, Player, Bringer, Participant } from '../../types';

// ============================================================================
// Custom Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid participant names (non-empty strings)
 */
const participantNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating valid game names (non-empty strings)
 */
const gameNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating a Participant object
 */
const participantArbitrary: fc.Arbitrary<Participant> = fc.record({
  id: fc.uuid(),
  name: participantNameArbitrary,
});

/**
 * Arbitrary for generating a Player object with participant
 */
const playerArbitrary: fc.Arbitrary<Player> = fc.record({
  id: fc.uuid(),
  participant: participantArbitrary,
  addedAt: fc.date(),
});

/**
 * Arbitrary for generating a Bringer object with participant
 */
const bringerArbitrary: fc.Arbitrary<Bringer> = fc.record({
  id: fc.uuid(),
  participant: participantArbitrary,
  addedAt: fc.date(),
});

/**
 * Arbitrary for generating a Game object
 */
const gameArbitrary: fc.Arbitrary<Game> = fc.record({
  id: fc.uuid(),
  name: gameNameArbitrary,
  owner: fc.constant(null),
  bggId: fc.constant(null),
  yearPublished: fc.constant(null),
  bggRating: fc.constant(null),
  addedAsAlternateName: fc.constant(null),
  alternateNames: fc.constant([]),
  isPrototype: fc.constant(false),
  isHidden: fc.constant(false),
  players: fc.array(playerArbitrary, { minLength: 0, maxLength: 10 }),
  bringers: fc.array(bringerArbitrary, { minLength: 0, maxLength: 10 }),
  createdAt: fc.date(),
}).map(game => ({
  ...game,
  status: game.bringers.length === 0 ? 'wunsch' as const : 'verfuegbar' as const,
}));

/**
 * Arbitrary for generating a list of games
 */
const gameListArbitrary = fc.array(gameArbitrary, { minLength: 0, maxLength: 20 });

// ============================================================================
// Property 15: Print List Contains Participant's Games
// ============================================================================

describe('Property 15: Print List Contains Participant\'s Games', () => {
  /**
   * **Validates: Requirements 7.2**
   * 
   * For any participant and game list, the print output SHALL contain exactly 
   * the games where the participant is listed as a bringer (by participant ID).
   */

  it('should return only games where participant is a bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          const filtered = filterGamesParticipantIsBringing(games, participantId);
          
          // Property: Every returned game must have the participant as a bringer
          for (const game of filtered) {
            const participantIsBringer = game.bringers.some(b => b.participant.id === participantId);
            expect(participantIsBringer).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not exclude any game where participant is a bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          const filtered = filterGamesParticipantIsBringing(games, participantId);
          
          // Property: All games where participant is a bringer should be included
          for (const game of games) {
            const participantIsBringer = game.bringers.some(b => b.participant.id === participantId);
            if (participantIsBringer) {
              expect(filtered).toContainEqual(game);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should satisfy biconditional: game in result <=> participant is bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          const filtered = filterGamesParticipantIsBringing(games, participantId);
          const filteredIds = new Set(filtered.map(g => g.id));
          
          // Property: Biconditional - game is in result if and only if participant is a bringer
          for (const game of games) {
            const isInResult = filteredIds.has(game.id);
            const participantIsBringer = game.bringers.some(b => b.participant.id === participantId);
            expect(isInResult).toBe(participantIsBringer);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return exactly the count of games where participant is bringer', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          const filtered = filterGamesParticipantIsBringing(games, participantId);
          
          // Property: Count should match exactly
          const expectedCount = games.filter(
            g => g.bringers.some(b => b.participant.id === participantId)
          ).length;
          
          expect(filtered.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not include games where participant is only a player (not bringer)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          const filtered = filterGamesParticipantIsBringing(games, participantId);
          
          // Property: Games where participant is only a player should NOT be included
          for (const game of games) {
            const participantIsPlayer = game.players.some(p => p.participant.id === participantId);
            const participantIsBringer = game.bringers.some(b => b.participant.id === participantId);
            
            if (participantIsPlayer && !participantIsBringer) {
              expect(filtered).not.toContainEqual(game);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return empty array when participant is not a bringer of any game', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          // Filter out games where participant might be a bringer
          const gamesWithoutUser = games.map(game => ({
            ...game,
            bringers: game.bringers.filter(b => b.participant.id !== participantId),
          }));
          
          const filtered = filterGamesParticipantIsBringing(gamesWithoutUser, participantId);
          
          // Property: Should return empty array
          expect(filtered).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve game data integrity (no mutation)', () => {
    fc.assert(
      fc.property(
        gameListArbitrary,
        fc.uuid(),
        (games, participantId) => {
          // Deep copy to compare
          const originalGames = JSON.stringify(games);
          
          filterGamesParticipantIsBringing(games, participantId);
          
          // Property: Original array should be unchanged
          expect(JSON.stringify(games)).toBe(originalGames);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty games list', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (participantId) => {
          const filtered = filterGamesParticipantIsBringing([], participantId);
          
          // Property: Empty input should return empty output
          expect(filtered).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
