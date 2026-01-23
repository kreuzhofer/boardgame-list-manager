/**
 * GameCard component
 * Mobile-optimized card layout for displaying a single game
 * All UI text in German (Requirement 9.1)
 * Requirement 6.3: Mobile-optimized card/list layout for game list
 * Requirement 6.4: Touch-friendly interactions on mobile
 */

import { useRef, useEffect } from 'react';
import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';
import { NeuheitSticker } from './NeuheitSticker';
import { openBggPage } from './BggModal';
import { BggRatingBadge } from './BggRatingBadge';

interface GameCardProps {
  game: Game;
  currentUserId: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  scrollIntoView?: boolean;
  onScrolledIntoView?: () => void;
  /** Whether this game should be highlighted (matches search) - Requirement 7.1, 7.2 */
  isHighlighted?: boolean;
}

export function GameCard({
  game,
  currentUserId,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  onDeleteGame,
  scrollIntoView,
  onScrolledIntoView,
  isHighlighted,
}: GameCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isWunsch = game.status === 'wunsch';
  const isOwner = game.owner?.id === currentUserId;
  const canDelete = isOwner && game.players.length === 0 && game.bringers.length === 0;
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Reset the scroll flag when scrollIntoView becomes false
    if (!scrollIntoView) {
      hasScrolledRef.current = false;
      return;
    }

    // Only scroll once per scrollIntoView=true
    if (scrollIntoView && cardRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      
      // Use requestAnimationFrame to ensure the element is fully rendered
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Delay clearing the scroll target to allow the animation to complete
        // and keep the visual highlight visible for a moment
        setTimeout(() => {
          onScrolledIntoView?.();
        }, 1500);
      });
    }
  }, [scrollIntoView, onScrolledIntoView]);

  // Determine background color: highlight > wunsch > default
  const getCardClassName = () => {
    const baseClasses = 'p-4';
    const scrollClasses = scrollIntoView ? 'ring-2 ring-blue-400 ring-inset' : '';
    
    if (isHighlighted) {
      return `${baseClasses} bg-green-100 ${scrollClasses}`;
    }
    if (isWunsch) {
      return `${baseClasses} bg-yellow-50 ${scrollClasses}`;
    }
    return `${baseClasses} bg-white ${scrollClasses}`;
  };

  return (
    <div
      ref={cardRef}
      className={getCardClassName()}
    >
      {/* Game Name with Status Badge */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {game.name}
            </h3>
            {/* Neuheit Sticker - Requirement 5.1, 5.4 */}
            {game.yearPublished && (
              <NeuheitSticker yearPublished={game.yearPublished} />
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* BGG Button - Requirement 6.1, 6.2, 6.3 - Opens in new tab */}
            {game.bggId && (
              <button
                onClick={() => openBggPage(game.bggId!)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                title="BoardGameGeek Info (öffnet in neuem Tab)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                BGG
                {game.bggRating && (
                  <BggRatingBadge rating={game.bggRating} />
                )}
              </button>
            )}
            
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
        </div>
        
        {/* Owner display - Requirement 2.3, 2.4 */}
        <span className="text-xs text-gray-500">
          Erstellt von: {game.owner?.name ?? 'Kein Besitzer'}
        </span>
        
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
            className={`mt-3 w-full text-sm px-4 py-2 rounded transition-colors min-h-[44px] ${
              canDelete
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            🗑️ Spiel löschen
          </button>
        )}
      </div>
    </div>
  );
}

export default GameCard;
