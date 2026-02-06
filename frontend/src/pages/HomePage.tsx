/**
 * HomePage - Main game list page
 * Wires frontend components to backend API
 * All UI text in German (Requirement 9.1)
 * 
 * Updated for unified search feature (Spec 006):
 * - Replaced AddGameForm and SearchFilters name search with UnifiedSearchBar
 * - Added AdvancedFilters for player/bringer search
 * - Added game highlighting based on search query
 * - Kept Wunsch and Meine Spiele toggles visible
 * 
 * Updated for Spec 007:
 * - Removed Statistics component (moved to dedicated StatisticsPage)
 */

import { useState, useEffect, useCallback } from 'react';
import { gamesApi, ApiError } from '../api/client';
import { GameTable } from '../components/GameTable';
import { UnifiedSearchBar } from '../components/UnifiedSearchBar';
import { AdvancedFilters } from '../components/AdvancedFilters';
import { DeleteGameModal } from '../components/DeleteGameModal';
import { useToast } from '../components/ToastProvider';
import { useGameFilters, useSSE } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { getHighlightedGameIds, DEFAULT_SORT_ORDER, DEFAULT_SORT_KEY } from '../utils';
import type { Game, Participant, SSEEvent, GameCreatedEvent, ThumbnailUploadedEvent } from '../types';
import type { SortOrder, SortKey } from '../utils';

interface HomePageProps {
  participant: Participant | null;
}

