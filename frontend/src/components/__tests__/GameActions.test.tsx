import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameActions } from '../GameActions';
import { Game } from '../../types';

// Helper to create a test game with participant structure
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game-id',
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
    status: 'wunsch',
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create a player with participant object
function createPlayer(id: string, participantId: string, participantName: string) {
  return {
    id,
    participant: { id: participantId, name: participantName },
    addedAt: new Date(),
  };
}

// Helper to create a bringer with participant object
function createBringer(id: string, participantId: string, participantName: string) {
  return {
    id,
    participant: { id: participantId, name: participantName },
    addedAt: new Date(),
  };
}

describe('GameActions', () => {
  const currentParticipantId = 'test-user-id';
  const currentUserName = 'Test User';

  describe('when participant is not a player or bringer', () => {
    it('shows Mitbringen button without checkmark', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      expect(bringButton).toBeInTheDocument();
      expect(bringButton).not.toHaveTextContent('✓');
    });

    it('shows Mitspielen button without checkmark', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton).not.toHaveTextContent('✓');
    });

    it('shows inactive styling (gray) for both buttons', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      
      expect(bringButton).toHaveClass('bg-gray-100');
      expect(playButton).toHaveClass('bg-gray-100');
    });

    it('calls onAddBringer when Mitbringen button is clicked', () => {
      const game = createTestGame({ status: 'wunsch' });
      const onAddBringer = vi.fn();
      render(<GameActions game={game} currentParticipantId={currentParticipantId} onAddBringer={onAddBringer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Mitbringen/i }));
      
      expect(onAddBringer).toHaveBeenCalledWith('test-game-id');
    });

    it('calls onAddPlayer when Mitspielen button is clicked', () => {
      const game = createTestGame({ status: 'wunsch' });
      const onAddPlayer = vi.fn();
      render(<GameActions game={game} currentParticipantId={currentParticipantId} onAddPlayer={onAddPlayer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Mitspielen/i }));
      
      expect(onAddPlayer).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('when participant is already a player', () => {
    it('shows Mitspielen button with checkmark and green styling', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      expect(playButton).toHaveTextContent('✓');
      expect(playButton).toHaveClass('bg-green-500');
    });

    it('calls onRemovePlayer when active Mitspielen button is clicked', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentParticipantId, currentUserName)],
      });
      const onRemovePlayer = vi.fn();
      render(<GameActions game={game} currentParticipantId={currentParticipantId} onRemovePlayer={onRemovePlayer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Mitspielen/i }));
      
      expect(onRemovePlayer).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('when participant is already a bringer', () => {
    it('shows Mitbringen button with checkmark and green styling', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        bringers: [createBringer('b1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      expect(bringButton).toHaveTextContent('✓');
      expect(bringButton).toHaveClass('bg-green-500');
    });

    it('calls onRemoveBringer when active Mitbringen button is clicked', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        bringers: [createBringer('b1', currentParticipantId, currentUserName)],
      });
      const onRemoveBringer = vi.fn();
      render(<GameActions game={game} currentParticipantId={currentParticipantId} onRemoveBringer={onRemoveBringer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Mitbringen/i }));
      
      expect(onRemoveBringer).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('when user is both player and bringer', () => {
    it('shows both buttons with checkmarks and green styling', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        players: [createPlayer('p1', currentParticipantId, currentUserName)],
        bringers: [createBringer('b1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      
      expect(bringButton).toHaveTextContent('✓');
      expect(bringButton).toHaveClass('bg-green-500');
      expect(playButton).toHaveTextContent('✓');
      expect(playButton).toHaveClass('bg-green-500');
    });
  });

  describe('mobile view', () => {
    it('shows icon-only buttons with fixed width', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} isMobile={true} />);
      
      // In mobile view, action buttons should have the mobile-specific fixed width class
      // Note: HelpBubble also renders buttons, so we filter by the action button class
      const actionButtons = screen.getAllByRole('button').filter(
        button => button.classList.contains('w-[44px]')
      );
      expect(actionButtons).toHaveLength(2);
    });

    it('shows checkmark in mobile view when user is active', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} isMobile={true} />);
      
      // Find the action buttons (not the help buttons)
      const actionButtons = screen.getAllByRole('button').filter(
        button => button.classList.contains('w-[44px]')
      );
      // Second action button is Mitspielen
      const playButton = actionButtons[1];
      expect(playButton).toHaveTextContent('✓');
    });

    it('renders HelpBubble components in mobile view', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} isMobile={true} />);
      
      // HelpBubble renders a "?" button with aria-label "Hilfe"
      const helpButtons = screen.getAllByLabelText('Hilfe');
      expect(helpButtons).toHaveLength(2);
    });

    it('does not render HelpBubble in desktop view', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} isMobile={false} />);
      
      const helpButtons = screen.queryAllByLabelText('Hilfe');
      expect(helpButtons).toHaveLength(0);
    });
  });

  describe('button titles (tooltips)', () => {
    it('shows correct title for inactive Mitbringen button', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      expect(bringButton).toHaveAttribute('title', 'Dieses Spiel mitbringen');
    });

    it('shows correct title for active Mitbringen button', () => {
      const game = createTestGame({
        bringers: [createBringer('b1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const bringButton = screen.getByRole('button', { name: /Mitbringen/i });
      expect(bringButton).toHaveAttribute('title', 'Mich als Bringer austragen');
    });

    it('shows correct title for inactive Mitspielen button', () => {
      const game = createTestGame({ status: 'wunsch' });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      expect(playButton).toHaveAttribute('title', 'Als Mitspieler eintragen');
    });

    it('shows correct title for active Mitspielen button', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentParticipantId, currentUserName)],
      });
      render(<GameActions game={game} currentParticipantId={currentParticipantId} />);
      
      const playButton = screen.getByRole('button', { name: /Mitspielen/i });
      expect(playButton).toHaveAttribute('title', 'Mich als Mitspieler austragen');
    });
  });
});
