import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { GameService } from '../game.service';
import { ParticipantService } from '../participant.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for GameService
 * 
 * These tests verify correctness properties using fast-check to generate
 * random inputs and ensure the properties hold across all valid inputs.
 * 
 * Feature: 002-participant-management
 */

// Custom arbitraries per design document
const gameNameArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Username arbitrary limited to 15 chars to allow room for unique suffix (max 30 total)
const participantNameArbitrary = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('GameService Property Tests', () => {
  let gameService: GameService;
  let participantService: ParticipantService;
  let eventId: string;
  const createdGameIds: string[] = [];
  const createdParticipantIds: string[] = [];
  const createdAccountIds: string[] = [];

  beforeAll(async () => {
    const email = `game-service-${Date.now()}@example.com`;
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash: 'test-hash',
        role: 'account_owner',
        status: 'active',
      },
    });
    createdAccountIds.push(account.id);

    const event = await prisma.event.create({
      data: {
        name: `Game Service Test ${Date.now()}`,
        passwordHash: 'test-hash',
        ownerAccountId: account.id,
      },
    });
    eventId = event.id;
  });

  beforeEach(() => {
    gameService = new GameService();
    participantService = new ParticipantService();
  });

  afterEach(async () => {
    // Clean up created games after each test
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
      createdGameIds.length = 0;
    }
    // Clean up created participants after each test
    if (createdParticipantIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdParticipantIds } },
      });
      createdParticipantIds.length = 0;
    }
  });

  afterAll(async () => {
    if (createdAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: createdAccountIds } },
      });
    }
    // Ensure cleanup and disconnect
    await prisma.$disconnect();
  });

  /**
   * Helper to create a unique participant for testing (max 30 chars for VARCHAR(30) constraint)
   */
  const createTestParticipant = async (baseName: string) => {
    const shortBase = baseName.slice(0, 15);
    const random = Math.random().toString(36).slice(2, 8);
    const uniqueName = `${shortBase}_${random}`.slice(0, 30);
    const participant = await participantService.createParticipant(uniqueName, eventId);
    createdParticipantIds.push(participant.id);
    return participant;
  };

  /**
   * Property 3: Game Creation with Bringer Flag
   * **Validates: Requirements 3.3**
   * 
   * *For any* valid game name and participant, when creating a game with the
   * "Bringe ich mit" flag enabled and isPlaying enabled, the resulting game 
   * SHALL have the participant in both the players list and the bringers list.
   */
  describe('Property 3: Game Creation with Bringer Flag', () => {
    it('should add participant to both players and bringers lists when isBringing and isPlaying are true', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          async (gameName, participantName) => {
            // Create a participant first
            const participant = await createTestParticipant(participantName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game with bringer flag and playing flag enabled
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, true, true);
            createdGameIds.push(game.id);

            // Property: Participant should be in players list (check by participant.id)
            const isInPlayers = game.players.some((p) => p.participant.id === participant.id);
            expect(isInPlayers).toBe(true);

            // Property: Participant should be in bringers list (check by participant.id)
            const isInBringers = game.bringers.some((b) => b.participant.id === participant.id);
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
   * Property 4: Game Responses Include Complete Participant Objects
   * **Validates: Requirements 4.6**
   * 
   * *For any* game with players or bringers, when the game data is returned
   * from the API, each player and bringer entry SHALL include a complete
   * participant object with both `id` (valid UUID) and `name` (non-empty string) fields.
   * 
   * Feature: 002-participant-management, Property 4: Game Responses Include Complete Participant Objects
   */
  describe('Property 4: Game Responses Include Complete Participant Objects', () => {
    it('should include complete participant objects for all players and bringers', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (gameName, participantName, isBringing, isPlaying) => {
            // Create a participant first
            const participant = await createTestParticipant(participantName);

            // Generate unique game name
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, isBringing, isPlaying);
            createdGameIds.push(game.id);

            // Property: All players should have complete participant objects
            for (const player of game.players) {
              // Participant object should exist
              expect(player.participant).toBeDefined();
              
              // Participant id should be a valid UUID
              expect(player.participant.id).toBeDefined();
              expect(typeof player.participant.id).toBe('string');
              expect(player.participant.id).toMatch(UUID_REGEX);
              
              // Participant name should be a non-empty string
              expect(player.participant.name).toBeDefined();
              expect(typeof player.participant.name).toBe('string');
              expect(player.participant.name.length).toBeGreaterThan(0);
            }

            // Property: All bringers should have complete participant objects
            for (const bringer of game.bringers) {
              // Participant object should exist
              expect(bringer.participant).toBeDefined();
              
              // Participant id should be a valid UUID
              expect(bringer.participant.id).toBeDefined();
              expect(typeof bringer.participant.id).toBe('string');
              expect(bringer.participant.id).toMatch(UUID_REGEX);
              
              // Participant name should be a non-empty string
              expect(bringer.participant.name).toBeDefined();
              expect(typeof bringer.participant.name).toBe('string');
              expect(bringer.participant.name.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });

    it('should include complete participant objects after adding players and bringers', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          participantNameArbitrary,
          async (gameName, creatorName, additionalUserName) => {
            // Create users
            const creator = await createTestParticipant(creatorName);
            const additionalUser = await createTestParticipant(additionalUserName);

            // Generate unique game name
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without bringer or player (just owner)
            let game = await gameService.createGame(eventId, uniqueGameName, creator.id, false, false);
            createdGameIds.push(game.id);

            // Add additional participant as player
            game = await gameService.addPlayer(eventId, game.id, additionalUser.id);

            // Add additional participant as bringer
            game = await gameService.addBringer(eventId, game.id, additionalUser.id);

            // Property: All players should have complete participant objects
            expect(game.players.length).toBe(1);
            for (const player of game.players) {
              expect(player.participant).toBeDefined();
              expect(player.participant.id).toMatch(UUID_REGEX);
              expect(player.participant.name.length).toBeGreaterThan(0);
            }

            // Property: All bringers should have complete participant objects
            expect(game.bringers.length).toBe(1);
            for (const bringer of game.bringers) {
              expect(bringer.participant).toBeDefined();
              expect(bringer.participant.id).toMatch(UUID_REGEX);
              expect(bringer.participant.name.length).toBeGreaterThan(0);
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
   * *For any* valid game name and participant, when creating a game with isPlaying true
   * but without the "Bringe ich mit" flag, the resulting game SHALL have the participant 
   * only in the players list and NOT in the bringers list.
   */
  describe('Property 5: Game Creation without Bringer Flag', () => {
    it('should add participant only to players list and NOT to bringers list when isBringing is false but isPlaying is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          async (gameName, participantName) => {
            // Create a participant first
            const participant = await createTestParticipant(participantName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without bringer flag (isBringing = false) but with isPlaying = true
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, false, true);
            createdGameIds.push(game.id);

            // Property: Participant should be in players list
            const isInPlayers = game.players.some((p) => p.participant.id === participant.id);
            expect(isInPlayers).toBe(true);

            // Property: Participant should NOT be in bringers list
            const isInBringers = game.bringers.some((b) => b.participant.id === participant.id);
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
   * *For any* existing game and valid participant, adding the participant as a player
   * SHALL result in the game's players list containing that participant, and the
   * bringers list SHALL remain unchanged.
   */
  describe('Property 6: Add Player Invariant', () => {
    it('should add participant to players list while keeping bringers list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          participantNameArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (gameName, creatorName, newPlayerName, creatorIsBringing, creatorIsPlaying) => {
            // Create users
            const creator = await createTestParticipant(creatorName);
            const newPlayer = await createTestParticipant(newPlayerName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Step 1: Create a game (with or without bringers/players based on random flags)
            const createdGame = await gameService.createGame(eventId, uniqueGameName, creator.id, creatorIsBringing, creatorIsPlaying);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial bringers list
            const initialBringers = createdGame.bringers.map((b) => b.participant.id).sort();

            // Step 3: Add a new player
            const updatedGame = await gameService.addPlayer(eventId, createdGame.id, newPlayer.id);

            // Property: The new player should be in the players list
            const newPlayerInList = updatedGame.players.some((p) => p.participant.id === newPlayer.id);
            expect(newPlayerInList).toBe(true);

            // Property: The bringers list should remain unchanged
            const updatedBringers = updatedGame.bringers.map((b) => b.participant.id).sort();
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
   * *For any* existing game and valid participant, adding the participant as a bringer
   * SHALL result in the game's bringers list containing that participant, and the
   * players list SHALL remain unchanged.
   */
  describe('Property 7: Add Bringer Invariant', () => {
    it('should add participant to bringers list while keeping players list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          participantNameArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (gameName, creatorName, newBringerName, creatorIsBringing, creatorIsPlaying) => {
            // Create users
            const creator = await createTestParticipant(creatorName);
            const newBringer = await createTestParticipant(newBringerName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Step 1: Create a game (with some players based on random flag)
            const createdGame = await gameService.createGame(eventId, uniqueGameName, creator.id, creatorIsBringing, creatorIsPlaying);
            createdGameIds.push(createdGame.id);

            // Step 2: Record the initial players list
            const initialPlayers = createdGame.players.map((p) => p.participant.id).sort();

            // Step 3: Add a new bringer
            const updatedGame = await gameService.addBringer(eventId, createdGame.id, newBringer.id);

            // Property: The new bringer should be in the bringers list
            const newBringerInList = updatedGame.bringers.some((b) => b.participant.id === newBringer.id);
            expect(newBringerInList).toBe(true);

            // Property: The players list should remain unchanged
            const updatedPlayers = updatedGame.players.map((p) => p.participant.id).sort();
            expect(updatedPlayers).toEqual(initialPlayers);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });

  /**
   * Property 1: Prototype Toggle Round-Trip
   * **Validates: Requirements 022-prototype-toggle 1.1**
   * 
   * *For any* game owned by a participant with no BGG ID, toggling the prototype status
   * to a value `v` and then reading the game back SHALL return a game with
   * `isPrototype === v`.
   * 
   * Feature: prototype-toggle, Property 1: Prototype Toggle Round-Trip
   */
  describe('Property 1: Prototype Toggle Round-Trip', () => {
    it('should persist prototype status correctly after toggle', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          fc.boolean(),
          async (gameName, participantName, targetPrototypeStatus) => {
            // Create a participant first
            const participant = await createTestParticipant(participantName);

            // Generate unique game name to avoid conflicts between test runs
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create game without BGG ID (required for prototype toggle)
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, false, false, false);
            createdGameIds.push(game.id);

            // Toggle prototype status to the target value
            const toggledGame = await gameService.togglePrototype(eventId, game.id, participant.id, targetPrototypeStatus);

            // Property: The toggled game should have the correct isPrototype value
            expect(toggledGame.isPrototype).toBe(targetPrototypeStatus);

            // Read the game back to verify persistence
            const fetchedGame = await gameService.getGameById(eventId, game.id);
            expect(fetchedGame).not.toBeNull();
            expect(fetchedGame!.isPrototype).toBe(targetPrototypeStatus);

            return true;
          }
        ),
        { numRuns: 3 } // Per workspace guidelines for DB operations
      );
    });
  });
});
