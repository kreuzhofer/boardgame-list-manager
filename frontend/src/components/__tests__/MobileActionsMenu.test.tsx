import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileActionsMenu } from '../MobileActionsMenu';
import type { Game } from '../../types';

/**
 * Unit tests for MobileActionsMenu component
 * Validates: Requirements 022-prototype-toggle 2.1, 2.2
 */

// Helper to create a test game
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game-id',
    name: 'Test Game',
    owner: { id: 'owner-id', name: 'Owner' },
    bggId: null,
    yearPublished: null,
    bggRating: null,
    addedAsAlternateName: null,
    alternateNames: [],
    isPrototype: false,
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('MobileActionsMenu', () => {
  const currentUserId = 'owner-id';

  describe('visibility conditions', () => {
    it('renders when user is owner and game has no BGG ID', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      expect(screen.getByRole('button', { name: 'Weitere Aktionen' })).toBeInTheDocument();
    });

    it('does not render when user is not owner', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId="other-user-id"
          onTogglePrototype={onTogglePrototype}
        />
      );

      expect(screen.queryByRole('button', { name: 'Weitere Aktionen' })).not.toBeInTheDocument();
    });

    it('does not render when game has BGG ID', () => {
      const game = createTestGame({ bggId: 12345 });
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      expect(screen.queryByRole('button', { name: 'Weitere Aktionen' })).not.toBeInTheDocument();
    });

    it('does not render when game has no owner', () => {
      const game = createTestGame({ owner: null });
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      expect(screen.queryByRole('button', { name: 'Weitere Aktionen' })).not.toBeInTheDocument();
    });
  });

  describe('menu interaction', () => {
    it('opens menu on button click', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows prototype toggle in menu', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));

      expect(screen.getByText('Prototyp')).toBeInTheDocument();
    });

    it('closes menu on escape key', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('calls onTogglePrototype when toggle is clicked', async () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));

      // Click the prototype toggle (it's inside the menu)
      const toggleButton = screen.getByRole('button', { name: /Prototyp/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(onTogglePrototype).toHaveBeenCalledWith('test-game-id', true);
      });
    });

    it('closes menu after toggle action', async () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click the prototype toggle
      const toggleButton = screen.getByRole('button', { name: /Prototyp/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has correct aria attributes on trigger button', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      const button = screen.getByRole('button', { name: 'Weitere Aktionen' });
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when menu is open', () => {
      const game = createTestGame();
      const onTogglePrototype = vi.fn().mockResolvedValue(undefined);

      render(
        <MobileActionsMenu
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      );

      const button = screen.getByRole('button', { name: 'Weitere Aktionen' });
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
