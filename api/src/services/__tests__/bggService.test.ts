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
    getDataSource: jest.fn(),
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
    mockBggCache.getDataSource.mockReturnValue('csv');
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
     * Feature: 014-alternate-names-search - Also includes matchedAlternateName and alternateNames
     */
    it('should return results with correct structure for valid query', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rating: 7.2, matchedAlternateName: null, alternateNames: [] },
        { id: 456, name: 'Carcassonne', yearPublished: 2000, rating: 7.4, matchedAlternateName: null, alternateNames: [] },
      ]);

      const response = service.searchGames('ca');

      expect(response.results).toEqual([
        { id: 123, name: 'Catan', yearPublished: 1995, rating: 7.2, matchedAlternateName: null, alternateNames: [] },
        { id: 456, name: 'Carcassonne', yearPublished: 2000, rating: 7.4, matchedAlternateName: null, alternateNames: [] },
      ]);
      expect(mockBggCache.search).toHaveBeenCalledWith('ca', 31);
    });

    it('should handle null yearPublished', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Test Game', yearPublished: null, rating: 6.5, matchedAlternateName: null, alternateNames: [] },
      ]);

      const response = service.searchGames('test');

      expect(response.results).toEqual([
        { id: 123, name: 'Test Game', yearPublished: null, rating: 6.5, matchedAlternateName: null, alternateNames: [] },
      ]);
    });

    /**
     * Feature: bgg-rating-badge
     * Requirement 1.5: Search results include rating field
     */
    it('should include rating in search results', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rating: 7.2, matchedAlternateName: null, alternateNames: [] },
      ]);

      const response = service.searchGames('catan');

      expect(response.results[0]).toHaveProperty('rating', 7.2);
    });

    it('should handle null rating in search results', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Test Game', yearPublished: 2020, rating: null, matchedAlternateName: null, alternateNames: [] },
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
        rating: 7.0,
        matchedAlternateName: null,
        alternateNames: [],
      }));
      mockBggCache.search.mockReturnValue(manyResults);

      const response = service.searchGames('test');

      expect(response.hasMore).toBe(true);
      expect(response.results.length).toBe(30);
    });

    it('should set hasMore to false when no more results exist', () => {
      mockBggCache.search.mockReturnValue([
        { id: 1, name: 'Test Game', yearPublished: 2020, rating: 7.0, matchedAlternateName: null, alternateNames: [] },
      ]);

      const response = service.searchGames('test');

      expect(response.hasMore).toBe(false);
    });

    /**
     * Feature: 014-alternate-names-search
     * Test that alternate name info is included in results
     */
    it('should include matchedAlternateName when present', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rating: 7.2, matchedAlternateName: 'Die Siedler von Catan', alternateNames: ['Die Siedler von Catan', 'カタン'] },
      ]);

      const response = service.searchGames('siedler');

      expect(response.results[0].matchedAlternateName).toBe('Die Siedler von Catan');
      expect(response.results[0].alternateNames).toEqual(['Die Siedler von Catan', 'カタン']);
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
