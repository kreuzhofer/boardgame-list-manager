/**
 * Custom pull-to-refresh hook for PWA standalone mode
 * Detects when app is running as installed PWA and provides touch-based refresh
 * Enhanced with smooth animations and better touch handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Pull distance to trigger refresh (default: 70px)
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  isStandalone: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Detect if app is running in standalone mode (added to home screen)
 */
export function isStandaloneMode(): boolean {
  // iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Android/Chrome standalone mode via display-mode media query
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Also check for fullscreen mode (some PWAs use this)
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isIOSStandalone || isDisplayStandalone || isFullscreen;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pullStarted = useRef(false);

  // Check standalone mode on mount
  useEffect(() => {
    setIsStandalone(isStandaloneMode());
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only trigger if at top of page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) return;
    
    startY.current = e.touches[0].clientY;
    pullStarted.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullStarted.current || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const rawDistance = currentY.current - startY.current;
    
    // Only start pulling if moving down
    if (rawDistance <= 0) {
      if (isPulling) {
        setIsPulling(false);
        setPullDistance(0);
      }
      return;
    }
    
    // Check scroll position again during move
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    
    if (!isPulling) {
      setIsPulling(true);
    }
    
    // Apply exponential resistance for natural rubber-band feel
    // More resistance as you pull further
    const maxPull = threshold * 2;
    const resistance = 1 - (rawDistance / (maxPull * 3));
    const resistedDistance = rawDistance * Math.max(resistance, 0.3);
    const clampedDistance = Math.min(resistedDistance, maxPull);
    
    setPullDistance(clampedDistance);
    
    // Prevent default scroll when pulling down
    if (rawDistance > 10) {
      e.preventDefault();
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullStarted.current) return;
    
    pullStarted.current = false;
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      // Keep a smaller distance during refresh for cleaner look
      setPullDistance(threshold * 0.7);
      
      try {
        await onRefresh();
      } finally {
        // Small delay before hiding to let animation complete
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to zero
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  // Attach touch listeners
  useEffect(() => {
    // Only enable in standalone mode
    if (!isStandalone || disabled) return;
    
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
      container.removeEventListener('touchcancel', handleTouchEnd as EventListener);
    };
  }, [isStandalone, disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    isStandalone,
    containerRef,
  };
}
