/**
 * GameRow component
 * Single row displaying one game in the table
 * Shows game name with status badge, owner, players, bringers, and action buttons
 * All UI text in German (Requirement 9.1)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Game } from '../types';
import { PlayerList } from './PlayerList';
import { BringerList } from './BringerList';
import { GameActions } from './GameActions';
import { NeuheitSticker } from './NeuheitSticker';
import { openBggPage } from './BggModal';
import { BggRatingBadge } from './BggRatingBadge';
import { HelpBubble } from './HelpBubble';
import { LazyBggImage } from './LazyBggImage';
import { DesktopActionsMenu } from './DesktopActionsMenu';
import { ThumbnailUploadModal } from './ThumbnailUploadModal';
import { useToast } from './ToastProvider';

interface GameRowProps {
  game: Game;
  currentUserId: string;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  onHideGame?: (gameId: string) => void;
  onUnhideGame?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  onTogglePrototype?: (gameId: string, isPrototype: boolean) => Promise<void>;
  onThumbnailUploaded?: (gameId: string) => void;
  scrollIntoView?: boolean;
  onScrolledIntoView?: () => void;
  /** Whether this game should be highlighted (matches search) - Requirement 7.1, 7.2 */
  isHighlighted?: boolean;
  /** Cache-busting timestamp for custom thumbnails */
  thumbnailTimestamp?: number;
}

