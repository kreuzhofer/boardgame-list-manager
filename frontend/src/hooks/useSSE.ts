import { useEffect, useRef, useCallback, useState } from 'react';
import type { SSEEvent, GameCreatedEvent } from '../types';
import { getToastMessage, shouldShowToast } from '../utils';

// Get API URL from environment variable
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

// Maximum reconnection delay in milliseconds
const MAX_RECONNECT_DELAY = 30000;

/**
 * Calculate exponential backoff delay
 * Formula: min(2^(attempt-1) * 1000, MAX_RECONNECT_DELAY)
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = Math.pow(2, attempt - 1) * 1000;
  return Math.min(delay, MAX_RECONNECT_DELAY);
}

interface SSEEventHandlers {
  onGameCreated?: (event: GameCreatedEvent) => void;
  onGameUpdated?: (event: SSEEvent) => void;
  onGameDeleted?: (event: SSEEvent) => void;
  onToast?: (message: string) => void;
}

interface UseSSEOptions {
  currentUserId: string;
  handlers: SSEEventHandlers;
  enabled?: boolean;
}

interface UseSSEResult {
  isConnected: boolean;
  connectionError: Error | null;
}

/**
 * useSSE - Custom hook for managing SSE connection lifecycle and event handling
 * 
 * Features:
 * - Establishes EventSource connection to /api/events
 * - Parses incoming events and calls appropriate handlers
 * - Filters out events from current user for toasts
 * - Implements exponential backoff reconnection (1s, 2s, 4s... max 30s)
 * - Cleans up connection on unmount
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.8, 6.1, 6.2
 */
export function useSSE(options: UseSSEOptions): UseSSEResult {
  const { currentUserId, handlers, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  
  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${getApiUrl()}/api/events`;
    
    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip connection confirmation messages
          if (data.type === 'connected') {
            return;
          }

          const sseEvent = data as SSEEvent;
          
          // Handle toast notifications (only for other users' actions)
          if (shouldShowToast(sseEvent) && sseEvent.userId !== currentUserId) {
            const message = getToastMessage(sseEvent);
            if (message && handlersRef.current.onToast) {
              handlersRef.current.onToast(message);
            }
          }

          // Handle game events
          switch (sseEvent.type) {
            case 'game:created':
              handlersRef.current.onGameCreated?.(sseEvent as GameCreatedEvent);
              break;
            case 'game:bringer-added':
            case 'game:bringer-removed':
            case 'game:player-added':
            case 'game:player-removed':
              handlersRef.current.onGameUpdated?.(sseEvent);
              break;
            case 'game:deleted':
              handlersRef.current.onGameDeleted?.(sseEvent);
              break;
          }
        } catch (error) {
          // Log malformed event and continue
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnection with exponential backoff
        reconnectAttemptRef.current += 1;
        const delay = calculateBackoffDelay(reconnectAttemptRef.current);
        
        setConnectionError(new Error(`SSE connection failed. Reconnecting in ${delay / 1000}s...`));
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (error) {
      setConnectionError(error instanceof Error ? error : new Error('Failed to create EventSource'));
    }
  }, [enabled, currentUserId]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled && currentUserId) {
      connect();
    }

    return () => {
      // Clean up on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, enabled, currentUserId]);

  return {
    isConnected,
    connectionError,
  };
}

export default useSSE;
