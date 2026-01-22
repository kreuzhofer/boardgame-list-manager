/**
 * GameActions component
 * Action buttons for game interactions
 * - "Möchte ich spielen" button to add as player (Requirement 3.5)
 * - "Bringe ich mit" button to add as bringer (Requirement 3.6)
 * - "Wunsch erfüllen" quick action for Wunsch games (Requirement 4.4)
 * - Remove buttons for current user's entries (Requirement 4.5)
 * - Touch-friendly interactions on mobile (Requirement 6.4)
 * All UI text in German (Requirement 9.1)
 */

import { Game } from '../types';

interface GameActionsProps {
  game: Game;
  currentUserId: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  /** Enable mobile-optimized touch-friendly button sizes (Requirement 6.4) */
  isMobile?: boolean;
}

export function GameActions({
  game,
  currentUserId,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  isMobile = false,
}: GameActionsProps) {
  // Check if current user is already a player or bringer
  const isPlayer = game.players.some((p) => p.user.id === currentUserId);
  const isBringer = game.bringers.some((b) => b.user.id === currentUserId);
  const isWunsch = game.status === 'wunsch';

  const handleAddPlayer = () => {
    if (onAddPlayer) {
      onAddPlayer(game.id);
    }
  };

  const handleAddBringer = () => {
    if (onAddBringer) {
      onAddBringer(game.id);
    }
  };

  const handleRemovePlayer = () => {
    if (onRemovePlayer) {
      onRemovePlayer(game.id);
    }
  };

  const handleRemoveBringer = () => {
    if (onRemoveBringer) {
      onRemoveBringer(game.id);
    }
  };

  // Base button classes - larger touch targets on mobile (Requirement 6.4)
  // Mobile: min-h-[44px] for touch-friendly 44px minimum touch target
  const baseButtonClasses = isMobile
    ? 'px-4 py-2.5 text-sm font-medium rounded-lg min-h-[44px] active:scale-95 transition-all'
    : 'px-3 py-1.5 text-xs font-medium rounded-md transition-colors';

  return (
    <div className={`flex gap-2 flex-wrap ${isMobile ? 'gap-3' : ''}`}>
      {/* "Wunsch erfüllen" quick action for Wunsch games - Requirement 4.4 */}
      {isWunsch && !isBringer && (
        <button
          onClick={handleAddBringer}
          className={`${baseButtonClasses} bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm`}
          title="Dieses Spiel mitbringen und den Wunsch erfüllen"
        >
          ✨ Wunsch erfüllen
        </button>
      )}

      {/* "Möchte ich spielen" button - Requirement 3.5 */}
      {!isPlayer && (
        <button
          onClick={handleAddPlayer}
          className={`${baseButtonClasses} bg-blue-500 text-white hover:bg-blue-600 shadow-sm`}
          title="Als Mitspieler eintragen"
        >
          🎮 Möchte ich spielen
        </button>
      )}

      {/* "Bringe ich mit" button - Requirement 3.6 */}
      {!isBringer && !isWunsch && (
        <button
          onClick={handleAddBringer}
          className={`${baseButtonClasses} bg-green-500 text-white hover:bg-green-600 shadow-sm`}
          title="Dieses Spiel mitbringen"
        >
          📦 Bringe ich mit
        </button>
      )}

      {/* Remove player button - Requirement 4.5 */}
      {isPlayer && (
        <button
          onClick={handleRemovePlayer}
          className={`${baseButtonClasses} bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700`}
          title="Mich als Mitspieler austragen"
        >
          ❌ Nicht mehr spielen
        </button>
      )}

      {/* Remove bringer button - Requirement 4.5 */}
      {isBringer && (
        <button
          onClick={handleRemoveBringer}
          className={`${baseButtonClasses} bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700`}
          title="Mich als Bringer austragen"
        >
          ❌ Nicht mehr mitbringen
        </button>
      )}
    </div>
  );
}

export default GameActions;
