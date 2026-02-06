import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { GameService } from '../game.service';
import { ParticipantService } from '../participant.service';
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

const participantNameArbitrary = fc
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
  let participantService: ParticipantService;
  let eventId: string;
  const createdGameIds: string[] = [];
  const createdParticipantIds: string[] = [];
  const createdAccountIds: string[] = [];

  beforeAll(async () => {
    const email = `sse-broadcast-${Date.now()}@example.com`;
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
        name: `SSE Broadcast Test ${Date.now()}`,
        passwordHash: 'test-hash',
        ownerAccountId: account.id,
      },
    });
    eventId = event.id;
  });

  beforeEach(() => {
    gameService = new GameService();
    participantService = new ParticipantService();
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
    await prisma.$disconnect();
  });

  const createTestParticipant = async (baseName: string) => {
    const shortBase = baseName.slice(0, 15);
    const random = Math.random().toString(36).slice(2, 8);
    const uniqueName = `${shortBase}_${random}`.slice(0, 30);
    const participant = await participantService.createParticipant(uniqueName, eventId);
    createdParticipantIds.push(participant.id);
    return participant;
  };

  describe('Property 1: Event Broadcast Correctness', () => {
    it('should broadcast game:created event with correct type when creating a game', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameNameArbitrary,
          participantNameArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (gameName, participantName, isBringing, isPlaying) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const participant = await createTestParticipant(participantName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, isBringing, isPlaying);
            createdGameIds.push(game.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:created');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(participant.id);
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
          participantNameArbitrary,
          participantNameArbitrary,
          async (gameName, creatorName, bringerName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const creator = await createTestParticipant(creatorName);
            const bringer = await createTestParticipant(bringerName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, creator.id, false, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.addBringer(eventId, game.id, bringer.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:bringer-added');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(bringer.id);

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
          participantNameArbitrary,
          async (gameName, participantName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const participant = await createTestParticipant(participantName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, true, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.removeBringer(eventId, game.id, participant.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:bringer-removed');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(participant.id);

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
          participantNameArbitrary,
          participantNameArbitrary,
          async (gameName, creatorName, playerName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const creator = await createTestParticipant(creatorName);
            const player = await createTestParticipant(playerName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, creator.id, false, false);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.addPlayer(eventId, game.id, player.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:player-added');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(player.id);

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
          participantNameArbitrary,
          async (gameName, participantName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const participant = await createTestParticipant(participantName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, false, true);
            createdGameIds.push(game.id);

            mockResponse.events.length = 0;

            await gameService.removePlayer(eventId, game.id, participant.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:player-removed');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(participant.id);

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
          participantNameArbitrary,
          async (gameName, participantName) => {
            const mockResponse = createMockResponse();
            sseManager.addClient('test-client', mockResponse as any);

            const participant = await createTestParticipant(participantName);
            const uniqueGameName = `${gameName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const game = await gameService.createGame(eventId, uniqueGameName, participant.id, false, false);
            // Don't add to createdGameIds since we're deleting it

            mockResponse.events.length = 0;

            await gameService.deleteGame(eventId, game.id, participant.id);

            expect(mockResponse.events.length).toBeGreaterThan(0);

            const lastEvent = mockResponse.events[mockResponse.events.length - 1];
            const eventData = JSON.parse(lastEvent.replace('data: ', '').trim());
            expect(eventData.type).toBe('game:deleted');
            expect(eventData.gameId).toBe(game.id);
            expect(eventData.participantId).toBe(participant.id);

            return true;
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
