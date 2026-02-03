/**
 * GameCard component
 * Mobile-optimized card layout for displaying a single game
 * All UI text in German (Requirement 9.1)
 * Requirement 6.3: Mobile-optimized card/list layout for game list
 * Requirement 6.4: Touch-friendly interactions on mobile
 * Requirement 8.1, 8.2, 8.3, 8.4: BGG game thumbnails with lazy loading
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Game, Player, Bringer } from '../types';
import { GameActions } from './GameActions';
import { NeuheitSticker } from './NeuheitSticker';
import { openBggPage } from './BggModal';
import { BggRatingBadge } from './BggRatingBadge';
import { HelpBubble } from './HelpBubble';
import { LazyBggImage } from './LazyBggImage';
import { ClickNotification } from './ClickNotification';
import { MobileActionsMenu } from './MobileActionsMenu';
import { ThumbnailUploadModal } from './ThumbnailUploadModal';

/**
 * Hook to detect if text would wrap at the larger font size
 * Measures once and only re-measures when content changes, not on resize
 * This avoids the resize loop where shrinking causes unwrapping which causes growing
 */
function useTextWrap(deps: unknown[]): [React.RefObject<HTMLHeadingElement>, boolean] {
  const ref = useRef<HTMLHeadingElement>(null);
  const [isWrapped, setIsWrapped] = useState(false);
  const measuredRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Only measure once per content change
    // Use requestAnimationFrame to ensure layout is complete
    measuredRef.current = false;
    
    const measure = () => {
      if (measuredRef.current) return;
      measuredRef.current = true;
      
      // Temporarily force large font to measure if it would wrap
      const originalClass = el.className;
      el.className = el.className.replace(/text-base/g, 'text-lg').replace(/text-sm/g, 'text-base');
      
      // Force layout recalc
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      const wouldWrap = el.scrollHeight > lineHeight * 1.3;
      
      // Restore original class
      el.className = originalClass;
      
      setIsWrapped(wouldWrap);
    };
    
    requestAnimationFrame(measure);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [ref, isWrapped];
}

interface GameCardProps {
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

/** Compact list display for mobile - shows up to 2 names, or 1 name + "+X" if more than 2 */
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

