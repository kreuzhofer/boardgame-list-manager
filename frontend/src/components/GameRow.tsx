/**
 * GameRow component
 * Single row displaying one game in the table
 * Shows game name with status badge, players, bringers, and action buttons
 * All UI text in German (Requirement 9.1)
 */

import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';

interface GameRowProps {
  game: Game;
  currentUser: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
}

export function GameRow({
  game,
  currentUser,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
}: GameRowProps) {
  const isWunsch = game.status === 'wunsch';

  return (
    <tr
      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isWunsch ? 'bg-yellow-50 hover:bg-yellow-100' : ''
      }`}
    >
      {/* Game Name with Status Badge */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{game.name}</span>
            
            {/* Status Badge - Requirement 4.1, 4.2 */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isWunsch
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-200 text-green-800'
              }`}
            >
              {isWunsch ? 'Wunsch' : 'Verfügbar'}
            </span>
          </div>
          
          {/* "Wird gesucht!" badge for Wunsch games - Requirement 4.3 */}
          {isWunsch && (
            <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded inline-block w-fit font-medium">
              🔍 Wird gesucht!
            </span>
          )}
        </div>
      </td>

      {/* Players (Mitspieler) - Requirement 3.9 */}
      <td className="px-4 py-3">
        <PlayerList players={game.players} currentUser={currentUser} />
      </td>

      {/* Bringers (Bringt mit) - Requirement 3.9, 4.6 */}
      <td className="px-4 py-3">
        <BringerList bringers={game.bringers} currentUser={currentUser} />
      </td>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5 */}
      <td className="px-4 py-3">
        <GameActions
          game={game}
          currentUser={currentUser}
          onAddPlayer={onAddPlayer}
          onAddBringer={onAddBringer}
          onRemovePlayer={onRemovePlayer}
          onRemoveBringer={onRemoveBringer}
        />
      </td>
    </tr>
  );
}

export default GameRow;