export function GameRow({
  game,
  currentUserId,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  onHideGame,
  onUnhideGame,
  onDeleteGame,
  onTogglePrototype,
  onThumbnailUploaded,
  scrollIntoView,
  onScrolledIntoView,
  isHighlighted,
  thumbnailTimestamp,
}: GameRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isWunsch = game.status === 'wunsch';
  const isPrototype = game.isPrototype;
  const isOwner = game.owner?.id === currentUserId;
  const isHidden = game.isHidden;
  const isBringer = game.bringers.some((bringer) => bringer.user.id === currentUserId);
  const canHide = !isBringer;
  
  // Check if current user is the only player/bringer (or lists are empty)
  const onlyCurrentUserIsPlayer = game.players.length === 0 || 
    (game.players.length === 1 && game.players[0].user.id === currentUserId);
  const onlyCurrentUserIsBringer = game.bringers.length === 0 || 
    (game.bringers.length === 1 && game.bringers[0].user.id === currentUserId);
  const canDelete = isOwner && onlyCurrentUserIsPlayer && onlyCurrentUserIsBringer;
  
  const hasScrolledRef = useRef(false);
  const [listsExpanded, setListsExpanded] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [collapsePhase, setCollapsePhase] = useState<'idle' | 'preparing' | 'collapsing'>('idle');
  const collapseHeightRef = useRef(0);
  const collapseTimeoutRef = useRef<number | null>(null);
  const { showToast } = useToast();

  const handleToggleExpand = () => {
    setListsExpanded(!listsExpanded);
  };

  const handleUploadThumbnail = useCallback((_gameId: string) => {
    setUploadModalOpen(true);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    onThumbnailUploaded?.(game.id);
  }, [onThumbnailUploaded, game.id]);

  const handleToggleHidden = () => {
    if (!canHide) return;
    triggerCollapse();
  };

  const handleAddPlayerWithToast = useCallback(() => {
    if (!onAddPlayer) return;
    onAddPlayer(game.id);
    showToast(`Du spielst mit bei ${game.name}`);
  }, [game.id, game.name, onAddPlayer, showToast]);

  const handleRemovePlayerWithToast = useCallback(() => {
    if (!onRemovePlayer) return;
    onRemovePlayer(game.id);
    showToast(`Du spielst nicht mehr mit bei ${game.name}`);
  }, [game.id, game.name, onRemovePlayer, showToast]);

  const handleAddBringerWithToast = useCallback(() => {
    if (!onAddBringer) return;
    onAddBringer(game.id);
    showToast(`Gepackt und dabei: ${game.name}`);
  }, [game.id, game.name, onAddBringer, showToast]);

  const handleRemoveBringerWithToast = useCallback(() => {
    if (!onRemoveBringer) return;
    onRemoveBringer(game.id);
    showToast(`Aus dem Koffer geflogen: ${game.name}`);
  }, [game.id, game.name, onRemoveBringer, showToast]);

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

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) {
        window.clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  const COLLAPSE_ANIMATION_MS = 420;
  const triggerCollapse = useCallback(() => {
    if (collapsePhase !== 'idle') return;
    collapseHeightRef.current = rowRef.current?.getBoundingClientRect().height ?? 0;
    setCollapsePhase('preparing');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCollapsePhase('collapsing'));
    });
    collapseTimeoutRef.current = window.setTimeout(() => {
      if (isHidden) {
        onUnhideGame?.(game.id);
      } else {
        onHideGame?.(game.id);
      }
    }, COLLAPSE_ANIMATION_MS);
  }, [collapsePhase, game.id, isHidden, onHideGame, onUnhideGame]);

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

  const collapseStyle =
    collapsePhase === 'idle'
      ? {}
      : {
          maxHeight:
            collapsePhase === 'collapsing'
              ? 0
              : `${collapseHeightRef.current || rowRef.current?.getBoundingClientRect().height || 0}px`,
          opacity: collapsePhase === 'collapsing' ? 0 : 1,
          overflow: 'hidden',
          paddingTop: collapsePhase === 'collapsing' ? 0 : undefined,
          paddingBottom: collapsePhase === 'collapsing' ? 0 : undefined,
          transition: `max-height ${COLLAPSE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${COLLAPSE_ANIMATION_MS}ms ease-in-out, padding ${COLLAPSE_ANIMATION_MS}ms ease-in-out`,
        };

  return (
    <tr
      ref={rowRef}
      className={getRowClassName()}
    >
      {/* Thumbnail with Neuheit overlay - Requirement 7.1: square200 thumbnail in first column (desktop) */}
      <td className="w-20 p-0">
        <div className="px-2 py-2" style={collapseStyle}>
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
              /* For non-BGG games, try to show custom thumbnail, fallback to placeholder */
              <LazyBggImage
                customThumbnailGameId={game.id}
                size="micro"
                alt={game.name}
                className="rounded"
                enableZoom={true}
                thumbnailTimestamp={thumbnailTimestamp}
              />
            )}
            {/* Neuheit Sticker overlay - Requirement 5.1, 5.4 */}
            {game.yearPublished && (
              <div className="absolute -top-2 -right-2">
                <NeuheitSticker yearPublished={game.yearPublished} />
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Game Name with Status Badge and Owner */}
      <td className="w-[25%] p-0">
        <div className="px-4 py-3" style={collapseStyle}>
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
        </div>
      </td>

      {/* Bringers (Bringt mit) - Requirement 3.9, 4.6 */}
      <td className="w-[18%] p-0">
        <div className="px-4 py-3" style={collapseStyle}>
          <BringerList 
            bringers={game.bringers} 
            currentUserId={currentUserId} 
            maxVisible={5}
            expanded={listsExpanded}
            onToggleExpand={handleToggleExpand}
            displayMode="stacked"
          />
        </div>
      </td>

      {/* Players (Mitspieler) - Requirement 3.9 */}
      <td className="w-[18%] p-0">
        <div className="px-4 py-3" style={collapseStyle}>
          <PlayerList 
            players={game.players} 
            currentUserId={currentUserId} 
            maxVisible={5}
            expanded={listsExpanded}
            onToggleExpand={handleToggleExpand}
            displayMode="stacked"
          />
        </div>
      </td>

      {/* Actions - Requirement 3.5, 3.6, 4.4, 4.5 */}
      <td className="w-[280px] p-0">
        <div className="px-4 py-3" style={collapseStyle}>
          <div className="flex gap-2 flex-nowrap items-center">
            <GameActions
              game={game}
              currentUserId={currentUserId}
              onAddPlayer={handleAddPlayerWithToast}
              onAddBringer={handleAddBringerWithToast}
              onRemovePlayer={handleRemovePlayerWithToast}
              onRemoveBringer={handleRemoveBringerWithToast}
            />
            
            {/* BGG Button - Requirement 6.1, 6.2, 6.3 - Opens in new tab */}
            <div className="relative w-9 h-8 flex items-center justify-center">
              {game.bggId && game.bggRating ? (
                <>
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
                </>
              ) : (
                <div className="w-8 h-8 pointer-events-none" aria-hidden="true" />
              )}
            </div>

            {/* Hide/Show button */}
            {(onHideGame || onUnhideGame) && (
              <div className="relative">
                <button
                  onClick={handleToggleHidden}
                  disabled={!canHide}
                  aria-label={isHidden ? 'Spiel einblenden' : 'Spiel ausblenden'}
                  className={`p-1.5 rounded transition-colors ${
                    canHide
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  title={isHidden ? 'Spiel einblenden' : 'Spiel ausblenden'}
                >
                  <img
                    src={isHidden ? '/eye.svg?v=3' : '/eye-off.svg?v=3'}
                    alt=""
                    className="w-4 h-4"
                  />
                </button>
                <HelpBubble
                  text={
                    canHide
                      ? (isHidden ? 'Einblenden' : 'Ausblenden')
                      : 'Du bringst dieses Spiel mit und kannst es nicht ausblenden.'
                  }
                  position="top-right"
                />
              </div>
            )}
            
            {/* Desktop Actions Menu - overflow actions */}
            <DesktopActionsMenu
              game={game}
              currentUserId={currentUserId}
              onTogglePrototype={onTogglePrototype}
              onUploadThumbnail={handleUploadThumbnail}
              onDeleteGame={onDeleteGame}
              canDelete={canDelete}
            />

            {/* Thumbnail Upload Modal - rendered via portal so can be here */}
            <ThumbnailUploadModal
              gameId={game.id}
              gameName={game.name}
              isOpen={uploadModalOpen}
              onClose={() => setUploadModalOpen(false)}
              onSuccess={handleUploadSuccess}
              userId={currentUserId}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

export default GameRow;
