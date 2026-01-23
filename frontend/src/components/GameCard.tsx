/**
 * GameCard component
 * Mobile-optimized card layout for displaying a single game
 * All UI text in German (Requirement 9.1)
 * Requirement 6.3: Mobile-optimized card/list layout for game list
 * Requirement 6.4: Touch-friendly interactions on mobile
 */

import { useRef, useEffect, useState } from 'react';
import { Game, Player, Bringer } from '../types';
import { GameActions } from './GameActions';
import { NeuheitSticker } from './NeuheitSticker';
import { openBggPage } from './BggModal';
import { BggRatingBadge } from './BggRatingBadge';
import { HelpBubble } from './HelpBubble';

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

/** Compact list display for mobile - shows up to 3 names, or 2 names + "+X" if more than 3 */
function CompactList({ 
  items, 
  currentUserId, 
  emptyText,
  expanded,
}: { 
  items: (Player | Bringer)[]; 
  currentUserId: string; 
  emptyText: string;
  expanded: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-gray-400 italic text-sm">{emptyText}</span>;
  }

  // When expanded: show all. When collapsed: show 2 + "+X" if >3, otherwise show all (up to 3)
  const hasOverflow = !expanded && items.length > 3;
  const maxVisible = expanded ? items.length : (hasOverflow ? 2 : items.length);
  const visibleItems = items.slice(0, maxVisible);
  const overflowCount = items.length - 2; // +X shows total - 2

  return (
    <div className="text-sm">
      {visibleItems.map((item) => (
        <div key={item.id} className="truncate">
          <span
            className={
              item.user.id === currentUserId
                ? 'font-semibold text-blue-600'
                : 'text-gray-700'
            }
          >
            {item.user.name}
          </span>
        </div>
      ))}
      {hasOverflow && (
        <span className="text-blue-500 text-xs">+{overflowCount} weitere</span>
      )}
    </div>
  );
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
  const [listsExpanded, setListsExpanded] = useState(false);
  
  // Check if either list has overflow (more than 3 items)
  const hasOverflow = game.players.length > 3 || game.bringers.length > 3;

  const handleListClick = () => {
    if (hasOverflow) {
      setListsExpanded(!listsExpanded);
    }
  };

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
      {/* Game Name */}
      <div className="mb-2">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight">
          {game.name}
        </h3>
      </div>

      {/* Players and Bringers - Two column layout for mobile, tappable to expand */}
      <div 
        className={`grid grid-cols-2 gap-3 mb-3 ${hasOverflow ? 'cursor-pointer' : ''}`}
        onClick={handleListClick}
      >
        {/* Bringers (Bringt mit) - First column to match Mitbringen button */}
        <div className="min-w-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Bringt mit
          </span>
          <CompactList 
            items={game.bringers} 
            currentUserId={currentUserId} 
            emptyText="Niemand"
            expanded={listsExpanded}
          />
        </div>

        {/* Players (Mitspieler) - Second column to match Mitspielen button */}
        <div className="min-w-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Mitspieler
          </span>
          <CompactList 
            items={game.players} 
            currentUserId={currentUserId} 
            emptyText="Keine"
            expanded={listsExpanded}
          />
        </div>
      </div>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5, 6.4 (touch-friendly) */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex gap-3 items-center">
          <GameActions
            game={game}
            currentUserId={currentUserId}
            onAddPlayer={onAddPlayer}
            onAddBringer={onAddBringer}
            onRemovePlayer={onRemovePlayer}
            onRemoveBringer={onRemoveBringer}
            isMobile={true}
          />
          
          {/* BGG Button - Requirement 6.1, 6.2, 6.3 - Opens in new tab */}
          {game.bggId && game.bggRating && (
            <div className="relative">
              <button
                onClick={() => openBggPage(game.bggId!)}
                className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label="BoardGameGeek Info"
              >
                <BggRatingBadge rating={game.bggRating} />
              </button>
              <HelpBubble
                text="BoardGameGeek Seite öffnen (neuer Tab)"
                position="top-right"
              />
            </div>
          )}
          
          {/* Delete button - only for owner, icon only to save space */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => onDeleteGame?.(game.id)}
                disabled={!canDelete}
                aria-label="Spiel löschen"
                className={`p-2.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                  canDelete
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <img src="/trash.svg" alt="" className="w-5 h-5" />
              </button>
              <HelpBubble
                text={
                  canDelete
                    ? 'Spiel löschen'
                    : 'Entferne zuerst alle Mitspieler und Bringer'
                }
                position="top-right"
              />
            </div>
          )}
          
          {/* Status Badge and Neuheit - Requirement 4.1, 4.2, 5.1, 5.4 - column on right */}
          <div className="ml-auto flex flex-col items-start gap-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${
                isWunsch
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-200 text-green-800'
              }`}
            >
              {isWunsch ? 'Gesucht' : 'Verfügbar'}
            </span>
            {game.yearPublished && (
              <NeuheitSticker yearPublished={game.yearPublished} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameCard;
