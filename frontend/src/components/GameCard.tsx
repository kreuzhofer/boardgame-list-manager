/**
 * GameCard component
 * Mobile-optimized card layout for displaying a single game
 * All UI text in German (Requirement 9.1)
 * Requirement 6.3: Mobile-optimized card/list layout for game list
 * Requirement 6.4: Touch-friendly interactions on mobile
 */

import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';

interface GameCardProps {
  game: Game;
  currentUserId: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
}

export function GameCard({
  game,
  currentUserId,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
}: GameCardProps) {
  const isWunsch = game.status === 'wunsch';

  return (
    <div
      className={`p-4 ${
        isWunsch ? 'bg-yellow-50' : 'bg-white'
      }`}
    >
      {/* Game Name with Status Badge */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">
            {game.name}
          </h3>
          
          {/* Status Badge - Requirement 4.1, 4.2 */}
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
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
          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block w-fit font-medium">
            🔍 Wird gesucht!
          </span>
        )}
      </div>

      {/* Players and Bringers sections */}
      <div className="space-y-3 mb-4">
        {/* Players (Mitspieler) - Requirement 3.9 */}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Mitspieler
          </span>
          <div className="text-sm">
            <PlayerList players={game.players} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Bringers (Bringt mit) - Requirement 3.9, 4.6 */}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Bringt mit
          </span>
          <div className="text-sm">
            <BringerList bringers={game.bringers} currentUserId={currentUserId} />
          </div>
        </div>
      </div>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5, 6.4 (touch-friendly) */}
      <div className="pt-3 border-t border-gray-200">
        <GameActions
          game={game}
          currentUserId={currentUserId}
          onAddPlayer={onAddPlayer}
          onAddBringer={onAddBringer}
          onRemovePlayer={onRemovePlayer}
          onRemoveBringer={onRemoveBringer}
          isMobile={true}
        />
      </div>
    </div>
  );
}

export default GameCard;
