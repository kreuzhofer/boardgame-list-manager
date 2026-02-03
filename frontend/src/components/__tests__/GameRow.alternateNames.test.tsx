/**
 * Unit tests for GameRow alternate names display
 * Feature: 014-alternate-names-search
 * 
 * Requirements: 11.1, 11.2, 11.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameRow } from '../GameRow';
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

// Mock PlayerList and BringerList
vi.mock('../PlayerList', () => ({
  PlayerList: () => <div data-testid="player-list" />,
}));

vi.mock('../BringerList', () => ({
  BringerList: () => <div data-testid="bringer-list" />,
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

// Helper to render GameRow in a table context
const renderGameRow = (game: Game, currentUserId: string) => {
  return render(
    <table>
      <tbody>
        <GameRow game={game} currentUserId={currentUserId} />
      </tbody>
    </table>
  );
};

describe('GameRow Alternate Names Display', () => {
  const currentUserId = 'user-1';

  describe('Requirement 11.1, 11.2: Two-line alternate name display', () => {
    it('should show alternate name on second line when addedAsAlternateName is set', () => {
      const game = createMockGame({
        name: 'War of the Ring: Second Edition',
        addedAsAlternateName: 'Der Ringkrieg',
      });

      renderGameRow(game, currentUserId);

      // Primary name should be visible
      expect(screen.getByText('War of the Ring: Second Edition')).toBeInTheDocument();
      
      // Alternate name should be shown on second line
      expect(screen.getByText('Der Ringkrieg')).toBeInTheDocument();
    });

    it('should display alternate name in smaller, muted text', () => {
      const game = createMockGame({
        name: 'Ark Nova',
        addedAsAlternateName: 'Arche Nova',
      });

      renderGameRow(game, currentUserId);

      // The alternate name should be in a span with smaller, muted styling
      const alternateNameElement = screen.getByText('Arche Nova');
      expect(alternateNameElement).toHaveClass('text-sm');
      expect(alternateNameElement).toHaveClass('text-gray-500');
    });
  });

  describe('Requirement 11.5: No alternate name when not set', () => {
    it('should show only primary name when addedAsAlternateName is null', () => {
      const game = createMockGame({
        name: 'Gloomhaven',
        addedAsAlternateName: null,
      });

      renderGameRow(game, currentUserId);

      expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      // The name cell should not contain an alternate name span with text-sm text-gray-500
      const nameCell = screen.getByText('Gloomhaven').closest('td');
      const alternateNameSpan = nameCell?.querySelector('span.text-sm.text-gray-500');
      expect(alternateNameSpan).toBeNull();
    });

    it('should show only primary name when addedAsAlternateName is undefined', () => {
      const game = createMockGame({
        name: 'Terraforming Mars',
      });
      // Remove the property entirely
      delete (game as Partial<Game>).addedAsAlternateName;

      renderGameRow(game, currentUserId);

      expect(screen.getByText('Terraforming Mars')).toBeInTheDocument();
    });
  });

  describe('Desktop layout structure', () => {
    it('should render alternate name as separate element below primary name', () => {
      const game = createMockGame({
        name: 'Primary Name',
        addedAsAlternateName: 'Alternate Name',
      });

      renderGameRow(game, currentUserId);

      // Primary name should be in a span with font-medium
      const primaryName = screen.getByText('Primary Name');
      expect(primaryName).toHaveClass('font-medium');

      // Alternate name should be in a separate span
      const alternateName = screen.getByText('Alternate Name');
      expect(alternateName.tagName).toBe('SPAN');
      
      // They should be siblings in the same container
      const container = primaryName.closest('.flex.flex-col');
      expect(container).toContainElement(alternateName);
    });
  });
});
