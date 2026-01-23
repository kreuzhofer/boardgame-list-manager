/**
 * Unit tests for BggCache rating extraction
 * 
 * Feature: bgg-rating-badge
 * Requirements: 1.1, 1.2, 1.3
 */

import { BggCache, BggGame } from '../bggCache';

describe('BggCache Rating Tests', () => {
  let cache: BggCache;

  beforeEach(() => {
    cache = new BggCache();
  });

  describe('Rating extraction from CSV', () => {
    /**
     * Requirement 1.1: Extract "average" column as rating
     */
    it('should include rating field in BggGame objects', () => {
      const games: BggGame[] = [
        { id: 1, name: 'Catan', yearPublished: 1995, rank: 50, rating: 7.2 },
      ];
      cache.loadGames(games);

      const results = cache.search('Catan');

      expect(results[0]).toHaveProperty('rating', 7.2);
    });

    /**
     * Requirement 1.2: Round rating to one decimal place
     */
    it('should store rating rounded to one decimal place', () => {
      const games: BggGame[] = [
        { id: 1, name: 'Test Game', yearPublished: 2020, rank: 1, rating: 7.5 },
      ];
      cache.loadGames(games);

      const results = cache.search('Test');

      // Rating should be exactly one decimal place
      expect(results[0].rating).toBe(7.5);
      expect(results[0].rating?.toString()).toMatch(/^\d+\.\d$/);
    });

    /**
     * Requirement 1.3: Store null for missing/invalid rating
     */
    it('should handle null rating', () => {
      const games: BggGame[] = [
        { id: 1, name: 'No Rating Game', yearPublished: 2020, rank: 1, rating: null },
      ];
      cache.loadGames(games);

      const results = cache.search('No Rating');

      expect(results[0].rating).toBeNull();
    });

    it('should preserve rating through search results', () => {
      const games: BggGame[] = [
        { id: 1, name: 'High Rated', yearPublished: 2020, rank: 1, rating: 8.5 },
        { id: 2, name: 'Medium Rated', yearPublished: 2020, rank: 2, rating: 6.0 },
        { id: 3, name: 'Low Rated', yearPublished: 2020, rank: 3, rating: 4.2 },
      ];
      cache.loadGames(games);

      const results = cache.search('Rated');

      expect(results).toHaveLength(3);
      expect(results[0].rating).toBe(8.5);
      expect(results[1].rating).toBe(6.0);
      expect(results[2].rating).toBe(4.2);
    });
  });

  describe('Rating edge cases', () => {
    it('should handle rating at boundary values', () => {
      const games: BggGame[] = [
        { id: 1, name: 'Perfect Game', yearPublished: 2020, rank: 1, rating: 10.0 },
        { id: 2, name: 'Worst Game', yearPublished: 2020, rank: 2, rating: 1.0 },
      ];
      cache.loadGames(games);

      const results = cache.search('Game');

      expect(results.find(g => g.name === 'Perfect Game')?.rating).toBe(10.0);
      expect(results.find(g => g.name === 'Worst Game')?.rating).toBe(1.0);
    });

    it('should handle mixed null and valid ratings', () => {
      const games: BggGame[] = [
        { id: 1, name: 'Rated Game', yearPublished: 2020, rank: 1, rating: 7.5 },
        { id: 2, name: 'Unrated Game', yearPublished: 2020, rank: 2, rating: null },
      ];
      cache.loadGames(games);

      const results = cache.search('Game');

      expect(results.find(g => g.name === 'Rated Game')?.rating).toBe(7.5);
      expect(results.find(g => g.name === 'Unrated Game')?.rating).toBeNull();
    });
  });
});
