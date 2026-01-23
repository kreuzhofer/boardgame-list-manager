/**
 * useBggSearch hook - Search BGG games with debouncing
 * 
 * Requirements: 3.2
 */

import { useState, useEffect, useRef } from 'react';
import { bggApi } from '../api/client';
import type { BggSearchResult } from '../types';

interface UseBggSearchResult {
  results: BggSearchResult[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

/**
 * Custom hook for searching BGG games with debouncing
 * 
 * @param query - Search query string
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with results, isLoading, error state, and hasMore flag
 */
export function useBggSearch(query: string, debounceMs: number = 300): UseBggSearchResult {
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear results if query is empty or too short
    if (!query || query.length < 1) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setHasMore(false);
      return;
    }

    // Set loading state
    setIsLoading(true);
    setError(null);

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await bggApi.search(query);
        setResults(response.results);
        setHasMore(response.hasMore);
        setError(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        console.error('BGG search error:', err);
        setError('Suche fehlgeschlagen. Bitte manuell eingeben.');
        setResults([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debounceMs]);

  return { results, isLoading, error, hasMore };
}

export default useBggSearch;
