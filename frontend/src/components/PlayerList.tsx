/**
 * PlayerList component
 * Displays a list of player names with current user highlighting
 * All UI text in German (Requirement 9.1)
 */

import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  currentUserId: string;
}

export function PlayerList({ players, currentUserId }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <span className="text-gray-400 italic text-sm">
        Keine Mitspieler
      </span>
    );
  }

  return (
    <span className="text-sm">
      {players.map((player, index) => (
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
          {index < players.length - 1 && (
            <span className="text-gray-400">, </span>
          )}
        </span>
      ))}
    </span>
  );
}

export default PlayerList;
