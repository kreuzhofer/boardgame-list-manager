/**
 * Unit tests for BggService alternate names functionality
 * Feature: 014-alternate-names-search
 * 
 * Tests API response format for alternate names
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import { bggCache, BggGameWithAlternates } from '../bggCache';

describe('BggService Alternate Names - Unit Tests', () => {
  beforeEach(() => {
    bggCache.reset();
  });

  afterEach(() => {
    bggCache.reset();
  });

  describe('API Response Format', () => {
    it('includes matchedAlternateName field in search results', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 1,
          name: 'Catan',
          yearPublished: 1995,
          rank: 1,
          rating: 7.2,
          alternateNames: ['Die Siedler von Catan'],
        },
      ];

      bggCache.loadGames(games);

      // Search by alternate name
      const results = bggCache.search('Siedler');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('matchedAlternateName');
      expect(results[0].matchedAlternateName).toBe('Die Siedler von Catan');
    });

    it('includes alternateNames array in search results', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 1,
          name: 'Catan',
          yearPublished: 1995,
          rank: 1,
          rating: 7.2,
          alternateNames: ['Die Siedler von Catan', 'Settlers of Catan'],
        },
      ];

      bggCache.loadGames(games);

      const results = bggCache.search('Catan');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('alternateNames');
      expect(results[0].alternateNames).toEqual(['Die Siedler von Catan', 'Settlers of Catan']);
    });

    it('maintains backward compatibility with existing fields', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 123,
          name: 'Test Game',
          yearPublished: 2020,
          rank: 50,
          rating: 8.5,
          alternateNames: [],
        },
      ];

      bggCache.loadGames(games);

      const results = bggCache.search('Test Game');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      
      // Existing fields should still be present
      expect(result).toHaveProperty('id', 123);
      expect(result).toHaveProperty('name', 'Test Game');
      expect(result).toHaveProperty('yearPublished', 2020);
      expect(result).toHaveProperty('rating', 8.5);
    });

    it('returns null for matchedAlternateName when primary name matches', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 1,
          name: 'Catan',
          yearPublished: 1995,
          rank: 1,
          rating: 7.2,
          alternateNames: ['Die Siedler von Catan'],
        },
      ];

      bggCache.loadGames(games);

      // Search by primary name
      const results = bggCache.search('Catan');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedAlternateName).toBeNull();
    });

    it('returns exact alternate name that matched in matchedAlternateName', () => {
      const games: BggGameWithAlternates[] = [
        {
          id: 1,
          name: 'Catan',
          yearPublished: 1995,
          rank: 1,
          rating: 7.2,
          alternateNames: ['Die Siedler von Catan', 'カタンの開拓者たち'],
        },
      ];

      bggCache.loadGames(games);

      // Search by German alternate name
      const results = bggCache.search('Siedler');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedAlternateName).toBe('Die Siedler von Catan');
    });
  });
});
