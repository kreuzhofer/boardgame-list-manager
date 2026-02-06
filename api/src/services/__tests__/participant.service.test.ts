import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ParticipantService, MAX_USERNAME_LENGTH } from '../participant.service';
import { ParticipantRepository, ParticipantEntity } from '../../repositories/participant.repository';

/**
 * Unit tests for Participant Service
 * Tests validation logic and error handling
 *
 * Validates: Requirements 3.3, 3.5, 3.6, 3.8, 3.9
 */
describe('ParticipantService', () => {
  let participantService: ParticipantService;
  let mockRepository: jest.Mocked<ParticipantRepository>;
  const eventId = 'event-123';

  // Helper to create a mock ParticipantEntity
  const createMockParticipantEntity = (id: string, name: string): ParticipantEntity => ({
    id,
    eventId,
    name,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    // Create mock repository with all methods
    mockRepository = {
      findAll: jest.fn<(eventId: string) => Promise<ParticipantEntity[]>>(),
      findById: jest.fn<(id: string, eventId: string) => Promise<ParticipantEntity | null>>(),
      findByName: jest.fn<(name: string, eventId: string) => Promise<ParticipantEntity | null>>(),
      create: jest.fn<(name: string, eventId: string) => Promise<ParticipantEntity>>(),
      update: jest.fn<(id: string, name: string) => Promise<ParticipantEntity>>(),
      delete: jest.fn<(id: string) => Promise<void>>(),
    };

    // Create service with mocked repository
    participantService = new ParticipantService(mockRepository);
  });

  describe('getAllParticipants', () => {
    /**
     * Test that getAllParticipants returns users in API format
     * Validates: Requirement 3.1
     */
    it('should return users in API format', async () => {
      const mockEntities: ParticipantEntity[] = [
        createMockParticipantEntity('participant-1', 'Alice'),
        createMockParticipantEntity('participant-2', 'Bob'),
      ];
      mockRepository.findAll.mockResolvedValue(mockEntities);

      const result = await participantService.getAllParticipants(eventId);

      expect(result).toEqual([
        { id: 'participant-1', name: 'Alice' },
        { id: 'participant-2', name: 'Bob' },
      ]);
      expect(mockRepository.findAll).toHaveBeenCalledWith(eventId);
    });

    /**
     * Test that getAllParticipants returns empty array when no users exist
     */
    it('should return empty array when no users exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await participantService.getAllParticipants(eventId);

      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalledWith(eventId);
    });
  });

  describe('getParticipantById', () => {
    /**
     * Test that getParticipantById returns participant when found
     * Validates: Requirement 3.2
     */
    it('should return participant when found', async () => {
      const mockEntity = createMockParticipantEntity('participant-123', 'Test Participant');
      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await participantService.getParticipantById('participant-123', eventId);

      expect(result).toEqual({ id: 'participant-123', name: 'Test Participant' });
      expect(mockRepository.findById).toHaveBeenCalledWith('participant-123', eventId);
    });

    /**
     * Test that getParticipantById throws "Teilnehmer nicht gefunden." when not found
     * Validates: Requirement 3.3
     */
    it('should throw "Teilnehmer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(participantService.getParticipantById('non-existent-id', eventId)).rejects.toThrow(
        'Teilnehmer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id', eventId);
    });
  });

  describe('createParticipant', () => {
    /**
     * Test that createParticipant creates participant successfully
     * Validates: Requirement 3.4
     */
    it('should create participant successfully', async () => {
      const mockEntity = createMockParticipantEntity('new-participant-id', 'New Participant');
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await participantService.createParticipant('New Participant', eventId);

      expect(result).toEqual({ id: 'new-participant-id', name: 'New Participant' });
      expect(mockRepository.findByName).toHaveBeenCalledWith('New Participant', eventId);
      expect(mockRepository.create).toHaveBeenCalledWith('New Participant', eventId);
    });

    /**
     * Test that createParticipant trims whitespace from name
     */
    it('should trim whitespace from name', async () => {
      const mockEntity = createMockParticipantEntity('new-participant-id', 'Trimmed Name');
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      await participantService.createParticipant('  Trimmed Name  ', eventId);

      expect(mockRepository.findByName).toHaveBeenCalledWith('Trimmed Name', eventId);
      expect(mockRepository.create).toHaveBeenCalledWith('Trimmed Name', eventId);
    });

    /**
     * Test that createParticipant throws "Bitte einen Namen eingeben." for empty name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for empty name', async () => {
      await expect(participantService.createParticipant('', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createParticipant throws "Bitte einen Namen eingeben." for whitespace-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for whitespace-only name', async () => {
      await expect(participantService.createParticipant('   ', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createParticipant throws "Bitte einen Namen eingeben." for tab-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for tab-only name', async () => {
      await expect(participantService.createParticipant('\t\t', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });

    /**
     * Test that createParticipant throws "Bitte einen Namen eingeben." for newline-only name
     * Validates: Requirement 3.5
     */
    it('should throw "Bitte einen Namen eingeben." for newline-only name', async () => {
      await expect(participantService.createParticipant('\n\n', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });

    /**
     * Test that createParticipant throws "Ein Teilnehmer mit diesem Namen existiert bereits." for duplicate
     * Validates: Requirement 3.6
     */
    it('should throw "Ein Teilnehmer mit diesem Namen existiert bereits." for duplicate', async () => {
      const existingUser = createMockParticipantEntity('existing-id', 'Existing Participant');
      mockRepository.findByName.mockResolvedValue(existingUser);

      await expect(participantService.createParticipant('Existing Participant', eventId)).rejects.toThrow(
        'Ein Teilnehmer mit diesem Namen existiert bereits.'
      );
      expect(mockRepository.findByName).toHaveBeenCalledWith('Existing Participant', eventId);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that createParticipant handles Prisma unique constraint violation
     * Validates: Requirement 3.6
     */
    it('should handle Prisma unique constraint violation', async () => {
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(participantService.createParticipant('Race Condition Participant', eventId)).rejects.toThrow(
        'Ein Teilnehmer mit diesem Namen existiert bereits.'
      );
    });
  });

  describe('updateParticipant', () => {
    /**
     * Test that updateParticipant updates participant successfully
     * Validates: Requirement 3.7
     */
    it('should update participant successfully', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      const updatedUser = createMockParticipantEntity('participant-id', 'New Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await participantService.updateParticipant('participant-id', 'New Name', eventId);

      expect(result).toEqual({ id: 'participant-id', name: 'New Name' });
      expect(mockRepository.findById).toHaveBeenCalledWith('participant-id', eventId);
      expect(mockRepository.findByName).toHaveBeenCalledWith('New Name', eventId);
      expect(mockRepository.update).toHaveBeenCalledWith('participant-id', 'New Name');
    });

    /**
     * Test that updateParticipant allows updating to the same name (no change)
     */
    it('should allow updating to the same name', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Same Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(existingUser);

      const result = await participantService.updateParticipant('participant-id', 'Same Name', eventId);

      expect(result).toEqual({ id: 'participant-id', name: 'Same Name' });
      // Should not check for duplicate when name is the same
      expect(mockRepository.findByName).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant trims whitespace from name
     */
    it('should trim whitespace from name', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      const updatedUser = createMockParticipantEntity('participant-id', 'Trimmed Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      await participantService.updateParticipant('participant-id', '  Trimmed Name  ', eventId);

      expect(mockRepository.update).toHaveBeenCalledWith('participant-id', 'Trimmed Name');
    });

    /**
     * Test that updateParticipant throws "Bitte einen Namen eingeben." for empty name
     * Validates: Requirement 3.8
     */
    it('should throw "Bitte einen Namen eingeben." for empty name', async () => {
      await expect(participantService.updateParticipant('participant-id', '', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant throws "Bitte einen Namen eingeben." for whitespace-only name
     * Validates: Requirement 3.8
     */
    it('should throw "Bitte einen Namen eingeben." for whitespace-only name', async () => {
      await expect(participantService.updateParticipant('participant-id', '   ', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant throws "Teilnehmer nicht gefunden." when not found
     * Validates: Requirement 3.7 (implicit - participant must exist to update)
     */
    it('should throw "Teilnehmer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(participantService.updateParticipant('non-existent-id', 'New Name', eventId)).rejects.toThrow(
        'Teilnehmer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id', eventId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant throws "Ein Teilnehmer mit diesem Namen existiert bereits." for duplicate
     * Validates: Requirement 3.9
     */
    it('should throw "Ein Teilnehmer mit diesem Namen existiert bereits." for duplicate', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      const otherUser = createMockParticipantEntity('other-id', 'Taken Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(otherUser);

      await expect(participantService.updateParticipant('participant-id', 'Taken Name', eventId)).rejects.toThrow(
        'Ein Teilnehmer mit diesem Namen existiert bereits.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('participant-id', eventId);
      expect(mockRepository.findByName).toHaveBeenCalledWith('Taken Name', eventId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant handles Prisma unique constraint violation
     * Validates: Requirement 3.9
     */
    it('should handle Prisma unique constraint violation', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(participantService.updateParticipant('participant-id', 'New Name', eventId)).rejects.toThrow(
        'Ein Teilnehmer mit diesem Namen existiert bereits.'
      );
    });

    /**
     * Test that updateParticipant handles Prisma record not found error
     */
    it('should handle Prisma record not found error', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockRejectedValue(new Error('Record to update not found'));

      await expect(participantService.updateParticipant('participant-id', 'New Name', eventId)).rejects.toThrow(
        'Teilnehmer nicht gefunden.'
      );
    });
  });

  describe('deleteParticipant', () => {
    /**
     * Test that deleteParticipant deletes participant successfully
     * Validates: Requirement 3.10
     */
    it('should delete participant successfully', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Participant To Delete');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockResolvedValue(undefined);

      await expect(participantService.deleteParticipant('participant-id', eventId)).resolves.toBeUndefined();
      expect(mockRepository.findById).toHaveBeenCalledWith('participant-id', eventId);
      expect(mockRepository.delete).toHaveBeenCalledWith('participant-id');
    });

    /**
     * Test that deleteParticipant throws "Teilnehmer nicht gefunden." when not found
     * Validates: Requirement 3.10 (implicit - participant must exist to delete)
     */
    it('should throw "Teilnehmer nicht gefunden." when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(participantService.deleteParticipant('non-existent-id', eventId)).rejects.toThrow(
        'Teilnehmer nicht gefunden.'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id', eventId);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test that deleteParticipant handles Prisma record not found error
     */
    it('should handle Prisma record not found error', async () => {
      const existingUser = createMockParticipantEntity('participant-id', 'Participant To Delete');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockRejectedValue(new Error('Record to delete does not exist'));

      await expect(participantService.deleteParticipant('participant-id', eventId)).rejects.toThrow(
        'Teilnehmer nicht gefunden.'
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

      const mockEntity = createMockParticipantEntity('participant-id', exactlyThirtyChars);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await participantService.createParticipant(exactlyThirtyChars, eventId);

      expect(result).toEqual({ id: 'participant-id', name: exactlyThirtyChars });
      expect(mockRepository.create).toHaveBeenCalledWith(exactlyThirtyChars, eventId);
    });

    /**
     * Test that a name with 31 characters is rejected (boundary test)
     * Validates: Requirements 2.1, 2.2
     */
    it('should reject a name with 31 characters', async () => {
      const thirtyOneChars = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters
      expect(thirtyOneChars.length).toBe(31);

      await expect(participantService.createParticipant(thirtyOneChars, eventId)).rejects.toThrow(
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

      const mockEntity = createMockParticipantEntity('participant-id', validName);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await participantService.createParticipant(paddedName, eventId);

      expect(result).toEqual({ id: 'participant-id', name: validName });
      expect(mockRepository.create).toHaveBeenCalledWith(validName, eventId);
    });

    /**
     * Test that whitespace padding with invalid trimmed length is rejected
     * Validates: Requirements 2.3, 3.2 (trimmed length validation)
     */
    it('should reject a name with whitespace padding that trims to invalid length', async () => {
      const invalidName = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters
      const paddedName = `  ${invalidName}  `; // 35 characters total, 31 after trim
      expect(paddedName.trim().length).toBe(31);

      await expect(participantService.createParticipant(paddedName, eventId)).rejects.toThrow(
        'Der Name darf maximal 30 Zeichen lang sein.'
      );
      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant also rejects names with 31 characters
     * Validates: Requirement 2.2 (updateParticipant validation)
     */
    it('should reject updateParticipant with 31 characters', async () => {
      const thirtyOneChars = 'A'.repeat(MAX_USERNAME_LENGTH + 1); // 31 characters

      await expect(participantService.updateParticipant('participant-id', thirtyOneChars, eventId)).rejects.toThrow(
        'Der Name darf maximal 30 Zeichen lang sein.'
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test that updateParticipant accepts names with exactly 30 characters
     * Validates: Requirement 3.3 (exactly 30 characters is valid)
     */
    it('should accept updateParticipant with exactly 30 characters', async () => {
      const exactlyThirtyChars = 'B'.repeat(MAX_USERNAME_LENGTH); // 30 characters
      expect(exactlyThirtyChars.length).toBe(30);

      const existingUser = createMockParticipantEntity('participant-id', 'Old Name');
      const updatedUser = createMockParticipantEntity('participant-id', exactlyThirtyChars);
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await participantService.updateParticipant('participant-id', exactlyThirtyChars, eventId);

      expect(result).toEqual({ id: 'participant-id', name: exactlyThirtyChars });
      expect(mockRepository.update).toHaveBeenCalledWith('participant-id', exactlyThirtyChars);
    });
  });
});
