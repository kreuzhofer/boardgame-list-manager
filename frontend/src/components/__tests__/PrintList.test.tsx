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

// Helper to create test games with new user structure
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: crypto.randomUUID(),
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

// Helper to create a bringer with user object
function createBringer(id: string, userId: string, userName: string) {
  return {
    id,
    user: { id: userId, name: userName },
    addedAt: new Date(),
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

describe('filterGamesUserIsBringing', () => {
  it('returns empty array when user is not a bringer of any game', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game 1',
        bringers: [createBringer('1', 'other-user-id', 'Other User')],
      }),
      createTestGame({
        name: 'Game 2',
        bringers: [],
      }),
    ];

    const result = filterGamesUserIsBringing(games, 'test-user-id');
    expect(result).toEqual([]);
  });

  it('returns only games where user is a bringer', () => {
    const testUserId = 'test-user-id';
    const game1 = createTestGame({
      name: 'Game 1',
      bringers: [createBringer('1', testUserId, 'Test User')],
    });
    const game2 = createTestGame({
      name: 'Game 2',
      bringers: [createBringer('2', 'other-user-id', 'Other User')],
    });
    const game3 = createTestGame({
      name: 'Game 3',
      bringers: [
        createBringer('3', testUserId, 'Test User'),
        createBringer('4', 'another-user-id', 'Another User'),
      ],
    });

    const result = filterGamesUserIsBringing([game1, game2, game3], testUserId);
    
    expect(result).toHaveLength(2);
    expect(result.map(g => g.name)).toEqual(['Game 1', 'Game 3']);
  });

  it('returns empty array when games list is empty', () => {
    const result = filterGamesUserIsBringing([], 'test-user-id');
    expect(result).toEqual([]);
  });

  it('matches by user ID, not user name', () => {
    const testUserId = 'test-user-id';
    const game = createTestGame({
      name: 'Game 1',
      bringers: [createBringer('1', testUserId, 'Test User')],
    });

    // Should match by ID
    expect(filterGamesUserIsBringing([game], testUserId)).toHaveLength(1);
    // Should not match by name
    expect(filterGamesUserIsBringing([game], 'Test User')).toHaveLength(0);
    // Should not match different ID
    expect(filterGamesUserIsBringing([game], 'different-id')).toHaveLength(0);
  });
});

describe('PrintList Component', () => {
  const testUserId = 'test-user-id';
  const testUserName = 'Max Mustermann';

  it('displays user name prominently in header', () => {
    render(<PrintList userName={testUserName} userId={testUserId} games={[]} />);
    
    expect(screen.getByText(testUserName)).toBeInTheDocument();
    expect(screen.getByText('Mitgebrachte Spiele')).toBeInTheDocument();
  });

  it('shows message when user has no games to bring', () => {
    render(<PrintList userName="Test User" userId={testUserId} games={[]} />);
    
    expect(screen.getByText('Sie bringen keine Spiele mit.')).toBeInTheDocument();
  });

  it('displays games count', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game 1',
        bringers: [createBringer('1', testUserId, 'Test User')],
      }),
      createTestGame({
        name: 'Game 2',
        bringers: [createBringer('2', testUserId, 'Test User')],
      }),
    ];

    render(<PrintList userName="Test User" userId={testUserId} games={games} />);
    
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
        bringers: [createBringer('1', testUserId, 'Test User')],
      }),
      createTestGame({
        name: 'Ticket to Ride',
        bringers: [createBringer('2', testUserId, 'Test User')],
      }),
    ];

    render(<PrintList userName="Test User" userId={testUserId} games={games} />);
    
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('Ticket to Ride')).toBeInTheDocument();
  });

  it('displays interested players for each game', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        players: [
          createPlayer('1', 'alice-id', 'Alice'),
          createPlayer('2', 'bob-id', 'Bob'),
        ],
        bringers: [createBringer('3', testUserId, 'Test User')],
      }),
    ];

    render(<PrintList userName="Test User" userId={testUserId} games={games} />);
    
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });

  it('shows dash when no players are interested', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        players: [],
        bringers: [createBringer('1', testUserId, 'Test User')],
      }),
    ];

    render(<PrintList userName="Test User" userId={testUserId} games={games} />);
    
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('only shows games where user is a bringer, not just a player', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game I Bring',
        bringers: [createBringer('1', testUserId, 'Test User')],
      }),
      createTestGame({
        name: 'Game I Only Play',
        players: [createPlayer('2', testUserId, 'Test User')],
        bringers: [createBringer('3', 'other-user-id', 'Other User')],
      }),
    ];

    render(<PrintList userName="Test User" userId={testUserId} games={games} />);
    
    expect(screen.getByText('Game I Bring')).toBeInTheDocument();
    expect(screen.queryByText('Game I Only Play')).not.toBeInTheDocument();
  });
});
