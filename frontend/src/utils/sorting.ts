/**
 * Game Sorting Utilities
 * 
 * Utility functions for sorting games alphabetically by name or by date added.
 * 
 * Validates: Requirements 5.2, 5.3
 * Property 11: Alphabetical Sort Order
 */

import type { Game } from '../types';

/**
 * Sort order type for game list sorting
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort key type for game list sorting
 */
export type SortKey = 'name' | 'addedAt';

/**
 * Sorts an array of games alphabetically by name.
 * 
 * - 'asc' (ascending): A → Z
 * - 'desc' (descending): Z → A
 * 
 * Uses locale-aware comparison for proper German character handling (ä, ö, ü, ß).
 * 
 * @param games - The array of games to sort
 * @param order - The sort order ('asc' for ascending, 'desc' for descending)
 * @returns A new sorted array of games (does not mutate the original)
 * 
 * Validates: Requirements 5.2, 5.3
 */
export function sortGamesByName(games: Game[], order: SortOrder): Game[] {
  return [...games].sort((a, b) => {
    // Use localeCompare for proper German character handling
    const comparison = a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Sorts an array of games by the date they were added (createdAt).
 * 
 * - 'asc' (ascending): Oldest → Newest
 * - 'desc' (descending): Newest → Oldest
 * 
 * Uses name as a stable tiebreaker when dates are equal.
 * 
 * @param games - The array of games to sort
 * @param order - The sort order ('asc' for ascending, 'desc' for descending)
 * @returns A new sorted array of games (does not mutate the original)
 */
export function sortGamesByAddedAt(games: Game[], order: SortOrder): Game[] {
  return [...games].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    const comparison = timeA - timeB;
    if (comparison !== 0) {
      return order === 'asc' ? comparison : -comparison;
    }

    const nameComparison = a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    return nameComparison;
  });
}

/**
 * Toggles the sort order between ascending and descending.
 * 
 * @param currentOrder - The current sort order
 * @returns The opposite sort order
 * 
 * Validates: Requirements 5.3
 */
export function toggleSortOrder(currentOrder: SortOrder): SortOrder {
  return currentOrder === 'asc' ? 'desc' : 'asc';
}

/**
 * Default sort order for the game list.
 * Per Requirements 5.2: Default alphabetical sort by name (ascending).
 */
export const DEFAULT_SORT_ORDER: SortOrder = 'asc';

/**
 * Default sort key for the game list.
 * Default is alphabetical sort by name.
 */
export const DEFAULT_SORT_KEY: SortKey = 'name';
