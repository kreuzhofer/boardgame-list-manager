/**
 * Unit tests for GameRow BggRatingBadge integration
 * Feature: bgg-rating-badge
 * **Validates: Requirements 3.1, 3.2, 5.2**
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameRow } from '../GameRow';
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
  players: [],
  bringers: [],
  status: 'wunsch',
  createdAt: new Date(),
  ...overrides,
});

// Helper to render GameRow in a table context
const renderGameRow = (game: Game, props = {}) => {
  const defaultProps = {
    currentUserId: 'user-1',
    onAddPlayer: vi.fn(),
    onAddBringer: vi.fn(),
    onRemovePlayer: vi.fn(),
    onRemoveBringer: vi.fn(),
    onDeleteGame: vi.fn(),
    ...props,
  };

  return render(
    <table>
      <tbody>
        <GameRow game={game} {...defaultProps} />
      </tbody>
    </table>
  );
};

describe('GameRow BggRatingBadge Integration', () => {
  describe('Badge visibility', () => {
    /**
     * Requirement 3.1: Badge displays when bggRating exists
     * Requirement 5.2: GameRow displays badge next to BGG button
     */
    it('should render BggRatingBadge when game has bggRating', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: 7.5,
      });

      renderGameRow(game);

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

      renderGameRow(game);

      // BGG button should exist but no rating badge
      expect(screen.getByText('BGG')).toBeInTheDocument();
      expect(screen.queryByTitle(/BGG Bewertung/)).not.toBeInTheDocument();
    });

    it('should not render BggRatingBadge when game has no bggId', () => {
      const game = createMockGame({
        bggId: null,
        bggRating: 7.5,
      });

      renderGameRow(game);

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

      renderGameRow(game);

      expect(screen.getByText('8.0')).toBeInTheDocument();
    });

    it('should display German tooltip', () => {
      const game = createMockGame({
        bggId: 123,
        bggRating: 7.5,
      });

      renderGameRow(game);

      expect(screen.getByTitle('BGG Bewertung: 7.5')).toBeInTheDocument();
    });
  });
});
