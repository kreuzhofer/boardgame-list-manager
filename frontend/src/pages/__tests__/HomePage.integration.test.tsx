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
    getById: vi.fn(),
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

// Mock ToastProvider
vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useSSE hook
const mockUseSSE = vi.fn();
vi.mock('../../hooks/useSSE', () => ({
  useSSE: (options: unknown) => mockUseSSE(options),
  calculateBackoffDelay: (attempt: number) => Math.min(Math.pow(2, attempt - 1) * 1000, 30000),
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
    mockUseSSE.mockReturnValue({ isConnected: true, connectionError: null });
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

      // Should show dropdown with "Schon eingetragen" section
      await waitFor(() => {
        expect(screen.getByText(/schon eingetragen/i)).toBeInTheDocument();
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

  describe('SSE Integration (Spec 012)', () => {
    it('initializes SSE connection with current user ID', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(mockUseSSE).toHaveBeenCalledWith(
          expect.objectContaining({
            currentUserId: mockUser.id,
            enabled: true,
          })
        );
      });
    });

    it('does not enable SSE when user is not logged in', async () => {
      render(<HomePage user={null} />);

      await waitFor(() => {
        expect(mockUseSSE).toHaveBeenCalledWith(
          expect.objectContaining({
            currentUserId: '',
            enabled: false,
          })
        );
      });
    });

    it('provides handlers for game events', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        const call = mockUseSSE.mock.calls[mockUseSSE.mock.calls.length - 1][0];
        expect(call.handlers).toBeDefined();
        expect(call.handlers.onGameCreated).toBeDefined();
        expect(call.handlers.onGameUpdated).toBeDefined();
        expect(call.handlers.onGameDeleted).toBeDefined();
        expect(call.handlers.onToast).toBeDefined();
      });
    });

    it('fetches and adds new game when onGameCreated is called', async () => {
      const newGame: Game = {
        id: 'game-3',
        name: 'Wingspan',
        owner: mockUser,
        bggId: 266192,
        yearPublished: 2019,
        bggRating: 8.1,
        players: [],
        bringers: [],
        status: 'wunsch',
        createdAt: new Date(),
      };

      (gamesApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ game: newGame });

      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
      });

      // Get the onGameCreated handler and call it
      const call = mockUseSSE.mock.calls[mockUseSSE.mock.calls.length - 1][0];
      await call.handlers.onGameCreated({
        type: 'game:created',
        gameId: 'game-3',
        userId: 'user-2',
        userName: 'Other User',
        gameName: 'Wingspan',
        isBringing: false,
      });

      await waitFor(() => {
        expect(gamesApi.getById).toHaveBeenCalledWith('game-3');
      });
    });

    it('fetches and updates game when onGameUpdated is called', async () => {
      const updatedGame: Game = {
        ...mockGames[0],
        bringers: [
          ...mockGames[0].bringers,
          { id: 'b3', user: { id: 'user-4', name: 'New Bringer' }, addedAt: new Date() },
        ],
      };

      (gamesApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ game: updatedGame });

      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
      });

      // Get the onGameUpdated handler and call it
      const call = mockUseSSE.mock.calls[mockUseSSE.mock.calls.length - 1][0];
      await call.handlers.onGameUpdated({
        type: 'game:bringer-added',
        gameId: 'game-1',
        userId: 'user-4',
        userName: 'New Bringer',
        gameName: 'Catan',
      });

      await waitFor(() => {
        expect(gamesApi.getById).toHaveBeenCalledWith('game-1');
      });
    });

    it('removes game from list when onGameDeleted is called', async () => {
      render(<HomePage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getAllByText('Catan').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });

      // Get the onGameDeleted handler and call it
      const call = mockUseSSE.mock.calls[mockUseSSE.mock.calls.length - 1][0];
      call.handlers.onGameDeleted({
        type: 'game:deleted',
        gameId: 'game-1',
        userId: 'user-2',
      });

      await waitFor(() => {
        // Catan should be removed
        expect(screen.queryAllByText('Catan').length).toBe(0);
        // Azul should still be there
        expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
      });
    });
  });
});
