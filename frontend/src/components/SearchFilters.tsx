/**
 * SearchFilters component
 * 
 * Provides search boxes for filtering games by name, player, and bringer,
 * plus toggle filters for "Gesuchte Spiele" (Wunsch) and "Meine Spiele".
 * 
 * All UI text in German (Requirement 9.1)
 * Requirement 6.1, 6.4: Responsive design with touch-friendly interactions
 * 
 * Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { useState } from 'react';

export interface SearchFiltersProps {
  /** Callback when name search query changes (Requirement 5.4) */
  onNameSearch: (query: string) => void;
  /** Callback when player search query changes (Requirement 5.5) */
  onPlayerSearch: (query: string) => void;
  /** Callback when bringer search query changes (Requirement 5.6) */
  onBringerSearch: (query: string) => void;
  /** Callback when Wunsch filter toggle changes (Requirement 5.8) */
  onWunschFilter: (enabled: boolean) => void;
  /** Callback when My Games filter toggle changes (Requirement 5.9) */
  onMyGamesFilter: (enabled: boolean) => void;
  /** Initial values for the filters (optional) */
  initialValues?: {
    nameQuery?: string;
    playerQuery?: string;
    bringerQuery?: string;
    wunschOnly?: boolean;
    myGamesOnly?: boolean;
  };
}

/**
 * SearchFilters component for filtering the game list.
 * 
 * Features:
 * - Search box for game name (Requirement 5.4)
 * - Search box for player names (Requirement 5.5)
 * - Search box for bringer names (Requirement 5.6)
 * - "Gesuchte Spiele" toggle for Wunsch games (Requirement 5.8)
 * - "Meine Spiele" toggle for user's games (Requirement 5.9)
 * - Responsive design with collapsible advanced filters on mobile (Requirement 6.1, 6.4)
 * 
 * @example
 * ```tsx
 * <SearchFilters
 *   onNameSearch={setNameQuery}
 *   onPlayerSearch={setPlayerQuery}
 *   onBringerSearch={setBringerQuery}
 *   onWunschFilter={setWunschOnly}
 *   onMyGamesFilter={setMyGamesOnly}
 * />
 * ```
 */
export function SearchFilters({
  onNameSearch,
  onPlayerSearch,
  onBringerSearch,
  onWunschFilter,
  onMyGamesFilter,
  initialValues = {},
}: SearchFiltersProps) {
  // Local state for controlled inputs
  const [nameQuery, setNameQuery] = useState(initialValues.nameQuery ?? '');
  const [playerQuery, setPlayerQuery] = useState(initialValues.playerQuery ?? '');
  const [bringerQuery, setBringerQuery] = useState(initialValues.bringerQuery ?? '');
  const [wunschOnly, setWunschOnly] = useState(initialValues.wunschOnly ?? false);
  const [myGamesOnly, setMyGamesOnly] = useState(initialValues.myGamesOnly ?? false);
  
  // Mobile: collapsible advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Handle name search input change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNameQuery(value);
    onNameSearch(value);
  };

  // Handle player search input change
  const handlePlayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPlayerQuery(value);
    onPlayerSearch(value);
  };

  // Handle bringer search input change
  const handleBringerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBringerQuery(value);
    onBringerSearch(value);
  };

  // Handle Wunsch filter toggle
  const handleWunschToggle = () => {
    const newValue = !wunschOnly;
    setWunschOnly(newValue);
    onWunschFilter(newValue);
  };

  // Handle My Games filter toggle
  const handleMyGamesToggle = () => {
    const newValue = !myGamesOnly;
    setMyGamesOnly(newValue);
    onMyGamesFilter(newValue);
  };

  // Count active advanced filters for badge
  const activeAdvancedFilters = [
    playerQuery,
    bringerQuery,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* Main search and filter toggles - always visible */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Name search box (Requirement 5.4) - always visible */}
        <div className="flex-1">
          <label
            htmlFor="search-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Spielname suchen
          </label>
          <div className="relative">
            <input
              type="text"
              id="search-name"
              value={nameQuery}
              onChange={handleNameChange}
              placeholder="Spielname eingeben..."
              className="w-full px-3 py-2.5 pl-9 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
              aria-label="Spielname suchen"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Filter toggles - always visible */}
        <div className="flex items-end gap-2 flex-wrap">
          {/* Gesuchte Spiele toggle (Requirement 5.8) */}
          <button
            type="button"
            onClick={handleWunschToggle}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              wunschOnly
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={wunschOnly}
            aria-label="Nur gesuchte Spiele anzeigen"
          >
            <WunschIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Gesuchte Spiele</span>
            <span className="sm:hidden">Gesucht</span>
            {wunschOnly && <CheckIcon className="w-4 h-4" />}
          </button>

          {/* Meine Spiele toggle (Requirement 5.9) */}
          <button
            type="button"
            onClick={handleMyGamesToggle}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              myGamesOnly
                ? 'bg-blue-100 text-blue-800 border-2 border-blue-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={myGamesOnly}
            aria-label="Nur meine Spiele anzeigen"
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Meine Spiele</span>
            <span className="sm:hidden">Meine</span>
            {myGamesOnly && <CheckIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile: Toggle for advanced filters */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
          aria-expanded={showAdvancedFilters}
        >
          <span className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4" />
            Erweiterte Filter
            {activeAdvancedFilters > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeAdvancedFilters}
              </span>
            )}
          </span>
          <ChevronIcon className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced search boxes - always visible on desktop, collapsible on mobile */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200 ${
        showAdvancedFilters ? 'block' : 'hidden lg:grid'
      }`}>
        {/* Player search box (Requirement 5.5) */}
        <div>
          <label
            htmlFor="search-player"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Mitspieler suchen
          </label>
          <div className="relative">
            <input
              type="text"
              id="search-player"
              value={playerQuery}
              onChange={handlePlayerChange}
              placeholder="Mitspieler eingeben..."
              className="w-full px-3 py-2.5 pl-9 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
              aria-label="Mitspieler suchen"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Bringer search box (Requirement 5.6) */}
        <div>
          <label
            htmlFor="search-bringer"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Bringt mit suchen
          </label>
          <div className="relative">
            <input
              type="text"
              id="search-bringer"
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
  );
}

// Icon components
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

function WunschIcon({ className }: { className?: string }) {
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
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
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

export default SearchFilters;
