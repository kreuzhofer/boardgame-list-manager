/**
 * Game filtering and highlighting utilities for unified search
 * Requirements: 1.2, 7.1
 */

import type { Game } from '../types';
import { normalizeName } from './nameNormalization';

/**
 * Game with bringer names extracted for display in dropdown
 */
export interface GameWithBringerInfo {
  id: string;
  name: string;
  bringerNames: string[];
}

/**
 * Filters games whose normalized names include the normalized query string.
 * 
 * @param games - The list of games to filter
 * @param query - The search query
 * @returns Filtered list of games matching the query
 * 
 * @example
 * filterGamesByName(games, "catan") // returns games with "catan" in name
 */
export function filterGamesByName(games: Game[], query: string): Game[] {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    return games;
  }
  
  return games.filter((game) => {
    const normalizedName = normalizeName(game.name);
    return normalizedName.includes(normalizedQuery);
  });
}

/**
 * Determines if a game should be highlighted based on search query.
 * A game is highlighted if its normalized name includes the normalized query.
 * 
 * @param game - The game to check
 * @param searchQuery - The current search query
 * @returns true if the game should be highlighted
 * 
 * @example
 * shouldHighlightGame(catanGame, "cat") // true
 * shouldHighlightGame(catanGame, "azul") // false
 * shouldHighlightGame(catanGame, "") // false
 */
export function shouldHighlightGame(game: Game, searchQuery: string): boolean {
  const normalizedQuery = normalizeName(searchQuery);
  
  if (!normalizedQuery) {
    return false;
  }
  
  const normalizedName = normalizeName(game.name);
  return normalizedName.includes(normalizedQuery);
}

/**
 * Gets the IDs of all games that should be highlighted for a given query.
 * 
 * @param games - The list of games
 * @param searchQuery - The current search query
 * @returns Set of game IDs that should be highlighted
 */
export function getHighlightedGameIds(games: Game[], searchQuery: string): Set<string> {
  const ids = new Set<string>();
  
  const normalizedQuery = normalizeName(searchQuery);
  if (!normalizedQuery) {
    return ids;
  }
  
  for (const game of games) {
    if (shouldHighlightGame(game, searchQuery)) {
      ids.add(game.id);
    }
  }
  
  return ids;
}

/**
 * Filters games and extracts bringer names for dropdown display.
 * Returns max `maxItems` games with their bringer information.
 * 
 * @param games - The list of games to filter
 * @param query - The search query
 * @param maxItems - Maximum number of items to return (default 3)
 * @returns Array of games with bringer info
 */
export function getMatchingGamesWithBringers(
  games: Game[],
  query: string,
  maxItems: number = 3
): GameWithBringerInfo[] {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    return [];
  }
  
  return games
    .filter((game) => {
      const normalizedName = normalizeName(game.name);
      return normalizedName.includes(normalizedQuery);
    })
    .slice(0, maxItems)
    .map((game) => ({
      id: game.id,
      name: game.name,
      bringerNames: game.bringers.map((b) => b.user.name),
    }));
}

/**
 * Counts total matching games for a query (for "X weitere" display)
 */
export function countMatchingGames(games: Game[], query: string): number {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    return 0;
  }
  
  return games.filter((game) => {
    const normalizedName = normalizeName(game.name);
    return normalizedName.includes(normalizedQuery);
  }).length;
}
