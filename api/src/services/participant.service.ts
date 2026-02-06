import { participantRepository, ParticipantRepository, ParticipantEntity } from '../repositories/participant.repository';
import { activityLogService } from './activityLog.service';

/**
 * Maximum allowed length for participant names (after trimming whitespace)
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */
export const MAX_USERNAME_LENGTH = 30;

/**
 * API response type for Participant
 */
export interface Participant {
  id: string;
  name: string;
}

/**
 * ParticipantService handles business logic for participant management.
 * Transforms database entities to API response format.
 *
 * Requirements: 3.1-3.10
 */
export class ParticipantService {
  constructor(private readonly repository: ParticipantRepository = participantRepository) {}

  /**
   * Transforms a ParticipantEntity from the database to the API Participant format
   */
  private transformParticipant(entity: ParticipantEntity): Participant {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  /**
   * Validates that a name is not empty or whitespace-only and does not exceed maximum length
   * @param name - The name to validate
   * @throws Error with German message if name is empty, whitespace-only, or exceeds max length
   *
   * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5, 3.8
   */
  private validateName(name: string): string {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Bitte einen Namen eingeben.');
    }
    if (trimmedName.length > MAX_USERNAME_LENGTH) {
      throw new Error('Der Name darf maximal 30 Zeichen lang sein.');
    }
    return trimmedName;
  }

  /**
   * Get all participants sorted by name
   * @returns Array of all participants in API format
   *
   * Requirement 3.1
   */
  async getAllParticipants(eventId: string): Promise<Participant[]> {
    const entities = await this.repository.findAll(eventId);
    return entities.map((entity) => this.transformParticipant(entity));
  }

  /**
   * Get a single participant by ID
   * @param id - The participant's unique identifier
   * @returns The participant in API format
   * @throws Error with German message if participant not found
   *
   * Requirements: 3.2, 3.3
   */
  async getParticipantById(id: string, eventId: string): Promise<Participant> {
    const entity = await this.repository.findById(id, eventId);
    if (!entity) {
      throw new Error('Teilnehmer nicht gefunden.');
    }
    return this.transformParticipant(entity);
  }

  /**
   * Create a new participant
   * @param name - The participant's name
   * @returns The created participant in API format
   * @throws Error with German message if name is empty or already exists
   *
   * Requirements: 3.4, 3.5, 3.6
   */
  async createParticipant(name: string, eventId: string): Promise<Participant> {
    // Validate name
    const trimmedName = this.validateName(name);

    // Check for duplicate name
    const existingParticipant = await this.repository.findByName(trimmedName, eventId);
    if (existingParticipant) {
      throw new Error('Ein Teilnehmer mit diesem Namen existiert bereits.');
    }

    try {
      const entity = await this.repository.create(trimmedName, eventId);
      await activityLogService.logEvent({
        actorParticipantId: entity.id,
        eventType: 'user_created',
        eventId,
      });
      return this.transformParticipant(entity);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('Ein Teilnehmer mit diesem Namen existiert bereits.');
      }
      throw error;
    }
  }

  /**
   * Update a participant's name
   * @param id - The participant's unique identifier
   * @param name - The new name for the participant
   * @returns The updated participant in API format
   * @throws Error with German message if participant not found, name is empty, or name already exists
   *
   * Requirements: 3.7, 3.8, 3.9
   */
  async updateParticipant(id: string, name: string, eventId: string): Promise<Participant> {
    // Validate name
    const trimmedName = this.validateName(name);

    // Check if participant exists
    const existingParticipant = await this.repository.findById(id, eventId);
    if (!existingParticipant) {
      throw new Error('Teilnehmer nicht gefunden.');
    }

    // Check for duplicate name (only if name is different)
    if (existingParticipant.name !== trimmedName) {
      const participantWithSameName = await this.repository.findByName(trimmedName, eventId);
      if (participantWithSameName) {
        throw new Error('Ein Teilnehmer mit diesem Namen existiert bereits.');
      }
    }

    try {
      const entity = await this.repository.update(id, trimmedName);
      return this.transformParticipant(entity);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('Ein Teilnehmer mit diesem Namen existiert bereits.');
      }
      // Handle Prisma record not found
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new Error('Teilnehmer nicht gefunden.');
      }
      throw error;
    }
  }

  /**
   * Delete a participant by ID
   * @param id - The participant's unique identifier
   * @throws Error with German message if participant not found
   *
   * Requirement 3.10
   */
  async deleteParticipant(id: string, eventId: string): Promise<void> {
    // Check if participant exists
    const existingParticipant = await this.repository.findById(id, eventId);
    if (!existingParticipant) {
      throw new Error('Teilnehmer nicht gefunden.');
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      // Handle Prisma record not found
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        throw new Error('Teilnehmer nicht gefunden.');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const participantService = new ParticipantService();
