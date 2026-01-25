/**
 * Game filtering and highlighting utilities for unified search
 * Requirements: 1.2, 7.1
 * 
 * Feature: 011-fuzzy-search
 * Enhanced with fuzzy/semantic search capabilities
 */

import type { Game } from '../types';
import { normalizeName } from './nameNormalization';
import { fuzzyMatch, type FuzzyMatchResult, type FuzzyMatchConfig } from './fuzzyMatch';

/**
 * Game with bringer names extracted for display in dropdown
 */
export interface GameWithBringerInfo {
  id: string;
  name: string;
  bggId: number | null;
  bringerNames: string[];
  /** Feature: 014-alternate-names-search - The alternate name that matched, if any */
  matchedAlternateName: string | null;
}

/**
 * Game with match score for sorted results
 * Feature: 011-fuzzy-search
 */
export interface ScoredGame {
  game: Game;
  score: number;
  matchType: FuzzyMatchResult['matchType'];
  /** Feature: 014-alternate-names-search - The alternate name that matched, if any */
  matchedAlternateName: string | null;
}

/**
 * Filters games using fuzzy matching and returns with scores.
 * Results are sorted by score in descending order (best matches first).
 * 
 * Feature: 014-alternate-names-search - Also searches alternate names
 * 
 * @param games - The list of games to filter
 * @param query - The search query
 * @param config - Optional fuzzy match configuration
 * @returns Array of scored games, sorted by score descending
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 4.1, 4.5
 */
export function filterGamesByNameWithScores(
  games: Game[],
  query: string,
  config?: Partial<FuzzyMatchConfig>
): ScoredGame[] {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    // Return all games with score 0 when query is empty
    return games.map((game) => ({
      game,
      score: 0,
      matchType: 'none' as const,
      matchedAlternateName: null,
    }));
  }
  
  const scoredGames: ScoredGame[] = [];
  
  for (const game of games) {
    // Check primary name first
    const primaryResult = fuzzyMatch(query, game.name, config);
    if (primaryResult.matched) {
      scoredGames.push({
        game,
        score: primaryResult.score,
        matchType: primaryResult.matchType,
        matchedAlternateName: null,
      });
      continue;
    }
    
    // Feature: 014-alternate-names-search - Check alternate names
    if (game.alternateNames && game.alternateNames.length > 0) {
      let bestAltMatch: { result: FuzzyMatchResult; name: string } | null = null;
      
      for (const altName of game.alternateNames) {
        const altResult = fuzzyMatch(query, altName, config);
        if (altResult.matched) {
          if (!bestAltMatch || altResult.score > bestAltMatch.result.score) {
            bestAltMatch = { result: altResult, name: altName };
          }
        }
      }
      
      if (bestAltMatch) {
        scoredGames.push({
          game,
          score: bestAltMatch.result.score,
          matchType: bestAltMatch.result.matchType,
          matchedAlternateName: bestAltMatch.name,
        });
      }
    }
  }
  
  // Sort by score descending (highest score first)
  scoredGames.sort((a, b) => b.score - a.score);
  
  return scoredGames;
}

/**
 * Filters games whose names match the query using fuzzy matching.
 * Results are sorted by match quality (best matches first).
 * 
 * Maintains backward compatibility with the original function signature.
 * 
 * @param games - The list of games to filter
 * @param query - The search query
 * @returns Filtered list of games matching the query, sorted by relevance
 * 
 * @example
 * filterGamesByName(games, "catan") // returns games with "catan" in name
 * filterGamesByName(games, "Brass Birmingham") // returns "Brass: Birmingham"
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 6.1, 6.3
 */
export function filterGamesByName(games: Game[], query: string): Game[] {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    return games;
  }
  
  const scoredGames = filterGamesByNameWithScores(games, query);
  return scoredGames.map((sg) => sg.game);
}

/**
 * Determines if a game should be highlighted based on search query.
 * Uses fuzzy matching to determine if the game matches the query.
 * 
 * Feature: 014-alternate-names-search - Also checks alternate names
 * 
 * @param game - The game to check
 * @param searchQuery - The current search query
 * @returns true if the game should be highlighted
 * 
 * @example
 * shouldHighlightGame(catanGame, "cat") // true
 * shouldHighlightGame(catanGame, "azul") // false
 * shouldHighlightGame(catanGame, "") // false
 * shouldHighlightGame(brassBirminghamGame, "Brass Birmingham") // true
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 6.2
 */
export function shouldHighlightGame(game: Game, searchQuery: string): boolean {
  const normalizedQuery = normalizeName(searchQuery);
  
  if (!normalizedQuery) {
    return false;
  }
  
  // Check primary name
  if (fuzzyMatch(searchQuery, game.name).matched) {
    return true;
  }
  
  // Feature: 014-alternate-names-search - Check alternate names
  if (game.alternateNames && game.alternateNames.length > 0) {
    return game.alternateNames.some(altName => fuzzyMatch(searchQuery, altName).matched);
  }
  
  return false;
}

/**
 * Gets the IDs of all games that should be highlighted for a given query.
 * Uses fuzzy matching to determine which games match.
 * 
 * @param games - The list of games
 * @param searchQuery - The current search query
 * @returns Set of game IDs that should be highlighted
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 6.4
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
 * Uses fuzzy matching and returns results sorted by relevance.
 * 
 * @param games - The list of games to filter
 * @param query - The search query
 * @param maxItems - Maximum number of items to return (default 3)
 * @returns Array of games with bringer info, sorted by match quality
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 6.4
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
  
  const scoredGames = filterGamesByNameWithScores(games, query);
  
  return scoredGames
    .slice(0, maxItems)
    .map((sg) => ({
      id: sg.game.id,
      name: sg.game.name,
      bggId: sg.game.bggId,
      bringerNames: sg.game.bringers.map((b) => b.user.name),
      matchedAlternateName: sg.matchedAlternateName,
    }));
}

/**
 * Counts total matching games for a query (for "X weitere" display)
 * Uses fuzzy matching to count matches.
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 6.4
 */
export function countMatchingGames(games: Game[], query: string): number {
  const normalizedQuery = normalizeName(query);
  
  if (!normalizedQuery) {
    return 0;
  }
  
  return filterGamesByNameWithScores(games, query).length;
}
