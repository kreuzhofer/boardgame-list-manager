/**
 * PrintPage - Print view page for generating game lists
 * Displays a printable list of games the user is bringing or playing
 * All UI text in German (Requirement 9.1)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useEffect, useState } from 'react';
import { gamesApi } from '../api/client';
import { PrintList, filterGamesForPrint } from '../components';
import type { PrintFilterMode } from '../components';
import type { Game, User } from '../types';

interface PrintPageProps {
  user: User | null;
}

export function PrintPage({ user }: PrintPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printFilter, setPrintFilter] = useState<PrintFilterMode>('bringing');

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await gamesApi.getAll();
        setGames(response.games);
      } catch (err) {
        console.error('Failed to fetch games:', err);
        setError('Spiele konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Handle print action
  const handlePrint = () => {
    window.print();
  };

  // Count games user is bringing
  const filteredGames = user
    ? filterGamesForPrint(games, user.id, printFilter)
    : [];
  const userGamesCount = filteredGames.length;
  const filterSummary = printFilter === 'bringing'
    ? 'Liste der Spiele, die Du mitbringst'
    : printFilter === 'playing'
      ? 'Liste der Spiele, bei denen Du mitspielst'
      : 'Liste der Spiele, die Du mitbringst oder bei denen Du mitspielst';
  const emptyHint = printFilter === 'bringing'
    ? 'Du bringst derzeit keine Spiele mit. Füge Dich als Mitbringer bei Spielen hinzu, um eine Druckliste zu erstellen.'
    : printFilter === 'playing'
      ? 'Du spielst derzeit bei keinen Spielen mit. Füge Dich als Mitspieler hinzu, um eine Druckliste zu erstellen.'
      : 'Du bringst derzeit keine Spiele mit und spielst bei keinen Spielen mit. Füge Dich als Mitbringer oder Mitspieler hinzu, um eine Druckliste zu erstellen.';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Druckansicht</h2>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Druckansicht</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Druckansicht</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 text-sm">
            Bitte wählen Sie zuerst einen Benutzer aus, um die Druckansicht zu nutzen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header - hidden when printing */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Druckansicht</h2>
          <p className="text-gray-600 text-sm mt-1">
            {filterSummary} ({userGamesCount} {userGamesCount === 1 ? 'Spiel' : 'Spiele'})
          </p>
          <div className="mt-3 inline-flex rounded-lg border border-gray-200 overflow-hidden bg-gray-100 min-h-[44px]">
            <button
              type="button"
              onClick={() => setPrintFilter('all')}
              className={`px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                printFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={printFilter === 'all'}
              aria-label="Alle relevanten Spiele anzeigen"
              title="Alle"
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setPrintFilter('bringing')}
              className={`px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                printFilter === 'bringing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={printFilter === 'bringing'}
              aria-label="Nur Spiele anzeigen, die ich mitbringe"
              title="Bringe ich mit"
            >
              Bringe ich mit
            </button>
            <button
              type="button"
              onClick={() => setPrintFilter('playing')}
              className={`px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                printFilter === 'playing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={printFilter === 'playing'}
              aria-label="Nur Spiele anzeigen, bei denen ich mitspiele"
              title="Spiele ich mit"
            >
              Spiele ich mit
            </button>
          </div>
        </div>
        
        {/* Print button */}
        <button
          onClick={handlePrint}
          disabled={userGamesCount === 0}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            userGamesCount > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Drucken
          </span>
        </button>
      </div>

      {/* Instructions - hidden when printing */}
      {userGamesCount === 0 && (
        <div className="no-print bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 text-sm">
            {emptyHint}
          </p>
        </div>
      )}

      {/* Print preview container */}
      <div className="bg-white rounded-lg shadow p-6">
        <PrintList userName={user.name} userId={user.id} games={games} mode={printFilter} />
      </div>

      {/* Print-specific global styles */}
      <style>
        {`
          @media print {
            /* Hide navigation, header, footer, and other non-print elements */
            .no-print,
            nav,
            header,
            footer {
              display: none !important;
            }
            
            .shadow {
              box-shadow: none !important;
            }
            
            /* Make everything white background */
            body,
            html,
            #root,
            #root > div,
            main {
              background: white !important;
              background-color: white !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }
            
            /* Remove flex layout that causes extra space */
            #root > div {
              display: block !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default PrintPage;
