/**
 * Unit tests for BggService
 * 
 * Requirements: 2.1, 2.4, 2.5
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
      const results = service.searchGames('');
      
      expect(results).toEqual([]);
      expect(mockBggCache.search).not.toHaveBeenCalled();
    });

    it('should return empty array for single character query', () => {
      const results = service.searchGames('a');
      
      expect(results).toEqual([]);
      expect(mockBggCache.search).not.toHaveBeenCalled();
    });

    /**
     * Requirement 2.5: Response includes id, name, yearPublished
     */
    it('should return results with correct structure for valid query', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Catan', yearPublished: 1995, rank: 50 },
        { id: 456, name: 'Carcassonne', yearPublished: 2000, rank: 100 },
      ]);

      const results = service.searchGames('ca');

      expect(results).toEqual([
        { id: 123, name: 'Catan', yearPublished: 1995 },
        { id: 456, name: 'Carcassonne', yearPublished: 2000 },
      ]);
      expect(mockBggCache.search).toHaveBeenCalledWith('ca', 10);
    });

    it('should handle null yearPublished', () => {
      mockBggCache.search.mockReturnValue([
        { id: 123, name: 'Test Game', yearPublished: null, rank: 50 },
      ]);

      const results = service.searchGames('test');

      expect(results).toEqual([
        { id: 123, name: 'Test Game', yearPublished: null },
      ]);
    });

    it('should return empty array when cache returns no matches', () => {
      mockBggCache.search.mockReturnValue([]);

      const results = service.searchGames('xyz');

      expect(results).toEqual([]);
      expect(mockBggCache.search).toHaveBeenCalledWith('xyz', 10);
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
