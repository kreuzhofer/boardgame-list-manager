import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from '../api/client';
import type {
  BggImportProgressEvent,
  BggImportCompleteEvent,
  BggEnrichProgressEvent,
  BggEnrichCompleteEvent,
} from '../types/adminSse';

const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

const MAX_RECONNECT_DELAY = 30000;

function calculateBackoffDelay(attempt: number): number {
  const delay = Math.pow(2, attempt - 1) * 1000;
  return Math.min(delay, MAX_RECONNECT_DELAY);
}

interface UseAdminSSEOptions {
  enabled?: boolean;
  onImportProgress?: (event: BggImportProgressEvent) => void;
  onImportComplete?: (event: BggImportCompleteEvent) => void;
  onEnrichProgress?: (event: BggEnrichProgressEvent) => void;
  onEnrichComplete?: (event: BggEnrichCompleteEvent) => void;
}

interface UseAdminSSEResult {
  isConnected: boolean;
}

export function useAdminSSE(options: UseAdminSSEOptions): UseAdminSSEResult {
  const { enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(options);

  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (!enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = getToken();
    if (!token) return;

    const url = `${getApiUrl()}/api/sse/admin?token=${encodeURIComponent(token)}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') return;

          switch (data.type) {
            case 'bgg:import-progress':
              handlersRef.current.onImportProgress?.(data);
              break;
            case 'bgg:import-complete':
              handlersRef.current.onImportComplete?.(data);
              break;
            case 'bgg:enrich-progress':
              handlersRef.current.onEnrichProgress?.(data);
              break;
            case 'bgg:enrich-complete':
              handlersRef.current.onEnrichComplete?.(data);
              break;
          }
        } catch (error) {
          console.error('Failed to parse admin SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        reconnectAttemptRef.current += 1;
        const delay = calculateBackoffDelay(reconnectAttemptRef.current);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (error) {
      console.error('Failed to create admin EventSource:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, enabled]);

  return { isConnected };
}

export default useAdminSSE;
