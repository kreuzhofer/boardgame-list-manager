import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../../db/prisma';
import { UserRepository, userRepository } from '../user.repository';

/**
 * Unit tests for User Repository
 * Tests CRUD operations, duplicate name constraint, and cascade delete behavior
 *
 * Validates: Requirements 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.7, 3.10
 */
describe('UserRepository', () => {
  let repository: UserRepository;

  // Track created test data for cleanup
  const createdUserIds: string[] = [];
  const createdGameIds: string[] = [];

  // Test data prefix to identify test records
  const TEST_PREFIX = 'TEST_USER_REPO_';

  beforeAll(() => {
    repository = userRepository;
  });

  afterAll(async () => {
    // Clean up all test data created during tests
    // Delete users first (cascade will handle players/bringers)
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Delete any test games
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({
        where: { id: { in: createdGameIds } },
      });
    }

    await prisma.$disconnect();
  });

  /**
   * Helper to create a unique test user name
   */
  const uniqueName = (base: string) => `${TEST_PREFIX}${base}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  describe('findAll', () => {
    /**
     * Test that findAll returns users sorted by name
     * Validates: Requirement 3.1
     */
    it('should return all users sorted by name ascending', async () => {
      // Create test users with names that will sort in a specific order
      const timestamp = Date.now();
      const nameA = `${TEST_PREFIX}AAA_${timestamp}`;
      const nameB = `${TEST_PREFIX}BBB_${timestamp}`;
      const nameC = `${TEST_PREFIX}CCC_${timestamp}`;

      // Create in non-alphabetical order
      const userB = await repository.create(nameB);
      createdUserIds.push(userB.id);

      const userC = await repository.create(nameC);
      createdUserIds.push(userC.id);

      const userA = await repository.create(nameA);
      createdUserIds.push(userA.id);

      // Fetch all users
      const users = await repository.findAll();

      // Filter to only our test users
      const testUsers = users.filter((u) => u.name.startsWith(`${TEST_PREFIX}`) && u.name.includes(`${timestamp}`));

      // Verify they are sorted alphabetically
      expect(testUsers.length).toBe(3);
      expect(testUsers[0].name).toBe(nameA);
      expect(testUsers[1].name).toBe(nameB);
      expect(testUsers[2].name).toBe(nameC);
    });
  });

  describe('findById', () => {
    /**
     * Test that findById returns the user when found
     * Validates: Requirement 3.2
     */
    it('should return user when found', async () => {
      const name = uniqueName('findById');
      const created = await repository.create(name);
      createdUserIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(name);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    /**
     * Test that findById returns null when user not found
     * Validates: Requirement 3.2
     */
    it('should return null when user not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const found = await repository.findById(nonExistentId);

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    /**
     * Test that findByName returns the user when found
     */
    it('should return user when found by name', async () => {
      const name = uniqueName('findByName');
      const created = await repository.create(name);
      createdUserIds.push(created.id);

      const found = await repository.findByName(name);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(name);
    });

    /**
     * Test that findByName returns null when user not found
     */
    it('should return null when user not found by name', async () => {
      const nonExistentName = uniqueName('nonexistent');

      const found = await repository.findByName(nonExistentName);

      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    /**
     * Test that create successfully creates a user
     * Validates: Requirement 3.4
     */
    it('should create user successfully', async () => {
      const name = uniqueName('create');

      const user = await repository.create(name);
      createdUserIds.push(user.id);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(user.name).toBe(name);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    /**
     * Test that create throws error on duplicate name (Prisma unique constraint)
     * Validates: Requirement 1.3 (uniqueness on name field)
     */
    it('should throw error on duplicate name', async () => {
      const name = uniqueName('duplicate');

      // Create first user
      const user = await repository.create(name);
      createdUserIds.push(user.id);

      // Attempt to create second user with same name
      await expect(repository.create(name)).rejects.toThrow();
    });
  });

  describe('update', () => {
    /**
     * Test that update successfully updates user name
     * Validates: Requirement 3.7
     */
    it('should update user name successfully', async () => {
      const originalName = uniqueName('updateOriginal');
      const newName = uniqueName('updateNew');

      const user = await repository.create(originalName);
      createdUserIds.push(user.id);

      const updated = await repository.update(user.id, newName);

      expect(updated.id).toBe(user.id);
      expect(updated.name).toBe(newName);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(user.updatedAt.getTime());
    });

    /**
     * Test that update throws error when user not found
     */
    it('should throw error when updating non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const newName = uniqueName('updateNonExistent');

      await expect(repository.update(nonExistentId, newName)).rejects.toThrow();
    });

    /**
     * Test that update throws error on duplicate name
     */
    it('should throw error when updating to duplicate name', async () => {
      const name1 = uniqueName('updateDup1');
      const name2 = uniqueName('updateDup2');

      const user1 = await repository.create(name1);
      createdUserIds.push(user1.id);

      const user2 = await repository.create(name2);
      createdUserIds.push(user2.id);

      // Try to update user2's name to user1's name
      await expect(repository.update(user2.id, name1)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    /**
     * Test that delete successfully deletes a user
     * Validates: Requirement 3.10
     */
    it('should delete user successfully', async () => {
      const name = uniqueName('delete');

      const user = await repository.create(name);
      // Don't add to createdUserIds since we're deleting it

      await repository.delete(user.id);

      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });

    /**
     * Test that delete throws error when user not found
     */
    it('should throw error when deleting non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(repository.delete(nonExistentId)).rejects.toThrow();
    });

    /**
     * Test cascade delete behavior - deleting user should delete associated Player records
     * Validates: Requirement 2.3
     */
    it('should cascade delete associated Player records', async () => {
      const userName = uniqueName('cascadePlayer');
      const gameName = uniqueName('cascadeGame');

      // Create user
      const user = await repository.create(userName);

      // Create a game
      const game = await prisma.game.create({
        data: { name: gameName },
      });
      createdGameIds.push(game.id);

      // Create a player record linking user to game
      const player = await prisma.player.create({
        data: {
          gameId: game.id,
          userId: user.id,
        },
      });

      // Verify player exists
      const playerBefore = await prisma.player.findUnique({
        where: { id: player.id },
      });
      expect(playerBefore).not.toBeNull();

      // Delete the user
      await repository.delete(user.id);

      // Verify player was cascade deleted
      const playerAfter = await prisma.player.findUnique({
        where: { id: player.id },
      });
      expect(playerAfter).toBeNull();

      // Verify game still exists (only player should be deleted)
      const gameAfter = await prisma.game.findUnique({
        where: { id: game.id },
      });
      expect(gameAfter).not.toBeNull();
    });

    /**
     * Test cascade delete behavior - deleting user should delete associated Bringer records
     * Validates: Requirement 2.3
     */
    it('should cascade delete associated Bringer records', async () => {
      const userName = uniqueName('cascadeBringer');
      const gameName = uniqueName('cascadeGameBringer');

      // Create user
      const user = await repository.create(userName);

      // Create a game
      const game = await prisma.game.create({
        data: { name: gameName },
      });
      createdGameIds.push(game.id);

      // Create a bringer record linking user to game
      const bringer = await prisma.bringer.create({
        data: {
          gameId: game.id,
          userId: user.id,
        },
      });

      // Verify bringer exists
      const bringerBefore = await prisma.bringer.findUnique({
        where: { id: bringer.id },
      });
      expect(bringerBefore).not.toBeNull();

      // Delete the user
      await repository.delete(user.id);

      // Verify bringer was cascade deleted
      const bringerAfter = await prisma.bringer.findUnique({
        where: { id: bringer.id },
      });
      expect(bringerAfter).toBeNull();

      // Verify game still exists (only bringer should be deleted)
      const gameAfter = await prisma.game.findUnique({
        where: { id: game.id },
      });
      expect(gameAfter).not.toBeNull();
    });

    /**
     * Test cascade delete behavior - deleting user should delete both Player and Bringer records
     * Validates: Requirement 2.3
     */
    it('should cascade delete both Player and Bringer records', async () => {
      const userName = uniqueName('cascadeBoth');
      const gameName = uniqueName('cascadeGameBoth');

      // Create user
      const user = await repository.create(userName);

      // Create a game
      const game = await prisma.game.create({
        data: { name: gameName },
      });
      createdGameIds.push(game.id);

      // Create both player and bringer records
      const player = await prisma.player.create({
        data: {
          gameId: game.id,
          userId: user.id,
        },
      });

      const bringer = await prisma.bringer.create({
        data: {
          gameId: game.id,
          userId: user.id,
        },
      });

      // Verify both exist
      expect(await prisma.player.findUnique({ where: { id: player.id } })).not.toBeNull();
      expect(await prisma.bringer.findUnique({ where: { id: bringer.id } })).not.toBeNull();

      // Delete the user
      await repository.delete(user.id);

      // Verify both were cascade deleted
      expect(await prisma.player.findUnique({ where: { id: player.id } })).toBeNull();
      expect(await prisma.bringer.findUnique({ where: { id: bringer.id } })).toBeNull();
    });

    /**
     * Test SetNull behavior - deleting user should set ownerId to null for owned games
     * Validates: Requirement 4.1, 4.2 - Games persist when owner is deleted
     */
    it('should set ownerId to null for owned games when user is deleted', async () => {
      const userName = uniqueName('ownerSetNull');
      const gameName = uniqueName('ownedGame');

      // Create user
      const user = await repository.create(userName);

      // Create a game owned by this user
      const game = await prisma.game.create({
        data: { 
          name: gameName,
          ownerId: user.id,
        },
      });
      createdGameIds.push(game.id);

      // Verify game has owner
      const gameBefore = await prisma.game.findUnique({
        where: { id: game.id },
      });
      expect(gameBefore).not.toBeNull();
      expect(gameBefore!.ownerId).toBe(user.id);

      // Delete the user
      await repository.delete(user.id);

      // Verify game still exists but ownerId is null
      const gameAfter = await prisma.game.findUnique({
        where: { id: game.id },
      });
      expect(gameAfter).not.toBeNull();
      expect(gameAfter!.ownerId).toBeNull();
      expect(gameAfter!.name).toBe(gameName);
    });

    /**
     * Test combined cascade and SetNull behavior
     * Validates: Requirement 4.1, 4.4 - Player/Bringer cascade delete + Game ownership SetNull
     */
    it('should cascade delete Player/Bringer and set ownerId to null for owned games', async () => {
      const userName = uniqueName('combinedCascade');
      const gameName = uniqueName('combinedGame');

      // Create user
      const user = await repository.create(userName);

      // Create a game owned by this user with the user as player and bringer
      const game = await prisma.game.create({
        data: { 
          name: gameName,
          ownerId: user.id,
          players: {
            create: { userId: user.id },
          },
          bringers: {
            create: { userId: user.id },
          },
        },
        include: {
          players: true,
          bringers: true,
        },
      });
      createdGameIds.push(game.id);

      // Verify initial state
      expect(game.ownerId).toBe(user.id);
      expect(game.players.length).toBe(1);
      expect(game.bringers.length).toBe(1);

      // Delete the user
      await repository.delete(user.id);

      // Verify game still exists with null owner and no players/bringers
      const gameAfter = await prisma.game.findUnique({
        where: { id: game.id },
        include: {
          players: true,
          bringers: true,
        },
      });
      expect(gameAfter).not.toBeNull();
      expect(gameAfter!.ownerId).toBeNull();
      expect(gameAfter!.players.length).toBe(0);
      expect(gameAfter!.bringers.length).toBe(0);
    });
  });
});
