import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { GameService } from '../game.service';
import { UserService } from '../user.service';
import { sseManager } from '../sse.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for SSE Event Broadcasting
 * 
 * Feature: 012-sse-real-time-updates
 * Property 1: Event Broadcast Correctness
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

// Custom arbitraries
const gameNameArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

const userNameArbitrary = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Mock response to capture broadcasts
const createMockResponse = () => {
  const events: string[] = [];
  return {
    write: jest.fn((data: string) => {
      events.push(data);
      return true;
    }),
    events,
  };
};

describe('SSE Broadcast Property Tests', () => {
  let gameService: GameService;
  let userService: UserService;
  const createdGameIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(() => {
    gameService = new GameService();
    userService = new UserService();
    sseManager.clearClients();
  });

  afterEach(async () => {
    sseManager.clearClients();
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
      createdGameIds.length = 0;
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createTestUser = async (baseName: string) => {
    const shortBase = baseName.slice(0, 15);
    const random = Math.random().toString(36).slice(2, 8);
    const uniqueName = `${shortBase}_${random}`.slice(0, 30);
    const user = await userService.createUser(uniqueName);
    createdUserIds.push(user.id);
    return user;
  };

  describe('Property 1: Event Broadcast Correctness', () => {
    it('should broadcast game:created event with correct type when creating a game', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (gameName, userName, isBringing, isPlaying) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const user = await createTestUser(userName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, user.id, isBringing, isPlaying);
            createdGameIds.push(game.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:created');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(user.id);
            expect(eventData.isBringing).toBe(isBringing);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should broadcast game:bringer-added event when adding a bringer', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          async (gameName, creatorName, bringerName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const creator = await createTestUser(creatorName);
            const bringer = await createTestUser(bringerName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, creator.id, false, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.addBringer(game.id, bringer.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:bringer-added');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(bringer.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should broadcast game:bringer-removed event when removing a bringer', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const user = await createTestUser(userName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, user.id, true, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.removeBringer(game.id, user.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:bringer-removed');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(user.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should broadcast game:player-added event when adding a player', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          userNameArbitrary,
          async (gameName, creatorName, playerName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const creator = await createTestUser(creatorName);
            const player = await createTestUser(playerName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, creator.id, false, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.addPlayer(game.id, player.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:player-added');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(player.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should broadcast game:player-removed event when removing a player', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const user = await createTestUser(userName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, user.id, false, true);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.removePlayer(game.id, user.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:player-removed');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(user.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should broadcast game:deleted event when deleting a game', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          userNameArbitrary,
          async (gameName, userName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const user = await createTestUser(userName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(uniqueGameName, user.id, false, false);
            // Don't add to createdGameIds since we're deleting it

            mockResponse.events.length = 0;

            await gameService.deleteGame(game.id, user.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:deleted');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.userId).toBe(user.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
