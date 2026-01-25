/**
 * BggService - Service layer for BGG search operations
 * Wraps BggCache and handles business logic like query validation
 * 
 * Requirements: 2.4
 * Feature: 014-alternate-names-search - Enhanced with alternate name support
 */

import { bggCache } from './bggCache';

export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
  rating: number | null;
  matchedAlternateName: string | null;
  alternateNames: string[];
}

export interface BggSearchResponse {
  results: BggSearchResult[];
  hasMore: boolean;
}

const MAX_RESULTS = 30;

/**
 * Service for BGG game search operations
 */
class BggService {
  /**
   * Search for games by name
   * Requirement 2.4: Return empty array for queries < 2 characters
   * Feature: 014-alternate-names-search - Include alternate name info
   * 
   * @param query - Search query string
   * @returns Object with array of matching games (max 30) and hasMore flag
   */
  searchGames(query: string): BggSearchResponse {
    // Requirement 2.4: Return empty array for queries < 2 characters
    if (!query || query.length < 2) {
      return { results: [], hasMore: false };
    }

    // Fetch one extra to detect if there are more results
    const games = bggCache.search(query, MAX_RESULTS + 1);
    const hasMore = games.length > MAX_RESULTS;
    
    // Transform to API response format
    const results: BggSearchResult[] = games.slice(0, MAX_RESULTS).map(game => ({
      id: game.id,
      name: game.name,
      yearPublished: game.yearPublished,
      rating: game.rating,
      matchedAlternateName: game.matchedAlternateName,
      alternateNames: game.alternateNames,
    }));

    return { results, hasMore };
  }

  /**
   * Check if the BGG cache is loaded
   */
  isReady(): boolean {
    return bggCache.isLoaded();
  }

  /**
   * Get the number of games in the cache
   */
  getGameCount(): number {
    return bggCache.getCount();
  }

  /**
   * Get the current data source
   * Feature: 014-alternate-names-search
   */
  getDataSource(): 'csv' | 'database' {
    return bggCache.getDataSource();
  }
}

// Export singleton instance
export const bggService = new BggService();
export { BggService };
