/**
 * Unit tests for UnifiedSearchBar add game flow with alternate names
 * Feature: 014-alternate-names-search
 * 
 * Requirements: 9.1, 9.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedSearchBar } from '../UnifiedSearchBar';
import { gamesApi } from '../../api/client';
import type { Game, BggSearchResult } from '../../types';

// Mock the API client
vi.mock('../../api/client', () => ({
  gamesApi: {
    create: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Mock the useBggSearch hook
vi.mock('../../hooks', () => ({
  useBggSearch: vi.fn(() => ({
    results: [],
    isLoading: false,
    hasMore: false,
  })),
}));

// Mock LazyBggImage
vi.mock('../LazyBggImage', () => ({
  LazyBggImage: ({ bggId }: { bggId: number }) => (
    <div data-testid={`lazy-bgg-image-${bggId}`} />
  ),
}));

describe('UnifiedSearchBar Add Game Flow', () => {
  const mockOnGameAdded = vi.fn();
  const mockOnSearchQueryChange = vi.fn();
  const mockOnScrollToGame = vi.fn();
  const currentUserId = 'test-user-123';

  const defaultProps = {
    games: [] as Game[],
    currentUserId,
    onGameAdded: mockOnGameAdded,
    onSearchQueryChange: mockOnSearchQueryChange,
    onScrollToGame: mockOnScrollToGame,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (gamesApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      game: {
        id: 'new-game-id',
        name: 'Test Game',
        status: 'wunsch',
        owner: { id: currentUserId, name: 'Test User' },
        players: [],
        bringers: [],
        bggId: null,
        yearPublished: null,
        bggRating: null,
        addedAsAlternateName: null,
        alternateNames: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 9.1: Alternate name data passed to API', () => {
    it('should pass matchedAlternateName to API when adding BGG game', async () => {
      // Import and mock useBggSearch to return results with alternate names
      const { useBggSearch } = await import('../../hooks');
      const mockBggResults: BggSearchResult[] = [
        {
          id: 115746,
          name: 'War of the Ring: Second Edition',
          yearPublished: 2012,
          rating: 8.5,
          matchedAlternateName: 'Der Ringkrieg',
          alternateNames: ['Der Ringkrieg', 'La Guerra del Anillo'],
        },
      ];
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: mockBggResults,
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      // Type in search
      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'ringkrieg' } });

      // Wait for dropdown and click BGG result
      await waitFor(() => {
        expect(screen.getByText('War of the Ring: Second Edition')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('War of the Ring: Second Edition'));

      // Click add button
      const addButton = screen.getByText('+ Hinzufügen');
      fireEvent.click(addButton);

      // Verify API was called with alternate name data
      await waitFor(() => {
        expect(gamesApi.create).toHaveBeenCalledWith(
          'War of the Ring: Second Edition',
          currentUserId,
          false, // isBringing
          false, // isPlaying
          false, // isPrototype
          115746, // bggId
          2012, // yearPublished
          8.5, // bggRating
          'Der Ringkrieg', // addedAsAlternateName
          ['Der Ringkrieg', 'La Guerra del Anillo'] // alternateNames
        );
      });
    });

    it('should pass alternateNames array to API when adding BGG game', async () => {
      const { useBggSearch } = await import('../../hooks');
      const mockBggResults: BggSearchResult[] = [
        {
          id: 342942,
          name: 'Ark Nova',
          yearPublished: 2021,
          rating: 8.5,
          matchedAlternateName: null, // Primary name matched
          alternateNames: ['Arche Nova', 'アークノヴァ'],
        },
      ];
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: mockBggResults,
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'ark nova' } });

      await waitFor(() => {
        expect(screen.getByText('Ark Nova')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ark Nova'));

      const addButton = screen.getByText('+ Hinzufügen');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(gamesApi.create).toHaveBeenCalledWith(
          'Ark Nova',
          currentUserId,
          false,
          false,
          false,
          342942,
          2021,
          8.5,
          undefined, // No matchedAlternateName (null becomes undefined)
          ['Arche Nova', 'アークノヴァ']
        );
      });
    });
  });

  describe('Requirement 9.2: Handling when no alternate name matched', () => {
    it('should pass undefined for alternate name fields when not present', async () => {
      const { useBggSearch } = await import('../../hooks');
      const mockBggResults: BggSearchResult[] = [
        {
          id: 174430,
          name: 'Gloomhaven',
          yearPublished: 2017,
          rating: 8.7,
          // No matchedAlternateName or alternateNames
        },
      ];
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: mockBggResults,
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'gloomhaven' } });

      await waitFor(() => {
        expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Gloomhaven'));

      const addButton = screen.getByText('+ Hinzufügen');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(gamesApi.create).toHaveBeenCalledWith(
          'Gloomhaven',
          currentUserId,
          false,
          false,
          false,
          174430,
          2017,
          8.7,
          undefined, // No matchedAlternateName
          undefined  // No alternateNames
        );
      });
    });

    it('should handle custom game name without BGG selection', async () => {
      const { useBggSearch } = await import('../../hooks');
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: [],
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'My Custom Game' } });

      // Wait for add button to appear
      await waitFor(() => {
        expect(screen.getByText('+ Hinzufügen')).toBeInTheDocument();
      });

      const addButton = screen.getByText('+ Hinzufügen');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(gamesApi.create).toHaveBeenCalledWith(
          'My Custom Game',
          currentUserId,
          false,
          false,
          false,
          undefined, // No bggId
          undefined, // No yearPublished
          undefined, // No bggRating
          undefined, // No matchedAlternateName
          undefined  // No alternateNames
        );
      });
    });
  });

  describe('Selected game chip display', () => {
    it('should show alternate name in selected game chip', async () => {
      const { useBggSearch } = await import('../../hooks');
      const mockBggResults: BggSearchResult[] = [
        {
          id: 115746,
          name: 'War of the Ring: Second Edition',
          yearPublished: 2012,
          rating: 8.5,
          matchedAlternateName: 'Der Ringkrieg',
          alternateNames: ['Der Ringkrieg'],
        },
      ];
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: mockBggResults,
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'ringkrieg' } });

      await waitFor(() => {
        expect(screen.getByText('War of the Ring: Second Edition')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('War of the Ring: Second Edition'));

      // After selection, the chip should show the alternate name
      await waitFor(() => {
        expect(screen.getByText('Auch bekannt als: Der Ringkrieg')).toBeInTheDocument();
      });
    });

    it('should not show alternate name section in chip when not matched', async () => {
      const { useBggSearch } = await import('../../hooks');
      const mockBggResults: BggSearchResult[] = [
        {
          id: 174430,
          name: 'Gloomhaven',
          yearPublished: 2017,
          rating: 8.7,
          matchedAlternateName: null,
        },
      ];
      
      (useBggSearch as ReturnType<typeof vi.fn>).mockReturnValue({
        results: mockBggResults,
        isLoading: false,
        hasMore: false,
      });

      render(<UnifiedSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Spiel suchen oder hinzufügen...');
      fireEvent.change(input, { target: { value: 'gloomhaven' } });

      await waitFor(() => {
        expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Gloomhaven'));

      // After selection, there should be no alternate name shown
      await waitFor(() => {
        expect(screen.queryByText(/Auch bekannt als/)).not.toBeInTheDocument();
      });
    });
  });
});
