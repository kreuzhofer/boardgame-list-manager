/**
 * ClickNotification component
 * A reusable notification bubble that appears near a click point and auto-dismisses
 * Useful for showing contextual feedback when an action cannot be performed
 */

import { useState, useCallback, type ReactNode, type MouseEvent } from 'react';

interface ClickNotificationProps {
  /** The message to display in the notification */
  message: string;
  /** Duration in ms before auto-dismiss (default: 3000) */
  duration?: number;
  /** The child element that triggers the notification on click */
  children: ReactNode;
  /** Whether the notification is enabled (if false, clicks pass through normally) */
  enabled?: boolean;
  /** Optional callback when notification is shown */
  onShow?: () => void;
}

/**
 * ClickNotification - Shows a temporary notification bubble near the click point
 * 
 * Usage:
 * ```tsx
 * <ClickNotification 
 *   message="Cannot delete: other users are registered"
 *   enabled={!canDelete}
 * >
 *   <button disabled={!canDelete}>Delete</button>
 * </ClickNotification>
 * ```
 */
export function ClickNotification({
  message,
  duration = 3000,
  children,
  enabled = true,
  onShow,
}: ClickNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
    // Prevent the click from propagating to the disabled button
    e.stopPropagation();
    e.preventDefault();
    
    // Show notification
    setIsVisible(true);
    onShow?.();
    
    // Auto-dismiss after duration
    setTimeout(() => {
      setIsVisible(false);
    }, duration);
  }, [enabled, duration, onShow]);

  return (
    <div className="relative inline-block">
      {/* Clickable overlay when enabled */}
      {enabled && (
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleClick}
        />
      )}
      
      {children}
      
      {/* Notification bubble */}
      {isVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in-up"
          role="alert"
        >
          <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg w-48 text-center">
            {message}
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-800" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClickNotification;
