/**
 * Game Status Derivation Utilities
 * 
 * Utility functions to derive game status from bringers count
 * and determine visual highlighting for games.
 * 
 * Validates: Requirements 4.1, 4.2
 */

import type { Game, GameStatus } from '../types';

/**
 * Derives the game status based on the number of bringers.
 * 
 * - Returns 'wunsch' if bringersCount === 0 (game is requested but no one is bringing it)
 * - Returns 'verfuegbar' if bringersCount > 0 (at least one person is bringing the game)
 * 
 * @param bringersCount - The number of bringers for the game
 * @returns The derived game status
 * 
 * Validates: Requirements 4.1, 4.2
 */
export function deriveGameStatus(bringersCount: number): GameStatus {
  if (bringersCount === 0) {
    return 'wunsch';
  }
  return 'verfuegbar';
}

/**
 * Checks if a game is in "Wunsch" status (requested but not yet available).
 * 
 * A game is considered a "Wunsch" game when it has players interested
 * but no one has committed to bringing it yet.
 * 
 * @param game - The game to check
 * @returns true if the game status is 'wunsch', false otherwise
 * 
 * Validates: Requirements 4.1, 4.3
 */
export function isWunschGame(game: Game): boolean {
  return game.status === 'wunsch';
}

/**
 * Determines if a duplicate bringer hint should be shown.
 * 
 * When 3 or more users are bringing the same game, a hint should be displayed
 * to inform users that the game is already being brought by multiple people.
 * 
 * @param bringersCount - The number of bringers for the game
 * @returns true if bringersCount >= 3, false otherwise
 * 
 * Validates: Requirements 4.6
 */
export function shouldShowDuplicateHint(bringersCount: number): boolean {
  return bringersCount >= 3;
}
