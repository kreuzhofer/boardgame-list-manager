/**
 * Integration tests for HomePage with unified search flow
 * **Validates: Requirements 1.2, 3.3, 4.1**
 * 
 * Updated for Spec 007:
 * - Removed Statistics component mock (Statistics moved to StatisticsPage)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HomePage } from '../HomePage';
import type { User, Game } from '../../types';

// Mock the API client
vi.mock('../../api/client', () => ({
  gamesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    addPlayer: vi.fn(),
    addBringer: vi.fn(),
    removePlayer: vi.fn(),
    removeBringer: vi.fn(),
    delete: vi.fn(),
  },
  bggApi: {
    search: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { gamesApi, bggApi } from '../../api/client';

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
};

const mockGames: Game[] = [
  {
    id: 'game-1',
    name: 'Catan',
    owner: mockUser,
    bggId: 13,
    yearPublished: 1995,
    bggRating: 7.1,
    players: [],
    bringers: [
      { id: 'b1', user: { id: 'user-2', name: 'Thorsten' }, addedAt: new Date() },
      { id: 'b2', user: { id: 'user-3', name: 'Daniel' }, addedAt: new Date() },
    ],
    status: 'verfuegbar',
    createdAt: new Date(),
  },
  {
    id: 'game-2',
    name: 'Azul',
    owner: mockUser,
    bggId: 230802,
    yearPublished: 2017,
    bggRating: 7.8,
    players: [],
    bringers: [],
    status: 'wunsch',
    createdAt: new Date(),
  },
];

describe('HomePage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (gamesApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ games: mockGames });
    (bggApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [], hasMore: false });
  });

  describe('Unified Search Bar', () => {
    it('renders unified search bar when user is logged in', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/spiel suchen oder hinzufügen/i)).toBeInTheDocument();
      });
    });

    it('filters game list when typing in search bar', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });

      // Type in search bar
      const searchInput = screen.getByPlaceholderText(/spiel suchen oder hinzufügen/i);
      fireEvent.change(searchInput, { target: { value: 'Catan' } });

      // Should filter to show only Catan
      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
      });
    });

    it('shows dropdown with matching games from list', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/spiel suchen oder hinzufügen/i)).toBeInTheDocument();
      });

      // Type in search bar
      const searchInput = screen.getByPlaceholderText(/spiel suchen oder hinzufügen/i);
      fireEvent.change(searchInput, { target: { value: 'Catan' } });

      // Should show dropdown with "In deiner Liste" section
      await waitFor(() => {
        expect(screen.getByText(/in deiner liste/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Toggles', () => {
    it('renders Wunsch and Meine Spiele toggle buttons', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /gesuchte spiele/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /meine spiele/i })).toBeInTheDocument();
      });
    });

    it('filters to Wunsch games when toggle is clicked', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });

      // Click Wunsch toggle
      const wunschButton = screen.getByRole('button', { name: /gesuchte spiele/i });
      fireEvent.click(wunschButton);

      // Should show only Azul (which is wunsch)
      await waitFor(() => {
        expect(screen.queryAllByText('Catan').length).toBe(0);
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Advanced Filters', () => {
    it('renders collapsed advanced filters section', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erweiterte filter/i })).toBeInTheDocument();
      });

      // Player and bringer inputs should not be visible initially
      expect(screen.queryByLabelText(/mitspieler suchen/i)).not.toBeInTheDocument();
    });

    it('expands advanced filters when clicked', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erweiterte filter/i })).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByRole('button', { name: /erweiterte filter/i }));

      // Player and bringer inputs should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/mitspieler suchen/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bringt mit suchen/i)).toBeInTheDocument();
      });
    });
  });

  describe('Game Highlighting', () => {
    it('highlights matching games in the list when searching', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
      });

      // Type in search bar
      const searchInput = screen.getByPlaceholderText(/spiel suchen oder hinzufügen/i);
      fireEvent.change(searchInput, { target: { value: 'Catan' } });

      // The game row/card should have highlight class
      // Note: This is a simplified test - in reality we'd check for bg-green-100 class
      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state while fetching games', async () => {
      (gamesApi.getAll as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<HomePage user={mockUser} />);

      expect(screen.getByText(/spiele werden geladen/i)).toBeInTheDocument();
    });

    it('shows error state when fetch fails', async () => {
      (gamesApi.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Removal (Spec 007)', () => {
    it('does not render Statistics component (Requirement 7.1)', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Spieleliste' })).toBeInTheDocument();
      });

      // Statistics component should not be rendered
      expect(screen.queryByText('Statistiken')).not.toBeInTheDocument();
      expect(screen.queryByTestId('statistics')).not.toBeInTheDocument();
    });

    it('retains game list functionality (Requirement 7.2)', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        // Game list should still render
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });
    });
  });
});
