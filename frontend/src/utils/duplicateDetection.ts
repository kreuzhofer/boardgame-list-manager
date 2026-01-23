/**
 * Duplicate detection utility for preventing duplicate games
 * Requirements: 5.1, 5.2
 */

import type { Game } from '../types';
import { normalizeName } from './nameNormalization';

/**
 * Result of a duplicate check
 */
export interface DuplicateCheckResult {
  /** Whether a duplicate was found */
  isDuplicate: boolean;
  /** How the duplicate was matched (bggId takes priority over name) */
  matchedBy: 'bggId' | 'name' | null;
  /** The existing game that matched, if any */
  existingGame: Game | null;
}

/**
 * Checks if a game already exists in the list.
 * First checks by bggId (if provided), then by normalized name.
 * 
 * @param bggId - The BGG ID to check (null if not from BGG)
 * @param name - The game name to check
 * @param games - The list of existing games
 * @returns DuplicateCheckResult indicating if duplicate found and how
 * 
 * @example
 * // Check by bggId
 * checkDuplicate(13, "Catan", games) // matches game with bggId 13
 * 
 * // Check by name when no bggId
 * checkDuplicate(null, "Catan", games) // matches game named "catan"
 */
export function checkDuplicate(
  bggId: number | null,
  name: string,
  games: Game[]
): DuplicateCheckResult {
  // First check by bggId (takes priority)
  if (bggId !== null) {
    const bggMatch = games.find((g) => g.bggId === bggId);
    if (bggMatch) {
      return { isDuplicate: true, matchedBy: 'bggId', existingGame: bggMatch };
    }
  }

  // Then check by normalized name
  const normalizedInput = normalizeName(name);
  if (normalizedInput) {
    const nameMatch = games.find(
      (g) => normalizeName(g.name) === normalizedInput
    );
    if (nameMatch) {
      return { isDuplicate: true, matchedBy: 'name', existingGame: nameMatch };
    }
  }

  return { isDuplicate: false, matchedBy: null, existingGame: null };
}

/**
 * Creates a Set of existing BGG IDs for quick lookup
 */
export function getExistingBggIds(games: Game[]): Set<number> {
  const ids = new Set<number>();
  for (const game of games) {
    if (game.bggId !== null) {
      ids.add(game.bggId);
    }
  }
  return ids;
}

/**
 * Creates a Set of normalized game names for quick lookup
 */
export function getExistingNormalizedNames(games: Game[]): Set<string> {
  const names = new Set<string>();
  for (const game of games) {
    const normalized = normalizeName(game.name);
    if (normalized) {
      names.add(normalized);
    }
  }
  return names;
}
