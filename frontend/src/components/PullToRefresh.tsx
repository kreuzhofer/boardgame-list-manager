/**
 * Pull-to-refresh indicator component for PWA standalone mode
 * Shows a visual indicator when user pulls down to refresh
 * Enhanced with smooth animations and polished feel
 */

import { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const THRESHOLD = 70;

export function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isStandalone, isPulling, containerRef } = usePullToRefresh({
    onRefresh,
    threshold: THRESHOLD,
    disabled,
  });

  // Don't render the indicator wrapper if not in standalone mode
  if (!isStandalone) {
    return <>{children}</>;
  }

  const showIndicator = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isReady = progress >= 1;
  
  // Smooth eased rotation based on pull progress
  const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
  const rotation = easedProgress * 540; // 1.5 rotations for more dynamic feel
  
  // Scale grows as you pull, with a subtle bounce when ready
  const scale = isRefreshing 
    ? 1 
    : isReady 
      ? 1.1 
      : 0.5 + (easedProgress * 0.5);
  
  // Opacity fades in smoothly
  const opacity = Math.min(easedProgress * 1.5, 1);
  
  // Indicator position - starts hidden above, comes down smoothly
  const indicatorY = isRefreshing 
    ? THRESHOLD * 0.6 
    : Math.min(pullDistance * 0.8, THRESHOLD * 0.8);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center z-40 pointer-events-none"
        style={{ 
          top: 0,
          transform: `translateY(${indicatorY - 50}px)`,
          opacity: showIndicator ? opacity : 0,
          transition: isPulling 
            ? 'opacity 0.1s ease-out' 
            : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out',
        }}
      >
        <div 
          className={`rounded-full p-2.5 shadow-lg transition-colors duration-200 ${
            isReady || isRefreshing ? 'bg-blue-600' : 'bg-blue-500'
          }`}
          style={{
            transform: `scale(${scale})`,
            transition: isPulling 
              ? 'transform 0.1s ease-out, background-color 0.2s' 
              : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s',
            boxShadow: isReady || isRefreshing 
              ? '0 4px 20px rgba(37, 99, 235, 0.4)' 
              : '0 2px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <svg
            className="w-6 h-6 text-white"
            style={{ 
              transform: `rotate(${isRefreshing ? 0 : rotation}deg)`,
              transition: isPulling ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>
      
      {/* Content with smooth transform when pulling */}
      <div 
        style={{ 
          transform: showIndicator ? `translateY(${pullDistance * 0.4}px)` : 'translateY(0)',
          transition: isPulling 
            ? 'none' 
            : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
      
      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PullToRefresh;
