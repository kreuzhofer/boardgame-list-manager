/**
 * Unit tests for BggService
 * 
 * Requirements: 2.1, 2.4, 2.5
 * Feature: bgg-static-data-integration, bgg-rating-badge
 */

import { BggService } from '../bggService';

// Mock the bggCache module
jest.mock('../bggCache', () => {
  const mockCache = {
    search: jest.fn(),
    isLoaded: jest.fn(),
    getCount: jest.fn(),
  };
  return {
    bggCache: mockCache,
    BggCache: jest.fn(),
  };
});

import { bggCache } from '../bggCache';

describe('BggService', () => {
  let service: BggService;
  const mockBggCache = bggCache as jest.Mocked<typeof bggCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BggService();
  });

  describe('searchGames', () => {
    /**
     * Requirement 2.4: Return empty array for queries < 2 characters
     */
    it('should return empty array for empty query', () => {
      const response = service.searchGames('');
      
      expect(response).toEqual({ results: [], hasMore: false });
      expect(mockBggCache.search).not.toHaveBeenCalled();
    });

    it('should return empty array for single character query', () => {
      const response = service.searchGames('a');
      
      expect(response).toEqual({ results: [], hasMore: false });
      expect(mockBggCache.search).not.toHaveBeenCalled();
    });

    /**
     * Requirement 2.5: Response includes id, name, yearPublished, rating
     */
    it('should return results with correct structure for valid query', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rank: 50, rating: 7.2 },
        { id: 456, name: 'Carcassonne', yearPublished: 2000, rank: 100, rating: 7.4 },
      ]);

      const response = service.searchGames('ca');

      expect(response.results).toEqual([
        { id: 123, name: 'Catan', yearPublished: 1995, rating: 7.2 },
        { id: 456, name: 'Carcassonne', yearPublished: 2000, rating: 7.4 },
      ]);
      expect(mockBggCache.search).toHaveBeenCalledWith('ca', 31);
    });

    it('should handle null yearPublished', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Test Game', yearPublished: null, rank: 50, rating: 6.5 },
      ]);

      const response = service.searchGames('test');

      expect(response.results).toEqual([
        { id: 123, name: 'Test Game', yearPublished: null, rating: 6.5 },
      ]);
    });

    /**
     * Feature: bgg-rating-badge
     * Requirement 1.5: Search results include rating field
     */
    it('should include rating in search results', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rank: 50, rating: 7.2 },
      ]);

      const response = service.searchGames('catan');

      expect(response.results[0]).toHaveProperty('rating', 7.2);
    });

    it('should handle null rating in search results', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Test Game', yearPublished: 2020, rank: 50, rating: null },
      ]);

      const response = service.searchGames('test');

      expect(response.results[0]).toHaveProperty('rating', null);
    });

    it('should return empty results when cache returns no matches', () => {
      mockBggCache.search.mockReturnValue([]);

      const response = service.searchGames('xyz');

      expect(response).toEqual({ results: [], hasMore: false });
      expect(mockBggCache.search).toHaveBeenCalledWith('xyz', 31);
    });

    it('should set hasMore to true when more results exist', () => {
      // Return 31 results to trigger hasMore
      const manyResults = Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        name: `Test Game ${i}`,
        yearPublished: 2020,
        rank: i + 1,
        rating: 7.0,
      }));
      mockBggCache.search.mockReturnValue(manyResults);

      const response = service.searchGames('test');

      expect(response.hasMore).toBe(true);
      expect(response.results.length).toBe(30);
    });

    it('should set hasMore to false when no more results exist', () => {
      mockBggCache.search.mockReturnValue([
        { id: 1, name: 'Test Game', yearPublished: 2020, rank: 1, rating: 7.0 },
      ]);

      const response = service.searchGames('test');

      expect(response.hasMore).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return true when cache is loaded', () => {
      mockBggCache.isLoaded.mockReturnValue(true);

      expect(service.isReady()).toBe(true);
    });

    it('should return false when cache is not loaded', () => {
      mockBggCache.isLoaded.mockReturnValue(false);

      expect(service.isReady()).toBe(false);
    });
  });

  describe('getGameCount', () => {
    it('should return the count from cache', () => {
      mockBggCache.getCount.mockReturnValue(150000);

      expect(service.getGameCount()).toBe(150000);
    });
  });
});
