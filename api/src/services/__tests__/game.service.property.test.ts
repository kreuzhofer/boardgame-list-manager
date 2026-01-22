import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { GameService } from '../game.service';
import { UserService } from '../user.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for GameService
 * 
 * These tests verify correctness properties using fast-check to generate
 * random inputs and ensure the properties hold across all valid inputs.
 * 
 * Feature: 002-user-management
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

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('GameService Property Tests', () => {
  let gameService: GameService;
  let userService: UserService;
  const createdGameIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(() => {
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
   * Helper to create a unique user for testing
   */
  const createTestUser = async (baseName: string) => {
    const uniqueName = `${baseName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const user = await userService.createUser(uniqueName);
    createdUserIds.push(user.id);
    return user;
  };

  /**
   * Property 3: Game Creation with Bringer Flag
   * **Validates: Requirements 3.3**
   * 
   * *For any* valid game name and user, when creating a game with the
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
            // Create a user first
            const user = await createTestUser(userName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game with bringer flag enabled
            const game = await gameService.createGame(uniqueGameName, user.id, true);
            createdGameIds.push(game.id);

            // Property: User should be in players list (check by user.id)
            const isInPlayers = game.players.some((p) => p.user.id === user.id);
            expect(isInPlayers).toBe(true);

            // Property: User should be in bringers list (check by user.id)
            const isInBringers = game.bringers.some((b) => b.user.id === user.id);
            expect(isInBringers).toBe(true);

            // Property: Game status should be 'verfuegbar' since there's a bringer
            expect(game.status).toBe('verfuegbar');

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 4: Game Responses Include Complete User Objects
   * **Validates: Requirements 4.6**
   * 
   * *For any* game with players or bringers, when the game data is returned
   * from the API, each player and bringer entry SHALL include a complete
   * user object with both `id` (valid UUID) and `name` (non-empty string) fields.
   * 
   * Feature: 002-user-management, Property 4: Game Responses Include Complete User Objects
   */
  describe('Property 4: Game Responses Include Complete User Objects', () => {
    it('should include complete user objects for all players and bringers', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          async (gameName, userName, isBringing) => {
            // Create a user first
            const user = await createTestUser(userName);

            // Generate unique game name
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game
            const game = await gameService.createGame(uniqueGameName, user.id, isBringing);
            createdGameIds.push(game.id);

            // Property: All players should have complete user objects
            for (const player of game.players) {
              // User object should exist
              expect(player.user).toBeDefined();
              
              // User id should be a valid UUID
              expect(player.user.id).toBeDefined();
              expect(typeof player.user.id).toBe('string');
              expect(player.user.id).toMatch(UUID_REGEX);
              
              // User name should be a non-empty string
              expect(player.user.name).toBeDefined();
              expect(typeof player.user.name).toBe('string');
              expect(player.user.name.length).toBeGreaterThan(0);
            }

            // Property: All bringers should have complete user objects
            for (const bringer of game.bringers) {
              // User object should exist
              expect(bringer.user).toBeDefined();
              
              // User id should be a valid UUID
              expect(bringer.user.id).toBeDefined();
              expect(typeof bringer.user.id).toBe('string');
              expect(bringer.user.id).toMatch(UUID_REGEX);
              
              // User name should be a non-empty string
              expect(bringer.user.name).toBeDefined();
              expect(typeof bringer.user.name).toBe('string');
              expect(bringer.user.name.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });

    it('should include complete user objects after adding players and bringers', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          async (gameName, creatorName, additionalUserName) => {
            // Create users
            const creator = await createTestUser(creatorName);
            const additionalUser = await createTestUser(additionalUserName);

            // Generate unique game name
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without bringer
            let game = await gameService.createGame(uniqueGameName, creator.id, false);
            createdGameIds.push(game.id);

            // Add additional user as player
            game = await gameService.addPlayer(game.id, additionalUser.id);

            // Add additional user as bringer
            game = await gameService.addBringer(game.id, additionalUser.id);

            // Property: All players should have complete user objects
            expect(game.players.length).toBe(2);
            for (const player of game.players) {
              expect(player.user).toBeDefined();
              expect(player.user.id).toMatch(UUID_REGEX);
              expect(player.user.name.length).toBeGreaterThan(0);
            }

            // Property: All bringers should have complete user objects
            expect(game.bringers.length).toBe(1);
            for (const bringer of game.bringers) {
              expect(bringer.user).toBeDefined();
              expect(bringer.user.id).toMatch(UUID_REGEX);
              expect(bringer.user.name.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 5: Game Creation without Bringer Flag
   * **Validates: Requirements 3.4**
   * 
   * *For any* valid game name and user, when creating a game without the
   * "Bringe ich mit" flag, the resulting game SHALL have the user only in the
   * players list and NOT in the bringers list.
   */
  describe('Property 5: Game Creation without Bringer Flag', () => {
    it('should add user only to players list and NOT to bringers list when isBringing is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            // Create a user first
            const user = await createTestUser(userName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without bringer flag (isBringing = false)
            const game = await gameService.createGame(uniqueGameName, user.id, false);
            createdGameIds.push(game.id);

            // Property: User should be in players list
            const isInPlayers = game.players.some((p) => p.user.id === user.id);
            expect(isInPlayers).toBe(true);

            // Property: User should NOT be in bringers list
            const isInBringers = game.bringers.some((b) => b.user.id === user.id);
            expect(isInBringers).toBe(false);

            // Property: Bringers list should be empty
            expect(game.bringers).toHaveLength(0);

            // Property: Game status should be 'wunsch' since there are no bringers
            expect(game.status).toBe('wunsch');

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 6: Add Player Invariant
   * **Validates: Requirements 3.5**
   * 
   * *For any* existing game and valid user, adding the user as a player
   * SHALL result in the game's players list containing that user, and the
   * bringers list SHALL remain unchanged.
   */
  describe('Property 6: Add Player Invariant', () => {
    it('should add user to players list while keeping bringers list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          async (gameName, creatorName, newPlayerName, creatorIsBringing) => {
            // Create users
            const creator = await createTestUser(creatorName);
            const newPlayer = await createTestUser(newPlayerName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Step 1: Create a game (with or without bringers based on random flag)
            const createdGame = await gameService.createGame(uniqueGameName, creator.id, creatorIsBringing);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial bringers list
            const initialBringers = createdGame.bringers.map((b) => b.user.id).sort();

            // Step 3: Add a new player
            const updatedGame = await gameService.addPlayer(createdGame.id, newPlayer.id);

            // Property: The new player should be in the players list
            const newPlayerInList = updatedGame.players.some((p) => p.user.id === newPlayer.id);
            expect(newPlayerInList).toBe(true);

            // Property: The bringers list should remain unchanged
            const updatedBringers = updatedGame.bringers.map((b) => b.user.id).sort();
            expect(updatedBringers).toEqual(initialBringers);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 7: Add Bringer Invariant
   * **Validates: Requirements 3.6**
   * 
   * *For any* existing game and valid user, adding the user as a bringer
   * SHALL result in the game's bringers list containing that user, and the
   * players list SHALL remain unchanged.
   */
  describe('Property 7: Add Bringer Invariant', () => {
    it('should add user to bringers list while keeping players list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          async (gameName, creatorName, newBringerName, creatorIsBringing) => {
            // Create users
            const creator = await createTestUser(creatorName);
            const newBringer = await createTestUser(newBringerName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Step 1: Create a game (with some players)
            const createdGame = await gameService.createGame(uniqueGameName, creator.id, creatorIsBringing);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial players list
            const initialPlayers = createdGame.players.map((p) => p.user.id).sort();

            // Step 3: Add a new bringer
            const updatedGame = await gameService.addBringer(createdGame.id, newBringer.id);

            // Property: The new bringer should be in the bringers list
            const newBringerInList = updatedGame.bringers.some((b) => b.user.id === newBringer.id);
            expect(newBringerInList).toBe(true);

            // Property: The players list should remain unchanged
            const updatedPlayers = updatedGame.players.map((p) => p.user.id).sort();
            expect(updatedPlayers).toEqual(initialPlayers);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });
});
