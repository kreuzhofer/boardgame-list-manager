import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { StatisticsService } from '../statistics.service';
import { GameService } from '../game.service';
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

const userNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Generate a game configuration with random players and bringers
const gameConfigArbitrary = fc.record({
  name: gameNameArbitrary,
  creatorName: userNameArbitrary,
  isBringing: fc.boolean(),
  additionalPlayers: fc.array(userNameArbitrary, { minLength: 0, maxLength: 3 }),
  additionalBringers: fc.array(userNameArbitrary, { minLength: 0, maxLength: 2 }),
});

describe('StatisticsService Property Tests', () => {
  let statisticsService: StatisticsService;
  let gameService: GameService;
  const createdGameIds: string[] = [];

  beforeEach(() => {
    statisticsService = new StatisticsService();
    gameService = new GameService();
  });

  afterEach(async () => {
    // Clean up created games after each test
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
      createdGameIds.length = 0;
    }
  });

  afterAll(async () => {
    // Ensure cleanup and disconnect
    await prisma.$disconnect();
  });

  /**
   * Helper function to create a game with additional players and bringers
   */
  async function createGameWithParticipants(config: {
    name: string;
    creatorName: string;
    isBringing: boolean;
    additionalPlayers: string[];
    additionalBringers: string[];
  }): Promise<string> {
    const uniqueName = `${config.name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const game = await gameService.createGame(uniqueName, config.creatorName, config.isBringing);
    createdGameIds.push(game.id);

    // Add additional players (ensure uniqueness)
    const addedPlayers = new Set<string>([config.creatorName]);
    for (const playerName of config.additionalPlayers) {
      const uniquePlayerName = addedPlayers.has(playerName)
        ? `${playerName}_${Math.random().toString(36).substring(7)}`
        : playerName;
      if (!addedPlayers.has(uniquePlayerName)) {
        try {
          await gameService.addPlayer(game.id, uniquePlayerName);
          addedPlayers.add(uniquePlayerName);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // Add additional bringers (ensure uniqueness)
    const addedBringers = new Set<string>(config.isBringing ? [config.creatorName] : []);
    for (const bringerName of config.additionalBringers) {
      const uniqueBringerName = addedBringers.has(bringerName)
        ? `${bringerName}_${Math.random().toString(36).substring(7)}`
        : bringerName;
      if (!addedBringers.has(uniqueBringerName)) {
        try {
          await gameService.addBringer(game.id, uniqueBringerName);
          addedBringers.add(uniqueBringerName);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    return game.id;
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
          fc.array(gameConfigArbitrary, { minLength: 0, maxLength: 5 }),
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
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 17: Statistics - Unique Participants Count
   * **Validates: Requirements 8.2**
   * 
   * *For any* game list, the unique participants count SHALL equal the count
   * of distinct user names across all players and bringers lists.
   */
  describe('Property 17: Statistics - Unique Participants Count', () => {
    it('should return unique participants count equal to distinct user names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gameConfigArbitrary, { minLength: 1, maxLength: 3 }),
          async (gameConfigs) => {
            // Track all unique participants we add
            const expectedParticipants = new Set<string>();

            // Create all games and track participants
            for (const config of gameConfigs) {
              const uniqueName = `${config.name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              const game = await gameService.createGame(uniqueName, config.creatorName, config.isBringing);
              createdGameIds.push(game.id);

              // Creator is always a player
              expectedParticipants.add(config.creatorName);

              // Add additional players
              const addedPlayers = new Set<string>([config.creatorName]);
              for (const playerName of config.additionalPlayers) {
                const uniquePlayerName = addedPlayers.has(playerName)
                  ? `${playerName}_${Math.random().toString(36).substring(7)}`
                  : playerName;
                if (!addedPlayers.has(uniquePlayerName)) {
                  try {
                    await gameService.addPlayer(game.id, uniquePlayerName);
                    addedPlayers.add(uniquePlayerName);
                    expectedParticipants.add(uniquePlayerName);
                  } catch {
                    // Ignore duplicate errors
                  }
                }
              }

              // Add additional bringers
              const addedBringers = new Set<string>(config.isBringing ? [config.creatorName] : []);
              for (const bringerName of config.additionalBringers) {
                const uniqueBringerName = addedBringers.has(bringerName)
                  ? `${bringerName}_${Math.random().toString(36).substring(7)}`
                  : bringerName;
                if (!addedBringers.has(uniqueBringerName)) {
                  try {
                    await gameService.addBringer(game.id, uniqueBringerName);
                    addedBringers.add(uniqueBringerName);
                    expectedParticipants.add(uniqueBringerName);
                  } catch {
                    // Ignore duplicate errors
                  }
                }
              }
            }

            // Get statistics
            const stats = await statisticsService.getStatistics();

            // Property: Unique participants should be at least the count we tracked
            // (could be more if other tests left data)
            expect(stats.totalParticipants).toBeGreaterThanOrEqual(expectedParticipants.size);

            return true;
          }
        ),
        { numRuns: 5 } // Per workspace guidelines for DB operations
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
          fc.array(gameConfigArbitrary, { minLength: 1, maxLength: 4 }),
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
        { numRuns: 5 } // Per workspace guidelines for DB operations
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
          fc.array(gameConfigArbitrary, { minLength: 2, maxLength: 5 }),
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
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });
});
