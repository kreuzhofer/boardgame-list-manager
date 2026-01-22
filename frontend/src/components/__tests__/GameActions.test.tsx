import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameActions } from '../GameActions';
import { Game } from '../../types';

// Helper to create a test game with new user structure
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game-id',
    name: 'Test Game',
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create a player with user object
function createPlayer(id: string, userId: string, userName: string) {
  return {
    id,
    user: { id: userId, name: userName },
    addedAt: new Date(),
  };
}

// Helper to create a bringer with user object
function createBringer(id: string, userId: string, userName: string) {
  return {
    id,
    user: { id: userId, name: userName },
    addedAt: new Date(),
  };
}

describe('GameActions', () => {
  const currentUserId = 'test-user-id';
  const currentUserName = 'Test User';

  describe('when user is not a player or bringer', () => {
    describe('for Wunsch games', () => {
      it('shows "Wunsch erfüllen" button', () => {
        const game = createTestGame({ status: 'wunsch' });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        expect(screen.getByRole('button', { name: /Wunsch erfüllen/i })).toBeInTheDocument();
      });

      it('shows "Möchte ich spielen" button', () => {
        const game = createTestGame({ status: 'wunsch' });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        expect(screen.getByRole('button', { name: /Möchte ich spielen/i })).toBeInTheDocument();
      });

      it('does not show regular "Bringe ich mit" button (Wunsch erfüllen is shown instead)', () => {
        const game = createTestGame({ status: 'wunsch' });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        // Should not have the regular "Bringe ich mit" button
        expect(screen.queryByRole('button', { name: /^📦 Bringe ich mit$/i })).not.toBeInTheDocument();
      });

      it('calls onAddBringer when "Wunsch erfüllen" is clicked', () => {
        const game = createTestGame({ status: 'wunsch' });
        const onAddBringer = vi.fn();
        render(<GameActions game={game} currentUserId={currentUserId} onAddBringer={onAddBringer} />);
        
        fireEvent.click(screen.getByRole('button', { name: /Wunsch erfüllen/i }));
        
        expect(onAddBringer).toHaveBeenCalledWith('test-game-id');
      });
    });

    describe('for Verfügbar games', () => {
      it('shows "Möchte ich spielen" button', () => {
        const game = createTestGame({ 
          status: 'verfuegbar',
          bringers: [createBringer('b1', 'other-user-id', 'Other User')]
        });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        expect(screen.getByRole('button', { name: /Möchte ich spielen/i })).toBeInTheDocument();
      });

      it('shows "Bringe ich mit" button', () => {
        const game = createTestGame({ 
          status: 'verfuegbar',
          bringers: [createBringer('b1', 'other-user-id', 'Other User')]
        });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        expect(screen.getByRole('button', { name: /Bringe ich mit/i })).toBeInTheDocument();
      });

      it('does not show "Wunsch erfüllen" button', () => {
        const game = createTestGame({ 
          status: 'verfuegbar',
          bringers: [createBringer('b1', 'other-user-id', 'Other User')]
        });
        render(<GameActions game={game} currentUserId={currentUserId} />);
        
        expect(screen.queryByRole('button', { name: /Wunsch erfüllen/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('when user is already a player', () => {
    it('does not show "Möchte ich spielen" button', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.queryByRole('button', { name: /Möchte ich spielen/i })).not.toBeInTheDocument();
    });

    it('shows "Nicht mehr spielen" remove button', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.getByRole('button', { name: /Nicht mehr spielen/i })).toBeInTheDocument();
    });

    it('calls onRemovePlayer when remove button is clicked', () => {
      const game = createTestGame({
        players: [createPlayer('p1', currentUserId, currentUserName)],
      });
      const onRemovePlayer = vi.fn();
      render(<GameActions game={game} currentUserId={currentUserId} onRemovePlayer={onRemovePlayer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Nicht mehr spielen/i }));
      
      expect(onRemovePlayer).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('when user is already a bringer', () => {
    it('does not show "Bringe ich mit" button', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.queryByRole('button', { name: /Bringe ich mit/i })).not.toBeInTheDocument();
    });

    it('does not show "Wunsch erfüllen" button even for Wunsch games', () => {
      const game = createTestGame({
        status: 'wunsch',
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.queryByRole('button', { name: /Wunsch erfüllen/i })).not.toBeInTheDocument();
    });

    it('shows "Nicht mehr mitbringen" remove button', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.getByRole('button', { name: /Nicht mehr mitbringen/i })).toBeInTheDocument();
    });

    it('calls onRemoveBringer when remove button is clicked', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      const onRemoveBringer = vi.fn();
      render(<GameActions game={game} currentUserId={currentUserId} onRemoveBringer={onRemoveBringer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Nicht mehr mitbringen/i }));
      
      expect(onRemoveBringer).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('when user is both player and bringer', () => {
    it('shows both remove buttons', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        players: [createPlayer('p1', currentUserId, currentUserName)],
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.getByRole('button', { name: /Nicht mehr spielen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Nicht mehr mitbringen/i })).toBeInTheDocument();
    });

    it('does not show add buttons', () => {
      const game = createTestGame({
        status: 'verfuegbar',
        players: [createPlayer('p1', currentUserId, currentUserName)],
        bringers: [createBringer('b1', currentUserId, currentUserName)],
      });
      render(<GameActions game={game} currentUserId={currentUserId} />);
      
      expect(screen.queryByRole('button', { name: /Möchte ich spielen/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Bringe ich mit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Wunsch erfüllen/i })).not.toBeInTheDocument();
    });
  });

  describe('action callbacks', () => {
    it('calls onAddPlayer when "Möchte ich spielen" is clicked', () => {
      const game = createTestGame();
      const onAddPlayer = vi.fn();
      render(<GameActions game={game} currentUserId={currentUserId} onAddPlayer={onAddPlayer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Möchte ich spielen/i }));
      
      expect(onAddPlayer).toHaveBeenCalledWith('test-game-id');
    });

    it('calls onAddBringer when "Bringe ich mit" is clicked', () => {
      const game = createTestGame({ 
        status: 'verfuegbar',
        bringers: [createBringer('b1', 'other-user-id', 'Other User')]
      });
      const onAddBringer = vi.fn();
      render(<GameActions game={game} currentUserId={currentUserId} onAddBringer={onAddBringer} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Bringe ich mit/i }));
      
      expect(onAddBringer).toHaveBeenCalledWith('test-game-id');
    });
  });
});
