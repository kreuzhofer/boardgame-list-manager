/**
 * Pull-to-refresh indicator component for PWA standalone mode
 * Shows a visual indicator when user pulls down to refresh
 */

import { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isStandalone, containerRef } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  });

  // Don't render the indicator wrapper if not in standalone mode
  if (!isStandalone) {
    return <>{children}</>;
  }

  const showIndicator = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / 80, 1);
  const rotation = isRefreshing ? 0 : progress * 360;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {showIndicator && (
        <div 
          className="absolute left-0 right-0 flex justify-center z-40 pointer-events-none"
          style={{ 
            top: -40,
            transform: `translateY(${pullDistance}px)`,
            opacity: Math.min(progress * 2, 1),
          }}
        >
          <div className="bg-blue-600 rounded-full p-2 shadow-lg">
            <svg
              className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: isRefreshing ? undefined : `rotate(${rotation}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>
      )}
      
      {/* Content with transform when pulling */}
      <div 
        style={{ 
          transform: showIndicator ? `translateY(${pullDistance}px)` : undefined,
          transition: !showIndicator ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
