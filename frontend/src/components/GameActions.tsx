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
import { HelpBubble } from './HelpBubble';

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

  // Base button classes - touch targets on mobile (Requirement 6.4)
  // Mobile: icon-only with 44px touch target (Apple recommended minimum)
  // Desktop: full text with icon, whitespace-nowrap prevents checkmark wrapping
  const baseButtonClasses = isMobile
    ? 'w-[44px] h-[44px] text-sm font-medium rounded-lg flex items-center justify-center active:scale-95 transition-all'
    : 'px-3 py-1.5 text-xs font-medium rounded-md min-w-[6.5rem] whitespace-nowrap transition-colors';

  // Bringer button text (desktop only)
  const bringerText = 'Mitbringen';
  // Player button text (desktop only)
  const playerText = 'Mitspielen';

  // Help text for buttons
  const bringerHelpText = isBringer 
    ? 'Mitbringen: Du bringst dieses Spiel mit. Tippe um dich auszutragen.' 
    : 'Mitbringen: Tippe um anzugeben, dass du dieses Spiel mitbringst.';
  const playerHelpText = isPlayer 
    ? 'Mitspielen: Du möchtest dieses Spiel spielen. Tippe um dich auszutragen.' 
    : 'Mitspielen: Tippe um anzugeben, dass du dieses Spiel spielen möchtest.';

  return (
    <div className={`flex ${isMobile ? 'gap-2 flex-wrap' : 'gap-2 flex-nowrap'}`}>
      {/* Player toggle button - always first */}
      <div className="relative">
        <button
          onClick={isPlayer ? handleRemovePlayer : handleAddPlayer}
          className={`${baseButtonClasses} ${
            isPlayer
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isPlayer ? 'Mich als Mitspieler austragen' : 'Als Mitspieler eintragen'}
        >
          {isMobile ? (
            <>
              <img src="/meeple.svg" alt="Mitspielen" className="w-4 h-4" />
              {isPlayer && <span className="ml-0.5 text-xs">✓</span>}
            </>
          ) : (
            <>
              <img src="/meeple.svg" alt="" className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {playerText}<span className="inline-block w-3 text-left">{isPlayer ? ' ✓' : ''}</span>
            </>
          )}
        </button>
        {isMobile && <HelpBubble text={playerHelpText} position="top-right" />}
      </div>

      {/* Bringer toggle button - always second */}
      <div className="relative">
        <button
          onClick={isBringer ? handleRemoveBringer : handleAddBringer}
          className={`${baseButtonClasses} ${
            isBringer
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isBringer ? 'Mich als Bringer austragen' : 'Dieses Spiel mitbringen'}
        >
          {isMobile ? (
            <>
              <img src="/package.svg" alt="Mitbringen" className="w-5 h-5" />
              {isBringer && <span className="ml-0.5 text-xs">✓</span>}
            </>
          ) : (
            <>
              <img src="/package.svg" alt="" className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {bringerText}<span className="inline-block w-3 text-left">{isBringer ? ' ✓' : ''}</span>
            </>
          )}
        </button>
        {isMobile && <HelpBubble text={bringerHelpText} position="top-right" />}
      </div>
    </div>
  );
}

export default GameActions;
