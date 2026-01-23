/**
 * GameRow component
 * Single row displaying one game in the table
 * Shows game name with status badge, owner, players, bringers, and action buttons
 * All UI text in German (Requirement 9.1)
 */

import { useRef, useEffect } from 'react';
import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';

interface GameRowProps {
  game: Game;
  currentUserId: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  scrollIntoView?: boolean;
  onScrolledIntoView?: () => void;
}

export function GameRow({
  game,
  currentUserId,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  onDeleteGame,
  scrollIntoView,
  onScrolledIntoView,
}: GameRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isWunsch = game.status === 'wunsch';
  const isOwner = game.owner?.id === currentUserId;
  const canDelete = isOwner && game.players.length === 0 && game.bringers.length === 0;

  useEffect(() => {
    if (scrollIntoView && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onScrolledIntoView?.();
    }
  }, [scrollIntoView, onScrolledIntoView]);

  return (
    <tr
      ref={rowRef}
      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isWunsch ? 'bg-yellow-50 hover:bg-yellow-100' : ''
      } ${scrollIntoView ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
    >
      {/* Game Name with Status Badge and Owner */}
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
          
          {/* Owner display - Requirement 2.3, 2.4 */}
          <span className="text-xs text-gray-500">
            Erstellt von: {game.owner?.name ?? 'Kein Besitzer'}
          </span>
          
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
        <PlayerList players={game.players} currentUserId={currentUserId} />
      </td>

      {/* Bringers (Bringt mit) - Requirement 3.9, 4.6 */}
      <td className="px-4 py-3">
        <BringerList bringers={game.bringers} currentUserId={currentUserId} />
      </td>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5 */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <GameActions
            game={game}
            currentUserId={currentUserId}
            onAddPlayer={onAddPlayer}
            onAddBringer={onAddBringer}
            onRemovePlayer={onRemovePlayer}
            onRemoveBringer={onRemoveBringer}
          />
          
          {/* Delete button - only for owner, only when game is empty */}
          {isOwner && (
            <button
              onClick={() => onDeleteGame?.(game.id)}
              disabled={!canDelete}
              title={
                canDelete
                  ? 'Spiel löschen'
                  : 'Entferne zuerst alle Mitspieler und Bringer'
              }
              className={`text-xs px-2 py-1 rounded transition-colors ${
                canDelete
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              🗑️ Löschen
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default GameRow;
