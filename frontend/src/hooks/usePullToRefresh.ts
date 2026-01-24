/**
 * Custom pull-to-refresh hook for PWA standalone mode
 * Detects when app is running as installed PWA and provides touch-based refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Pull distance to trigger refresh (default: 80px)
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
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

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
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance to make it feel natural
    const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
    setPullDistance(resistedDistance);
    
    // Prevent default scroll when pulling down
    if (distance > 0 && window.scrollY <= 0) {
      e.preventDefault();
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  // Attach touch listeners
  useEffect(() => {
    // Only enable in standalone mode
    if (!isStandalone || disabled) return;
    
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
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
