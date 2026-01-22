/**
 * SortControls component
 * 
 * Provides UI controls for toggling sort order between ascending and descending.
 * All UI text in German (Requirement 9.1).
 * 
 * Validates: Requirements 5.2, 5.3
 */

import type { SortOrder } from '../utils';

interface SortControlsProps {
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

/**
 * Sort controls component for toggling alphabetical sort order.
 * 
 * Displays a button that shows the current sort direction and allows
 * users to toggle between ascending (A→Z) and descending (Z→A) order.
 */
export function SortControls({ sortOrder, onSortOrderChange }: SortControlsProps) {
  const handleToggle = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Sortierung:</span>
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        aria-label={sortOrder === 'asc' ? 'Sortierung: A bis Z, klicken für Z bis A' : 'Sortierung: Z bis A, klicken für A bis Z'}
      >
        <span>Name</span>
        {sortOrder === 'asc' ? (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
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
        )}
        <span className="text-xs text-gray-500">
          {sortOrder === 'asc' ? '(A→Z)' : '(Z→A)'}
        </span>
      </button>
    </div>
  );
}

export default SortControls;
