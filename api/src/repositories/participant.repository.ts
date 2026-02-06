import { prisma } from '../db/prisma';

/**
 * Entity type for Participant from database
 * Note: Full type definitions will be added in task 4.1
 */
export interface ParticipantEntity {
  id: string;
  eventId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for participant-related database operations.
 * Uses Prisma client to interact with the PostgreSQL database.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.7, 3.10
 */
export class ParticipantRepository {
  /**
   * Get all participants sorted by name ascending
   * @returns Array of all participants
   *
   * Requirement 3.1: GET /api/participants returns all participants sorted by name
   */
  async findAll(eventId: string): Promise<ParticipantEntity[]> {
    const participants = await prisma.user.findMany({
      where: { eventId },
      orderBy: {
        name: 'asc',
      },
    });
    return participants;
  }

  /**
   * Get a single participant by ID
   * @param id - The participant's unique identifier
   * @returns The participant, or null if not found
   *
   * Requirement 3.2: GET /api/participants/:id returns the participant with that ID
   */
  async findById(id: string, eventId: string): Promise<ParticipantEntity | null> {
    const participant = await prisma.user.findUnique({
      where: { id },
    });
    if (!participant || participant.eventId !== eventId) {
      return null;
    }
    return participant;
  }

  /**
   * Find a participant by their name
   * @param name - The participant's name
   * @returns The participant, or null if not found
   */
  async findByName(name: string, eventId: string): Promise<ParticipantEntity | null> {
    const participant = await prisma.user.findUnique({
      where: {
        eventId_name: {
          eventId,
          name,
        },
      },
    });
    return participant;
  }

  /**
   * Create a new participant
   * @param name - The participant's name
   * @returns The created participant
   *
   * Requirement 3.4: POST /api/participants creates a new participant
   */
  async create(name: string, eventId: string): Promise<ParticipantEntity> {
    const participant = await prisma.user.create({
      data: {
        name,
        eventId,
      },
    });
    return participant;
  }

  /**
   * Update a participant's name
   * @param id - The participant's unique identifier
   * @param name - The new name for the participant
   * @returns The updated participant
   *
   * Requirement 3.7: PATCH /api/participants/:id updates the participant's name
   */
  async update(id: string, name: string): Promise<ParticipantEntity> {
    const participant = await prisma.user.update({
      where: { id },
      data: {
        name,
      },
    });
    return participant;
  }

  /**
   * Delete a participant by ID
   * @param id - The participant's unique identifier
   *
   * Requirement 3.10: DELETE /api/participants/:id deletes the participant
   * Note: Cascade delete of Player/Bringer records is handled by database constraints
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}

// Export a singleton instance for convenience
export const participantRepository = new ParticipantRepository();
