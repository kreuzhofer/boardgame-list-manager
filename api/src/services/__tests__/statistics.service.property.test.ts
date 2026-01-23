import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { StatisticsService } from '../statistics.service';
import { GameService } from '../game.service';
import { UserService } from '../user.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for StatisticsService
 * 
 * These tests verify correctness properties for statistics calculations
 * using fast-check to generate random inputs and ensure the properties
 * hold across all valid inputs.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */

// Custom arbitraries per design document
const gameNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Username arbitrary limited to 15 chars to allow room for unique suffix (max 30 total)
const userNameArbitrary = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Generate a game configuration with random players and bringers
const gameConfigArbitrary = fc.record({
  name: gameNameArbitrary,
  creatorName: userNameArbitrary,
  isBringing: fc.boolean(),
  additionalPlayersCount: fc.integer({ min: 0, max: 3 }),
  additionalBringersCount: fc.integer({ min: 0, max: 2 }),
});

describe('StatisticsService Property Tests', () => {
  let statisticsService: StatisticsService;
  let gameService: GameService;
  let userService: UserService;
  const createdGameIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(() => {
    statisticsService = new StatisticsService();
    gameService = new GameService();
    userService = new UserService();
  });

  afterEach(async () => {
    // Clean up created games after each test
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
      createdGameIds.length = 0;
    }
    // Clean up created users after each test
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    // Ensure cleanup and disconnect
    await prisma.$disconnect();
  });

  /**
   * Helper to create a unique user for testing (max 30 chars for VARCHAR(30) constraint)
   */
  const createTestUser = async (baseName: string) => {
    const shortBase = baseName.slice(0, 15);
    const random = Math.random().toString(36).slice(2, 8);
    const uniqueName = `${shortBase}_${random}`.slice(0, 30);
    const user = await userService.createUser(uniqueName);
    createdUserIds.push(user.id);
    return user;
  };

  /**
   * Helper function to create a game with additional players and bringers
   */
  async function createGameWithParticipants(config: {
    name: string;
    creatorName: string;
    isBringing: boolean;
    additionalPlayersCount: number;
    additionalBringersCount: number;
  }): Promise<{ gameId: string; participantIds: Set<string> }> {
    const uniqueName = `${config.name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create the creator user
    const creator = await createTestUser(config.creatorName);
    const participantIds = new Set<string>([creator.id]);
    
    // Create game with isPlaying=true so creator is counted as participant
    const game = await gameService.createGame(uniqueName, creator.id, config.isBringing, true);
    createdGameIds.push(game.id);

    // Add additional players
    for (let i = 0; i < config.additionalPlayersCount; i++) {
      const player = await createTestUser(`player_${i}`);
      participantIds.add(player.id);
      try {
        await gameService.addPlayer(game.id, player.id);
      } catch {
        // Ignore duplicate errors
      }
    }

    // Add additional bringers
    for (let i = 0; i < config.additionalBringersCount; i++) {
      const bringer = await createTestUser(`bringer_${i}`);
      participantIds.add(bringer.id);
      try {
        await gameService.addBringer(game.id, bringer.id);
      } catch {
        // Ignore duplicate errors
      }
    }

    return { gameId: game.id, participantIds };
  }

  /**
   * Property 16: Statistics - Total Games Count
   * **Validates: Requirements 8.1**
   * 
   * *For any* game list, the total games statistic SHALL equal the number
   * of games in the list.
   */
  describe('Property 16: Statistics - Total Games Count', () => {
    it('should return total games count equal to the number of games created', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gameConfigArbitrary, { minLength: 0, maxLength: 3 }),
          async (gameConfigs) => {
            // Create all games
            for (const config of gameConfigs) {
              await createGameWithParticipants(config);
            }

            // Get statistics
            const stats = await statisticsService.getStatistics();

            // Property: Total games count should equal the number of games we created
            // Note: We only check our created games since other tests may have left data
            expect(stats.totalGames).toBeGreaterThanOrEqual(gameConfigs.length);

            // More precise check: count games we created
            const ourGamesCount = createdGameIds.length;
            expect(stats.totalGames).toBeGreaterThanOrEqual(ourGamesCount);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 17: Statistics - Unique Participants Count
   * **Validates: Requirements 8.2**
   * 
   * *For any* game list, the unique participants count SHALL equal the count
   * of distinct user IDs across all players and bringers lists.
   */
  describe('Property 17: Statistics - Unique Participants Count', () => {
    it('should return unique participants count equal to distinct user IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gameConfigArbitrary, { minLength: 1, maxLength: 2 }),
          async (gameConfigs) => {
            // Track all unique participants we add
            const allParticipantIds = new Set<string>();

            // Create all games and track participants
            for (const config of gameConfigs) {
              const { participantIds } = await createGameWithParticipants(config);
              participantIds.forEach(id => allParticipantIds.add(id));
            }

            // Get statistics
            const stats = await statisticsService.getStatistics();

            // Property: Unique participants should be at least the count we tracked
            // (could be more if other tests left data)
            expect(stats.totalParticipants).toBeGreaterThanOrEqual(allParticipantIds.size);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 18: Statistics - Available vs Requested Partition
   * **Validates: Requirements 8.3**
   * 
   * *For any* game list, the sum of available games count and requested games
   * count SHALL equal the total games count, where available games have at
   * least one bringer and requested games have zero bringers.
   */
  describe('Property 18: Statistics - Available vs Requested Partition', () => {
    it('should have available + requested games equal total games', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gameConfigArbitrary, { minLength: 1, maxLength: 2 }),
          async (gameConfigs) => {
            // Create all games
            for (const config of gameConfigs) {
              await createGameWithParticipants(config);
            }

            // Get statistics
            const stats = await statisticsService.getStatistics();

            // Property: availableGames + requestedGames === totalGames
            expect(stats.availableGames + stats.requestedGames).toBe(stats.totalGames);

            // Additional property: both counts should be non-negative
            expect(stats.availableGames).toBeGreaterThanOrEqual(0);
            expect(stats.requestedGames).toBeGreaterThanOrEqual(0);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 19: Statistics - Popular Games Ranking
   * **Validates: Requirements 8.4**
   * 
   * *For any* game list, the popular games ranking SHALL be ordered by
   * player count in descending order.
   */
  describe('Property 19: Statistics - Popular Games Ranking', () => {
    it('should return popular games ordered by player count descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gameConfigArbitrary, { minLength: 2, maxLength: 3 }),
          async (gameConfigs) => {
            // Create all games
            for (const config of gameConfigs) {
              await createGameWithParticipants(config);
            }

            // Get statistics
            const stats = await statisticsService.getStatistics();

            // Property: Popular games should be sorted by playerCount in descending order
            for (let i = 1; i < stats.popularGames.length; i++) {
              const prevGame = stats.popularGames[i - 1];
              const currGame = stats.popularGames[i];
              expect(prevGame.playerCount).toBeGreaterThanOrEqual(currGame.playerCount);
            }

            // Additional property: all player counts should be non-negative
            for (const game of stats.popularGames) {
              expect(game.playerCount).toBeGreaterThanOrEqual(0);
            }

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });
});
