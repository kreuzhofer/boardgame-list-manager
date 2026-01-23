/**
 * BggFetchQueue - Manages in-flight requests to prevent duplicate fetches
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 * 
 * This service maintains a queue that processes fetch requests and tracks
 * in-flight requests using an in-memory map of BGG ID to Promise.
 * When multiple requests arrive for the same uncached BGG ID, all requests
 * subscribe to (await) the same Promise.
 */

/**
 * Type for the fetch function that will be injected
 * This function performs the actual fetch from BGG
 */
export type FetchFunction = (bggId: number) => Promise<void>;

/**
 * BggFetchQueue class
 * 
 * Manages in-flight requests to prevent duplicate fetches for the same BGG ID.
 * Uses a Map to track which BGG IDs are currently being fetched.
 */
class BggFetchQueue {
  /**
   * Map of BGG ID to in-flight Promise
   * Requirement 2.2: Track in-flight requests using an in-memory map
   */
  private inFlightMap: Map<number, Promise<void>> = new Map();

  /**
   * The function that performs the actual fetch
   */
  private fetchFunction: FetchFunction;

  /**
   * Create a new BggFetchQueue
   * @param fetchFunction - Function that performs the actual fetch from BGG
   */
  constructor(fetchFunction: FetchFunction) {
    this.fetchFunction = fetchFunction;
  }

  /**
   * Enqueue a fetch request. Returns existing promise if already in-flight.
   * 
   * Requirement 2.3: When a fetch request arrives for a BGG ID that already has
   *                  an in-flight Promise, return the existing Promise instead
   *                  of starting a new fetch
   * Requirement 2.4: When multiple API requests arrive for the same uncached BGG ID,
   *                  all requests subscribe to (await) the same Promise
   * Requirement 2.5: When the fetch Promise resolves (success), all subscribed
   *                  requests receive the cached image path
   * Requirement 2.6: When the fetch Promise rejects (failure), all subscribed
   *                  requests receive the error
   * Requirement 2.7: When a fetch completes (success or failure), remove the
   *                  BGG ID from the in-flight map
   * 
   * @param bggId - BoardGameGeek game ID
   * @returns Promise that resolves when images are cached
   */
  enqueue(bggId: number): Promise<void> {
    // Requirement 2.3: Return existing Promise if already in-flight
    const existingPromise = this.inFlightMap.get(bggId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new fetch Promise
    const fetchPromise = this.fetchFunction(bggId)
      .finally(() => {
        // Requirement 2.7: Remove from map after completion (success or failure)
        this.inFlightMap.delete(bggId);
      });

    // Add to in-flight map
    this.inFlightMap.set(bggId, fetchPromise);

    return fetchPromise;
  }

  /**
   * Check if a fetch is currently in progress for a BGG ID
   * 
   * @param bggId - BoardGameGeek game ID
   * @returns true if a fetch is in progress, false otherwise
   */
  isInFlight(bggId: number): boolean {
    return this.inFlightMap.has(bggId);
  }

  /**
   * Get the number of in-flight requests (for testing/monitoring)
   */
  getInFlightCount(): number {
    return this.inFlightMap.size;
  }

  /**
   * Clear all in-flight requests (for testing purposes)
   */
  clear(): void {
    this.inFlightMap.clear();
  }
}

// Factory function to create a BggFetchQueue instance
export function createBggFetchQueue(fetchFunction: FetchFunction): BggFetchQueue {
  return new BggFetchQueue(fetchFunction);
}

export { BggFetchQueue };
