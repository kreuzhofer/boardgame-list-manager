/**
 * PrintList component
 * Generates a printable list of games the user is bringing
 * Formatted for table labels with user name prominently displayed
 * Print-friendly CSS styling (no unnecessary colors, good contrast)
 * All UI text in German (Requirement 9.1)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { Game } from '../types';

export interface PrintListProps {
  /** The name of the user whose games are being printed */
  userName: string;
  /** List of all games - will be filtered to show only games user is bringing */
  games: Game[];
}

/**
 * Filters games to only include those where the user is a bringer
 * Property 15: Print List Contains User's Games
 * Validates: Requirements 7.2
 */
export function filterGamesUserIsBringing(games: Game[], userName: string): Game[] {
  return games.filter(game => 
    game.bringers.some(bringer => bringer.name === userName)
  );
}

/**
 * PrintList component
 * 
 * Requirements:
 * - 7.1: Provide a print-friendly view of games the user is bringing
 * - 7.2: Print list shows only games where user is a bringer
 * - 7.3: Format suitable for table labels (user name prominently displayed)
 * - 7.4: Print-friendly CSS (no unnecessary colors, good contrast)
 */
export function PrintList({ userName, games }: PrintListProps) {
  // Filter to only games where user is a bringer (Requirement 7.2)
  const userGames = filterGamesUserIsBringing(games, userName);

  return (
    <div className="print-list">
      {/* Print-specific styles */}
      <style>
        {`
          @media print {
            /* Hide non-print elements */
            .no-print {
              display: none !important;
            }
            
            /* Reset page margins for print */
            @page {
              margin: 1cm;
            }
            
            /* Ensure good contrast and no background colors */
            .print-list {
              background: white !important;
              color: black !important;
            }
            
            /* Make borders visible in print */
            .print-list table {
              border-collapse: collapse;
            }
            
            .print-list th,
            .print-list td {
              border: 1px solid black !important;
              padding: 8px 12px !important;
            }
            
            /* Ensure header is prominent */
            .print-list .print-header {
              font-size: 24pt !important;
              font-weight: bold !important;
              margin-bottom: 16pt !important;
              text-align: center !important;
              border-bottom: 2px solid black !important;
              padding-bottom: 8pt !important;
            }
            
            /* Game list styling for print */
            .print-list .game-item {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* Header with user name - prominently displayed for table labels (Requirement 7.3) */}
      <div className="print-header text-center mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-bold text-gray-900">
          {userName}
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Mitgebrachte Spiele
        </p>
      </div>

      {/* Game count summary */}
      <div className="mb-4 text-gray-700">
        <p className="text-sm">
          Anzahl Spiele: <span className="font-semibold">{userGames.length}</span>
        </p>
      </div>

      {/* Games list */}
      {userGames.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Sie bringen keine Spiele mit.</p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Nr.
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Spielname
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Interessierte Spieler
              </th>
            </tr>
          </thead>
          <tbody>
            {userGames.map((game, index) => (
              <tr key={game.id} className="game-item">
                <td className="border border-gray-300 px-4 py-2 text-gray-700 w-12">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                  {game.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-gray-600">
                  {game.players.length > 0 
                    ? game.players.map(p => p.name).join(', ')
                    : '—'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer with print date */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <p>
          Gedruckt am: {new Date().toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}

export default PrintList;
