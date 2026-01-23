/**
 * LazyBggImage - Reusable component for displaying BGG game thumbnails
 * 
 * Features:
 * - Lazy loading with Intersection Observer (only loads when in viewport)
 * - Shimmer placeholder animation
 * - Smooth fade-in on load
 * - Error placeholder with board game icon
 * - Desktop: hover to show zoom popup
 * - Mobile: tap to show zoom, tap anywhere or scroll to hide
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ImageZoomOverlay } from './ImageZoomOverlay';

export type ImageSize = 'micro' | 'square200';

export interface LazyBggImageProps {
  bggId: number;
  size: ImageSize;
  alt: string;
  className?: string;
  enableZoom?: boolean;
  /** For testing: override touch detection */
  _forceTouch?: boolean;
}

function getBggImageUrl(bggId: number, size: ImageSize): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${apiUrl}/api/bgg/image/${bggId}/${size}`;
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function LazyBggImage({
  bggId,
  size,
  alt,
  className = '',
  enableZoom = true,
  _forceTouch,
}: LazyBggImageProps) {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [isInViewport, setIsInViewport] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTouch = _forceTouch !== undefined ? _forceTouch : isTouchDevice();

  const imageUrl = getBggImageUrl(bggId, size);

  // Intersection Observer for viewport detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px', threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Start loading when in viewport
  useEffect(() => {
    if (isInViewport && loadState === 'idle') {
      setLoadState('loading');
    }
  }, [isInViewport, loadState]);

  // Mobile: Close zoom on scroll or any tap
  useEffect(() => {
    if (!showZoom || !isTouch) return;

    const handleScroll = () => setShowZoom(false);
    const handleTouch = () => setShowZoom(false);

    // Use capture phase to catch taps before they're handled
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouch, { capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouch, { capture: true });
    };
  }, [showZoom, isTouch]);

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  // Desktop: Show zoom on mouse enter
  const handleMouseEnter = useCallback(() => {
    if (isTouch || !enableZoom || loadState !== 'loaded') return;
    setShowZoom(true);
  }, [isTouch, enableZoom, loadState]);

  // Desktop: Hide zoom on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isTouch) return;
    setShowZoom(false);
  }, [isTouch]);

  // Mobile: Toggle zoom on tap
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isTouch || !enableZoom || loadState !== 'loaded') return;
    e.stopPropagation();
    setShowZoom(true);
  }, [isTouch, enableZoom, loadState]);

  const getAnchorRect = useCallback((): DOMRect | undefined => {
    return containerRef.current?.getBoundingClientRect();
  }, []);

  const dimensions = size === 'micro' 
    ? { width: 64, height: 64 }
    : { width: 200, height: 200 };

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-testid="lazy-bgg-image-container"
      >
        {/* Shimmer placeholder */}
        {(loadState === 'idle' || loadState === 'loading') && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"
            data-testid="shimmer-placeholder"
          />
        )}

        {/* Error placeholder */}
        {loadState === 'error' && (
          <div 
            className="absolute inset-0 bg-gray-100 flex items-center justify-center"
            data-testid="error-placeholder"
          >
            <svg 
              className="w-8 h-8 text-gray-400" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C9.24 2 7 4.24 7 7c0 1.1.36 2.12.97 2.95L4 14.5V22h16v-7.5l-3.97-4.55c.61-.83.97-1.85.97-2.95 0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
            </svg>
          </div>
        )}

        {/* Actual image */}
        {isInViewport && (
          <img
            src={imageUrl}
            alt={alt}
            width={dimensions.width}
            height={dimensions.height}
            onLoad={handleLoad}
            onError={handleError}
            className={`
              absolute inset-0 w-full h-full object-cover
              transition-opacity duration-300
              ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'}
            `}
            draggable={false}
          />
        )}
      </div>

      {/* Zoom overlay */}
      {showZoom && (
        <ImageZoomOverlay
          bggId={bggId}
          alt={alt}
          onClose={() => setShowZoom(false)}
          anchorRect={getAnchorRect()}
        />
      )}
    </>
  );
}

export default LazyBggImage;
