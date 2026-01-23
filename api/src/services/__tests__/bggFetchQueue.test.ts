/**
 * Unit tests for BggFetchQueue service
 * 
 * Tests the in-flight request tracking and deduplication functionality.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { BggFetchQueue, createBggFetchQueue, FetchFunction } from '../bggFetchQueue';

describe('BggFetchQueue', () => {
  let queue: BggFetchQueue;
  let mockFetchFunction: jest.Mock<Promise<void>, [number]>;

  beforeEach(() => {
    mockFetchFunction = jest.fn();
    queue = createBggFetchQueue(mockFetchFunction);
  });

  describe('enqueue', () => {
    it('should call fetchFunction for new BGG ID', async () => {
      mockFetchFunction.mockResolvedValueOnce(undefined);

      await queue.enqueue(12345);

      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
      expect(mockFetchFunction).toHaveBeenCalledWith(12345);
    });

    it('should return existing Promise for in-flight BGG ID (Requirement 2.3)', async () => {
      // Create a deferred promise we can control
      let resolvePromise: () => void;
      const deferredPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchFunction.mockReturnValueOnce(deferredPromise);

      // First call starts the fetch
      const promise1 = queue.enqueue(12345);
      
      // Second call should return the same promise
      const promise2 = queue.enqueue(12345);

      // Should be the exact same promise reference
      expect(promise1).toBe(promise2);
      
      // fetchFunction should only be called once
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);

      // Resolve to clean up
      resolvePromise!();
      await promise1;
    });

    it('should allow multiple subscribers to await the same Promise (Requirement 2.4)', async () => {
      let resolvePromise: () => void;
      const deferredPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchFunction.mockReturnValueOnce(deferredPromise);

      // Multiple "subscribers" await the same promise
      const promise1 = queue.enqueue(12345);
      const promise2 = queue.enqueue(12345);
      const promise3 = queue.enqueue(12345);

      // All should be the same promise
      expect(promise1).toBe(promise2);
      expect(promise2).toBe(promise3);

      // Resolve the promise
      resolvePromise!();

      // All should resolve successfully
      await expect(promise1).resolves.toBeUndefined();
      await expect(promise2).resolves.toBeUndefined();
      await expect(promise3).resolves.toBeUndefined();
    });

    it('should propagate success to all subscribers (Requirement 2.5)', async () => {
      mockFetchFunction.mockResolvedValueOnce(undefined);

      const results = await Promise.all([
        queue.enqueue(12345),
        queue.enqueue(12345),
        queue.enqueue(12345),
      ]);

      // All should resolve successfully
      expect(results).toEqual([undefined, undefined, undefined]);
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors to all subscribers (Requirement 2.6)', async () => {
      const error = new Error('Fetch failed');
      mockFetchFunction.mockRejectedValueOnce(error);

      const promise1 = queue.enqueue(12345);
      const promise2 = queue.enqueue(12345);

      // Both should reject with the same error
      await expect(promise1).rejects.toThrow('Fetch failed');
      await expect(promise2).rejects.toThrow('Fetch failed');
    });

    it('should remove BGG ID from map after successful completion (Requirement 2.7)', async () => {
      mockFetchFunction.mockResolvedValueOnce(undefined);

      expect(queue.isInFlight(12345)).toBe(false);

      const promise = queue.enqueue(12345);
      expect(queue.isInFlight(12345)).toBe(true);

      await promise;
      expect(queue.isInFlight(12345)).toBe(false);
    });

    it('should remove BGG ID from map after failure (Requirement 2.7)', async () => {
      mockFetchFunction.mockRejectedValueOnce(new Error('Fetch failed'));

      expect(queue.isInFlight(12345)).toBe(false);

      const promise = queue.enqueue(12345);
      expect(queue.isInFlight(12345)).toBe(true);

      await expect(promise).rejects.toThrow('Fetch failed');
      expect(queue.isInFlight(12345)).toBe(false);
    });

    it('should allow new fetch after previous one completes', async () => {
      mockFetchFunction.mockResolvedValue(undefined);

      // First fetch
      await queue.enqueue(12345);
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);

      // Second fetch for same ID (after first completed)
      await queue.enqueue(12345);
      expect(mockFetchFunction).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple different BGG IDs concurrently', async () => {
      let resolve1: () => void;
      let resolve2: () => void;
      
      mockFetchFunction
        .mockReturnValueOnce(new Promise<void>((r) => { resolve1 = r; }))
        .mockReturnValueOnce(new Promise<void>((r) => { resolve2 = r; }));

      const promise1 = queue.enqueue(12345);
      const promise2 = queue.enqueue(67890);

      expect(queue.isInFlight(12345)).toBe(true);
      expect(queue.isInFlight(67890)).toBe(true);
      expect(queue.getInFlightCount()).toBe(2);

      // Resolve in different order
      resolve2!();
      await promise2;
      expect(queue.isInFlight(12345)).toBe(true);
      expect(queue.isInFlight(67890)).toBe(false);

      resolve1!();
      await promise1;
      expect(queue.isInFlight(12345)).toBe(false);
      expect(queue.getInFlightCount()).toBe(0);
    });
  });

  describe('isInFlight', () => {
    it('should return false for BGG ID not in queue', () => {
      expect(queue.isInFlight(12345)).toBe(false);
    });

    it('should return true for BGG ID currently being fetched', async () => {
      let resolvePromise: () => void;
      mockFetchFunction.mockReturnValueOnce(
        new Promise<void>((resolve) => { resolvePromise = resolve; })
      );

      queue.enqueue(12345);
      expect(queue.isInFlight(12345)).toBe(true);

      resolvePromise!();
    });
  });

  describe('getInFlightCount', () => {
    it('should return 0 when no requests are in flight', () => {
      expect(queue.getInFlightCount()).toBe(0);
    });

    it('should return correct count of in-flight requests', async () => {
      mockFetchFunction.mockReturnValue(new Promise(() => {})); // Never resolves

      queue.enqueue(1);
      expect(queue.getInFlightCount()).toBe(1);

      queue.enqueue(2);
      expect(queue.getInFlightCount()).toBe(2);

      queue.enqueue(3);
      expect(queue.getInFlightCount()).toBe(3);

      // Same ID shouldn't increase count
      queue.enqueue(1);
      expect(queue.getInFlightCount()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all in-flight requests', () => {
      mockFetchFunction.mockReturnValue(new Promise(() => {})); // Never resolves

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);
      expect(queue.getInFlightCount()).toBe(3);

      queue.clear();
      expect(queue.getInFlightCount()).toBe(0);
      expect(queue.isInFlight(1)).toBe(false);
      expect(queue.isInFlight(2)).toBe(false);
      expect(queue.isInFlight(3)).toBe(false);
    });
  });

  describe('createBggFetchQueue factory', () => {
    it('should create a new BggFetchQueue instance', () => {
      const fetchFn: FetchFunction = async () => {};
      const queue = createBggFetchQueue(fetchFn);
      
      expect(queue).toBeInstanceOf(BggFetchQueue);
    });
  });
});
