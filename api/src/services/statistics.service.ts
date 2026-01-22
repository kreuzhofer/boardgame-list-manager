import { prisma } from '../db/prisma';
import type { StatisticsData, PopularGame } from '../types';

/**
 * StatisticsService handles calculation of event statistics.
 * Provides aggregate data about games and participants.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export class StatisticsService {
  /**
   * Get all statistics for the event
   * @returns Statistics data including total games, participants, available/requested games, and popular games
   * 
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async getStatistics(): Promise<StatisticsData> {
    // Get all games with players and bringers
    const games = await prisma.game.findMany({
      include: {
        players: true,
        bringers: true,
      },
    });

    // Requirement 8.1: Total count of games
    const totalGames = games.length;

    // Requirement 8.2: Count of unique participants (across all players and bringers)
    const uniqueParticipants = new Set<string>();
    for (const game of games) {
      for (const player of game.players) {
        uniqueParticipants.add(player.userId);
      }
      for (const bringer of game.bringers) {
        uniqueParticipants.add(bringer.userId);
      }
    }
    const totalParticipants = uniqueParticipants.size;

    // Requirement 8.3: Available games (with bringers) vs requested games (without bringers)
    let availableGames = 0;
    let requestedGames = 0;
    for (const game of games) {
      if (game.bringers.length > 0) {
        availableGames++;
      } else {
        requestedGames++;
      }
    }

    // Requirement 8.4: Popular games ranked by player count (descending)
    const popularGames: PopularGame[] = games
      .map((game) => ({
        id: game.id,
        name: game.name,
        playerCount: game.players.length,
      }))
      .sort((a, b) => b.playerCount - a.playerCount);

    return {
      totalGames,
      totalParticipants,
      availableGames,
      requestedGames,
      popularGames,
    };
  }
}

// Export singleton instance
export const statisticsService = new StatisticsService();
