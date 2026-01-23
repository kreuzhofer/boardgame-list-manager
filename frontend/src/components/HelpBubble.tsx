/**
 * HelpBubble component
 * A small "?" button that shows an explanatory speech bubble on tap/hover
 * - Positioned at the edge of the parent element
 * - Speech bubble appears with tip pointing to the ? button
 * - Auto-dismisses based on text length
 * - Viewport-aware: flips position if bubble would overflow screen
 * - Reusable for any control needing explanation
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';

interface HelpBubbleProps {
  /** The help text to display in the bubble */
  text: string;
  /** Preferred position relative to the target element (will flip if needed) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Optional additional class names for the container */
  className?: string;
}

type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

// Calculate display duration based on text length (minimum 2s, ~50ms per character)
const calculateDuration = (text: string): number => {
  const baseDuration = 2000;
  const perCharDuration = 50;
  return Math.max(baseDuration, text.length * perCharDuration);
};

export function HelpBubble({ 
  text, 
  position: preferredPosition = 'top-right',
  className = '' 
}: HelpBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [actualPosition, setActualPosition] = useState<Position>(preferredPosition);
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

  // Track horizontal offset to keep bubble in viewport (use ref to avoid re-render loops)
  const horizontalOffsetRef = useRef(0);
  const [, forceUpdate] = useState(0);

  // Adjust bubble position after it renders to ensure it stays in viewport
  useLayoutEffect(() => {
    if (isVisible && bubbleRef.current) {
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8; // Keep some padding from edges

      let newPosition = actualPosition;
      let needsPositionUpdate = false;

      // Check horizontal overflow - adjust offset to keep in viewport
      // Account for current offset when checking bounds
      const currentOffset = horizontalOffsetRef.current;
      const actualLeft = bubbleRect.left;
      const actualRight = bubbleRect.right;
      
      let newOffset = currentOffset;
      if (actualLeft < padding) {
        // Bubble overflows left edge - shift it right
        newOffset = currentOffset + (padding - actualLeft);
      } else if (actualRight > viewportWidth - padding) {
        // Bubble overflows right edge - shift it left
        newOffset = currentOffset + ((viewportWidth - padding) - actualRight);
      }

      // Only update if offset changed significantly (avoid floating point issues)
      if (Math.abs(newOffset - currentOffset) > 0.5) {
        horizontalOffsetRef.current = newOffset;
        forceUpdate(n => n + 1); // Trigger re-render to apply new offset
      }

      // Check vertical overflow
      if (bubbleRect.top < padding) {
        // Flip to bottom
        if (newPosition.startsWith('top')) {
          newPosition = newPosition.replace('top', 'bottom') as Position;
          needsPositionUpdate = true;
        }
      } else if (bubbleRect.bottom > viewportHeight - padding) {
        // Flip to top
        if (newPosition.startsWith('bottom')) {
          newPosition = newPosition.replace('bottom', 'top') as Position;
          needsPositionUpdate = true;
        }
      }

      if (needsPositionUpdate) {
        setActualPosition(newPosition);
      }
    }
  }, [isVisible, actualPosition]);

  const showBubble = useCallback(() => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    
    clearTimeouts();
    setActualPosition(preferredPosition); // Start with preferred, will adjust in useLayoutEffect
    horizontalOffsetRef.current = 0; // Reset offset
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
  }, [text, clearTimeouts, preferredPosition]);

  const hideBubble = useCallback(() => {
    // Don't hide if we're in the middle of showing
    if (!isVisible || isFadingOut) return;
    
    setIsFadingOut(true);
    clearTimeouts();
    fadeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      isInteractingRef.current = false;
    }, 300);
  }, [isVisible, isFadingOut, clearTimeouts]);

  // Handle click for mobile
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVisible) {
      showBubble();
    }
  }, [isVisible, showBubble]);

  // Handle mouse enter/leave for desktop
  const handleMouseEnter = useCallback(() => {
    if (!isVisible && !isInteractingRef.current) {
      showBubble();
    }
  }, [isVisible, showBubble]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // Check if we're moving to a child element (the bubble)
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current?.contains(relatedTarget)) {
      return;
    }
    hideBubble();
  }, [hideBubble]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  // Position classes for the ? button
  const buttonPositionClasses: Record<Position, string> = {
    'top-right': '-top-1.5 -right-1.5',
    'top-left': '-top-1.5 -left-1.5',
    'bottom-right': '-bottom-1.5 -right-1.5',
    'bottom-left': '-bottom-1.5 -left-1.5',
  };

  // Position classes for the speech bubble
  const getBubblePositionStyle = (): React.CSSProperties => {
    const isTop = actualPosition.startsWith('top');
    const isRight = actualPosition.endsWith('right');
    
    const style: React.CSSProperties = {
      position: 'absolute',
      [isTop ? 'bottom' : 'top']: '100%',
      [isRight ? 'right' : 'left']: 0,
      [isTop ? 'marginBottom' : 'marginTop']: '8px',
    };

    // Apply horizontal offset to keep bubble in viewport
    if (horizontalOffsetRef.current !== 0) {
      style.transform = `translateX(${horizontalOffsetRef.current}px)`;
    }

    return style;
  };

  // Arrow/tip position classes
  const arrowPositionClasses: Record<Position, string> = {
    'top-right': 'top-full right-1.5 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    'top-left': 'top-full left-1.5 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    'bottom-right': 'bottom-full right-1.5 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    'bottom-left': 'bottom-full left-1.5 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute ${buttonPositionClasses[preferredPosition]} z-10 ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {/* ? Button - always visible */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        className="w-4 h-4 rounded-full bg-gray-500 text-white text-xs font-bold flex items-center justify-center hover:bg-gray-600 transition-colors"
        aria-label="Hilfe"
      >
        ?
      </button>

      {/* Speech Bubble */}
      {isVisible && (
        <div
          ref={bubbleRef}
          style={getBubblePositionStyle()}
          className={`transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="relative bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-48 whitespace-normal">
            {text}
            {/* Arrow/tip */}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowPositionClasses[actualPosition]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpBubble;
