/**
 * AutocompleteDropdown component
 * Displays BGG search results in a dropdown below the input field
 * Shows 5 visible items with scroll support for up to 30 results
 * 
 * Requirements: 3.1, 3.3, 3.7, 3.8, 6.1, 6.2, 8.1, 9.1
 */

import type { BggSearchResult } from '../types';
import { LazyBggImage } from './LazyBggImage';

interface AutocompleteDropdownProps {
  /** Search results to display */
  results: BggSearchResult[];
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Whether search is in progress */
  isLoading: boolean;
  /** Currently selected index for keyboard navigation */
  selectedIndex: number;
  /** Whether there are more results than displayed */
  hasMore?: boolean;
  /** Callback when a result is selected */
  onSelect: (result: BggSearchResult) => void;
  /** Callback when dropdown should close */
  onClose: () => void;
}

// Height for approximately 5 visible items (each item ~80px with thumbnail)
const VISIBLE_HEIGHT = 400;

/**
 * Dropdown component showing BGG search results
 * Supports keyboard navigation and mouse selection
 * Shows 5 visible items with scroll for more
 */
export function AutocompleteDropdown({
  results,
  isOpen,
  isLoading,
  selectedIndex,
  hasMore = false,
  onSelect,
}: AutocompleteDropdownProps) {
  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
      role="listbox"
      aria-label="Spielvorschläge"
    >
      <div 
        className="overflow-y-auto"
        style={{ maxHeight: `${VISIBLE_HEIGHT}px` }}
      >
        {isLoading && (
          <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
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
            Suche...
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">
            Keine Treffer gefunden
          </div>
        )}

        {!isLoading && results.map((result, index) => (
          <button
            key={result.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0 ${
              index === selectedIndex ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelect(result)}
            onMouseDown={(e) => {
              // Prevent input blur before click is processed
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-3">
              {/* Requirement 6.1: Display micro thumbnail as leading element */}
              <LazyBggImage
                bggId={result.id}
                size="micro"
                alt={result.name}
                className="flex-shrink-0 rounded"
                enableZoom={false}
              />
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="font-medium text-gray-900 truncate">
                  {result.name}
                </span>
                {result.yearPublished && (
                  <span className="ml-2 text-sm text-gray-500 flex-shrink-0">
                    ({result.yearPublished})
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* Show message if there are more results */}
        {!isLoading && hasMore && (
          <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50 border-t border-gray-200 text-center">
            Weitere Treffer vorhanden. Bitte genauer suchen.
          </div>
        )}
      </div>
    </div>
  );
}

export default AutocompleteDropdown;
