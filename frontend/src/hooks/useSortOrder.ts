/**
 * useSortOrder hook
 * 
 * Custom hook for managing sort order state.
 * Provides default ascending order per Requirements 5.2.
 * 
 * Validates: Requirements 5.2, 5.3
 */

import { useState, useCallback } from 'react';
import { DEFAULT_SORT_ORDER, type SortOrder } from '../utils';

export interface UseSortOrderReturn {
  /** Current sort order ('asc' or 'desc') */
  sortOrder: SortOrder;
  /** Function to set the sort order */
  setSortOrder: (order: SortOrder) => void;
  /** Function to toggle between ascending and descending */
  toggleSortOrder: () => void;
}

/**
 * Hook for managing sort order state.
 * 
 * @param initialOrder - Initial sort order (defaults to 'asc' per Requirements 5.2)
 * @returns Object with sortOrder state and control functions
 * 
 * @example
 * ```tsx
 * const { sortOrder, setSortOrder, toggleSortOrder } = useSortOrder();
 * 
 * return (
 *   <GameTable
 *     games={games}
 *     sortOrder={sortOrder}
 *     onSortOrderChange={setSortOrder}
 *   />
 * );
 * ```
 */
export function useSortOrder(initialOrder: SortOrder = DEFAULT_SORT_ORDER): UseSortOrderReturn {
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  return {
    sortOrder,
    setSortOrder,
    toggleSortOrder,
  };
}
