import { userRepository, UserRepository, UserEntity } from '../repositories/user.repository';

/**
 * Maximum allowed length for usernames (after trimming whitespace)
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */
export const MAX_USERNAME_LENGTH = 30;

/**
 * API response type for User
 */
export interface User {
  id: string;
  name: string;
}

/**
 * UserService handles business logic for user management.
 * Transforms database entities to API response format.
 *
 * Requirements: 3.1-3.10
 */
export class UserService {
  constructor(private readonly repository: UserRepository = userRepository) {}

  /**
   * Transforms a UserEntity from the database to the API User format
   */
  private transformUser(entity: UserEntity): User {
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
   * Get all users sorted by name
   * @returns Array of all users in API format
   *
   * Requirement 3.1
   */
  async getAllUsers(): Promise<User[]> {
    const entities = await this.repository.findAll();
    return entities.map((entity) => this.transformUser(entity));
  }

  /**
   * Get a single user by ID
   * @param id - The user's unique identifier
   * @returns The user in API format
   * @throws Error with German message if user not found
   *
   * Requirements: 3.2, 3.3
   */
  async getUserById(id: string): Promise<User> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new Error('Benutzer nicht gefunden.');
    }
    return this.transformUser(entity);
  }

  /**
   * Create a new user
   * @param name - The user's name
   * @returns The created user in API format
   * @throws Error with German message if name is empty or already exists
   *
   * Requirements: 3.4, 3.5, 3.6
   */
  async createUser(name: string): Promise<User> {
    // Validate name
    const trimmedName = this.validateName(name);

    // Check for duplicate name
    const existingUser = await this.repository.findByName(trimmedName);
    if (existingUser) {
      throw new Error('Ein Benutzer mit diesem Namen existiert bereits.');
    }

    try {
      const entity = await this.repository.create(trimmedName);
      return this.transformUser(entity);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('Ein Benutzer mit diesem Namen existiert bereits.');
      }
      throw error;
    }
  }

  /**
   * Update a user's name
   * @param id - The user's unique identifier
   * @param name - The new name for the user
   * @returns The updated user in API format
   * @throws Error with German message if user not found, name is empty, or name already exists
   *
   * Requirements: 3.7, 3.8, 3.9
   */
  async updateUser(id: string, name: string): Promise<User> {
    // Validate name
    const trimmedName = this.validateName(name);

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('Benutzer nicht gefunden.');
    }

    // Check for duplicate name (only if name is different)
    if (existingUser.name !== trimmedName) {
      const userWithSameName = await this.repository.findByName(trimmedName);
      if (userWithSameName) {
        throw new Error('Ein Benutzer mit diesem Namen existiert bereits.');
      }
    }

    try {
      const entity = await this.repository.update(id, trimmedName);
      return this.transformUser(entity);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('Ein Benutzer mit diesem Namen existiert bereits.');
      }
      // Handle Prisma record not found
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new Error('Benutzer nicht gefunden.');
      }
      throw error;
    }
  }

  /**
   * Delete a user by ID
   * @param id - The user's unique identifier
   * @throws Error with German message if user not found
   *
   * Requirement 3.10
   */
  async deleteUser(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('Benutzer nicht gefunden.');
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      // Handle Prisma record not found
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        throw new Error('Benutzer nicht gefunden.');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();
