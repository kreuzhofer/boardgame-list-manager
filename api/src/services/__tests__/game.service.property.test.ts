import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { GameService } from '../game.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for GameService
 * 
 * These tests verify correctness properties using fast-check to generate
 * random inputs and ensure the properties hold across all valid inputs.
 */

// Custom arbitraries per design document
const gameNameArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

const userNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

describe('GameService Property Tests', () => {
  let gameService: GameService;
  const createdGameIds: string[] = [];

  beforeEach(() => {
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
   * Property 3: Game Creation with Bringer Flag
   * **Validates: Requirements 3.3**
   * 
   * *For any* valid game name and user name, when creating a game with the
   * "Bringe ich mit" flag enabled, the resulting game SHALL have the user
   * in both the players list and the bringers list.
   */
  describe('Property 3: Game Creation with Bringer Flag', () => {
    it('should add user to both players and bringers lists when isBringing is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game with bringer flag enabled
            const game = await gameService.createGame(uniqueGameName, userName, true);
            createdGameIds.push(game.id);

            // Property: User should be in players list
            const isInPlayers = game.players.some((p) => p.name === userName);
            expect(isInPlayers).toBe(true);

            // Property: User should be in bringers list
            const isInBringers = game.bringers.some((b) => b.name === userName);
            expect(isInBringers).toBe(true);

            // Property: Game status should be 'verfuegbar' since there's a bringer
            expect(game.status).toBe('verfuegbar');

            return true;
          }
        ),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 4: Game Creation without Bringer Flag
   * **Validates: Requirements 3.4**
   * 
   * *For any* valid game name and user name, when creating a game without the
   * "Bringe ich mit" flag, the resulting game SHALL have the user only in the
   * players list and NOT in the bringers list.
   */
  describe('Property 4: Game Creation without Bringer Flag', () => {
    it('should add user only to players list and NOT to bringers list when isBringing is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without bringer flag (isBringing = false)
            const game = await gameService.createGame(uniqueGameName, userName, false);
            createdGameIds.push(game.id);

            // Property: User should be in players list
            const isInPlayers = game.players.some((p) => p.name === userName);
            expect(isInPlayers).toBe(true);

            // Property: User should NOT be in bringers list
            const isInBringers = game.bringers.some((b) => b.name === userName);
            expect(isInBringers).toBe(false);

            // Property: Bringers list should be empty
            expect(game.bringers).toHaveLength(0);

            // Property: Game status should be 'wunsch' since there are no bringers
            expect(game.status).toBe('wunsch');

            return true;
          }
        ),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 5: Add Player Invariant
   * **Validates: Requirements 3.5**
   * 
   * *For any* existing game and valid user name, adding the user as a player
   * SHALL result in the game's players list containing that user, and the
   * bringers list SHALL remain unchanged.
   */
  describe('Property 5: Add Player Invariant', () => {
    it('should add user to players list while keeping bringers list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          async (gameName, creatorName, newPlayerName, creatorIsBringing) => {
            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Ensure new player is different from creator to avoid duplicate player error
            const uniqueNewPlayerName = newPlayerName === creatorName 
              ? `${newPlayerName}_new_${Math.random().toString(36).substring(7)}`
              : newPlayerName;

            // Step 1: Create a game (with or without bringers based on random flag)
            const createdGame = await gameService.createGame(uniqueGameName, creatorName, creatorIsBringing);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial bringers list
            const initialBringers = createdGame.bringers.map((b) => b.name).sort();

            // Step 3: Add a new player
            const updatedGame = await gameService.addPlayer(createdGame.id, uniqueNewPlayerName);

            // Property: The new player should be in the players list
            const newPlayerInList = updatedGame.players.some((p) => p.name === uniqueNewPlayerName);
            expect(newPlayerInList).toBe(true);

            // Property: The bringers list should remain unchanged
            const updatedBringers = updatedGame.bringers.map((b) => b.name).sort();
            expect(updatedBringers).toEqual(initialBringers);

            return true;
          }
        ),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 6: Add Bringer Invariant
   * **Validates: Requirements 3.6**
   * 
   * *For any* existing game and valid user name, adding the user as a bringer
   * SHALL result in the game's bringers list containing that user, and the
   * players list SHALL remain unchanged.
   */
  describe('Property 6: Add Bringer Invariant', () => {
    it('should add user to bringers list while keeping players list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          async (gameName, creatorName, newBringerName, creatorIsBringing) => {
            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Ensure new bringer is different from creator (if creator is bringing)
            // to avoid duplicate bringer error
            const uniqueNewBringerName = (creatorIsBringing && newBringerName === creatorName)
              ? `${newBringerName}_new_${Math.random().toString(36).substring(7)}`
              : newBringerName;

            // Step 1: Create a game (with some players)
            const createdGame = await gameService.createGame(uniqueGameName, creatorName, creatorIsBringing);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial players list
            const initialPlayers = createdGame.players.map((p) => p.name).sort();

            // Step 3: Add a new bringer
            const updatedGame = await gameService.addBringer(createdGame.id, uniqueNewBringerName);

            // Property: The new bringer should be in the bringers list
            const newBringerInList = updatedGame.bringers.some((b) => b.name === uniqueNewBringerName);
            expect(newBringerInList).toBe(true);

            // Property: The players list should remain unchanged
            const updatedPlayers = updatedGame.players.map((p) => p.name).sort();
            expect(updatedPlayers).toEqual(initialPlayers);

            return true;
          }
        ),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });
});
