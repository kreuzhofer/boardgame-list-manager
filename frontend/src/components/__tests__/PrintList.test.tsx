/**
 * Unit tests for PrintList component
 * Tests the filterGamesParticipantIsBringing utility function
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintList, filterGamesParticipantIsBringing } from '../PrintList';
import type { Game } from '../../types';

// Helper to create test games with participant structure
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

// Helper to create a bringer with participant object
function createBringer(id: string, participantId: string, participantName: string) {
  return {
    id,
    participant: { id: participantId, name: participantName },
    addedAt: new Date(),
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

describe('filterGamesParticipantIsBringing', () => {
  it('returns empty array when participant is not a bringer of any game', () => {
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

    const result = filterGamesParticipantIsBringing(games, 'test-user-id');
    expect(result).toEqual([]);
  });

  it('returns only games where participant is a bringer', () => {
    const testParticipantId = 'test-user-id';
    const game1 = createTestGame({
      name: 'Game 1',
      bringers: [createBringer('1', testParticipantId, 'Test User')],
    });
    const game2 = createTestGame({
      name: 'Game 2',
      bringers: [createBringer('2', 'other-user-id', 'Other User')],
    });
    const game3 = createTestGame({
      name: 'Game 3',
      bringers: [
        createBringer('3', testParticipantId, 'Test User'),
        createBringer('4', 'another-user-id', 'Another User'),
      ],
    });

    const result = filterGamesParticipantIsBringing([game1, game2, game3], testParticipantId);
    
    expect(result).toHaveLength(2);
    expect(result.map(g => g.name)).toEqual(['Game 1', 'Game 3']);
  });

  it('returns empty array when games list is empty', () => {
    const result = filterGamesParticipantIsBringing([], 'test-user-id');
    expect(result).toEqual([]);
  });

  it('matches by participant ID, not participant name', () => {
    const testParticipantId = 'test-user-id';
    const game = createTestGame({
      name: 'Game 1',
      bringers: [createBringer('1', testParticipantId, 'Test User')],
    });

    // Should match by ID
    expect(filterGamesParticipantIsBringing([game], testParticipantId)).toHaveLength(1);
    // Should not match by name
    expect(filterGamesParticipantIsBringing([game], 'Test User')).toHaveLength(0);
    // Should not match different ID
    expect(filterGamesParticipantIsBringing([game], 'different-id')).toHaveLength(0);
  });
});

describe('PrintList Component', () => {
  const testParticipantId = 'test-user-id';
  const testParticipantName = 'Max Mustermann';

  it('displays participant name prominently in header', () => {
    render(<PrintList participantName={testParticipantName} participantId={testParticipantId} games={[]} />);
    
    expect(screen.getByText(testParticipantName)).toBeInTheDocument();
    expect(screen.getByText('Mitgebrachte Spiele')).toBeInTheDocument();
  });

  it('shows message when participant has no games to bring', () => {
    render(<PrintList participantName="Test User" participantId={testParticipantId} games={[]} />);
    
    expect(screen.getByText('Sie bringen keine Spiele mit.')).toBeInTheDocument();
  });

  it('displays games count', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game 1',
        bringers: [createBringer('1', testParticipantId, 'Test User')],
      }),
      createTestGame({
        name: 'Game 2',
        bringers: [createBringer('2', testParticipantId, 'Test User')],
      }),
    ];

    render(<PrintList participantName="Test User" participantId={testParticipantId} games={games} />);
    
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
        bringers: [createBringer('1', testParticipantId, 'Test User')],
      }),
      createTestGame({
        name: 'Ticket to Ride',
        bringers: [createBringer('2', testParticipantId, 'Test User')],
      }),
    ];

    render(<PrintList participantName="Test User" participantId={testParticipantId} games={games} />);
    
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
        bringers: [createBringer('3', testParticipantId, 'Test User')],
      }),
    ];

    render(<PrintList participantName="Test User" participantId={testParticipantId} games={games} />);
    
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });

  it('shows dash when no players are interested', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Catan',
        players: [],
        bringers: [createBringer('1', testParticipantId, 'Test User')],
      }),
    ];

    render(<PrintList participantName="Test User" participantId={testParticipantId} games={games} />);
    
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('only shows games where participant is a bringer, not just a player', () => {
    const games: Game[] = [
      createTestGame({
        name: 'Game I Bring',
        bringers: [createBringer('1', testParticipantId, 'Test User')],
      }),
      createTestGame({
        name: 'Game I Only Play',
        players: [createPlayer('2', testParticipantId, 'Test User')],
        bringers: [createBringer('3', 'other-user-id', 'Other User')],
      }),
    ];

    render(<PrintList participantName="Test User" participantId={testParticipantId} games={games} />);
    
    expect(screen.getByText('Game I Bring')).toBeInTheDocument();
    expect(screen.queryByText('Game I Only Play')).not.toBeInTheDocument();
  });
});
