/**
 * Unit tests for game service alternate name handling
 * Feature: 014-alternate-names-search
 * 
 * Tests creating games with alternate name data
 * Validates: Requirements 8.3, 8.4, 8.5
 */

import { prisma } from '../../lib/prisma';

describe('Game Service Alternate Names - Unit Tests', () => {
  const testUserId = 'test-user-id';
  let createdGameIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: { id: testUserId, name: 'Test User' },
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

  describe('Creating games with alternate name data', () => {
    it('stores addedAsAlternateName when provided', async () => {
      const gameName = `Test Game ${Date.now()}`;
      
      const game = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
          addedAsAlternateName: 'German Name',
          alternateNames: ['German Name', 'French Name'],
        },
      });
      createdGameIds.push(game.id);

      expect(game.addedAsAlternateName).toBe('German Name');
    });

    it('stores alternateNames array when provided', async () => {
      const gameName = `Test Game ${Date.now()}`;
      const alternates = ['Alt 1', 'Alt 2', 'Alt 3'];
      
      const game = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
          alternateNames: alternates,
        },
      });
      createdGameIds.push(game.id);

      expect(game.alternateNames).toEqual(alternates);
    });

    it('defaults addedAsAlternateName to null when not provided', async () => {
      const gameName = `Test Game ${Date.now()}`;
      
      const game = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
        },
      });
      createdGameIds.push(game.id);

      expect(game.addedAsAlternateName).toBeNull();
    });

    it('defaults alternateNames to empty array when not provided', async () => {
      const gameName = `Test Game ${Date.now()}`;
      
      const game = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
        },
      });
      createdGameIds.push(game.id);

      expect(game.alternateNames).toEqual([]);
    });
  });

  describe('Retrieving games with alternate name data', () => {
    it('returns addedAsAlternateName in game response', async () => {
      const gameName = `Test Game ${Date.now()}`;
      
      const created = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
          addedAsAlternateName: 'Alternate Title',
          alternateNames: ['Alternate Title'],
        },
      });
      createdGameIds.push(created.id);

      const game = await prisma.game.findUnique({
        where: { id: created.id },
      });

      expect(game).not.toBeNull();
      expect(game!.addedAsAlternateName).toBe('Alternate Title');
    });

    it('returns alternateNames array in game response', async () => {
      const gameName = `Test Game ${Date.now()}`;
      const alternates = ['Name 1', 'Name 2'];
      
      const created = await prisma.game.create({
        data: {
          name: gameName,
          ownerId: testUserId,
          alternateNames: alternates,
        },
      });
      createdGameIds.push(created.id);

      const game = await prisma.game.findUnique({
        where: { id: created.id },
      });

      expect(game).not.toBeNull();
      expect(game!.alternateNames).toEqual(alternates);
    });
  });
});
