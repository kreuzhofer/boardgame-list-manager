/**
 * useGameFilters hook
 * 
 * Custom hook for managing game filter state.
 * Provides state and handlers for all filter types.
 * 
 * Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { useState, useCallback, useMemo } from 'react';
import {
  DEFAULT_FILTER_STATE,
  applyAllFilters,
  hasActiveFilters,
  type FilterState,
  type PrototypeFilter,
} from '../utils/filtering';
import type { Game } from '../types';

export interface UseGameFiltersReturn {
  /** Current filter state */
  filters: FilterState;
  /** Set the name search query */
  setNameQuery: (query: string) => void;
  /** Set the player search query */
  setPlayerQuery: (query: string) => void;
  /** Set the bringer search query */
  setBringerQuery: (query: string) => void;
  /** Set the Wunsch filter toggle */
  setWunschOnly: (enabled: boolean) => void;
  /** Set the My Games filter toggle */
  setMyGamesOnly: (enabled: boolean) => void;
  /** Set the Hidden filter toggle */
  setHiddenOnly: (enabled: boolean) => void;
  /** Set the prototype filter */
  setPrototypeFilter: (filter: PrototypeFilter) => void;
  /** Reset all filters to default state */
  resetFilters: () => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Apply all filters to a game list */
  filterGames: (games: Game[], currentUser: string) => Game[];
}

/**
 * Hook for managing game filter state.
 * 
 * @returns Object with filter state and control functions
 * 
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setNameQuery,
 *   setPlayerQuery,
 *   setBringerQuery,
 *   setWunschOnly,
 *   setMyGamesOnly,
 *   setPrototypeFilter,
 *   resetFilters,
 *   hasActiveFilters,
 *   filterGames,
 * } = useGameFilters();
 * 
 * const filteredGames = filterGames(games, currentUser);
 * 
 * return (
 *   <SearchFilters
 *     onNameSearch={setNameQuery}
 *     onPlayerSearch={setPlayerQuery}
 *     onBringerSearch={setBringerQuery}
 *     onWunschFilter={setWunschOnly}
 *     onMyGamesFilter={setMyGamesOnly}
 *   />
 * );
 * ```
 */
export function useGameFilters(): UseGameFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const setNameQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, nameQuery: query }));
  }, []);

  const setPlayerQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, playerQuery: query }));
  }, []);

  const setBringerQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, bringerQuery: query }));
  }, []);

  const setWunschOnly = useCallback((enabled: boolean) => {
    setFilters((prev) => ({ ...prev, wunschOnly: enabled }));
  }, []);

  const setMyGamesOnly = useCallback((enabled: boolean) => {
    setFilters((prev) => ({ ...prev, myGamesOnly: enabled }));
  }, []);

  const setHiddenOnly = useCallback((enabled: boolean) => {
    setFilters((prev) => ({ ...prev, hiddenOnly: enabled }));
  }, []);

  const setPrototypeFilter = useCallback((filter: PrototypeFilter) => {
    setFilters((prev) => ({ ...prev, prototypeFilter: filter }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  const activeFilters = useMemo(() => hasActiveFilters(filters), [filters]);

  const filterGames = useCallback(
    (games: Game[], currentUser: string) => {
      return applyAllFilters(games, filters, currentUser);
    },
    [filters]
  );

  return {
    filters,
    setNameQuery,
    setPlayerQuery,
    setBringerQuery,
    setWunschOnly,
    setMyGamesOnly,
    setHiddenOnly,
    setPrototypeFilter,
    resetFilters,
    hasActiveFilters: activeFilters,
    filterGames,
  };
}
