/**
 * UnifiedSearchBar component
 * Single search input that combines game list filtering with BGG search and game addition
 * Requirements: 1.1, 1.3, 1.4, 1.5, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 10.1, 10.2, 10.3, 10.4
 */

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { gamesApi, ApiError } from '../api/client';
import { useBggSearch } from '../hooks';
import {
  UnifiedDropdown,
  IN_LISTE_MAX_ITEMS,
  BGG_INITIAL_ITEMS,
  BGG_EXPAND_INCREMENT,
  hasNoResults,
} from './UnifiedDropdown';
import {
  checkDuplicate,
  getExistingBggIds,
  getMatchingGamesWithBringers,
  countMatchingGames,
} from '../utils';
import type { Game, BggSearchResult } from '../types';

export interface UnifiedSearchBarProps {
  /** All games in the list for filtering and duplicate detection */
  games: Game[];
  /** Current user's ID for game creation */
  currentUserId: string;
  /** Callback when a game is successfully added */
  onGameAdded: (game: Game) => void;
  /** Callback when search query changes (for list filtering/highlighting) */
  onSearchQueryChange: (query: string) => void;
  /** Callback when user clicks an in-list game (for scrolling) */
  onScrollToGame: (gameId: string) => void;
  /** When this value changes, clear the search input and selection */
  clearTrigger?: number;
}

/**
 * Determines the add button state based on current input and selection
 */
export type AddButtonState = 'hidden' | 'enabled' | 'disabled';

export interface AddButtonStateResult {
  state: AddButtonState;
  message?: string;
}

export function getAddButtonState(
  query: string,
  selectedBggItem: BggSearchResult | null,
  isDuplicate: boolean
): AddButtonStateResult {
  // Empty query = hidden
  if (!query.trim()) {
    return { state: 'hidden' };
  }

  // BGG item selected
  if (selectedBggItem) {
    if (isDuplicate) {
      return {
        state: 'disabled',
        message: 'Spiel bereits in der Liste',
      };
    }
    return { state: 'enabled' };
  }

  // Custom name typed - hide if it matches existing game
  if (isDuplicate) {
    return { state: 'hidden' };
  }

  return { state: 'enabled' };
}

