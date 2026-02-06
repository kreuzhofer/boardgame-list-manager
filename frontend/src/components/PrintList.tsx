/**
 * PrintList component
 * Generates a printable list of games the participant is bringing or playing
 * Formatted for table labels with participant name prominently displayed
 * Print-friendly CSS styling (no unnecessary colors, good contrast)
 * All UI text in German (Requirement 9.1)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { Game } from '../types';

export type PrintFilterMode = 'all' | 'bringing' | 'playing';

export interface PrintListProps {
  /** The name of the participant whose games are being printed */
  participantName: string;
  /** The ID of the participant whose games are being printed */
  participantId: string;
  /** List of all games - will be filtered based on the selected mode */
  games: Game[];
  /** Filter mode for which games to include */
  mode?: PrintFilterMode;
}

/**
 * Filters games to only include those where the participant is a bringer
 * Property 15: Print List Contains Participant's Games
 * Validates: Requirements 7.2
 */
export function filterGamesParticipantIsBringing(games: Game[], participantId: string): Game[] {
  return games.filter(game => 
    game.bringers.some(bringer => bringer.participant.id === participantId)
  );
}

/**
 * Filters games to only include those where the participant is a player
 */
export function filterGamesParticipantIsPlaying(games: Game[], participantId: string): Game[] {
  return games.filter(game =>
    game.players.some(player => player.participant.id === participantId)
  );
}

/**
 * Filters games to include those where the participant is a bringer or a player
 */
export function filterGamesParticipantIsInvolved(games: Game[], participantId: string): Game[] {
  return games.filter(game =>
    game.bringers.some(bringer => bringer.participant.id === participantId) ||
    game.players.some(player => player.participant.id === participantId)
  );
}

/**
 * Filters games based on the selected print mode
 */
export function filterGamesForPrint(
  games: Game[],
  participantId: string,
  mode: PrintFilterMode
): Game[] {
  switch (mode) {
    case 'playing':
      return filterGamesParticipantIsPlaying(games, participantId);
    case 'all':
      return filterGamesParticipantIsInvolved(games, participantId);
    case 'bringing':
    default:
      return filterGamesParticipantIsBringing(games, participantId);
  }
}

/**
 * PrintList component
 * 
 * Requirements:
 * - 7.1: Provide a print-friendly view of games the participant is bringing
 * - 7.2: Print list shows only games where participant is a bringer
 * - 7.3: Format suitable for table labels (participant name prominently displayed)
 * - 7.4: Print-friendly CSS (no unnecessary colors, good contrast)
 */
export function PrintList({ participantName, participantId, games, mode = 'bringing' }: PrintListProps) {
  const participantGames = filterGamesForPrint(games, participantId, mode);
  const modeSubtitle = mode === 'bringing'
    ? 'Mitgebrachte Spiele'
    : mode === 'playing'
      ? 'Spiele, bei denen ich mitspiele'
      : 'Mitgebrachte und Mitspiel-Spiele';
  const emptyMessage = mode === 'bringing'
    ? 'Sie bringen keine Spiele mit.'
    : mode === 'playing'
      ? 'Sie spielen derzeit bei keinen Spielen mit.'
      : 'Sie bringen keine Spiele mit und spielen bei keinen Spielen mit.';

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
              table-layout: fixed;
              width: 100%;
            }

            .print-list th,
            .print-list td {
              border: 1px solid black !important;
              padding: 8px 12px !important;
            }

            .print-list col.col-number {
              width: 8%;
            }

            .print-list col.col-name,
            .print-list col.col-players {
              width: 46%;
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

      {/* Header with participant name - prominently displayed for table labels (Requirement 7.3) */}
      <div className="print-header text-center mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-bold text-gray-900">
          {participantName}
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          {modeSubtitle}
        </p>
      </div>

      {/* Game count summary */}
      <div className="mb-4 text-gray-700">
        <p className="text-sm">
          Anzahl Spiele: <span className="font-semibold">{participantGames.length}</span>
        </p>
      </div>

      {/* Games list */}
      {participantGames.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <colgroup>
            <col className="col-number" />
            <col className="col-name" />
            <col className="col-players" />
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Nr.
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Spielname
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                Mitspieler
              </th>
            </tr>
          </thead>
          <tbody>
            {participantGames.map((game, index) => (
              <tr key={game.id} className="game-item">
                <td className="border border-gray-300 px-4 py-2 text-gray-700 w-12">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                  {game.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-gray-600">
                  {game.players.length > 0 
                    ? game.players.map(p => p.participant.name).join(', ')
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
