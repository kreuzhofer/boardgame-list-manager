/**
 * BringerList component
 * Displays a list of bringer names with current user highlighting
 * Shows duplicate hint when 3+ bringers (Requirement 4.6)
 * All UI text in German (Requirement 9.1)
 */

import { Bringer } from '../types';

interface BringerListProps {
  bringers: Bringer[];
  currentUserId: string;
  showDuplicateHint?: boolean;
}

export function BringerList({ bringers, currentUserId, showDuplicateHint = true }: BringerListProps) {
  if (bringers.length === 0) {
    return (
      <span className="text-gray-400 italic text-sm">
        Niemand
      </span>
    );
  }

  const hasDuplicateBringers = bringers.length >= 3;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm">
        {bringers.map((bringer, index) => (
          <span key={bringer.id}>
            <span
              className={
                bringer.user.id === currentUserId
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }
              title={bringer.user.id === currentUserId ? 'Das bist du!' : undefined}
            >
              {bringer.user.name}
            </span>
            {index < bringers.length - 1 && (
              <span className="text-gray-400">, </span>
            )}
          </span>
        ))}
      </span>
      
      {/* Duplicate bringer hint - Requirement 4.6 */}
      {showDuplicateHint && hasDuplicateBringers && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block w-fit">
          Wird bereits von {bringers.length} Personen mitgebracht
        </span>
      )}
    </div>
  );
}

export default BringerList;
