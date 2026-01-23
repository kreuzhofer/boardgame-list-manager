/**
 * Property-based tests for BggFetchQueue service
 * 
 * Feature: bgg-game-thumbnails
 * 
 * These tests verify correctness properties for the fetch queue's
 * request deduplication and subscriber notification behavior using
 * fast-check to generate random inputs.
 * 
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import * as fc from 'fast-check';
import { createBggFetchQueue, FetchFunction } from '../bggFetchQueue';

/**
 * Arbitrary for valid BGG IDs (positive integers)
 */
const bggIdArbitrary = fc.integer({ min: 1, max: 999999 });

/**
 * Arbitrary for number of concurrent subscribers (2-10)
 */
const subscriberCountArbitrary = fc.integer({ min: 2, max: 10 });

describe('BggFetchQueue Property Tests', () => {
  /**
   * Feature: bgg-game-thumbnails, Property 4: Request deduplication
   * 
   * For any set of concurrent requests for the same uncached BGG ID, 
   * only one fetch should occur, and all requests should receive the same Promise.
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  describe('Feature: bgg-game-thumbnails, Property 4: Request deduplication', () => {
    it('should return the same Promise for concurrent requests with the same BGG ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          subscriberCountArbitrary,
          async (bggId, subscriberCount) => {
            let fetchCallCount = 0;
            let resolvePromise: () => void;
            
            // Create a deferred promise we can control
            const deferredPromise = new Promise<void>((resolve) => {
              resolvePromise = resolve;
            });
            
            const mockFetchFunction: FetchFunction = async () => {
              fetchCallCount++;
              return deferredPromise;
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Make multiple concurrent requests for the same BGG ID
            const promises: Promise<void>[] = [];
            for (let i = 0; i < subscriberCount; i++) {
              promises.push(queue.enqueue(bggId));
            }
            
            // All promises should be the exact same reference
            const firstPromise = promises[0];
            const allSamePromise = promises.every(p => p === firstPromise);
            
            // Fetch function should only be called once
            const singleFetchCall = fetchCallCount === 1;
            
            // Resolve to clean up
            resolvePromise!();
            await Promise.all(promises);
            
            return allSamePromise && singleFetchCall;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should call fetchFunction exactly once for concurrent requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          fc.integer({ min: 3, max: 8 }),
          async (bggId, concurrentRequests) => {
            let fetchCallCount = 0;
            let resolvePromise: () => void;
            
            const deferredPromise = new Promise<void>((resolve) => {
              resolvePromise = resolve;
            });
            
            const mockFetchFunction: FetchFunction = async () => {
              fetchCallCount++;
              return deferredPromise;
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Fire off multiple concurrent requests
            const promises = Array.from({ length: concurrentRequests }, () => 
              queue.enqueue(bggId)
            );
            
            // Resolve and wait for all
            resolvePromise!();
            await Promise.all(promises);
            
            // Should have called fetch exactly once
            return fetchCallCount === 1;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle different BGG IDs independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(bggIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (bggIds) => {
            // Deduplicate BGG IDs
            const uniqueBggIds = [...new Set(bggIds)];
            if (uniqueBggIds.length < 2) return true;
            
            const fetchCalls: number[] = [];
            const resolvers: Map<number, () => void> = new Map();
            
            const mockFetchFunction: FetchFunction = async (id) => {
              fetchCalls.push(id);
              return new Promise<void>((resolve) => {
                resolvers.set(id, resolve);
              });
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Make requests for each unique BGG ID
            const promises = uniqueBggIds.map(id => queue.enqueue(id));
            
            // Each unique ID should trigger exactly one fetch
            const correctFetchCount = fetchCalls.length === uniqueBggIds.length;
            const allIdsRequested = uniqueBggIds.every(id => fetchCalls.includes(id));
            
            // Resolve all to clean up
            resolvers.forEach(resolve => resolve());
            await Promise.all(promises);
            
            return correctFetchCount && allIdsRequested;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: bgg-game-thumbnails, Property 5: Subscriber notification
   * 
   * For any in-flight fetch request with multiple subscribers, when the fetch 
   * completes (success or failure), all subscribers should receive the same result.
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  describe('Feature: bgg-game-thumbnails, Property 5: Subscriber notification', () => {
    it('should notify all subscribers with success when fetch succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          subscriberCountArbitrary,
          async (bggId, subscriberCount) => {
            const mockFetchFunction: FetchFunction = async () => {
              // Simulate some async work
              await new Promise(resolve => setTimeout(resolve, 1));
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Create multiple subscribers
            const promises = Array.from({ length: subscriberCount }, () => 
              queue.enqueue(bggId)
            );
            
            // All should resolve successfully
            const results = await Promise.allSettled(promises);
            
            // All should be fulfilled (not rejected)
            return results.every(r => r.status === 'fulfilled');
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should notify all subscribers with the same error when fetch fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          subscriberCountArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (bggId, subscriberCount, errorMessage) => {
            const expectedError = new Error(errorMessage);
            
            const mockFetchFunction: FetchFunction = async () => {
              throw expectedError;
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Create multiple subscribers
            const promises = Array.from({ length: subscriberCount }, () => 
              queue.enqueue(bggId)
            );
            
            // All should reject
            const results = await Promise.allSettled(promises);
            
            // All should be rejected with the same error
            const allRejected = results.every(r => r.status === 'rejected');
            const allSameError = results.every(r => 
              r.status === 'rejected' && r.reason === expectedError
            );
            
            return allRejected && allSameError;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should propagate the exact same error instance to all subscribers', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          fc.integer({ min: 2, max: 6 }),
          async (bggId, subscriberCount) => {
            const uniqueError = new Error(`Fetch failed for ${bggId}`);
            
            const mockFetchFunction: FetchFunction = async () => {
              throw uniqueError;
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Collect errors from all subscribers
            const errors: Error[] = [];
            const promises = Array.from({ length: subscriberCount }, () => 
              queue.enqueue(bggId).catch(err => {
                errors.push(err);
                throw err;
              })
            );
            
            await Promise.allSettled(promises);
            
            // All errors should be the exact same instance
            return errors.length === subscriberCount && 
                   errors.every(err => err === uniqueError);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: bgg-game-thumbnails, Property 6: Queue cleanup
   * 
   * For any completed fetch operation (success or failure), the BGG ID should 
   * be removed from the in-flight map, allowing future requests to trigger new fetches.
   * 
   * **Validates: Requirements 2.7**
   */
  describe('Feature: bgg-game-thumbnails, Property 6: Queue cleanup', () => {
    it('should remove BGG ID from in-flight map after successful completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          async (bggId) => {
            const mockFetchFunction: FetchFunction = async () => {
              await new Promise(resolve => setTimeout(resolve, 1));
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Before enqueue, should not be in flight
            const beforeEnqueue = !queue.isInFlight(bggId);
            
            // Start the fetch
            const promise = queue.enqueue(bggId);
            
            // During fetch, should be in flight
            const duringFetch = queue.isInFlight(bggId);
            
            // Wait for completion
            await promise;
            
            // After completion, should not be in flight
            const afterCompletion = !queue.isInFlight(bggId);
            
            return beforeEnqueue && duringFetch && afterCompletion;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should remove BGG ID from in-flight map after failed completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          async (bggId) => {
            const mockFetchFunction: FetchFunction = async () => {
              throw new Error('Fetch failed');
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Before enqueue, should not be in flight
            const beforeEnqueue = !queue.isInFlight(bggId);
            
            // Start the fetch
            const promise = queue.enqueue(bggId);
            
            // During fetch, should be in flight
            const duringFetch = queue.isInFlight(bggId);
            
            // Wait for completion (will reject)
            try {
              await promise;
            } catch {
              // Expected to fail
            }
            
            // After completion, should not be in flight
            const afterCompletion = !queue.isInFlight(bggId);
            
            return beforeEnqueue && duringFetch && afterCompletion;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should allow new fetch after previous one completes', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          fc.integer({ min: 2, max: 4 }),
          async (bggId, fetchCount) => {
            let callCount = 0;
            
            const mockFetchFunction: FetchFunction = async () => {
              callCount++;
              await new Promise(resolve => setTimeout(resolve, 1));
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Perform sequential fetches for the same BGG ID
            for (let i = 0; i < fetchCount; i++) {
              await queue.enqueue(bggId);
              // After each completion, should not be in flight
              if (queue.isInFlight(bggId)) {
                return false;
              }
            }
            
            // Each sequential fetch should trigger a new call
            return callCount === fetchCount;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should correctly track in-flight count across multiple BGG IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(bggIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (bggIds) => {
            // Deduplicate BGG IDs
            const uniqueBggIds = [...new Set(bggIds)];
            if (uniqueBggIds.length < 2) return true;
            
            const resolvers: Map<number, () => void> = new Map();
            
            const mockFetchFunction: FetchFunction = async (id) => {
              return new Promise<void>((resolve) => {
                resolvers.set(id, resolve);
              });
            };
            
            const queue = createBggFetchQueue(mockFetchFunction);
            
            // Start fetches for all unique IDs
            const promises = uniqueBggIds.map(id => queue.enqueue(id));
            
            // All should be in flight
            const allInFlight = uniqueBggIds.every(id => queue.isInFlight(id));
            const correctCount = queue.getInFlightCount() === uniqueBggIds.length;
            
            // Resolve all
            resolvers.forEach(resolve => resolve());
            await Promise.all(promises);
            
            // None should be in flight after completion
            const noneInFlight = uniqueBggIds.every(id => !queue.isInFlight(id));
            const zeroCount = queue.getInFlightCount() === 0;
            
            return allInFlight && correctCount && noneInFlight && zeroCount;
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
