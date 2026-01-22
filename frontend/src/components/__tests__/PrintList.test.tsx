/**
 * Unit tests for PrintList component
 * Tests the filterGamesUserIsBringing utility function
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintList, filterGamesUserIsBringing } from '../PrintList';
import type { Game } from '../../types';

// Helper to create test games
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: crypto.randomUUID(),
    name: 'Test Game',
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('filterGamesUserIsBringing', () => {
  it('returns empty array when user is not a bringer of any game', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game 1',
        bringers: [{ id: '1', name: 'Other User', addedAt: new Date() }],
      }),
      createTestGame({
        name: 'Game 2',
        bringers: [],
      }),
    ];

    const result = filterGamesUserIsBringing(games, 'Test User');
    expect(result).toEqual([]);
  });

  it('returns only games where user is a bringer', () => {
    const game1 = createTestGame({
      name: 'Game 1',
      bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
    });
    const game2 = createTestGame({
      name: 'Game 2',
      bringers: [{ id: '2', name: 'Other User', addedAt: new Date() }],
    });
    const game3 = createTestGame({
      name: 'Game 3',
      bringers: [
        { id: '3', name: 'Test User', addedAt: new Date() },
        { id: '4', name: 'Another User', addedAt: new Date() },
      ],
    });

    const result = filterGamesUserIsBringing([game1, game2, game3], 'Test User');
    
    expect(result).toHaveLength(2);
    expect(result.map(g => g.name)).toEqual(['Game 1', 'Game 3']);
  });

  it('returns empty array when games list is empty', () => {
    const result = filterGamesUserIsBringing([], 'Test User');
    expect(result).toEqual([]);
  });

  it('is case-sensitive for user names', () => {
    const game = createTestGame({
      name: 'Game 1',
      bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
    });

    expect(filterGamesUserIsBringing([game], 'Test User')).toHaveLength(1);
    expect(filterGamesUserIsBringing([game], 'test user')).toHaveLength(0);
    expect(filterGamesUserIsBringing([game], 'TEST USER')).toHaveLength(0);
  });
});

describe('PrintList Component', () => {
  it('displays user name prominently in header', () => {
    render(<PrintList userName="Max Mustermann" games={[]} />);
    
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Mitgebrachte Spiele')).toBeInTheDocument();
  });

  it('shows message when user has no games to bring', () => {
    render(<PrintList userName="Test User" games={[]} />);
    
    expect(screen.getByText('Sie bringen keine Spiele mit.')).toBeInTheDocument();
  });

  it('displays games count', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game 1',
        bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
      }),
      createTestGame({
        name: 'Game 2',
        bringers: [{ id: '2', name: 'Test User', addedAt: new Date() }],
      }),
    ];

    render(<PrintList userName="Test User" games={games} />);
    
    // Check for the count in the summary text
    expect(screen.getByText(/Anzahl Spiele:/)).toBeInTheDocument();
    // The count "2" appears in a span with font-semibold class
    const countElement = screen.getByText('Anzahl Spiele:').parentElement?.querySelector('.font-semibold');
    expect(countElement?.textContent).toBe('2');
  });

  it('displays game names in table', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
      }),
      createTestGame({
        name: 'Ticket to Ride',
        bringers: [{ id: '2', name: 'Test User', addedAt: new Date() }],
      }),
    ];

    render(<PrintList userName="Test User" games={games} />);
    
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('Ticket to Ride')).toBeInTheDocument();
  });

  it('displays interested players for each game', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        players: [
          { id: '1', name: 'Alice', addedAt: new Date() },
          { id: '2', name: 'Bob', addedAt: new Date() },
        ],
        bringers: [{ id: '3', name: 'Test User', addedAt: new Date() }],
      }),
    ];

    render(<PrintList userName="Test User" games={games} />);
    
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });

  it('shows dash when no players are interested', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        players: [],
        bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
      }),
    ];

    render(<PrintList userName="Test User" games={games} />);
    
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('only shows games where user is a bringer, not just a player', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game I Bring',
        bringers: [{ id: '1', name: 'Test User', addedAt: new Date() }],
      }),
      createTestGame({
        name: 'Game I Only Play',
        players: [{ id: '2', name: 'Test User', addedAt: new Date() }],
        bringers: [{ id: '3', name: 'Other User', addedAt: new Date() }],
      }),
    ];

    render(<PrintList userName="Test User" games={games} />);
    
    expect(screen.getByText('Game I Bring')).toBeInTheDocument();
    expect(screen.queryByText('Game I Only Play')).not.toBeInTheDocument();
  });
});
