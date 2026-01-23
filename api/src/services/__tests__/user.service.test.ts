import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserService, MAX_USERNAME_LENGTH } from '../user.service';
import { UserRepository, UserEntity } from '../../repositories/user.repository';

/**
 * Unit tests for User Service
 * Tests validation logic and error handling
 *
 * Validates: Requirements 3.3, 3.5, 3.6, 3.8, 3.9
 */
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  // Helper to create a mock UserEntity
  const createMockUserEntity = (id: string, name: string): UserEntity => ({
    id,
    name,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    // Create mock repository with all methods
    mockRepository = {
      findAll: jest.fn<() => Promise<UserEntity[]>>(),
      findById: jest.fn<(id: string) => Promise<UserEntity | null>>(),
      findByName: jest.fn<(name: string) => Promise<UserEntity | null>>(),
      create: jest.fn<(name: string) => Promise<UserEntity>>(),
      update: jest.fn<(id: string, name: string) => Promise<UserEntity>>(),
      delete: jest.fn<(id: string) => Promise<void>>(),
    };

    // Create service with mocked repository
    userService = new UserService(mockRepository);
  });

  describe('getAllUsers', () => {
    /**
     * Test that getAllUsers returns users in API format
     * Validates: Requirement 3.1
     */
    it('should return users in API format', async () => {
      const mockEntities: UserEntity[] = [
        createMockUserEntity('user-1', 'Alice'),
        createMockUserEntity('user-2', 'Bob'),
      ];
      mockRepository.findAll.mockResolvedValue(mockEntities);

      const result = await userService.getAllUsers();

      expect(result).toEqual([
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ]);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    /**
     * Test that getAllUsers returns empty array when no users exist
     */
    it('should return empty array when no users exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById', () => {
    /**
     * Test that getUserById returns user when found
     * Validates: Requirement 3.2
     */
    it('should return user when found', async () => {
      const mockEntity = createMockUserEntity('user-123', 'Test User');
      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await userService.getUserById('user-123');

      expect(result).toEqual({ id: 'user-123', name: 'Test User' });
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123');
    });

    /**
     * Test that getUserById throws "Benutzer nicht gefunden." when not found
     * Validates: Requirement 3.3
     */
    it('should throw "Benutzer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(
        'Benutzer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('createUser', () => {
    /**
     * Test that createUser creates user successfully
     * Validates: Requirement 3.4
     */
    it('should create user successfully', async () => {
      const mockEntity = createMockUserEntity('new-user-id', 'New User');
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await userService.createUser('New User');

      expect(result).toEqual({ id: 'new-user-id', name: 'New User' });
      expect(mockRepository.findByName).toHaveBeenCalledWith('New User');
      expect(mockRepository.create).toHaveBeenCalledWith('New User');
    });

    /**
     * Test that createUser trims whitespace from name
     */
    it('should trim whitespace from name', async () => {
      const mockEntity = createMockUserEntity('new-user-id', 'Trimmed Name');
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      await userService.createUser('  Trimmed Name  ');

      expect(mockRepository.findByName).toHaveBeenCalledWith('Trimmed Name');
      expect(mockRepository.create).toHaveBeenCalledWith('Trimmed Name');
    });

    /**
     * Test that createUser throws "Bitte einen Namen eingeben." for empty name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for empty name', async () => {
      await expect(userService.createUser('')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createUser throws "Bitte einen Namen eingeben." for whitespace-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for whitespace-only name', async () => {
      await expect(userService.createUser('   ')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createUser throws "Bitte einen Namen eingeben." for tab-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for tab-only name', async () => {
      await expect(userService.createUser('\t\t')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });

    /**
     * Test that createUser throws "Bitte einen Namen eingeben." for newline-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for newline-only name', async () => {
      await expect(userService.createUser('\n\n')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });

    /**
     * Test that createUser throws "Ein Benutzer mit diesem Namen existiert bereits." for duplicate
     * Validates: Requirement 3.6
     */
    it('should throw "Ein Benutzer mit diesem Namen existiert bereits." for duplicate', async () => {
      const existingUser = createMockUserEntity('existing-id', 'Existing User');
      mockRepository.findByName.mockResolvedValue(existingUser);

      await expect(userService.createUser('Existing User')).rejects.toThrow(
        'Ein Benutzer mit diesem Namen existiert bereits.'
      );
      expect(mockRepository.findByName).toHaveBeenCalledWith('Existing User');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createUser handles Prisma unique constraint violation
     * Validates: Requirement 3.6
     */
    it('should handle Prisma unique constraint violation', async () => {
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(userService.createUser('Race Condition User')).rejects.toThrow(
        'Ein Benutzer mit diesem Namen existiert bereits.'
      );
    });
  });

  describe('updateUser', () => {
    /**
     * Test that updateUser updates user successfully
     * Validates: Requirement 3.7
     */
    it('should update user successfully', async () => {
      const existingUser = createMockUserEntity('user-id', 'Old Name');
      const updatedUser = createMockUserEntity('user-id', 'New Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-id', 'New Name');

      expect(result).toEqual({ id: 'user-id', name: 'New Name' });
      expect(mockRepository.findById).toHaveBeenCalledWith('user-id');
      expect(mockRepository.findByName).toHaveBeenCalledWith('New Name');
      expect(mockRepository.update).toHaveBeenCalledWith('user-id', 'New Name');
    });

    /**
     * Test that updateUser allows updating to the same name (no change)
     */
    it('should allow updating to the same name', async () => {
      const existingUser = createMockUserEntity('user-id', 'Same Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(existingUser);

      const result = await userService.updateUser('user-id', 'Same Name');

      expect(result).toEqual({ id: 'user-id', name: 'Same Name' });
      // Should not check for duplicate when name is the same
      expect(mockRepository.findByName).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser trims whitespace from name
     */
    it('should trim whitespace from name', async () => {
      const existingUser = createMockUserEntity('user-id', 'Old Name');
      const updatedUser = createMockUserEntity('user-id', 'Trimmed Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      await userService.updateUser('user-id', '  Trimmed Name  ');

      expect(mockRepository.update).toHaveBeenCalledWith('user-id', 'Trimmed Name');
    });

    /**
     * Test that updateUser throws "Bitte einen Namen eingeben." for empty name
     * Validates: Requirement 3.8
     */
    it('should throw "Bitte einen Namen eingeben." for empty name', async () => {
      await expect(userService.updateUser('user-id', '')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser throws "Bitte einen Namen eingeben." for whitespace-only name
     * Validates: Requirement 3.8
     */
    it('should throw "Bitte einen Namen eingeben." for whitespace-only name', async () => {
      await expect(userService.updateUser('user-id', '   ')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser throws "Benutzer nicht gefunden." when not found
     * Validates: Requirement 3.7 (implicit - user must exist to update)
     */
    it('should throw "Benutzer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('non-existent-id', 'New Name')).rejects.toThrow(
        'Benutzer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser throws "Ein Benutzer mit diesem Namen existiert bereits." for duplicate
     * Validates: Requirement 3.9
     */
    it('should throw "Ein Benutzer mit diesem Namen existiert bereits." for duplicate', async () => {
      const existingUser = createMockUserEntity('user-id', 'Old Name');
      const otherUser = createMockUserEntity('other-id', 'Taken Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(otherUser);

      await expect(userService.updateUser('user-id', 'Taken Name')).rejects.toThrow(
        'Ein Benutzer mit diesem Namen existiert bereits.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('user-id');
      expect(mockRepository.findByName).toHaveBeenCalledWith('Taken Name');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser handles Prisma unique constraint violation
     * Validates: Requirement 3.9
     */
    it('should handle Prisma unique constraint violation', async () => {
      const existingUser = createMockUserEntity('user-id', 'Old Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(userService.updateUser('user-id', 'Race Condition Name')).rejects.toThrow(
        'Ein Benutzer mit diesem Namen existiert bereits.'
      );
    });

    /**
     * Test that updateUser handles Prisma record not found error
     */
    it('should handle Prisma record not found error', async () => {
      const existingUser = createMockUserEntity('user-id', 'Old Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockRejectedValue(new Error('Record to update not found'));

      await expect(userService.updateUser('user-id', 'New Name')).rejects.toThrow(
        'Benutzer nicht gefunden.'
      );
    });
  });

  describe('deleteUser', () => {
    /**
     * Test that deleteUser deletes user successfully
     * Validates: Requirement 3.10
     */
    it('should delete user successfully', async () => {
      const existingUser = createMockUserEntity('user-id', 'User To Delete');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockResolvedValue(undefined);

      await expect(userService.deleteUser('user-id')).resolves.toBeUndefined();
      expect(mockRepository.findById).toHaveBeenCalledWith('user-id');
      expect(mockRepository.delete).toHaveBeenCalledWith('user-id');
    });

    /**
     * Test that deleteUser throws "Benutzer nicht gefunden." when not found
     * Validates: Requirement 3.10 (implicit - user must exist to delete)
     */
    it('should throw "Benutzer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser('non-existent-id')).rejects.toThrow(
        'Benutzer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test that deleteUser handles Prisma record not found error
     */
    it('should handle Prisma record not found error', async () => {
      const existingUser = createMockUserEntity('user-id', 'User To Delete');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockRejectedValue(new Error('Record to delete does not exist'));

      await expect(userService.deleteUser('user-id')).rejects.toThrow(
        'Benutzer nicht gefunden.'
      );
    });
  });

  /**
   * Unit tests for username length validation edge cases
   * Tests boundary conditions and whitespace handling for the 30-character limit
   *
   * Validates: Requirements 2.3, 3.2, 3.3
   */
  describe('Username Length Validation Edge Cases', () => {
    /**
     * Test that a name with exactly 30 characters is accepted (boundary test)
     * Validates: Requirement 3.3 (exactly 30 characters is valid)
     */
    it('should accept a name with exactly 30 characters', async () => {
      const exactlyThirtyChars = 'A'.repeat(MAX_USERNAME_LENGTH); // 30 characters
      expect(exactlyThirtyChars.length).toBe(30);

      const mockEntity = createMockUserEntity('user-id', exactlyThirtyChars);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await userService.createUser(exactlyThirtyChars);

      expect(result).toEqual({ id: 'user-id', name: exactlyThirtyChars });
      expect(mockRepository.create).toHaveBeenCalledWith(exactlyThirtyChars);
    });

    /**
     * Test that a name with 31 characters is rejected (boundary test)
     * Validates: Requirements 2.1, 2.2
     */
    it('should reject a name with 31 characters', async () => {
      const thirtyOneChars = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters
      expect(thirtyOneChars.length).toBe(31);

      await expect(userService.createUser(thirtyOneChars)).rejects.toThrow(
        'Der Name darf maximal 30 Zeichen lang sein.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that whitespace padding with valid trimmed length is accepted
     * Validates: Requirements 2.3, 3.2 (trimmed length validation)
     */
    it('should accept a name with whitespace padding that trims to valid length', async () => {
      const validName = 'ValidName'; // 9 characters
      const paddedName = `  ${validName}  `; // 13 characters total, but 9 after trim
      expect(paddedName.trim().length).toBeLessThanOrEqual(MAX_USERNAME_LENGTH);

      const mockEntity = createMockUserEntity('user-id', validName);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await userService.createUser(paddedName);

      expect(result).toEqual({ id: 'user-id', name: validName });
      expect(mockRepository.create).toHaveBeenCalledWith(validName);
    });

    /**
     * Test that whitespace padding with invalid trimmed length is rejected
     * Validates: Requirements 2.3, 3.2 (trimmed length validation)
     */
    it('should reject a name with whitespace padding that trims to invalid length', async () => {
      const invalidName = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters
      const paddedName = `  ${invalidName}  `; // 35 characters total, 31 after trim
      expect(paddedName.trim().length).toBe(31);

      await expect(userService.createUser(paddedName)).rejects.toThrow(
        'Der Name darf maximal 30 Zeichen lang sein.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser also rejects names with 31 characters
     * Validates: Requirement 2.2 (updateUser validation)
     */
    it('should reject updateUser with 31 characters', async () => {
      const thirtyOneChars = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters

      await expect(userService.updateUser('user-id', thirtyOneChars)).rejects.toThrow(
        'Der Name darf maximal 30 Zeichen lang sein.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateUser accepts names with exactly 30 characters
     * Validates: Requirement 3.3 (exactly 30 characters is valid)
     */
    it('should accept updateUser with exactly 30 characters', async () => {
      const exactlyThirtyChars = 'B'.repeat(MAX_USERNAME_LENGTH); // 30 characters
      expect(exactlyThirtyChars.length).toBe(30);

      const existingUser = createMockUserEntity('user-id', 'Old Name');
      const updatedUser = createMockUserEntity('user-id', exactlyThirtyChars);
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-id', exactlyThirtyChars);

      expect(result).toEqual({ id: 'user-id', name: exactlyThirtyChars });
      expect(mockRepository.update).toHaveBeenCalledWith('user-id', exactlyThirtyChars);
    });
  });
});
