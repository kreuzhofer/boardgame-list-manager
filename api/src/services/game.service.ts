import { gameRepository, GameRepository } from '../repositories';
import type { Game, GameEntity, Player, Bringer, PlayerEntity, BringerEntity } from '../types';

/**
 * GameService handles business logic for game management.
 * Transforms database entities to API response format and derives game status.
 * 
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1-4.6
 */
export class GameService {
  constructor(private readonly repository: GameRepository = gameRepository) {}

  /**
   * Transforms a PlayerEntity to the API Player format
   * Requirements: 4.6 - Include full user object (id and name) for each player
   */
  private transformPlayer(player: PlayerEntity): Player {
    return {
      id: player.id,
      user: {
        id: player.user.id,
        name: player.user.name,
      },
      addedAt: player.addedAt,
    };
  }

  /**
   * Transforms a BringerEntity to the API Bringer format
   * Requirements: 4.6 - Include full user object (id and name) for each bringer
   */
  private transformBringer(bringer: BringerEntity): Bringer {
    return {
      id: bringer.id,
      user: {
        id: bringer.user.id,
        name: bringer.user.name,
      },
      addedAt: bringer.addedAt,
    };
  }

  /**
   * Derives game status based on bringers count.
   * - 'wunsch' if no bringers (game is requested but not available)
   * - 'verfuegbar' if has at least one bringer
   */
  private deriveStatus(bringersCount: number): 'wunsch' | 'verfuegbar' {
    return bringersCount === 0 ? 'wunsch' : 'verfuegbar';
  }

  /**
   * Transforms a GameEntity from the database to the API Game format
   * Requirements: 2.3, 2.4 - Include owner information
   */
  private transformGame(entity: GameEntity): Game {
    return {
      id: entity.id,
      name: entity.name,
      owner: entity.owner ? { id: entity.owner.id, name: entity.owner.name } : null,
      players: entity.players.map((p) => this.transformPlayer(p)),
      bringers: entity.bringers.map((b) => this.transformBringer(b)),
      status: this.deriveStatus(entity.bringers.length),
      createdAt: entity.createdAt,
    };
  }

  /**
   * Get all games with players and bringers
   * @returns Array of all games in API format
   */
  async getAllGames(): Promise<Game[]> {
    const entities = await this.repository.findAll();
    return entities.map((entity) => this.transformGame(entity));
  }

  /**
   * Create a new game
   * @param name - The game name
   * @param userId - The user ID of the user creating the game
   * @param isBringing - Whether the user is bringing the game
   * @param isPlaying - Whether the user wants to play the game
   * @returns The created game in API format
   * @throws Error with German message if game name is empty or already exists
   * 
   * Requirements: 3.1, 3.3, 3.4, 4.1
   */
  async createGame(name: string, userId: string, isBringing: boolean, isPlaying: boolean): Promise<Game> {
    // Validate game name
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Bitte einen Spielnamen eingeben.');
    }

    // Check for duplicate game name
    const existingGame = await this.repository.findByName(trimmedName);
    if (existingGame) {
      throw new Error('Ein Spiel mit diesem Namen existiert bereits.');
    }

    try {
      const entity = await this.repository.create({
        name: trimmedName,
        userId,
        isBringing,
        isPlaying,
      });
      return this.transformGame(entity);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('Ein Spiel mit diesem Namen existiert bereits.');
      }
      throw error;
    }
  }

  /**
   * Add a player to a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to add as a player
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user already a player
   * 
   * Requirements: 3.5, 4.2
   */
  async addPlayer(gameId: string, userId: string): Promise<Game> {
    try {
      const entity = await this.repository.addPlayer(gameId, userId);
      return this.transformGame(entity);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          throw new Error('Spiel nicht gefunden.');
        }
        // Handle Prisma unique constraint violation
        if (error.message.includes('Unique constraint')) {
          throw new Error('Du bist bereits als Mitspieler eingetragen.');
        }
      }
      throw error;
    }
  }

  /**
   * Remove a player from a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to remove as a player
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user not a player
   * 
   * Requirements: 3.5, 4.4
   */
  async removePlayer(gameId: string, userId: string): Promise<Game> {
    try {
      const entity = await this.repository.removePlayer(gameId, userId);
      return this.transformGame(entity);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          throw new Error('Spiel nicht gefunden.');
        }
        if (error.message === 'User is not a player of this game') {
          throw new Error('Du bist nicht in dieser Liste eingetragen.');
        }
      }
      throw error;
    }
  }

  /**
   * Add a bringer to a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to add as a bringer
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user already a bringer
   * 
   * Requirements: 3.6, 3.7, 4.3
   */
  async addBringer(gameId: string, userId: string): Promise<Game> {
    try {
      const entity = await this.repository.addBringer(gameId, userId);
      return this.transformGame(entity);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          throw new Error('Spiel nicht gefunden.');
        }
        // Handle Prisma unique constraint violation
        if (error.message.includes('Unique constraint')) {
          throw new Error('Du bringst dieses Spiel bereits mit.');
        }
      }
      throw error;
    }
  }

  /**
   * Remove a bringer from a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to remove as a bringer
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user not a bringer
   * 
   * Requirements: 3.6, 4.5
   */
  async removeBringer(gameId: string, userId: string): Promise<Game> {
    try {
      const entity = await this.repository.removeBringer(gameId, userId);
      return this.transformGame(entity);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          throw new Error('Spiel nicht gefunden.');
        }
        if (error.message === 'User is not a bringer of this game') {
          throw new Error('Du bist nicht in dieser Liste eingetragen.');
        }
      }
      throw error;
    }
  }

  /**
   * Delete a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID requesting deletion (must be owner)
   * @throws Error with German message if:
   *   - Game not found (404)
   *   - User is not the owner (403)
   *   - Game has players or bringers (400)
   * 
   * Requirements: 3.2, 3.5, 3.6, 3.7
   */
  async deleteGame(gameId: string, userId: string): Promise<void> {
    // Find the game
    const entity = await this.repository.findById(gameId);
    
    if (!entity) {
      const error = new Error('Spiel nicht gefunden.');
      (error as Error & { code: string }).code = 'GAME_NOT_FOUND';
      throw error;
    }

    // Check ownership - user must be the owner
    if (entity.ownerId !== userId) {
      const error = new Error('Du bist nicht berechtigt, dieses Spiel zu löschen.');
      (error as Error & { code: string }).code = 'FORBIDDEN';
      throw error;
    }

    // Check if game has players or bringers
    if (entity.players.length > 0 || entity.bringers.length > 0) {
      const error = new Error('Das Spiel kann nicht gelöscht werden, solange noch Mitspieler oder Bringer eingetragen sind.');
      (error as Error & { code: string }).code = 'GAME_NOT_EMPTY';
      throw error;
    }

    // Delete the game
    await this.repository.delete(gameId);
  }
}

// Export singleton instance
export const gameService = new GameService();