  // When expanded: show all. When collapsed: show 1 + "+X" if >2, otherwise show all (up to 2)
  const hasOverflow = !expanded && items.length > 2;
  const maxVisible = expanded ? items.length : (hasOverflow ? 1 : items.length);
  const visibleItems = items.slice(0, maxVisible);
  const overflowCount = items.length - 1; // +X shows total - 1

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
  onHideGame,
  onUnhideGame,
  onDeleteGame,
  onTogglePrototype,
  onThumbnailUploaded,
  scrollIntoView,
  onScrolledIntoView,
  isHighlighted,
  thumbnailTimestamp,
}: GameCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isWunsch = game.status === 'wunsch';
  const isPrototype = game.isPrototype;
  const isOwner = game.owner?.id === currentUserId;
  const isHidden = game.isHidden;
  const isPlayer = game.players.some((player) => player.user.id === currentUserId);
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
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isAnimatingSwipe, setIsAnimatingSwipe] = useState(false);
  const [collapsePhase, setCollapsePhase] = useState<'idle' | 'preparing' | 'collapsing'>('idle');
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const collapseHeightRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const swipeTimeoutRef = useRef<number | null>(null);
  const collapseTimeoutRef = useRef<number | null>(null);
  const [visualIsPlayer, setVisualIsPlayer] = useState(isPlayer);
  const [playFeedback, setPlayFeedback] = useState<'added' | 'removed' | null>(null);
  const [playFeedbackVisible, setPlayFeedbackVisible] = useState(false);
  const playFeedbackTimeoutRef = useRef<number | null>(null);
  const playFeedbackClearTimeoutRef = useRef<number | null>(null);
  const [playPulse, setPlayPulse] = useState(false);
  const playPulseTimeoutRef = useRef<number | null>(null);
  const [playCommitActive, setPlayCommitActive] = useState(false);
  
  // Dynamic text sizing - shrink when title wraps to 2 lines
  const [titleRef, isTitleWrapped] = useTextWrap([game.name, game.addedAsAlternateName]);
  
  // Check if either list has overflow (more than 2 items)
  const hasOverflow = game.players.length > 2 || game.bringers.length > 2;

  const handleListClick = () => {
    if (hasOverflow) {
      setListsExpanded(!listsExpanded);
    }
  };

  const handleUploadThumbnail = useCallback((_gameId: string) => {
    setUploadModalOpen(true);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    onThumbnailUploaded?.(game.id);
  }, [onThumbnailUploaded, game.id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const updateSize = () => {
      setCardWidth(el.offsetWidth);
      setCardHeight(el.offsetHeight);
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) {
        window.clearTimeout(swipeTimeoutRef.current);
      }
      if (collapseTimeoutRef.current) {
        window.clearTimeout(collapseTimeoutRef.current);
      }
      if (playFeedbackTimeoutRef.current) {
        window.clearTimeout(playFeedbackTimeoutRef.current);
      }
      if (playFeedbackClearTimeoutRef.current) {
        window.clearTimeout(playFeedbackClearTimeoutRef.current);
      }
      if (playPulseTimeoutRef.current) {
        window.clearTimeout(playPulseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!playCommitActive) {
      setVisualIsPlayer(isPlayer);
    }
  }, [isPlayer, playCommitActive]);

  const triggerPlayFeedback = useCallback((adding: boolean) => {
    if (playFeedbackTimeoutRef.current) {
      window.clearTimeout(playFeedbackTimeoutRef.current);
    }
    if (playFeedbackClearTimeoutRef.current) {
      window.clearTimeout(playFeedbackClearTimeoutRef.current);
    }
    setPlayFeedback(adding ? 'added' : 'removed');
    setPlayFeedbackVisible(true);
    playFeedbackTimeoutRef.current = window.setTimeout(() => {
      setPlayFeedbackVisible(false);
    }, 700);
    playFeedbackClearTimeoutRef.current = window.setTimeout(() => {
      setPlayFeedback(null);
    }, 900);
  }, []);

  const triggerPlayPulse = useCallback(() => {
    if (playPulseTimeoutRef.current) {
      window.clearTimeout(playPulseTimeoutRef.current);
    }
    setPlayPulse(true);
    playPulseTimeoutRef.current = window.setTimeout(() => {
      setPlayPulse(false);
    }, 620);
  }, []);

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

  const SWIPE_REVEAL = 70;
  const SWIPE_SIMPLE_TRIGGER = 80;
  const SWIPE_CAPTURE_THRESHOLD = 14;
  const SWIPE_RESIST = 0.46;
  const SWIPE_CONFIRM_FALLBACK = 180;
  const SWIPE_PLAY_COMMIT_DISTANCE = 110;
  const SWIPE_PLAY_RETURN_MS = 280;
  const SWIPE_COMMIT_ANIMATION_MS = 140;
  const COLLAPSE_ANIMATION_MS = 420;
  const isCollapsing = collapsePhase !== 'idle';
  const swipeConfirmDistance = cardWidth
    ? Math.max(150, Math.round(cardWidth * 0.55))
    : SWIPE_CONFIRM_FALLBACK;

  const applySwipeResistance = (deltaX: number) => {
    if (deltaX > 0) return deltaX;
    const abs = Math.abs(deltaX);
    if (abs <= SWIPE_REVEAL) return deltaX;
    const resisted = SWIPE_REVEAL + (abs - SWIPE_REVEAL) * SWIPE_RESIST;
    return Math.sign(deltaX) * resisted;
  };
  const shouldCaptureSwipe = (absX: number, absY: number, alreadySwiping: boolean) =>
    alreadySwiping || (absX > absY && absX > SWIPE_CAPTURE_THRESHOLD);

  const triggerCollapse = useCallback(() => {
    if (collapsePhase !== 'idle') return;
    collapseHeightRef.current =
      wrapperRef.current?.getBoundingClientRect().height ??
      cardRef.current?.getBoundingClientRect().height ??
      cardHeight;
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
      setIsAnimatingSwipe(false);
    }, COLLAPSE_ANIMATION_MS);
  }, [cardHeight, collapsePhase, game.id, isHidden, onHideGame, onUnhideGame]);

  const commitPlaySwipe = useCallback(() => {
    if (isAnimatingSwipe || isCollapsing) return;
    const willAdd = !isPlayer;
    setIsAnimatingSwipe(true);
    setPlayCommitActive(true);
    setSwipeX(SWIPE_PLAY_COMMIT_DISTANCE);
    setIsSwiping(false);
    if (willAdd) {
      onAddPlayer?.(game.id);
    } else {
      onRemovePlayer?.(game.id);
    }
    triggerPlayFeedback(willAdd);
    triggerPlayPulse();
    swipeTimeoutRef.current = window.setTimeout(() => {
      setSwipeX(0);
      setIsAnimatingSwipe(false);
      setPlayCommitActive(false);
    }, SWIPE_PLAY_RETURN_MS);
  }, [
    isAnimatingSwipe,
    isCollapsing,
    isPlayer,
    onAddPlayer,
    onRemovePlayer,
    game.id,
    triggerPlayFeedback,
    triggerPlayPulse,
  ]);

  const handleConfirmedSwipe = useCallback((deltaX: number) => {
    if (isAnimatingSwipe || isCollapsing) return;
    const direction = deltaX > 0 ? 1 : -1;
    const commitDistance = cardWidth || SWIPE_CONFIRM_FALLBACK;

    setIsAnimatingSwipe(true);
    setSwipeX(direction * commitDistance);
    setIsSwiping(false);

    swipeTimeoutRef.current = window.setTimeout(() => {
      if (!canHide) {
        setSwipeX(0);
        setIsAnimatingSwipe(false);
        return;
      }

      triggerCollapse();
    }, SWIPE_COMMIT_ANIMATION_MS);
  }, [canHide, cardWidth, isAnimatingSwipe, isCollapsing, triggerCollapse]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (isAnimatingSwipe || isCollapsing) return;
      if (!shouldCaptureSwipe(eventData.absX, eventData.absY, isSwiping)) {
        if (isSwiping) {
          setSwipeX(0);
          setIsSwiping(false);
        }
        return;
      }
      if (eventData.event.cancelable) {
        eventData.event.preventDefault();
      }
      const resisted = applySwipeResistance(eventData.deltaX);
      setSwipeX(resisted);
      setIsSwiping(true);
    },
    onSwiped: (eventData) => {
      if (isAnimatingSwipe || isCollapsing) return;
      if (!shouldCaptureSwipe(eventData.absX, eventData.absY, isSwiping)) {
        setSwipeX(0);
        setIsSwiping(false);
        return;
      }
      const isRight = eventData.dir === 'Right';
      const isLeft = eventData.dir === 'Left';

      if (isRight && eventData.absX >= SWIPE_SIMPLE_TRIGGER) {
        commitPlaySwipe();
        return;
      }
      if (isLeft && eventData.absX >= swipeConfirmDistance) {
        handleConfirmedSwipe(-1);
        return;
      }
      setSwipeX(0);
      setIsSwiping(false);
    },
    delta: 10,
    preventScrollOnSwipe: false,
    touchEventOptions: { passive: false },
  });

  // Determine background color: highlight > wunsch > default
  const getCardClassName = () => {
    const baseClasses = 'relative px-4 py-2';
    const scrollClasses = scrollIntoView ? 'ring-2 ring-blue-400 ring-inset' : '';
    
    if (isHighlighted) {
      return `${baseClasses} bg-green-100 ${scrollClasses}`;
    }
    if (isWunsch) {
      return `${baseClasses} bg-yellow-50 ${scrollClasses}`;
    }
    return `${baseClasses} bg-white ${scrollClasses}`;
  };

  const swipeDirection = swipeX > 0 ? 'right' : swipeX < 0 ? 'left' : 'none';
  const swipeIntensity = Math.min(1, Math.abs(swipeX) / SWIPE_REVEAL);
  const rightActionLabel = visualIsPlayer ? 'Nicht Mitspielen' : 'Mitspielen';
  const leftActionLabel = canHide
    ? (isHidden ? 'Einblenden' : 'Ausblenden')
    : 'Ausblenden nicht möglich';
  const swipeBackgroundColor =
    swipeDirection === 'right'
      ? `rgba(220, 252, 231, ${0.2 + 0.8 * swipeIntensity})`
      : swipeDirection === 'left'
        ? `rgba(229, 231, 235, ${0.2 + 0.8 * swipeIntensity})`
        : 'transparent';
  const playIconScale = Math.min(
    1.25,
    1 + 0.25 * swipeIntensity + (playPulse ? 0.05 : 0)
  );
  const playIconStyle = {
    transform: `scale(${playIconScale})`,
    transformOrigin: 'center',
    transition: isSwiping ? 'none' : 'transform 160ms ease-out',
    willChange: 'transform',
  };
  const playStrikeStyle = {
    transform: `scaleX(${playPulse ? 1 : 0.75})`,
    transition: 'transform 160ms ease-out',
  };
  const playFeedbackLabel =
    playFeedback === 'added' ? 'Du spielst mit' : playFeedback === 'removed' ? 'Nicht mehr dabei' : '';
  const cardTransition = isSwiping
    ? 'none'
    : playCommitActive
      ? 'transform 260ms ease-out'
      : 'transform 180ms ease-out';
  const collapseStyle =
    collapsePhase === 'idle'
      ? {}
      : {
          maxHeight:
            collapsePhase === 'collapsing'
              ? 0
              : `${collapseHeightRef.current || cardHeight || 0}px`,
          opacity: collapsePhase === 'collapsing' ? 0 : 1,
          overflow: 'hidden',
          transition: `max-height ${COLLAPSE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${COLLAPSE_ANIMATION_MS}ms ease-in-out`,
        };

  return (
    <div ref={wrapperRef} style={collapseStyle}>
      <div
        className="relative overflow-hidden"
        {...swipeHandlers}
      >
        <div
          className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
          style={{ backgroundColor: swipeBackgroundColor }}
        >
          <div
            className="flex flex-col items-center text-xs font-semibold text-green-800"
            style={{ opacity: swipeDirection === 'right' ? swipeIntensity : 0 }}
          >
            <div className="relative w-6 h-6">
              <div style={playIconStyle}>
                <img src="/meeple.svg" alt="" className="w-6 h-6" />
              </div>
              {visualIsPlayer && (
                <span
                  className="absolute left-0 right-0 top-1/2 h-[2px] bg-green-800 -rotate-12 origin-left"
                  style={playStrikeStyle}
                />
              )}
            </div>
            <span className="mt-1">{rightActionLabel}</span>
          </div>
          <div
            className={`flex flex-col items-center text-xs font-semibold ${canHide ? 'text-gray-700' : 'text-gray-400'}`}
            style={{ opacity: swipeDirection === 'left' ? swipeIntensity : 0 }}
          >
            <img src={isHidden ? '/eye.svg' : '/eye-off.svg'} alt="" className="w-6 h-6" />
            <span className="mt-1">{leftActionLabel}</span>
          </div>
        </div>

        <div
          ref={cardRef}
          className={getCardClassName()}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: cardTransition,
          }}
        >
          {playFeedback && (
            <div
              className={`pointer-events-none absolute left-4 top-3 z-10 text-xs font-semibold px-2 py-1 rounded-full shadow-sm transition-all duration-200 ${
                playFeedback === 'added'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-200 text-gray-700'
              } ${playFeedbackVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
            >
              {playFeedbackLabel}
            </div>
          )}
          {/* Game Name with Thumbnail and Actions - Requirement 8.1, 8.2, 8.3 */}
          <div className="flex gap-3 mb-1">
            {/* Thumbnail with Neuheit overlay - micro size for mobile, fixed outer size for consistency */}
            <div className="flex-shrink-0 relative w-[72px] h-20">
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
            {/* Title and Actions column */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Title row with status indicator */}
              <div className="flex items-start gap-2">
                <h3 
                  ref={titleRef}
                  className={`font-semibold text-gray-900 leading-tight flex-1 line-clamp-2 ${
                    isTitleWrapped ? 'text-sm' : 'text-lg'
                  }`}
                >
                  {game.name}
                  {/* Feature: 014-alternate-names-search - Show alternate name inline on mobile */}
                  {game.addedAsAlternateName && (
                    <span className={`font-normal text-gray-500 ${isTitleWrapped ? 'text-sm' : 'text-base'}`}>
                      {' · '}{game.addedAsAlternateName}
                    </span>
                  )}
                </h3>
                {/* Status indicator - colored circle with HelpBubble (no ? shown) */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="relative">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        isWunsch ? 'bg-yellow-400' : 'bg-green-500'
                      }`}
                      aria-label={isWunsch ? 'Gesucht' : 'Verfügbar'}
                    />
                    <HelpBubble
                      text={isWunsch ? 'Gesucht' : 'Verfügbar'}
                      position="top-right"
                      showIndicator={false}
                    />
                  </div>
                  {isPrototype && (
                    <div className="relative">
                      <div
                        className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center"
                        aria-label="Prototyp"
                      >
                        P
                      </div>
                      <HelpBubble
                        text="Prototyp"
                        position="top-right"
                        showIndicator={false}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* Actions row - Requirement 3.5, 3.6, 4.4, 4.5, 6.4 (touch-friendly) */}
              <div className="flex gap-2 items-center mt-1 flex-wrap">
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
                      className="p-1.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
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
                      className={`p-1.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                        canDelete
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <img src="/trash.svg" alt="" className="w-5 h-5" />
                    </button>
                  </ClickNotification>
                )}
                
                {/* Mobile Actions Menu - prototype toggle for owner's non-BGG games */}
                {onTogglePrototype && (
                  <MobileActionsMenu
                    game={game}
                    currentUserId={currentUserId}
                    onTogglePrototype={onTogglePrototype}
                    onUploadThumbnail={handleUploadThumbnail}
                  />
                )}

                {/* Thumbnail Upload Modal - rendered via portal */}
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
          </div>

          {/* Players and Bringers - Two column layout for mobile, tappable to expand */}
          <div 
            className={`grid grid-cols-2 gap-3 pt-1 border-t border-gray-200 ${hasOverflow ? 'cursor-pointer' : ''}`}
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
        </div>
      </div>
    </div>
  );
}

export default GameCard;
