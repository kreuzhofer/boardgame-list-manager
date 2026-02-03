/**
 * Unit tests for GameCard alternate names display
 * Feature: 014-alternate-names-search
 * 
 * Requirements: 11.1, 11.3, 11.4, 11.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from '../GameCard';
import type { Game } from '../../types';

// Mock LazyBggImage
vi.mock('../LazyBggImage', () => ({
  LazyBggImage: ({ bggId }: { bggId: number }) => (
    <div data-testid={`lazy-bgg-image-${bggId}`} />
  ),
}));

// Mock NeuheitSticker
vi.mock('../NeuheitSticker', () => ({
  NeuheitSticker: () => <div data-testid="neuheit-sticker" />,
}));

// Mock BggRatingBadge
vi.mock('../BggRatingBadge', () => ({
  BggRatingBadge: ({ rating }: { rating: number }) => (
    <div data-testid="bgg-rating-badge">{rating}</div>
  ),
}));

// Mock HelpBubble
vi.mock('../HelpBubble', () => ({
  HelpBubble: () => null,
}));

// Mock ClickNotification
vi.mock('../ClickNotification', () => ({
  ClickNotification: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock GameActions
vi.mock('../GameActions', () => ({
  GameActions: () => <div data-testid="game-actions" />,
}));

const createMockGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'game-1',
  name: 'Test Game',
  status: 'verfuegbar',
  owner: { id: 'user-1', name: 'Test User' },
  players: [],
  bringers: [],
  bggId: 12345,
  yearPublished: 2023,
  bggRating: 8.0,
  addedAsAlternateName: null,
  alternateNames: [],
  isPrototype: false,
  isHidden: false,
  createdAt: new Date(),
  ...overrides,
});

describe('GameCard Alternate Names Display', () => {
  const currentUserId = 'user-1';

  describe('Requirement 11.1, 11.3: Inline alternate name display', () => {
    it('should show alternate name inline with primary name when addedAsAlternateName is set', () => {
      const game = createMockGame({
        name: 'War of the Ring: Second Edition',
        addedAsAlternateName: 'Der Ringkrieg',
      });

      render(<GameCard game={game} currentUserId={currentUserId} />);

      // Primary name should be visible
      expect(screen.getByText(/War of the Ring: Second Edition/)).toBeInTheDocument();
      
      // Alternate name should be shown inline with separator
      expect(screen.getByText(/Der Ringkrieg/)).toBeInTheDocument();
    });

    it('should use inline format with separator for mobile display', () => {
      const game = createMockGame({
        name: 'Ark Nova',
        addedAsAlternateName: 'Arche Nova',
      });

      render(<GameCard game={game} currentUserId={currentUserId} />);

      // The h3 element should contain both names with separator
      const titleElement = screen.getByRole('heading', { level: 3 });
      expect(titleElement).toHaveTextContent('Ark Nova');
      expect(titleElement).toHaveTextContent('Arche Nova');
      // Check for the separator
      expect(titleElement.textContent).toContain(' · ');
    });
  });

  describe('Requirement 11.5: No alternate name when not set', () => {
    it('should show only primary name when addedAsAlternateName is null', () => {
      const game = createMockGame({
        name: 'Gloomhaven',
        addedAsAlternateName: null,
      });

      render(<GameCard game={game} currentUserId={currentUserId} />);

      expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      // Should not have the separator
      const titleElement = screen.getByRole('heading', { level: 3 });
      expect(titleElement.textContent).not.toContain(' · ');
    });

    it('should show only primary name when addedAsAlternateName is undefined', () => {
      const game = createMockGame({
        name: 'Terraforming Mars',
      });
      // Remove the property entirely
      delete (game as Partial<Game>).addedAsAlternateName;

      render(<GameCard game={game} currentUserId={currentUserId} />);

      expect(screen.getByText('Terraforming Mars')).toBeInTheDocument();
      const titleElement = screen.getByRole('heading', { level: 3 });
      expect(titleElement.textContent).not.toContain(' · ');
    });
  });

  describe('Requirement 11.4: Styling', () => {
    it('should style alternate name differently from primary name', () => {
      const game = createMockGame({
        name: 'Primary Name',
        addedAsAlternateName: 'Alternate Name',
      });

      render(<GameCard game={game} currentUserId={currentUserId} />);

      // The alternate name should be in a span with muted styling
      const alternateNameSpan = screen.getByText(/Alternate Name/).closest('span');
      expect(alternateNameSpan).toHaveClass('text-gray-500');
    });
  });
});
