import { prisma } from '../db/prisma';
import type { StatisticsData, PopularGame, StatisticsTimelineData } from '../types';

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

    const releaseYearMap = new Map<number, number>();
    for (const game of games) {
      const year = game.yearPublished;
      if (!year || year <= 0) {
        continue;
      }
      releaseYearMap.set(year, (releaseYearMap.get(year) ?? 0) + 1);
    }

    const releaseYearCounts = Array.from(releaseYearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    return {
      totalGames,
      totalParticipants,
      availableGames,
      requestedGames,
      popularGames,
      releaseYearCounts,
    };
  }

  async getTimeline(): Promise<StatisticsTimelineData> {
    type DayCountRow = { day: string; count: number };

    const gameCounts = await prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS count
      FROM games
      GROUP BY day
      ORDER BY day;
    `;

    const userCounts = await prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS count
      FROM users
      GROUP BY day
      ORDER BY day;
    `;

    const activeUserCounts = await prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             count(DISTINCT actor_user_id)::int AS count
      FROM activity_events
      GROUP BY day
      ORDER BY day;
    `;

    const playerCounts = await prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', added_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS count
      FROM players
      GROUP BY day
      ORDER BY day;
    `;

    if (
      gameCounts.length === 0 &&
      playerCounts.length === 0 &&
      userCounts.length === 0 &&
      activeUserCounts.length === 0
    ) {
      return { points: [] };
    }

    const gameMap = new Map(gameCounts.map((row) => [row.day, row.count]));
    const playerMap = new Map(playerCounts.map((row) => [row.day, row.count]));
    const userMap = new Map(userCounts.map((row) => [row.day, row.count]));
    const activeUserMap = new Map(activeUserCounts.map((row) => [row.day, row.count]));

    const allDays = [
      ...gameMap.keys(),
      ...playerMap.keys(),
      ...userMap.keys(),
      ...activeUserMap.keys(),
    ];
    const minDay = allDays.reduce((min, day) => (day < min ? day : min), allDays[0]);
    const maxDay = allDays.reduce((max, day) => (day > max ? day : max), allDays[0]);

    const startDate = new Date(`${minDay}T00:00:00Z`);
    const endDate = new Date(`${maxDay}T00:00:00Z`);
    const points: StatisticsTimelineData['points'] = [];
    let totalUsers = 0;

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const day = cursor.toISOString().slice(0, 10);
      const newUsers = userMap.get(day) ?? 0;
      totalUsers += newUsers;
      points.push({
        date: day,
        gamesAdded: gameMap.get(day) ?? 0,
        playersAdded: playerMap.get(day) ?? 0,
        newUsers,
        totalUsers,
        activeUsers: activeUserMap.get(day) ?? 0,
      });
    }

    return { points };
  }
}

// Export singleton instance
export const statisticsService = new StatisticsService();
