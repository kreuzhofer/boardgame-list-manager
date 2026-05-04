/**
 * HelpBubble component
 * A small "?" button that shows an explanatory speech bubble on tap/hover.
 * - Inline button as anchor; bubble rendered via createPortal to document.body
 *   so it escapes any ancestor with `overflow: hidden` (cards, table cells,
 *   scroll containers).
 * - Position computed in viewport coords from the anchor's getBoundingClientRect;
 *   re-anchors on scroll/resize while visible.
 * - Auto-dismisses based on text length; flips/shifts to stay in viewport.
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface HelpBubbleProps {
  /** The help text to display in the bubble */
  text: string;
  /** Preferred position relative to the target element (will flip if needed) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Optional additional class names for the container */
  className?: string;
  /** Whether to show the ? indicator button (default: true) */
  showIndicator?: boolean;
}

type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

const calculateDuration = (text: string): number => {
  const baseDuration = 2000;
  const perCharDuration = 50;
  return Math.max(baseDuration, text.length * perCharDuration);
};

const VIEWPORT_PADDING = 8;
const BUBBLE_GAP = 8;

export function HelpBubble({
  text,
  position: preferredPosition = 'top-right',
  className = '',
  showIndicator = true,
}: HelpBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [actualPosition, setActualPosition] = useState<Position>(preferredPosition);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }, []);

  const captureAnchorRect = useCallback(() => {
    if (!containerRef.current) return;
    setAnchorRect(containerRef.current.getBoundingClientRect());
  }, []);

  // Re-anchor on scroll/resize while visible so the bubble follows the button.
  useEffect(() => {
    if (!isVisible) return;
    const update = () => captureAnchorRect();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isVisible, captureAnchorRect]);

  // Position the bubble in viewport coords once it has rendered (so we know
  // its size). Flips top<->bottom and shifts horizontally to stay on screen.
  useLayoutEffect(() => {
    if (!isVisible || !anchorRect || !bubbleRef.current) return;

    const bubble = bubbleRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let pos = preferredPosition;

    // Vertical flip if the preferred side won't fit.
    const wantsTop = pos.startsWith('top');
    const fitsAbove = anchorRect.top - BUBBLE_GAP - bubble.height >= VIEWPORT_PADDING;
    const fitsBelow = anchorRect.bottom + BUBBLE_GAP + bubble.height <= vh - VIEWPORT_PADDING;
    if (wantsTop && !fitsAbove && fitsBelow) {
      pos = pos.replace('top', 'bottom') as Position;
    } else if (!wantsTop && !fitsBelow && fitsAbove) {
      pos = pos.replace('bottom', 'top') as Position;
    }

    const isTop = pos.startsWith('top');
    const isRight = pos.endsWith('right');

    const top = isTop
      ? anchorRect.top - BUBBLE_GAP - bubble.height
      : anchorRect.bottom + BUBBLE_GAP;

    let left = isRight
      ? anchorRect.right - bubble.width
      : anchorRect.left;

    // Horizontal viewport clamp.
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (left + bubble.width > vw - VIEWPORT_PADDING) {
      left = vw - VIEWPORT_PADDING - bubble.width;
    }

    setActualPosition(pos);
    setBubbleStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      visibility: 'visible',
    });
  }, [isVisible, anchorRect, preferredPosition]);

  const showBubble = useCallback(() => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;

    clearTimeouts();
    setActualPosition(preferredPosition);
    setBubbleStyle({ position: 'fixed', visibility: 'hidden' });
    captureAnchorRect();
    setIsFadingOut(false);
    setIsVisible(true);

    const duration = calculateDuration(text);

    timeoutRef.current = setTimeout(() => {
      setIsFadingOut(true);
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        isInteractingRef.current = false;
      }, 300);
    }, duration);
  }, [text, clearTimeouts, preferredPosition, captureAnchorRect]);

  const hideBubble = useCallback(() => {
    if (!isVisible || isFadingOut) return;
    setIsFadingOut(true);
    clearTimeouts();
    fadeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      isInteractingRef.current = false;
    }, 300);
  }, [isVisible, isFadingOut, clearTimeouts]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isVisible) {
        showBubble();
      }
    },
    [isVisible, showBubble],
  );

  const handleMouseEnter = useCallback(() => {
    if (!isVisible && !isInteractingRef.current) {
      showBubble();
    }
  }, [isVisible, showBubble]);

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (containerRef.current?.contains(relatedTarget)) {
        return;
      }
      hideBubble();
    },
    [hideBubble],
  );

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  const buttonPositionClasses: Record<Position, string> = {
    'top-right': '-top-1.5 -right-1.5',
    'top-left': '-top-1.5 -left-1.5',
    'bottom-right': '-bottom-1.5 -right-1.5',
    'bottom-left': '-bottom-1.5 -left-1.5',
  };

  // Arrow tip — points back toward the anchor. With the bubble portalled and
  // free-floating, the arrow stays cosmetic and may not always perfectly
  // align after a horizontal shift; that's acceptable.
  const arrowPositionClasses: Record<Position, string> = {
    'top-right': 'top-full right-3 border-l-transparent border-r-transparent border-b-transparent border-t-ink',
    'top-left': 'top-full left-3 border-l-transparent border-r-transparent border-b-transparent border-t-ink',
    'bottom-right': 'bottom-full right-3 border-l-transparent border-r-transparent border-t-transparent border-b-ink',
    'bottom-left': 'bottom-full left-3 border-l-transparent border-r-transparent border-t-transparent border-b-ink',
  };

  const containerClasses = showIndicator
    ? `absolute ${buttonPositionClasses[preferredPosition]} z-10 ${className}`
    : `absolute inset-0 z-10 cursor-help ${className}`;

  const bubble =
    isVisible &&
    createPortal(
      <div
        ref={bubbleRef}
        style={{ ...bubbleStyle, zIndex: 1000 }}
        className={`pointer-events-none transition-opacity duration-300 ${
          isFadingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="relative bg-ink text-white text-xs px-3 py-2 rounded-lg shadow-floating max-w-48 whitespace-normal">
          {text}
          <div className={`absolute w-0 h-0 border-4 ${arrowPositionClasses[actualPosition]}`} />
        </div>
      </div>,
      document.body,
    );

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseLeave={handleMouseLeave}
      onClick={!showIndicator ? handleClick : undefined}
      onMouseEnter={!showIndicator ? handleMouseEnter : undefined}
    >
      {showIndicator && (
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          className="w-4 h-4 rounded-full bg-ink-mute text-white text-xs font-bold flex items-center justify-center hover:bg-ink-soft transition-colors"
          aria-label="Hilfe"
        >
          ?
        </button>
      )}
      {bubble}
    </div>
  );
}

export default HelpBubble;
