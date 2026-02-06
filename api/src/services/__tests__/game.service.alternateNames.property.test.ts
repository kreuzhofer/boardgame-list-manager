/**
 * Property-based tests for game service alternate names persistence
 * Feature: 014-alternate-names-search
 * 
 * Tests Property 10: Alternate Names Persistence
 * Validates: Requirements 9.1, 9.3
 */

import * as fc from 'fast-check';
import { prisma } from '../../lib/prisma';

describe('Game Service Alternate Names - Property Tests', () => {
  const testParticipantId = 'test-participant-property';
  const createdAccountIds: string[] = [];
  let eventId: string;
  let createdGameIds: string[] = [];

  beforeAll(async () => {
    const email = `alternate-names-${Date.now()}@example.com`;
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
        name: `Alternate Names Test ${Date.now()}`,
        passwordHash: 'test-hash',
        ownerAccountId: account.id,
      },
    });
    eventId = event.id;

    // Create test participant
    await prisma.user.upsert({
      where: { id: testParticipantId },
      update: { eventId },
      create: { id: testParticipantId, name: 'Test Participant Property', eventId },
    });
  });

  afterEach(async () => {
    // Clean up created games
    if (createdGameIds.length > 0) {
      await prisma.player.deleteMany({
        where: { gameId: { in: createdGameIds } },
      });
      await prisma.bringer.deleteMany({
        where: { gameId: { in: createdGameIds } },
      });
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
      createdGameIds = [];
    }
  });

  afterAll(async () => {
    if (createdAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: createdAccountIds } },
      });
    }
  });

  /**
   * Property 10: Alternate Names Persistence
   * For any game added via BGG search with a matchedAlternateName,
   * the Game record SHALL have addedAsAlternateName set to that value.
   * Validates: Requirements 9.1, 9.3
   */
  describe('Property 10: Alternate Names Persistence', () => {
    it('persists addedAsAlternateName correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (alternateName) => {
            const gameName = `Test Game ${Date.now()}-${Math.random()}`;
            
            const game = await prisma.game.create({
              data: {
                eventId,
                name: gameName,
                ownerId: testParticipantId,
                addedAsAlternateName: alternateName,
                alternateNames: [alternateName],
              },
            });
            createdGameIds.push(game.id);

            // Verify the value was persisted
            const retrieved = await prisma.game.findUnique({
              where: { id: game.id },
            });

            expect(retrieved).not.toBeNull();
            expect(retrieved!.addedAsAlternateName).toBe(alternateName);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('persists alternateNames array correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          async (alternateNames) => {
            const gameName = `Test Game ${Date.now()}-${Math.random()}`;
            
            const game = await prisma.game.create({
              data: {
                eventId,
                name: gameName,
                ownerId: testParticipantId,
                alternateNames: alternateNames,
              },
            });
            createdGameIds.push(game.id);

            // Verify the value was persisted
            const retrieved = await prisma.game.findUnique({
              where: { id: game.id },
            });

            expect(retrieved).not.toBeNull();
            expect(retrieved!.alternateNames).toEqual(alternateNames);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
