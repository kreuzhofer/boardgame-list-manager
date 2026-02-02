/**
 * GameRow component
 * Single row displaying one game in the table
 * Shows game name with status badge, owner, players, bringers, and action buttons
 * All UI text in German (Requirement 9.1)
 */

import { useRef, useEffect, useState } from 'react';
import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';
import { NeuheitSticker } from './NeuheitSticker';
import { openBggPage } from './BggModal';
import { BggRatingBadge } from './BggRatingBadge';
import { HelpBubble } from './HelpBubble';
import { LazyBggImage } from './LazyBggImage';
import { ClickNotification } from './ClickNotification';

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
  /** Whether this game should be highlighted (matches search) - Requirement 7.1, 7.2 */
  isHighlighted?: boolean;
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
  isHighlighted,
}: GameRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isWunsch = game.status === 'wunsch';
  const isPrototype = game.isPrototype;
  const isOwner = game.owner?.id === currentUserId;
  
  // Check if current user is the only player/bringer (or lists are empty)
  const onlyCurrentUserIsPlayer = game.players.length === 0 || 
    (game.players.length === 1 && game.players[0].user.id === currentUserId);
  const onlyCurrentUserIsBringer = game.bringers.length === 0 || 
    (game.bringers.length === 1 && game.bringers[0].user.id === currentUserId);
  const canDelete = isOwner && onlyCurrentUserIsPlayer && onlyCurrentUserIsBringer;
  
  const hasScrolledRef = useRef(false);
  const [listsExpanded, setListsExpanded] = useState(false);

  const handleToggleExpand = () => {
    setListsExpanded(!listsExpanded);
  };

  useEffect(() => {
    // Reset the scroll flag when scrollIntoView becomes false
    if (!scrollIntoView) {
      hasScrolledRef.current = false;
      return;
    }

    // Only scroll once per scrollIntoView=true
    if (scrollIntoView && rowRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      
      // Use requestAnimationFrame to ensure the element is fully rendered
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Delay clearing the scroll target to allow the animation to complete
        // and keep the visual highlight visible for a moment
        setTimeout(() => {
          onScrolledIntoView?.();
        }, 1500);
      });
    }
  }, [scrollIntoView, onScrolledIntoView]);

  // Determine background color: highlight > wunsch > default
  const getRowClassName = () => {
    const baseClasses = 'border-b border-gray-200 transition-colors';
    const scrollClasses = scrollIntoView ? 'ring-2 ring-blue-400 ring-inset' : '';
    
    if (isHighlighted) {
      return `${baseClasses} bg-green-100 hover:bg-green-200 ${scrollClasses}`;
    }
    if (isWunsch) {
      return `${baseClasses} bg-yellow-50 hover:bg-yellow-100 ${scrollClasses}`;
    }
    return `${baseClasses} hover:bg-gray-50 ${scrollClasses}`;
  };

  return (
    <tr
      ref={rowRef}
      className={getRowClassName()}
    >
      {/* Thumbnail with Neuheit overlay - Requirement 7.1: square200 thumbnail in first column (desktop) */}
      <td className="px-2 py-2 w-20">
        <div className="relative w-[72px] h-16">
          {game.bggId ? (
            <LazyBggImage
              bggId={game.bggId}
              size="micro"
              alt={game.name}
              className="rounded"
              enableZoom={true}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C9.24 2 7 4.24 7 7c0 1.1.36 2.12.97 2.95L4 14.5V22h16v-7.5l-3.97-4.55c.61-.83.97-1.85.97-2.95 0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
              </svg>
            </div>
          )}
          {/* Neuheit Sticker overlay - Requirement 5.1, 5.4 */}
          {game.yearPublished && (
            <div className="absolute -top-2 -right-2">
              <NeuheitSticker yearPublished={game.yearPublished} />
            </div>
          )}
        </div>
      </td>

      {/* Game Name with Status Badge and Owner */}
      <td className="px-4 py-3 w-[25%]">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gray-900">{game.name}</span>
          {/* Feature: 014-alternate-names-search - Show alternate name on second line (desktop) */}
          {game.addedAsAlternateName && (
            <span className="text-sm text-gray-500 truncate">
              {game.addedAsAlternateName}
            </span>
          )}
          <div className="flex items-center gap-2">
            {/* Status Badge - Requirement 4.1, 4.2 */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium min-w-[4.5rem] text-center ${
                isWunsch
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-200 text-green-800'
              }`}
            >
              {isWunsch ? 'Gesucht' : 'Verfügbar'}
            </span>
            {isPrototype && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                Prototyp
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Bringers (Bringt mit) - Requirement 3.9, 4.6 */}
      <td className="px-4 py-3 w-[18%]">
        <BringerList 
          bringers={game.bringers} 
          currentUserId={currentUserId} 
          maxVisible={5}
          expanded={listsExpanded}
          onToggleExpand={handleToggleExpand}
          displayMode="stacked"
        />
      </td>

      {/* Players (Mitspieler) - Requirement 3.9 */}
      <td className="px-4 py-3 w-[18%]">
        <PlayerList 
          players={game.players} 
          currentUserId={currentUserId} 
          maxVisible={5}
          expanded={listsExpanded}
          onToggleExpand={handleToggleExpand}
          displayMode="stacked"
        />
      </td>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5 */}
      <td className="px-4 py-3 w-[280px]">
        <div className="flex gap-2 flex-nowrap items-center">
          <GameActions
            game={game}
            currentUserId={currentUserId}
            onAddPlayer={onAddPlayer}
            onAddBringer={onAddBringer}
            onRemovePlayer={onRemovePlayer}
            onRemoveBringer={onRemoveBringer}
          />
          
          {/* BGG Button - Requirement 6.1, 6.2, 6.3 - Opens in new tab */}
          {game.bggId && game.bggRating && (
            <div className="relative">
              <button
                onClick={() => openBggPage(game.bggId!)}
                className="p-1 rounded flex items-center hover:bg-gray-100 transition-colors"
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
            <ClickNotification
              message="Andere Spieler oder Mitbringer sind eingetragen"
              enabled={!canDelete}
              duration={3000}
            >
              <button
                onClick={() => canDelete && onDeleteGame?.(game.id)}
                disabled={!canDelete}
                aria-label="Spiel löschen"
                className={`p-1.5 rounded transition-colors ${
                  canDelete
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <img src="/trash.svg" alt="" className="w-4 h-4" />
              </button>
            </ClickNotification>
          )}
        </div>
      </td>
    </tr>
  );
}

export default GameRow;
