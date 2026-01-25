/**
 * UnifiedDropdown component
 * Dual-section dropdown showing "Schon eingetragen" and "Von BGG" sections
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 6.1, 6.2, 9.1, 9.3
 */

import type { BggSearchResult } from '../types';
import type { GameWithBringerInfo } from '../utils';
import { BggRatingBadge } from './BggRatingBadge';
import { LazyBggImage } from './LazyBggImage';

/** Maximum items to show in In-Liste section */
export const IN_LISTE_MAX_ITEMS = 3;

/** Initial items to show in BGG section */
export const BGG_INITIAL_ITEMS = 3;

/** Items to add when expanding BGG section */
export const BGG_EXPAND_INCREMENT = 5;

export interface UnifiedDropdownProps {
  /** Current search query */
  query: string;
  /** Whether dropdown is open */
  isOpen: boolean;
  /** Games from user's list that match the query */
  matchingGames: GameWithBringerInfo[];
  /** Total count of matching games (for display) */
  totalMatchingGames: number;
  /** BGG search results */
  bggResults: BggSearchResult[];
  /** Whether BGG search is loading */
  isBggLoading: boolean;
  /** Whether there are more BGG results available */
  hasMoreBggResults: boolean;
  /** Number of BGG items currently shown */
  visibleBggCount: number;
  /** Currently selected index for keyboard navigation (-1 = none) */
  selectedIndex: number;
  /** Set of bggIds that already exist in the list */
  existingBggIds: Set<number>;
  /** Callback when in-list game is clicked */
  onInListeClick: (gameId: string) => void;
  /** Callback when BGG item is clicked */
  onBggClick: (result: BggSearchResult) => void;
  /** Callback when "show more" is clicked */
  onShowMore: () => void;
}

/** Helper to check if there are no results for a given query */
export function hasNoResults(
  query: string,
  matchingGames: GameWithBringerInfo[],
  bggResults: BggSearchResult[],
  existingBggIds: Set<number>,
  isBggLoading: boolean
): boolean {
  if (!query.trim()) return false;
  const filteredBggResults = bggResults.filter(r => !existingBggIds.has(r.id));
  const hasInListeResults = matchingGames.length > 0;
  const hasBggResults = filteredBggResults.length > 0 || isBggLoading;
  return !hasInListeResults && !hasBggResults;
}

export function UnifiedDropdown({
  query,
  isOpen,
  matchingGames,
  totalMatchingGames,
  bggResults,
  isBggLoading,
  hasMoreBggResults,
  visibleBggCount,
  selectedIndex,
  existingBggIds,
  onInListeClick,
  onBggClick,
  onShowMore,
}: UnifiedDropdownProps) {
  if (!isOpen || !query.trim()) {
    return null;
  }

  // Filter out BGG results that already exist in the list
  const filteredBggResults = bggResults.filter(
    (result) => !existingBggIds.has(result.id)
  );
  const visibleBggResults = filteredBggResults.slice(0, visibleBggCount);
  const remainingBggCount = filteredBggResults.length - visibleBggCount;
  const showMoreLink = remainingBggCount > 0 || hasMoreBggResults;

  const hasInListeResults = matchingGames.length > 0;
  const hasBggResults = visibleBggResults.length > 0 || isBggLoading;
  const hasAnyResults = hasInListeResults || hasBggResults;

  // Calculate selection indices
  const inListeCount = matchingGames.length;

  const dropdownContent = (
    <div
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
      role="listbox"
    >
      {/* Schon eingetragen section */}
      {hasInListeResults && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            📋 Schon eingetragen
          </div>
          <ul>
            {matchingGames.map((game, index) => {
              const isSelected = selectedIndex === index;
              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => onInListeClick(game.id)}
                    className={`w-full px-3 py-3 text-left flex items-center gap-3 min-h-[44px] transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* Requirement 6.1: Display micro thumbnail as leading element */}
                    {game.bggId && (
                      <LazyBggImage
                        bggId={game.bggId}
                        size="micro"
                        displaySize="small"
                        alt={game.name}
                        className="flex-shrink-0 rounded"
                        enableZoom={false}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 truncate block">
                        ✓ {game.name}
                      </span>
                      {/* Feature: 014-alternate-names-search - Show matched alternate name */}
                      {game.matchedAlternateName && (
                        <div className="text-xs text-gray-500 truncate">
                          Auch bekannt als: {game.matchedAlternateName}
                        </div>
                      )}
                    </div>
                    {game.bringerNames.length > 0 ? (
                      <span className="text-sm text-green-700 flex-shrink-0 flex items-center gap-1">
                        <img src="/package.svg" alt="" className="w-4 h-4" /> {game.bringerNames.length === 1 
                          ? game.bringerNames[0] 
                          : `${game.bringerNames[0]} +${game.bringerNames.length - 1}`}
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 flex-shrink-0 flex items-center gap-1">
                        <img src="/package.svg" alt="" className="w-4 h-4" /> Keiner
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {totalMatchingGames > IN_LISTE_MAX_ITEMS && (
            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
              + {totalMatchingGames - IN_LISTE_MAX_ITEMS} weitere in der Liste
            </div>
          )}
        </div>
      )}

      {/* Von BGG section */}
      {(hasBggResults || isBggLoading) && (
        <div>
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            🌐 Von BGG
          </div>
          {isBggLoading && visibleBggResults.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
              <LoadingSpinner />
              Suche...
            </div>
          ) : (
            <ul>
              {visibleBggResults.map((result, index) => {
                const globalIndex = inListeCount + index;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => onBggClick(result)}
                      className={`w-full px-3 py-3 text-left flex items-center gap-3 min-h-[44px] transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-900'
                          : 'hover:bg-gray-100'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* Requirement 6.1: Display micro thumbnail as leading element */}
                      <LazyBggImage
                        bggId={result.id}
                        size="micro"
                        displaySize="small"
                        alt={result.name}
                        className="flex-shrink-0 rounded"
                        enableZoom={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 truncate">
                            {result.name}
                          </span>
                          {result.yearPublished && (
                            <span className="text-gray-500 flex-shrink-0">
                              ({result.yearPublished})
                            </span>
                          )}
                        </div>
                        {/* Feature: 014-alternate-names-search - Show matched alternate name */}
                        {result.matchedAlternateName && (
                          <div className="text-xs text-gray-500 truncate">
                            Auch bekannt als: {result.matchedAlternateName}
                          </div>
                        )}
                      </div>
                      {result.rating && (
                        <BggRatingBadge rating={result.rating} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Show more link */}
          {showMoreLink && !isBggLoading && (
            <button
              type="button"
              onClick={onShowMore}
              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {remainingBggCount > 0 ? (
                <>+ {remainingBggCount} weitere Treffer anzeigen...</>
              ) : hasMoreBggResults ? (
                <>+ weitere Treffer anzeigen...</>
              ) : visibleBggCount > BGG_INITIAL_ITEMS ? (
                <>Suchbegriff verfeinern für bessere Ergebnisse</>
              ) : null}
            </button>
          )}
        </div>
      )}

      {/* No results - return null, parent will show inline message */}
    </div>
  );

  // If no results at all, don't render the dropdown box
  if (!hasAnyResults && !isBggLoading) {
    return null;
  }

  return dropdownContent;
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-gray-400"
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

export default UnifiedDropdown;
