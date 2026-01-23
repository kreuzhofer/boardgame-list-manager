/**
 * HomePage - Main game list page
 * Wires frontend components to backend API
 * All UI text in German (Requirement 9.1)
 * 
 * Task 14.1: Wire frontend to backend API
 * - Fetches games from API on mount
 * - Displays GameTable, AddGameForm, SearchFilters, Statistics
 * - Handles all game actions (add player, add bringer, remove player, remove bringer, delete game)
 * - Shows loading states and error messages in German
 */

import { useState, useEffect, useCallback } from 'react';
import { gamesApi, ApiError } from '../api/client';
import { GameTable } from '../components/GameTable';
import { AddGameForm } from '../components/AddGameForm';
import { SearchFilters } from '../components/SearchFilters';
import { Statistics } from '../components/Statistics';
import { DeleteGameModal } from '../components/DeleteGameModal';
import { useGameFilters } from '../hooks';
import type { Game, User } from '../types';
import type { SortOrder } from '../utils';

interface HomePageProps {
  user: User | null;
}

export function HomePage({ user }: HomePageProps) {
  // Game state
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sort state
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Statistics refresh trigger
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  
  // Track newly added game for scroll-to behavior
  const [newlyAddedGameId, setNewlyAddedGameId] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state from hook
  const {
    filters,
    setNameQuery,
    setPlayerQuery,
    setBringerQuery,
    setWunschOnly,
    setMyGamesOnly,
    filterGames,
    hasActiveFilters,
    resetFilters,
  } = useGameFilters();

  // Current user info
  const currentUserId = user?.id || '';
  const currentUserName = user?.name || 'Unbekannt';

  // Fetch games from API
  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gamesApi.getAll();
      setGames(response.games);
    } catch (err) {
      console.error('Failed to fetch games:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Spiele konnten nicht geladen werden. Bitte Verbindung prüfen.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Refresh statistics when games change
  const refreshStats = useCallback(() => {
    setStatsRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handle game added
  const handleGameAdded = useCallback((game: Game) => {
    setGames((prev) => [...prev, game]);
    setNewlyAddedGameId(game.id);
    refreshStats();
  }, [refreshStats]);

  // Clear newly added game ID after scroll
  const handleScrolledToGame = useCallback(() => {
    setNewlyAddedGameId(null);
  }, []);

  // Handle add player action
  const handleAddPlayer = useCallback(async (gameId: string) => {
    if (!currentUserId) return;
    try {
      const response = await gamesApi.addPlayer(gameId, currentUserId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
      refreshStats();
    } catch (err) {
      console.error('Failed to add player:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Hinzufügen als Mitspieler. Bitte erneut versuchen.');
      }
    }
  }, [currentUserId, refreshStats]);

  // Handle add bringer action
  const handleAddBringer = useCallback(async (gameId: string) => {
    if (!currentUserId) return;
    try {
      const response = await gamesApi.addBringer(gameId, currentUserId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
      refreshStats();
    } catch (err) {
      console.error('Failed to add bringer:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Hinzufügen als Bringer. Bitte erneut versuchen.');
      }
    }
  }, [currentUserId, refreshStats]);

  // Handle remove player action
  const handleRemovePlayer = useCallback(async (gameId: string) => {
    if (!currentUserId) return;
    try {
      const response = await gamesApi.removePlayer(gameId, currentUserId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
      refreshStats();
    } catch (err) {
      console.error('Failed to remove player:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Entfernen als Mitspieler. Bitte erneut versuchen.');
      }
    }
  }, [currentUserId, refreshStats]);

  // Handle remove bringer action
  const handleRemoveBringer = useCallback(async (gameId: string) => {
    if (!currentUserId) return;
    try {
      const response = await gamesApi.removeBringer(gameId, currentUserId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
      refreshStats();
    } catch (err) {
      console.error('Failed to remove bringer:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Entfernen als Bringer. Bitte erneut versuchen.');
      }
    }
  }, [currentUserId, refreshStats]);

  // Handle delete game - opens confirmation modal
  const handleDeleteGameClick = useCallback((gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (game) {
      setGameToDelete(game);
      setDeleteModalOpen(true);
    }
  }, [games]);

  // Handle delete game confirmation
  const handleDeleteGameConfirm = useCallback(async () => {
    if (!gameToDelete || !currentUserId) return;
    
    setIsDeleting(true);
    try {
      await gamesApi.delete(gameToDelete.id, currentUserId);
      setGames((prev) => prev.filter((g) => g.id !== gameToDelete.id));
      refreshStats();
      setDeleteModalOpen(false);
      setGameToDelete(null);
    } catch (err) {
      console.error('Failed to delete game:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Löschen des Spiels. Bitte erneut versuchen.');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [gameToDelete, currentUserId, refreshStats]);

  // Handle delete modal cancel
  const handleDeleteModalCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setGameToDelete(null);
  }, []);

  // Apply filters to games
  const filteredGames = filterGames(games, currentUserName);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Spieleliste</h2>
        </div>
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-gray-600">Spiele werden geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Spieleliste</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Fehler beim Laden</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchGames}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Spieleliste</h2>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      <Statistics refreshTrigger={statsRefreshTrigger} />

      {user && (
        <AddGameForm currentUserId={currentUserId} onGameAdded={handleGameAdded} />
      )}

      <SearchFilters
        onNameSearch={setNameQuery}
        onPlayerSearch={setPlayerQuery}
        onBringerSearch={setBringerQuery}
        onWunschFilter={setWunschOnly}
        onMyGamesFilter={setMyGamesOnly}
        initialValues={{
          nameQuery: filters.nameQuery,
          playerQuery: filters.playerQuery,
          bringerQuery: filters.bringerQuery,
          wunschOnly: filters.wunschOnly,
          myGamesOnly: filters.myGamesOnly,
        }}
      />

      {hasActiveFilters && filteredGames.length !== games.length && (
        <div className="text-sm text-gray-500">
          {filteredGames.length} von {games.length} Spielen angezeigt
        </div>
      )}

      <GameTable
        games={filteredGames}
        currentUserId={currentUserId}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onAddPlayer={handleAddPlayer}
        onAddBringer={handleAddBringer}
        onRemovePlayer={handleRemovePlayer}
        onRemoveBringer={handleRemoveBringer}
        onDeleteGame={handleDeleteGameClick}
        scrollToGameId={newlyAddedGameId}
        onScrolledToGame={handleScrolledToGame}
      />

      {/* Delete confirmation modal */}
      <DeleteGameModal
        isOpen={deleteModalOpen}
        gameName={gameToDelete?.name ?? ''}
        onConfirm={handleDeleteGameConfirm}
        onCancel={handleDeleteModalCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default HomePage;
