/**
 * Unit tests for game status derivation utilities
 * 
 * **Validates: Requirements 4.1, 4.2, 4.6**
 */

import { describe, it, expect } from 'vitest';
import { deriveGameStatus, isWunschGame, shouldShowDuplicateHint } from '../gameStatus';
import type { Game } from '../../types';

describe('gameStatus utilities', () => {
  describe('deriveGameStatus', () => {
    it('should return "wunsch" when bringersCount is 0', () => {
      expect(deriveGameStatus(0)).toBe('wunsch');
    });

    it('should return "verfuegbar" when bringersCount is 1', () => {
      expect(deriveGameStatus(1)).toBe('verfuegbar');
    });

    it('should return "verfuegbar" when bringersCount is greater than 1', () => {
      expect(deriveGameStatus(2)).toBe('verfuegbar');
      expect(deriveGameStatus(5)).toBe('verfuegbar');
      expect(deriveGameStatus(100)).toBe('verfuegbar');
    });
  });

  describe('isWunschGame', () => {
    const createGame = (status: 'wunsch' | 'verfuegbar'): Game => ({
      id: 'test-id',
      name: 'Test Game',
      owner: null,
      bggId: null,
      yearPublished: null,
      bggRating: null,
      addedAsAlternateName: null,
      alternateNames: [],
      isPrototype: false,
      isHidden: false,
      players: [],
      bringers: [],
      status,
      createdAt: new Date(),
    });

    it('should return true when game status is "wunsch"', () => {
      const game = createGame('wunsch');
      expect(isWunschGame(game)).toBe(true);
    });

    it('should return false when game status is "verfuegbar"', () => {
      const game = createGame('verfuegbar');
      expect(isWunschGame(game)).toBe(false);
    });
  });

  describe('shouldShowDuplicateHint', () => {
    it('should return false when bringersCount is 0', () => {
      expect(shouldShowDuplicateHint(0)).toBe(false);
    });

    it('should return false when bringersCount is 1', () => {
      expect(shouldShowDuplicateHint(1)).toBe(false);
    });

    it('should return false when bringersCount is 2', () => {
      expect(shouldShowDuplicateHint(2)).toBe(false);
    });

    it('should return true when bringersCount is 3', () => {
      expect(shouldShowDuplicateHint(3)).toBe(true);
    });

    it('should return true when bringersCount is greater than 3', () => {
      expect(shouldShowDuplicateHint(4)).toBe(true);
      expect(shouldShowDuplicateHint(10)).toBe(true);
      expect(shouldShowDuplicateHint(100)).toBe(true);
    });
  });
});
