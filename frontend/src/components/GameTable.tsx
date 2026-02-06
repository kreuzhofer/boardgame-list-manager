/**
 * GameTable component
 * Displays games in table format with Name, Mitspieler, Bringt mit, Aktionen columns
 * All UI text in German (Requirement 9.1)
 * Requirement 5.1: Display each game as a row in a table format
 * Requirement 5.2, 5.3: Sorting by game name or date added with toggle
 * Requirement 6.1, 6.2, 6.3, 6.4: Responsive design with desktop table and mobile card layout
 */

import { useMemo } from 'react';
import { Game } from '../types';
import { GameRow } from './GameRow';
import { GameCard } from './GameCard';
import {
  sortGamesByName,
  sortGamesByAddedAt,
  toggleSortOrder,
  type SortOrder,
  type SortKey,
  DEFAULT_SORT_ORDER,
  DEFAULT_SORT_KEY,
} from '../utils';

interface GameTableProps {
  games: Game[];
  currentParticipantId: string;
  sortKey?: SortKey;
  sortOrder?: SortOrder;
  onSortChange?: (key: SortKey, order: SortOrder) => void;
  onAddPlayer?: (gameId: string) => void;
  onAddBringer?: (gameId: string) => void;
  onRemovePlayer?: (gameId: string) => void;
  onRemoveBringer?: (gameId: string) => void;
  onHideGame?: (gameId: string) => void;
  onUnhideGame?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  onTogglePrototype?: (gameId: string, isPrototype: boolean) => Promise<void>;
  onThumbnailUploaded?: (gameId: string) => void;
  scrollToGameId?: string | null;
  onScrolledToGame?: () => void;
  /** Set of game IDs that should be highlighted (match search) - Requirement 7.1, 7.2 */
  highlightedGameIds?: Set<string>;
  /** Total number of games before filtering (to show appropriate empty message) */
  totalGamesCount?: number;
  /** Total number of hidden games (for header count display) */
  hiddenCount?: number;
  /** Whether the hidden-only filter is active */
  hiddenOnly?: boolean;
  /** Thumbnail timestamps for cache-busting (gameId -> timestamp) */
  thumbnailTimestamps?: Record<string, number>;
  /** Organizer/admin can manage all games */
  canManageGames?: boolean;
}

