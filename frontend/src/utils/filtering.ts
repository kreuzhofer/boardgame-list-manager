/**
 * Game Filtering Utilities
 * 
 * Utility functions for filtering games by name, player, bringer,
 * and special filters (Wunsch games, My games).
 * 
 * Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 * Property 12: Search Filter Correctness
 * Property 13: Wunsch Filter Correctness
 * Property 14: My Games Filter Correctness
 * 
 * Feature: 011-fuzzy-search
 * Updated to use fuzzy matching for name filtering
 */

import type { Game } from '../types';
import { fuzzyMatch } from './fuzzyMatch';

/**
 * Filter state interface for all game filters
 */
export interface FilterState {
  /** Search query for game name (Requirement 5.4) */
  nameQuery: string;
  /** Search query for player names (Requirement 5.5) */
  playerQuery: string;
  /** Search query for bringer names (Requirement 5.6) */
  bringerQuery: string;
  /** Filter to show only games without bringers (Requirement 5.8) */
  wunschOnly: boolean;
  /** Filter to show only games where current user is involved (Requirement 5.9) */
  myGamesOnly: boolean;
  /** Filter by prototype status */
  prototypeFilter: PrototypeFilter;
}

export type PrototypeFilter = 'all' | 'exclude' | 'only';

/**
 * Default filter state with all filters cleared
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  nameQuery: '',
  playerQuery: '',
  bringerQuery: '',
  wunschOnly: false,
  myGamesOnly: false,
  prototypeFilter: 'all',
};

/**
 * Checks if a string contains a query (case-insensitive).
 * 
 * @param text - The text to search in
 * @param query - The query to search for
 * @returns true if text contains query (case-insensitive)
 */
function containsQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

/**
 * Filters games by game name using fuzzy matching.
 * Returns only games where the name matches the query using multi-strategy fuzzy matching:
 * - Exact substring match
 * - Punctuation-normalized match (e.g., "Brass Birmingham" matches "Brass: Birmingham")
 * - Word-order independent match (e.g., "Birmingham Brass" matches "Brass: Birmingham")
 * - Edit distance match for typo tolerance (e.g., "Cataan" matches "Catan")
 * 
 * Feature: 014-alternate-names-search - Also searches alternate names
 * 
 * @param games - Array of games to filter
 * @param query - Search query for game name
 * @returns Filtered array of games
 * 
 * Validates: Requirements 5.4, 5.7
 * Property 12: Search Filter Correctness
 * Feature: 011-fuzzy-search
 */
export function filterByName(games: Game[], query: string): Game[] {
  if (!query.trim()) return games;
  return games.filter((game) => {
    // Match primary name
    if (fuzzyMatch(query, game.name).matched) return true;
    
    // Feature: 014-alternate-names-search - Match any alternate name
    if (game.alternateNames && game.alternateNames.length > 0) {
      return game.alternateNames.some(altName => fuzzyMatch(query, altName).matched);
    }
    
    return false;
  });
}

/**
 * Filters games by player name.
 * Returns only games where at least one player's name contains the query string (case-insensitive).
 * 
 * @param games - Array of games to filter
 * @param query - Search query for player name
 * @returns Filtered array of games
 * 
 * Validates: Requirements 5.5, 5.7
 * Property 12: Search Filter Correctness
 */
export function filterByPlayer(games: Game[], query: string): Game[] {
  if (!query.trim()) return games;
  return games.filter((game) =>
    game.players.some((player) => containsQuery(player.user.name, query))
  );
}

/**
 * Filters games by bringer name.
 * Returns only games where at least one bringer's name contains the query string (case-insensitive).
 * 
 * @param games - Array of games to filter
 * @param query - Search query for bringer name
 * @returns Filtered array of games
 * 
 * Validates: Requirements 5.6, 5.7
 * Property 12: Search Filter Correctness
 */
export function filterByBringer(games: Game[], query: string): Game[] {
  if (!query.trim()) return games;
  return games.filter((game) =>
    game.bringers.some((bringer) => containsQuery(bringer.user.name, query))
  );
}

/**
 * Filters games to show only "Wunsch" games (games without bringers).
 * 
 * @param games - Array of games to filter
 * @param enabled - Whether the filter is enabled
 * @returns Filtered array of games (only games with zero bringers if enabled)
 * 
 * Validates: Requirements 5.8
 * Property 13: Wunsch Filter Correctness
 */
export function filterWunschGames(games: Game[], enabled: boolean): Game[] {
  if (!enabled) return games;
  return games.filter((game) => game.bringers.length === 0);
}

/**
 * Filters games to show only games where the current user is involved.
 * A user is involved if they are either a player or a bringer.
 * 
 * @param games - Array of games to filter
 * @param currentUserName - The current user's name
 * @param enabled - Whether the filter is enabled
 * @returns Filtered array of games (only games where user is player or bringer if enabled)
 * 
 * Validates: Requirements 5.9
 * Property 14: My Games Filter Correctness
 */
export function filterMyGames(games: Game[], currentUserName: string, enabled: boolean): Game[] {
  if (!enabled) return games;
  return games.filter((game) => {
    const isPlayer = game.players.some(
      (player) => player.user.name.toLowerCase() === currentUserName.toLowerCase()
    );
    const isBringer = game.bringers.some(
      (bringer) => bringer.user.name.toLowerCase() === currentUserName.toLowerCase()
    );
    return isPlayer || isBringer;
  });
}

/**
 * Filters games based on prototype flag.
 * - 'all': return all games
 * - 'exclude': return only non-prototype games
 * - 'only': return only prototype games
 */
export function filterPrototypeGames(games: Game[], filter: PrototypeFilter): Game[] {
  switch (filter) {
    case 'exclude':
      return games.filter((game) => !game.isPrototype);
    case 'only':
      return games.filter((game) => game.isPrototype);
    case 'all':
    default:
      return games;
  }
}

/**
 * Applies all filters to a game list.
 * Filters are applied in sequence: name → player → bringer → wunsch → myGames.
 * 
 * @param games - Array of games to filter
 * @param filters - Filter state object
 * @param currentUser - The current user's name (for "My Games" filter)
 * @returns Filtered array of games
 * 
 * Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */
export function applyAllFilters(
  games: Game[],
  filters: FilterState,
  currentUser: string
): Game[] {
  let result = games;
  
  // Apply search filters
  result = filterByName(result, filters.nameQuery);
  result = filterByPlayer(result, filters.playerQuery);
  result = filterByBringer(result, filters.bringerQuery);
  
  // Apply toggle filters
  result = filterWunschGames(result, filters.wunschOnly);
  result = filterMyGames(result, currentUser, filters.myGamesOnly);
  result = filterPrototypeGames(result, filters.prototypeFilter);
  
  return result;
}

/**
 * Checks if any filters are currently active.
 * 
 * @param filters - Filter state object
 * @returns true if any filter is active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.nameQuery.trim() !== '' ||
    filters.playerQuery.trim() !== '' ||
    filters.bringerQuery.trim() !== '' ||
    filters.wunschOnly ||
    filters.myGamesOnly ||
    filters.prototypeFilter !== 'all'
  );
}