export function HomePage({ participant }: HomePageProps) {
  // Game state
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  
  // Track game to scroll to (newly added or clicked from dropdown)
  const [scrollToGameId, setScrollToGameId] = useState<string | null>(null);
  
  // Search query for highlighting (from UnifiedSearchBar)
  const [searchQuery, setSearchQuery] = useState('');
  
  // Clear trigger for UnifiedSearchBar (incremented to trigger clear)
  const [searchClearTrigger, setSearchClearTrigger] = useState(0);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Thumbnail timestamps for cache-busting (gameId -> timestamp)
  const [thumbnailTimestamps, setThumbnailTimestamps] = useState<Record<string, number>>({});
  
  // Toast notifications
  const { showToast } = useToast();

  // Account auth (organizer/admin)
  const { account } = useAuth();
  const canManageGames = account?.role === 'admin' || account?.role === 'account_owner';
  
  // Filter state from hook
  const {
    filters,
    setNameQuery,
    setPlayerQuery,
    setBringerQuery,
    setWunschOnly,
    setMyGamesOnly,
    setPlayerOnly,
    setHiddenOnly,
    setPrototypeFilter,
    filterGames,
    hasActiveFilters,
    resetFilters,
  } = useGameFilters();

  // Current participant info
  const currentParticipantId = participant?.id || '';
  const currentParticipantName = participant?.name || 'Unbekannt';

  // Fetch games from API
  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gamesApi.getAll(currentParticipantId || undefined);
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
  }, [currentParticipantId]);

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // SSE event handlers for real-time updates
  const handleSSEGameCreated = useCallback(async (event: GameCreatedEvent) => {
    try {
      const response = await gamesApi.getById(event.gameId, currentParticipantId || undefined);
      setGames((prev) => {
        // Check if game already exists (in case of race condition)
        if (prev.some(g => g.id === event.gameId)) {
          return prev;
        }
        return [...prev, response.game];
      });
    } catch (err) {
      console.error('Failed to fetch new game from SSE event:', err);
    }
  }, [currentParticipantId]);

  const handleSSEGameUpdated = useCallback(async (event: SSEEvent) => {
    try {
      // Handle thumbnail-uploaded events specially to extract timestamp for cache-busting
      if (event.type === 'game:thumbnail-uploaded') {
        const thumbnailEvent = event as ThumbnailUploadedEvent;
        setThumbnailTimestamps((prev) => ({
          ...prev,
          [thumbnailEvent.gameId]: thumbnailEvent.timestamp,
        }));
      }
      
      const response = await gamesApi.getById(event.gameId, currentParticipantId || undefined);
      setGames((prev) =>
        prev.map((g) => (g.id === event.gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to fetch updated game from SSE event:', err);
    }
  }, [currentParticipantId]);

  const handleSSEGameDeleted = useCallback((event: SSEEvent) => {
    setGames((prev) => prev.filter((g) => g.id !== event.gameId));
  }, [currentParticipantId]);

  // SSE connection for real-time updates
  useSSE({
    currentParticipantId,
    enabled: !!currentParticipantId,
    handlers: {
      onGameCreated: handleSSEGameCreated,
      onGameUpdated: handleSSEGameUpdated,
      onGameDeleted: handleSSEGameDeleted,
      onToast: showToast,
    },
  });

  // Handle game added from UnifiedSearchBar
  const handleGameAdded = useCallback((game: Game) => {
    setGames((prev) => [...prev, game]);
    // Small delay to ensure the new game is rendered in the DOM before scrolling
    setTimeout(() => {
      setScrollToGameId(game.id);
    }, 100);
  }, [currentParticipantId]);

  // Handle scroll to game from dropdown click
  // Uses requestAnimationFrame to ensure the list is unfiltered before scrolling
  const handleScrollToGame = useCallback((gameId: string) => {
    // Clear the search first
    setSearchClearTrigger(prev => prev + 1);
    // Wait for the next render cycle after filters are cleared, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScrollToGameId(gameId);
      });
    });
  }, [currentParticipantId]);

  // Clear scroll target after scroll
  const handleScrolledToGame = useCallback(() => {
    setScrollToGameId(null);
  }, [currentParticipantId]);

  // Handle search query change for highlighting and filtering
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    setNameQuery(query);
  }, [setNameQuery]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchClearTrigger(prev => prev + 1);
  }, [resetFilters]);

  const handleSortChange = useCallback((key: SortKey, order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
  }, []);

  // Handle add player action
  const handleAddPlayer = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.addPlayer(gameId, currentParticipantId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to add player:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Hinzufügen als Mitspieler. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId]);

  // Handle add bringer action
  const handleAddBringer = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.addBringer(gameId, currentParticipantId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to add bringer:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Hinzufügen als Bringer. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId]);

  // Handle remove player action
  const handleRemovePlayer = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.removePlayer(gameId, currentParticipantId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to remove player:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Entfernen als Mitspieler. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId]);

  // Handle remove bringer action
  const handleRemoveBringer = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.removeBringer(gameId, currentParticipantId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to remove bringer:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Entfernen als Bringer. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId]);

  // Handle hide game action
  const handleHideGame = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.hideGame(gameId, currentParticipantId);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to hide game:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Ausblenden des Spiels. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId]);

  // Handle unhide game action
  const handleUnhideGame = useCallback(async (gameId: string) => {
    if (!currentParticipantId) return;
    try {
      const response = await gamesApi.unhideGame(gameId, currentParticipantId);
      let shouldDisableHiddenFilter = false;
      setGames((prev) => {
        const hiddenCountBefore = prev.filter((g) => g.isHidden).length;
        const wasHidden = prev.some((g) => g.id === gameId && g.isHidden);
        if (filters.hiddenOnly && wasHidden && hiddenCountBefore === 1) {
          shouldDisableHiddenFilter = true;
        }
        return prev.map((g) => (g.id === gameId ? response.game : g));
      });
      if (shouldDisableHiddenFilter) {
        setHiddenOnly(false);
        showToast('Keine ausgeblendeten Spiele mehr – Filter zurückgesetzt.');
      }
    } catch (err) {
      console.error('Failed to unhide game:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Fehler beim Einblenden des Spiels. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId, filters.hiddenOnly, setHiddenOnly, showToast]);

  // Handle toggle prototype status
  // Requirements: 022-prototype-toggle 2.3, 3.2
  const handleTogglePrototype = useCallback(async (gameId: string, isPrototype: boolean) => {
    if (!currentParticipantId) return;
    
    // Store previous state for rollback using functional update
    let previousGames: Game[] = [];
    
    setGames((prev) => {
      previousGames = prev;
      return prev.map((g) => (g.id === gameId ? { ...g, isPrototype } : g));
    });
    
    try {
      const response = await gamesApi.togglePrototype(gameId, isPrototype, currentParticipantId);
      // Update with server response to ensure consistency
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? response.game : g))
      );
    } catch (err) {
      console.error('Failed to toggle prototype:', err);
      // Rollback on error
      setGames(previousGames);
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Fehler beim Ändern des Prototyp-Status. Bitte erneut versuchen.');
      }
    }
  }, [currentParticipantId, showToast]);

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
    if (!gameToDelete || !currentParticipantId) return;
    
    setIsDeleting(true);
    try {
      await gamesApi.delete(gameToDelete.id, currentParticipantId, canManageGames);
      setGames((prev) => prev.filter((g) => g.id !== gameToDelete.id));
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
  }, [gameToDelete, currentParticipantId, canManageGames]);

  // Handle delete modal cancel
  const handleDeleteModalCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setGameToDelete(null);
  }, [currentParticipantId]);

  // Handle thumbnail uploaded - update timestamp for cache-busting
  const handleThumbnailUploaded = useCallback((gameId: string) => {
    setThumbnailTimestamps((prev) => ({
      ...prev,
      [gameId]: Date.now(),
    }));
  }, []);

  // Apply filters to games
  const filteredGames = filterGames(games, currentParticipantName);
  const hiddenCount = games.filter((game) => game.isHidden).length;

  // Get highlighted game IDs based on search query
  const highlightedGameIds = getHighlightedGameIds(filteredGames, searchQuery);

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
    <div className={`space-y-6 ${(hasActiveFilters || searchQuery) ? 'pb-20 sm:pb-0' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Spieleliste</h2>
      </div>

      {/* Unified Search Bar - replaces AddGameForm and SearchFilters name search */}
      {participant && (
        <UnifiedSearchBar
          games={games}
          currentParticipantId={currentParticipantId}
          onGameAdded={handleGameAdded}
          onSearchQueryChange={handleSearchQueryChange}
          onScrollToGame={handleScrollToGame}
          clearTrigger={searchClearTrigger}
        />
      )}

      {/* Filter toggles - Wunsch and Meine Spiele (Requirement 8.5, 8.6) */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {/* Gesuchte Spiele toggle */}
          <button
            type="button"
            onClick={() => setWunschOnly(!filters.wunschOnly)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              filters.wunschOnly
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={filters.wunschOnly}
            aria-label="Nur gesuchte Spiele anzeigen"
          >
            <span className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-500" aria-hidden="true" />
            <span className="hidden sm:inline">Gesuchte Spiele</span>
            <span className="sm:hidden">Gesucht</span>
            {filters.wunschOnly && <CheckIcon className="w-4 h-4" />}
          </button>

          {/* Bringe ich mit toggle */}
          <button
            type="button"
            onClick={() => setMyGamesOnly(!filters.myGamesOnly)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              filters.myGamesOnly
                ? 'bg-blue-100 text-blue-800 border-2 border-blue-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={filters.myGamesOnly}
            aria-label="Nur Spiele anzeigen, die ich mitbringe"
          >
            <img src="/package.svg?v=2" alt="" className="w-5 h-5" />
            <span className="hidden sm:inline">Bringe ich mit</span>
            <span className="sm:hidden">Bringe</span>
            {filters.myGamesOnly && <CheckIcon className="w-4 h-4" />}
          </button>

          {/* Spiele ich mit toggle */}
          <button
            type="button"
            onClick={() => setPlayerOnly(!filters.playerOnly)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              filters.playerOnly
                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={filters.playerOnly}
            aria-label="Nur Spiele anzeigen, bei denen ich mitspiele"
          >
            <img src="/meeple.svg" alt="" className="w-4 h-4" />
            <span className="hidden sm:inline">Spiele ich mit</span>
            <span className="sm:hidden">Spiele</span>
            {filters.playerOnly && <CheckIcon className="w-4 h-4" />}
          </button>

          {/* Ausgeblendet toggle */}
          <button
            type="button"
            onClick={() => setHiddenOnly(!filters.hiddenOnly)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              filters.hiddenOnly
                ? 'bg-gray-200 text-gray-800 border-2 border-gray-400'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
            aria-pressed={filters.hiddenOnly}
            aria-label="Nur ausgeblendete Spiele anzeigen"
          >
            <img src="/eye-off.svg?v=3" alt="" className="w-4 h-4" />
            <span className="hidden sm:inline">Ausgeblendet</span>
            <span className="sm:hidden">Ausbl.</span>
            {filters.hiddenOnly && <CheckIcon className="w-4 h-4" />}
          </button>

          {/* Prototypen filter - segmented control */}
          <div className="flex items-end">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-gray-100 min-h-[44px]">
              <button
                type="button"
                onClick={() => setPrototypeFilter('all')}
                className={`px-3 text-xs sm:text-sm font-medium transition-colors ${
                  filters.prototypeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={filters.prototypeFilter === 'all'}
                aria-label="Alle Spiele anzeigen"
                title="Alle Spiele"
              >
                <span className="hidden sm:inline">Alle</span>
                <span className="sm:hidden">Alle</span>
              </button>
              <button
                type="button"
                onClick={() => setPrototypeFilter('exclude')}
                className={`px-3 text-xs sm:text-sm font-medium transition-colors border-l border-gray-200 ${
                  filters.prototypeFilter === 'exclude'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={filters.prototypeFilter === 'exclude'}
                aria-label="Ohne Prototypen anzeigen"
                title="Ohne Prototypen"
              >
                <span className="hidden sm:inline">Ohne Prototypen</span>
                <span className="sm:hidden">Ohne Protos</span>
              </button>
              <button
                type="button"
                onClick={() => setPrototypeFilter('only')}
                className={`px-3 text-xs sm:text-sm font-medium transition-colors border-l border-gray-200 ${
                  filters.prototypeFilter === 'only'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={filters.prototypeFilter === 'only'}
                aria-label="Nur Prototypen anzeigen"
                title="Nur Prototypen"
              >
                <span className="hidden sm:inline">Nur Prototypen</span>
                <span className="sm:hidden">Nur Protos</span>
              </button>
            </div>
          </div>

          {(hasActiveFilters || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200 ml-auto order-last"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters - player and bringer search (Requirement 8.1-8.4) */}
      <AdvancedFilters
        onPlayerSearch={setPlayerQuery}
        onBringerSearch={setBringerQuery}
        initialValues={{
          playerQuery: filters.playerQuery,
          bringerQuery: filters.bringerQuery,
        }}
      />

        <GameTable
          games={filteredGames}
          currentParticipantId={currentParticipantId}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onAddPlayer={handleAddPlayer}
          onAddBringer={handleAddBringer}
        onRemovePlayer={handleRemovePlayer}
        onRemoveBringer={handleRemoveBringer}
        onHideGame={handleHideGame}
        onUnhideGame={handleUnhideGame}
        onDeleteGame={handleDeleteGameClick}
        onTogglePrototype={handleTogglePrototype}
        onThumbnailUploaded={handleThumbnailUploaded}
        scrollToGameId={scrollToGameId}
        onScrolledToGame={handleScrolledToGame}
        highlightedGameIds={highlightedGameIds}
        totalGamesCount={games.length}
        hiddenCount={hiddenCount}
        hiddenOnly={filters.hiddenOnly}
        thumbnailTimestamps={thumbnailTimestamps}
        canManageGames={canManageGames}
      />

      {/* Delete confirmation modal */}
      <DeleteGameModal
        isOpen={deleteModalOpen}
        gameName={gameToDelete?.name ?? ''}
        onConfirm={handleDeleteGameConfirm}
        onCancel={handleDeleteModalCancel}
        isDeleting={isDeleting}
        playersCount={gameToDelete?.players.length ?? 0}
        bringersCount={gameToDelete?.bringers.length ?? 0}
      />

      {(hasActiveFilters || searchQuery) && (
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200 shadow-md"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default HomePage;
