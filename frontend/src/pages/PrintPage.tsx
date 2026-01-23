/**
 * PrintPage - Print view page for generating game lists
 * Displays a printable list of games the user is bringing
 * All UI text in German (Requirement 9.1)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useEffect, useState } from 'react';
import { gamesApi } from '../api/client';
import { PrintList, filterGamesUserIsBringing } from '../components';
import type { Game, User } from '../types';

interface PrintPageProps {
  user: User | null;
}

export function PrintPage({ user }: PrintPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const userGamesCount = user 
    ? filterGamesUserIsBringing(games, user.id).length 
    : 0;

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
            Liste der Spiele, die Du mitbringst ({userGamesCount} {userGamesCount === 1 ? 'Spiel' : 'Spiele'})
          </p>
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
            Du bringst derzeit keine Spiele mit. Fügen Dich als Mitbringer bei Spielen hinzu, 
            um eine Druckliste zu erstellen.
          </p>
        </div>
      )}

      {/* Print preview container */}
      <div className="bg-white rounded-lg shadow p-6">
        <PrintList userName={user.name} userId={user.id} games={games} />
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
