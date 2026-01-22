import { gameRepository, GameRepository } from '../repositories';
import type { Game, GameEntity, Player, Bringer } from '../types';

/**
 * GameService handles business logic for game management.
 * Transforms database entities to API response format and derives game status.
 * 
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export class GameService {
  constructor(private readonly repository: GameRepository = gameRepository) {}

  /**
   * Transforms a PlayerEntity to the API Player format
   */
  private transformPlayer(player: { id: string; userName: string; addedAt: Date }): Player {
    return {
      id: player.id,
      name: player.userName,
      addedAt: player.addedAt,
    };
  }

  /**
   * Transforms a BringerEntity to the API Bringer format
   */
  private transformBringer(bringer: { id: string; userName: string; addedAt: Date }): Bringer {
    return {
      id: bringer.id,
      name: bringer.userName,
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
   */
  private transformGame(entity: GameEntity): Game {
    return {
      id: entity.id,
      name: entity.name,
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
   * @param userName - The user creating the game
   * @param isBringing - Whether the user is bringing the game
   * @returns The created game in API format
   * @throws Error with German message if game name is empty or already exists
   * 
   * Requirements: 3.1, 3.3, 3.4
   */
  async createGame(name: string, userName: string, isBringing: boolean): Promise<Game> {
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
        userName,
        isBringing,
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
   * @param userName - The user's name to add as a player
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user already a player
   * 
   * Requirements: 3.5
   */
  async addPlayer(gameId: string, userName: string): Promise<Game> {
    try {
      const entity = await this.repository.addPlayer(gameId, userName);
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
   * @param userName - The user's name to remove as a player
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user not a player
   * 
   * Requirements: 3.5
   */
  async removePlayer(gameId: string, userName: string): Promise<Game> {
    try {
      const entity = await this.repository.removePlayer(gameId, userName);
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
   * @param userName - The user's name to add as a bringer
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user already a bringer
   * 
   * Requirements: 3.6, 3.7
   */
  async addBringer(gameId: string, userName: string): Promise<Game> {
    try {
      const entity = await this.repository.addBringer(gameId, userName);
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
   * @param userName - The user's name to remove as a bringer
   * @returns The updated game in API format
   * @throws Error with German message if game not found or user not a bringer
   * 
   * Requirements: 3.6
   */
  async removeBringer(gameId: string, userName: string): Promise<Game> {
    try {
      const entity = await this.repository.removeBringer(gameId, userName);
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
}

// Export singleton instance
export const gameService = new GameService();