export function UnifiedSearchBar({
  games,
  currentUserId,
  onGameAdded,
  onSearchQueryChange,
  onScrollToGame,
  clearTrigger,
}: UnifiedSearchBarProps) {
  // Input state
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [visibleBggCount, setVisibleBggCount] = useState(BGG_INITIAL_ITEMS);

  // Selected BGG item state
  const [selectedBggItem, setSelectedBggItem] = useState<BggSearchResult | null>(null);

  // Toggle states for adding
  const [isBringing, setIsBringing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPrototype, setIsPrototype] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const lastClearTrigger = useRef(clearTrigger);

  // Clear search when clearTrigger changes
  useEffect(() => {
    if (clearTrigger !== undefined && clearTrigger !== lastClearTrigger.current) {
      lastClearTrigger.current = clearTrigger;
      setQuery('');
      setSelectedBggItem(null);
      setIsDropdownOpen(false);
      setIsBringing(false);
      setIsPlaying(false);
      setIsPrototype(false);
      setError(null);
      onSearchQueryChange('');
    }
  }, [clearTrigger, onSearchQueryChange]);

  // BGG search with debounce
  const { results: bggResults, isLoading: isBggLoading, hasMore: hasMoreBgg } = useBggSearch(query, 300);

  // Computed values
  const existingBggIds = getExistingBggIds(games);
  const matchingGames = getMatchingGamesWithBringers(games, query, IN_LISTE_MAX_ITEMS);
  const totalMatchingGames = countMatchingGames(games, query);

  // Duplicate check
  const duplicateCheck = checkDuplicate(
    selectedBggItem?.id ?? null,
    query,
    games
  );

  // Add button state
  const addButtonState = getAddButtonState(query, selectedBggItem, duplicateCheck.isDuplicate);

  // Filter BGG results to exclude existing games
  const filteredBggResults = bggResults.filter((r) => !existingBggIds.has(r.id));
  const visibleBggResults = filteredBggResults.slice(0, visibleBggCount);

  // Total navigable items for keyboard navigation
  const totalNavigableItems = matchingGames.length + visibleBggResults.length;

  // Check if there are no results to show inline message
  const showNoResultsMessage = hasNoResults(
    query,
    matchingGames,
    bggResults,
    existingBggIds,
    isBggLoading
  );

  // Open dropdown when typing
  useEffect(() => {
    if (justSelectedRef.current) {
      return;
    }
    if (query.length >= 1) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [query]);

  // Reset visible BGG count when query changes
  useEffect(() => {
    setVisibleBggCount(BGG_INITIAL_ITEMS);
  }, [query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [matchingGames.length, visibleBggResults.length]);

  // Notify parent of query changes for highlighting
  useEffect(() => {
    onSearchQueryChange(query);
  }, [query, onSearchQueryChange]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    justSelectedRef.current = false;

    // Clear BGG selection when user types
    if (selectedBggItem) {
      setSelectedBggItem(null);
    }

    // Clear error
    if (error) {
      setError(null);
    }
  }, [selectedBggItem, error]);

  const handleInListeClick = useCallback((gameId: string) => {
    setIsDropdownOpen(false);
    // Don't clear query here - parent will clear via clearTrigger after setting scroll target
    // This ensures the list is unfiltered before scrolling
    onScrollToGame(gameId);
  }, [onScrollToGame]);

  const handleBggClick = useCallback((result: BggSearchResult) => {
    justSelectedRef.current = true;
    setQuery(result.name);
    setSelectedBggItem(result);
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    setIsPrototype(false);
  }, []);

  // Clear the BGG selection and return to search mode
  const handleClearSelection = useCallback(() => {
    setSelectedBggItem(null);
    setQuery('');
    justSelectedRef.current = false;
    // Focus the input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleBggCount((prev) => prev + BGG_EXPAND_INCREMENT);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always prevent Enter from submitting the form - user must click the button
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only allow Enter to select a dropdown item if one is highlighted
      if (isDropdownOpen && selectedIndex >= 0) {
        if (selectedIndex < matchingGames.length) {
          // In-Liste item
          handleInListeClick(matchingGames[selectedIndex].id);
        } else {
          // BGG item
          const bggIndex = selectedIndex - matchingGames.length;
          if (bggIndex < visibleBggResults.length) {
            handleBggClick(visibleBggResults[bggIndex]);
          }
        }
      }
      return;
    }

    if (!isDropdownOpen || totalNavigableItems === 0) {
      return;
    }

    const maxIndex = totalNavigableItems - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isDropdownOpen, totalNavigableItems, selectedIndex, matchingGames, visibleBggResults, handleInListeClick, handleBggClick]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Bitte einen Spielnamen eingeben.');
      return;
    }

    if (addButtonState.state !== 'enabled') {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setIsDropdownOpen(false);

    try {
      const response = await gamesApi.create(
        trimmedQuery,
        currentUserId,
        isBringing,
        isPlaying,
        !selectedBggItem && isPrototype,
        selectedBggItem?.id,
        selectedBggItem?.yearPublished ?? undefined,
        selectedBggItem?.rating ?? undefined,
        selectedBggItem?.matchedAlternateName ?? undefined,
        selectedBggItem?.alternateNames ?? undefined
      );

      // Reset form
      setQuery('');
      setSelectedBggItem(null);
      setIsBringing(false);
      setIsPlaying(false);
      setIsPrototype(false);
      inputRef.current?.focus();

      onGameAdded(response.game);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Netzwerkfehler. Bitte Verbindung prüfen.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [query, addButtonState.state, currentUserId, isBringing, isPlaying, isPrototype, selectedBggItem, onGameAdded]);

  const toggleButtonBase = 'px-3 py-2 text-sm font-medium rounded-lg transition-all min-h-[44px] min-w-[7.5rem]';
  const isPrototypeDisabled = Boolean(selectedBggItem);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {/* Search input with dropdown */}
          <div ref={containerRef} className="relative max-w-xl">
            <label
              htmlFor="unified-search-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Spiel suchen oder hinzufügen
            </label>
            
            {/* Show either the selected game tag OR the search input */}
            {selectedBggItem ? (
              /* Selected BGG game tag/chip */
              <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg min-h-[44px]">
                <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                  BGG
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-900 font-medium truncate block">
                    {selectedBggItem.name}
                    {selectedBggItem.yearPublished && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({selectedBggItem.yearPublished})
                      </span>
                    )}
                  </span>
                  {/* Feature: 014-alternate-names-search - Show matched alternate name */}
                  {selectedBggItem.matchedAlternateName && (
                    <span className="text-xs text-gray-500 truncate block">
                      Auch bekannt als: {selectedBggItem.matchedAlternateName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={isSubmitting}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
                  aria-label="Auswahl aufheben"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <input
                  ref={inputRef}
                  id="unified-search-input"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (!justSelectedRef.current && query.length >= 1) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  placeholder="Spiel suchen oder hinzufügen..."
                  disabled={isSubmitting}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  className={`w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] ${
                    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  aria-describedby={error ? 'unified-search-error' : undefined}
                  aria-invalid={error ? 'true' : 'false'}
                />
                {/* Search icon */}
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            )}

            {/* Dropdown */}
            <UnifiedDropdown
              query={query}
              isOpen={isDropdownOpen}
              matchingGames={matchingGames}
              totalMatchingGames={totalMatchingGames}
              bggResults={bggResults}
              isBggLoading={isBggLoading}
              hasMoreBggResults={hasMoreBgg}
              visibleBggCount={visibleBggCount}
              selectedIndex={selectedIndex}
              existingBggIds={existingBggIds}
              onInListeClick={handleInListeClick}
              onBggClick={handleBggClick}
              onShowMore={handleShowMore}
            />

            {/* Inline no results message */}
            {showNoResultsMessage && isDropdownOpen && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500">
                Keine Treffer
              </span>
            )}
          </div>

          {/* Toggle buttons and add button row */}
          {addButtonState.state !== 'hidden' && (
            <div className="flex flex-wrap gap-2 items-center">
              {/* Mitbringen toggle */}
              <button
                type="button"
                onClick={() => setIsBringing(!isBringing)}
                disabled={isSubmitting}
                className={`${toggleButtonBase} ${
                  isBringing
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img src="/package.svg" alt="" className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Mitbringen<span className="inline-block w-3 text-left">{isBringing ? ' ✓' : ''}</span>
              </button>

              {/* Mitspielen toggle */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isSubmitting}
                className={`${toggleButtonBase} ${
                  isPlaying
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img src="/meeple.svg" alt="" className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Mitspielen<span className="inline-block w-3 text-left">{isPlaying ? ' ✓' : ''}</span>
              </button>

              {/* Prototyp toggle (manual entries only) */}
              <button
                type="button"
                onClick={() => setIsPrototype(!isPrototype)}
                disabled={isSubmitting || isPrototypeDisabled}
                className={`${toggleButtonBase} ${
                  isPrototype
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isPrototypeDisabled ? 'Nur für manuelle Einträge verfügbar' : 'Prototyp markieren'}
                aria-pressed={isPrototype}
              >
                Prototyp<span className="inline-block w-3 text-left">{isPrototype ? ' ✓' : ''}</span>
              </button>

              {/* Add button */}
              <button
                type="submit"
                disabled={isSubmitting || addButtonState.state === 'disabled'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    Wird hinzugefügt...
                  </>
                ) : (
                  '+ Hinzufügen'
                )}
              </button>

              {/* Duplicate message */}
              {addButtonState.message && (
                <span className="text-sm text-amber-600 ml-2">
                  {addButtonState.message}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id="unified-search-error"
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default UnifiedSearchBar;
