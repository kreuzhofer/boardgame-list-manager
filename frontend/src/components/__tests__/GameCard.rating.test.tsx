/**
 * Unit tests for GameCard BggRatingBadge integration
 * Feature: bgg-rating-badge
 * **Validates: Requirements 3.1, 3.2, 5.1**
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from '../GameCard';
import type { Game } from '../../types';

// Mock the BggModal module
vi.mock('../BggModal', () => ({
  openBggPage: vi.fn(),
}));

const createMockGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'game-1',
  name: 'Test Game',
  owner: { id: 'user-1', name: 'Test User' },
  bggId: null,
  yearPublished: null,
  bggRating: null,
  addedAsAlternateName: null,
  alternateNames: [],
  isPrototype: false,
  isHidden: false,
  players: [],
  bringers: [],
  status: 'wunsch',
  createdAt: new Date(),
  ...overrides,
});

describe('GameCard BggRatingBadge Integration', () => {
  const defaultProps = {
    currentUserId: 'user-1',
    onAddPlayer: vi.fn(),
    onAddBringer: vi.fn(),
    onRemovePlayer: vi.fn(),
    onRemoveBringer: vi.fn(),
    onDeleteGame: vi.fn(),
  };

  describe('Badge visibility', () => {
    /**
     * Requirement 3.1: Badge displays when bggRating exists
     * Requirement 5.1: GameCard displays badge next to BGG button
     */
    it('should render BggRatingBadge when game has bggRating', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: 7.5,
      });

      render(<GameCard game={game} {...defaultProps} />);

      // Badge should be visible with the rating
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });

    /**
     * Requirement 3.2: Badge does not display when bggRating is null
     */
    it('should not render BggRatingBadge when game has no bggRating', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: null,
      });

      render(<GameCard game={game} {...defaultProps} />);

      // When there's no rating, the BGG button with rating badge is not shown
      // But the thumbnail should still be rendered (via LazyBggImage)
      expect(screen.getByTestId('lazy-bgg-image-container')).toBeInTheDocument();
      expect(screen.queryByTitle(/BGG Bewertung/)).not.toBeInTheDocument();
    });

    it('should not render BggRatingBadge when game has no bggId', () => {
      const game = createMockGame({
        bggId: null,
        bggRating: 7.5,
      });

      render(<GameCard game={game} {...defaultProps} />);

      // No BGG button means no rating badge either
      expect(screen.queryByText('BGG')).not.toBeInTheDocument();
      expect(screen.queryByText('7.5')).not.toBeInTheDocument();
    });
  });

  describe('Badge display', () => {
    it('should display rating formatted to one decimal place', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: 8.0,
      });

      render(<GameCard game={game} {...defaultProps} />);

      expect(screen.getByText('8.0')).toBeInTheDocument();
    });

    it('should display German tooltip', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: 7.5,
      });

      render(<GameCard game={game} {...defaultProps} />);

      expect(screen.getByTitle('BGG Bewertung: 7.5')).toBeInTheDocument();
    });
  });
});
