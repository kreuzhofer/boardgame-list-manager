/**
 * GameTable component
 * Displays games in table format with Name, Mitspieler, Bringt mit, Aktionen columns
 * All UI text in German (Requirement 9.1)
 * Requirement 5.1: Display each game as a row in a table format
 * Requirement 5.2, 5.3: Sorting by game name with toggle
 * Requirement 6.1, 6.2, 6.3, 6.4: Responsive design with desktop table and mobile card layout
 */

import { useMemo } from 'react';
import { Game } from '../types';
import { GameRow } from './GameRow';
import { GameCard } from './GameCard';
import { sortGamesByName, type SortOrder, DEFAULT_SORT_ORDER } from '../utils';

interface GameTableProps {
  games: Game[];
  currentUserId: string;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  scrollToGameId?: string | null;
  onScrolledToGame?: () => void;
}

export function GameTable({
  games,
  currentUserId,
  sortOrder = DEFAULT_SORT_ORDER,
  onSortOrderChange,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  onDeleteGame,
  scrollToGameId,
  onScrolledToGame,
}: GameTableProps) {
  // Sort games alphabetically by name (Requirements 5.2, 5.3)
  const sortedGames = useMemo(() => {
    return sortGamesByName(games, sortOrder);
  }, [games, sortOrder]);

  // Handle sort toggle when clicking the Name header
  const handleSortToggle = () => {
    if (onSortOrderChange) {
      onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
    }
  };

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">
          Noch keine Spiele vorhanden.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Füge das erste Spiel hinzu, um loszulegen!
        </p>
      </div>
    );
  }

  // Sort header button component (shared between desktop and mobile)
  const SortButton = () => (
    <button
      onClick={handleSortToggle}
      className="inline-flex items-center gap-1 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors"
      aria-label={sortOrder === 'asc' ? 'Sortiert A bis Z, klicken für Z bis A' : 'Sortiert Z bis A, klicken für A bis Z'}
    >
      <span>Name</span>
      {sortOrder === 'asc' ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Mobile card layout (Requirement 6.3) - visible on small screens */}
      <div className="lg:hidden">
        {/* Mobile sort header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            <SortButton />
          </span>
          <span className="text-sm text-gray-500">
            {games.length} {games.length === 1 ? 'Spiel' : 'Spiele'}
          </span>
        </div>
        
        {/* Mobile card list */}
        <div className="divide-y divide-gray-200">
          {sortedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              currentUserId={currentUserId}
              onAddPlayer={onAddPlayer}
              onAddBringer={onAddBringer}
              onRemovePlayer={onRemovePlayer}
              onRemoveBringer={onRemoveBringer}
              onDeleteGame={onDeleteGame}
              scrollIntoView={game.id === scrollToGameId}
              onScrolledIntoView={onScrolledToGame}
            />
          ))}
        </div>
      </div>

      {/* Desktop table layout (Requirement 6.2) - visible on large screens */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  <SortButton />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Mitspieler
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Bringt mit
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedGames.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  currentUserId={currentUserId}
                  onAddPlayer={onAddPlayer}
                  onAddBringer={onAddBringer}
                  onRemovePlayer={onRemovePlayer}
                  onRemoveBringer={onRemoveBringer}
                  onDeleteGame={onDeleteGame}
                  scrollIntoView={game.id === scrollToGameId}
                  onScrolledIntoView={onScrolledToGame}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Table footer with count */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {games.length} {games.length === 1 ? 'Spiel' : 'Spiele'} insgesamt
          </p>
        </div>
      </div>
    </div>
  );
}

export default GameTable;
