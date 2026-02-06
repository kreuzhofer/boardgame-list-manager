/**
 * BringerList component
 * Displays a list of bringer names with current participant highlighting
 * All UI text in German (Requirement 9.1)
 */

import { Bringer } from '../types';

interface BringerListProps {
  bringers: Bringer[];
  currentParticipantId: string;
  /** Maximum number of bringers to show before using +X overflow */
  maxVisible?: number;
  /** Whether the list is expanded (shows all) */
  expanded?: boolean;
  /** Callback when overflow link is clicked */
  onToggleExpand?: () => void;
  /** Display mode: 'inline' (comma-separated) or 'stacked' (one per line) */
  displayMode?: 'inline' | 'stacked';
}

export function BringerList({ 
  bringers, 
  currentParticipantId,
  maxVisible,
  expanded = false,
  onToggleExpand,
  displayMode = 'inline'
}: BringerListProps) {
  if (bringers.length === 0) {
    return (
      <span className="text-gray-400 italic text-sm">
        Niemand
      </span>
    );
  }

  // Apply maxVisible limit if specified and not expanded
  const hasOverflow = maxVisible !== undefined && bringers.length > maxVisible && !expanded;
  // If overflow, show maxVisible - 1 to make room for the "+X weitere" line
  const visibleCount = hasOverflow ? maxVisible - 1 : bringers.length;
  const visibleBringers = bringers.slice(0, visibleCount);
  const overflowCount = bringers.length - visibleCount;

  if (displayMode === 'stacked') {
    return (
      <div className="text-sm">
        {visibleBringers.map((bringer) => (
          <div key={bringer.id} className="truncate">
            <span
              className={
                bringer.participant.id === currentParticipantId
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }
              title={bringer.participant.id === currentParticipantId ? 'Das bist du!' : undefined}
            >
              {bringer.participant.name}
            </span>
          </div>
        ))}
        {hasOverflow && (
          <button 
            onClick={onToggleExpand}
            className="text-blue-500 text-xs hover:text-blue-700 hover:underline"
          >
            +{overflowCount} weitere
          </button>
        )}
      </div>
    );
  }

  // Inline mode (original)
  return (
    <span className="text-sm">
      {visibleBringers.map((bringer, index) => (
        <span key={bringer.id}>
          <span
            className={
              bringer.participant.id === currentParticipantId
                ? 'font-semibold text-blue-600'
                : 'text-gray-700'
            }
            title={bringer.participant.id === currentParticipantId ? 'Das bist du!' : undefined}
          >
            {bringer.participant.name}
          </span>
          {index < visibleBringers.length - 1 && (
            <span className="text-gray-400">, </span>
          )}
        </span>
      ))}
      {hasOverflow && (
        <button 
          onClick={onToggleExpand}
          className="text-blue-500 text-xs ml-1 hover:text-blue-700 hover:underline"
        >
          +{overflowCount}
        </button>
      )}
    </span>
  );
}

export default BringerList;
