import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DesktopActionsMenu } from '../DesktopActionsMenu';
import type { Game } from '../../types';

/**
 * Unit tests for DesktopActionsMenu component
 * Feature: 023-custom-thumbnail-upload, Property 7: Menu Visibility
 * Validates: Requirements 5.2, 6.2
 */
describe('DesktopActionsMenu', () => {
  const currentUserId = 'user-123';
  
  const createMockGame = (overrides: Partial<Game> = {}): Game => ({
    id: 'game-123',
    name: 'Test Game',
    owner: { id: currentUserId, name: 'Test User' },
    bggId: null,
    yearPublished: null,
    bggRating: null,
    addedAsAlternateName: null,
    alternateNames: [],
    isPrototype: false,
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const defaultProps = {
    currentUserId,
    onTogglePrototype: vi.fn().mockResolvedValue(undefined),
    onUploadThumbnail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 7: Menu Visibility', () => {
    it('renders menu button for owner of non-BGG game', () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      expect(screen.getByLabelText('Weitere Aktionen')).toBeInTheDocument();
    });

    it('does NOT render for non-owner', () => {
      const game = createMockGame({
        owner: { id: 'different-user', name: 'Other User' },
      });
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      expect(screen.queryByLabelText('Weitere Aktionen')).not.toBeInTheDocument();
    });

    it('does NOT render for BGG game', () => {
      const game = createMockGame({
        bggId: 12345,
      });
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      expect(screen.queryByLabelText('Weitere Aktionen')).not.toBeInTheDocument();
    });

    it('does NOT render for non-owner of BGG game', () => {
      const game = createMockGame({
        owner: { id: 'different-user', name: 'Other User' },
        bggId: 12345,
      });
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      expect(screen.queryByLabelText('Weitere Aktionen')).not.toBeInTheDocument();
    });

    it('does NOT render when game has no owner', () => {
      const game = createMockGame({
        owner: null,
      });
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      expect(screen.queryByLabelText('Weitere Aktionen')).not.toBeInTheDocument();
    });
  });

  describe('menu interaction', () => {
    it('opens menu when button is clicked', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
    });

    it('closes menu when clicking outside', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
      
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Bild hochladen')).not.toBeInTheDocument();
      });
    });

    it('closes menu on escape key', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('Bild hochladen')).not.toBeInTheDocument();
      });
    });
  });

  describe('upload thumbnail option', () => {
    it('displays "Bild hochladen" option', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
    });

    it('calls onUploadThumbnail with gameId when clicked', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Bild hochladen'));
      
      expect(defaultProps.onUploadThumbnail).toHaveBeenCalledWith('game-123');
    });

    it('closes menu after clicking upload option', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Bild hochladen'));
      
      await waitFor(() => {
        expect(screen.queryByText('Bild hochladen')).not.toBeInTheDocument();
      });
    });
  });

  describe('prototype toggle', () => {
    it('displays prototype toggle in menu', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Prototyp')).toBeInTheDocument();
      });
    });

    it('calls onTogglePrototype when prototype toggle is clicked', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByText('Prototyp')).toBeInTheDocument();
      });
      
      // Find and click the prototype toggle button
      const prototypeButton = screen.getByText('Prototyp').closest('button');
      if (prototypeButton) {
        fireEvent.click(prototypeButton);
      }
      
      await waitFor(() => {
        expect(defaultProps.onTogglePrototype).toHaveBeenCalledWith('game-123', true);
      });
    });
  });

  describe('accessibility', () => {
    it('has correct aria attributes on button', () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      const button = screen.getByLabelText('Weitere Aktionen');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when menu is open', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      const button = screen.getByLabelText('Weitere Aktionen');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('menu has correct role', async () => {
      const game = createMockGame();
      render(<DesktopActionsMenu game={game} {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });
  });
});
