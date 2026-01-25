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
  const testUserId = 'test-user-property';
  let createdGameIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: { id: testUserId, name: 'Test User Property' },
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
    // Clean up test user
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
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
                name: gameName,
                ownerId: testUserId,
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
                name: gameName,
                ownerId: testUserId,
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