export function GameTable({
  games,
  currentParticipantId,
  sortKey = DEFAULT_SORT_KEY,
  sortOrder = DEFAULT_SORT_ORDER,
  onSortChange,
  onAddPlayer,
  onAddBringer,
  onRemovePlayer,
  onRemoveBringer,
  onHideGame,
  onUnhideGame,
  onDeleteGame,
  onTogglePrototype,
  onThumbnailUploaded,
  scrollToGameId,
  onScrolledToGame,
  highlightedGameIds,
  totalGamesCount,
  hiddenCount = 0,
  hiddenOnly = false,
  thumbnailTimestamps,
  canManageGames = false,
}: GameTableProps) {
  // Sort games by selected key (name or added date)
  const sortedGames = useMemo(() => {
    return sortKey === 'addedAt'
      ? sortGamesByAddedAt(games, sortOrder)
      : sortGamesByName(games, sortOrder);
  }, [games, sortKey, sortOrder]);

  const getDefaultSortOrder = (key: SortKey): SortOrder => {
    return key === 'name' ? DEFAULT_SORT_ORDER : 'desc';
  };

  const getSortAriaLabel = (key: SortKey, order: SortOrder, isActive: boolean): string => {
    if (key === 'name') {
      if (isActive) {
        return order === 'asc'
          ? 'Sortiert A bis Z, klicken für Z bis A'
          : 'Sortiert Z bis A, klicken für A bis Z';
      }
      return 'Sortieren nach Name (A bis Z)';
    }

    if (isActive) {
      return order === 'asc'
        ? 'Sortiert nach hinzugefügt, älteste zuerst, klicken für neueste zuerst'
        : 'Sortiert nach hinzugefügt, neueste zuerst, klicken für älteste zuerst';
    }
    return 'Sortieren nach hinzugefügt (neueste zuerst)';
  };

  // Handle sort toggle when clicking a header
  const handleSortToggle = (key: SortKey) => {
    if (!onSortChange) return;

    if (key === sortKey) {
      onSortChange(key, toggleSortOrder(sortOrder));
      return;
    }

    onSortChange(key, getDefaultSortOrder(key));
  };

  if (games.length === 0) {
    // Check if there are games but none match the filter
    const hasGamesButNoMatch = totalGamesCount !== undefined && totalGamesCount > 0;
    
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">
          {hasGamesButNoMatch
            ? 'Keine Spiele gefunden.'
            : 'Noch keine Spiele vorhanden.'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {hasGamesButNoMatch
            ? 'Versuche einen anderen Suchbegriff oder setze die Filter zurück.'
            : 'Füge das erste Spiel hinzu, um loszulegen!'}
        </p>
      </div>
    );
  }

  // Sort header button component (shared between desktop and mobile)
  const SortIcon = ({ order }: { order: SortOrder }) => (
    order === 'asc' ? (
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
    )
  );

  const SortButton = ({
    label,
    targetKey,
    className = '',
  }: {
    label: string;
    targetKey: SortKey;
    className?: string;
  }) => {
    const isActive = sortKey === targetKey;
    const displayOrder = isActive ? sortOrder : getDefaultSortOrder(targetKey);
    const ariaLabel = getSortAriaLabel(targetKey, displayOrder, isActive);

    return (
      <button
        onClick={() => handleSortToggle(targetKey)}
        className={`inline-flex items-center gap-1 focus:outline-none focus:text-blue-600 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} ${className}`.trim()}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        {isActive && <SortIcon order={sortOrder} />}
      </button>
    );
  };

  const totalCount = totalGamesCount ?? games.length;
  const showHiddenInfo = hiddenCount > 0;
  const countLabel = hiddenOnly
    ? `${games.length} ${games.length === 1 ? 'Spiel' : 'Spiele'} ausgeblendet von ${totalCount}`
    : showHiddenInfo
      ? `${totalCount} ${totalCount === 1 ? 'Spiel' : 'Spiele'} (${hiddenCount} ausgeblendet)`
      : `${totalCount} ${totalCount === 1 ? 'Spiel' : 'Spiele'}`;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Mobile card layout (Requirement 6.3) - visible on small screens */}
      <div className="lg:hidden">
        {/* Mobile sort header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm font-semibold">
            <SortButton
              label="Hinzugefügt"
              targetKey="addedAt"
              className="w-28 shrink-0"
            />
            <SortButton label="Name" targetKey="name" />
          </div>
          <span className="text-sm text-gray-500">
            {countLabel}
          </span>
        </div>
        
        {/* Mobile card list */}
        <div>
          {sortedGames.map((game, index) => (
            <div
              key={game.id}
              className="relative"
            >
              {index > 0 && (
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-gray-300/35 to-transparent pointer-events-none z-10" />
              )}
              <GameCard
                game={game}
                currentParticipantId={currentParticipantId}
                canManageGames={canManageGames}
                onAddPlayer={onAddPlayer}
                onAddBringer={onAddBringer}
                onRemovePlayer={onRemovePlayer}
                onRemoveBringer={onRemoveBringer}
                onHideGame={onHideGame}
                onUnhideGame={onUnhideGame}
                onDeleteGame={onDeleteGame}
                onTogglePrototype={onTogglePrototype}
                onThumbnailUploaded={onThumbnailUploaded}
                scrollIntoView={game.id === scrollToGameId}
                onScrolledIntoView={onScrolledToGame}
                isHighlighted={highlightedGameIds?.has(game.id)}
                thumbnailTimestamp={thumbnailTimestamps?.[game.id]}
                isLast={index === sortedGames.length - 1}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop table layout (Requirement 6.2) - visible on large screens */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-3 text-left text-sm font-semibold text-gray-700 w-20">
                  <SortButton label="Hinzugefügt" targetKey="addedAt" className="leading-tight whitespace-normal break-words" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[22%] 2xl:w-[25%]">
                  <SortButton label="Name" targetKey="name" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[15%] 2xl:w-[18%]">
                  Bringt mit
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[15%] 2xl:w-[18%]">
                  Mitspieler
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[320px] 2xl:w-[300px]">
                  <div className="flex items-center gap-2 w-full">
                    <span>Aktionen</span>
                    <span className="ml-auto text-right text-sm font-normal text-gray-500">
                      {countLabel}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedGames.map((game, index) => (
                <GameRow
                  key={game.id}
                  game={game}
                  currentParticipantId={currentParticipantId}
                  canManageGames={canManageGames}
                  onAddPlayer={onAddPlayer}
                  onAddBringer={onAddBringer}
                  onRemovePlayer={onRemovePlayer}
                  onRemoveBringer={onRemoveBringer}
                  onHideGame={onHideGame}
                  onUnhideGame={onUnhideGame}
                  onDeleteGame={onDeleteGame}
                  onTogglePrototype={onTogglePrototype}
                  onThumbnailUploaded={onThumbnailUploaded}
                  scrollIntoView={game.id === scrollToGameId}
                  onScrolledIntoView={onScrolledToGame}
                  isHighlighted={highlightedGameIds?.has(game.id)}
                  thumbnailTimestamp={thumbnailTimestamps?.[game.id]}
                  showTopShadow={index > 0}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer with count */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {countLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GameTable;
