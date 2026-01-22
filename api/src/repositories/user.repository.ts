import { prisma } from '../db/prisma';

/**
 * Entity type for User from database
 * Note: Full type definitions will be added in task 4.1
 */
export interface UserEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for user-related database operations.
 * Uses Prisma client to interact with the PostgreSQL database.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.7, 3.10
 */
export class UserRepository {
  /**
   * Get all users sorted by name ascending
   * @returns Array of all users
   *
   * Requirement 3.1: GET /api/users returns all users sorted by name
   */
  async findAll(): Promise<UserEntity[]> {
    const users = await prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return users;
  }

  /**
   * Get a single user by ID
   * @param id - The user's unique identifier
   * @returns The user, or null if not found
   *
   * Requirement 3.2: GET /api/users/:id returns the user with that ID
   */
  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  /**
   * Find a user by their name
   * @param name - The user's name
   * @returns The user, or null if not found
   */
  async findByName(name: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { name },
    });
    return user;
  }

  /**
   * Create a new user
   * @param name - The user's name
   * @returns The created user
   *
   * Requirement 3.4: POST /api/users creates a new user
   */
  async create(name: string): Promise<UserEntity> {
    const user = await prisma.user.create({
      data: {
        name,
      },
    });
    return user;
  }

  /**
   * Update a user's name
   * @param id - The user's unique identifier
   * @param name - The new name for the user
   * @returns The updated user
   *
   * Requirement 3.7: PATCH /api/users/:id updates the user's name
   */
  async update(id: string, name: string): Promise<UserEntity> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
      },
    });
    return user;
  }

  /**
   * Delete a user by ID
   * @param id - The user's unique identifier
   *
   * Requirement 3.10: DELETE /api/users/:id deletes the user
   * Note: Cascade delete of Player/Bringer records is handled by database constraints
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}

// Export a singleton instance for convenience
export const userRepository = new UserRepository();
