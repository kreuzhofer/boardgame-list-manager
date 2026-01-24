/**
 * PlayerList component
 * Displays a list of player names with current user highlighting
 * All UI text in German (Requirement 9.1)
 */

import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  currentUserId: string;
  /** Maximum number of players to show before using +X overflow */
  maxVisible?: number;
  /** Whether the list is expanded (shows all) */
  expanded?: boolean;
  /** Callback when overflow link is clicked */
  onToggleExpand?: () => void;
  /** Display mode: 'inline' (comma-separated) or 'stacked' (one per line) */
  displayMode?: 'inline' | 'stacked';
}

export function PlayerList({ 
  players, 
  currentUserId, 
  maxVisible, 
  expanded = false,
  onToggleExpand,
  displayMode = 'inline'
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <span className="text-gray-400 italic text-sm">
        Keine Mitspieler
      </span>
    );
  }

  // Apply maxVisible limit if specified and not expanded
  const hasOverflow = maxVisible !== undefined && players.length > maxVisible && !expanded;
  // If overflow, show maxVisible - 1 to make room for the "+X weitere" line
  const visibleCount = hasOverflow ? maxVisible - 1 : players.length;
  const visiblePlayers = players.slice(0, visibleCount);
  const overflowCount = players.length - visibleCount;

  if (displayMode === 'stacked') {
    return (
      <div className="text-sm">
        {visiblePlayers.map((player) => (
          <div key={player.id} className="truncate">
            <span
              className={
                player.user.id === currentUserId
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }
              title={player.user.id === currentUserId ? 'Das bist du!' : undefined}
            >
              {player.user.name}
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
      {visiblePlayers.map((player, index) => (
        <span key={player.id}>
          <span
            className={
              player.user.id === currentUserId
                ? 'font-semibold text-blue-600'
                : 'text-gray-700'
            }
            title={player.user.id === currentUserId ? 'Das bist du!' : undefined}
          >
            {player.user.name}
          </span>
          {index < visiblePlayers.length - 1 && (
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

export default PlayerList;
