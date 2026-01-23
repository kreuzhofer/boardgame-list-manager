/**
 * AdvancedFilters component
 * Collapsible section for player and bringer search filters
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7
 */

import { useState } from 'react';

export interface AdvancedFiltersProps {
  /** Callback when player search changes */
  onPlayerSearch: (query: string) => void;
  /** Callback when bringer search changes */
  onBringerSearch: (query: string) => void;
  /** Initial values */
  initialValues?: {
    playerQuery?: string;
    bringerQuery?: string;
  };
}

export function AdvancedFilters({
  onPlayerSearch,
  onBringerSearch,
  initialValues = {},
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playerQuery, setPlayerQuery] = useState(initialValues.playerQuery ?? '');
  const [bringerQuery, setBringerQuery] = useState(initialValues.bringerQuery ?? '');

  // Count active filters for badge
  const activeFilterCount = [playerQuery, bringerQuery].filter(Boolean).length;

  const handlePlayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPlayerQuery(value);
    onPlayerSearch(value);
  };

  const handleBringerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBringerQuery(value);
    onBringerSearch(value);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
        aria-expanded={isExpanded}
        aria-controls="advanced-filters-content"
      >
        <span className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          Erweiterte Filter
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </span>
        <ChevronIcon
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div
          id="advanced-filters-content"
          className="px-4 pb-4 pt-2 border-t border-gray-200"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player search */}
            <div>
              <label
                htmlFor="advanced-player-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mitspieler suchen
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="advanced-player-search"
                  value={playerQuery}
                  onChange={handlePlayerChange}
                  placeholder="Mitspieler eingeben..."
                  className="w-full px-3 py-2.5 pl-9 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                  aria-label="Mitspieler suchen"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Bringer search */}
            <div>
              <label
                htmlFor="advanced-bringer-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Bringt mit suchen
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="advanced-bringer-search"
                  value={bringerQuery}
                  onChange={handleBringerChange}
                  placeholder="Name eingeben..."
                  className="w-full px-3 py-2.5 pl-9 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                  aria-label="Bringt mit suchen"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

export default AdvancedFilters;
