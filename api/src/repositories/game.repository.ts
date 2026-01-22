import { prisma } from '../db/prisma';
import type { GameEntity, CreateGameDto } from '../types';

/**
 * Repository for game-related database operations.
 * Uses Prisma client to interact with the PostgreSQL database.
 * 
 * Requirements: 10.3, 10.4
 */
export class GameRepository {
  /**
   * Include clause for fetching related players and bringers
   */
  private readonly includeRelations = {
    players: true,
    bringers: true,
  };

  /**
   * Get all games with their players and bringers
   * @returns Array of all games with related data
   */
  async findAll(): Promise<GameEntity[]> {
    const games = await prisma.game.findMany({
      include: this.includeRelations,
      orderBy: {
        name: 'asc',
      },
    });
    return games;
  }

  /**
   * Get a single game by ID with players and bringers
   * @param id - The game's unique identifier
   * @returns The game with related data, or null if not found
   */
  async findById(id: string): Promise<GameEntity | null> {
    const game = await prisma.game.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    return game;
  }

  /**
   * Create a new game with optional player and bringer entries
   * @param data - Game creation data including name, userName, and isBringing flag
   * @returns The created game with related data
   */
  async create(data: CreateGameDto): Promise<GameEntity> {
    const { name, userName, isBringing } = data;

    // Create game with the user as a player, and optionally as a bringer
    const game = await prisma.game.create({
      data: {
        name,
        players: {
          create: {
            userName,
          },
        },
        ...(isBringing && {
          bringers: {
            create: {
              userName,
            },
          },
        }),
      },
      include: this.includeRelations,
    });

    return game;
  }

  /**
   * Add a player to a game
   * @param gameId - The game's unique identifier
   * @param userName - The user's name to add as a player
   * @returns The updated game with related data
   * @throws Error if game not found or user already a player
   */
  async addPlayer(gameId: string, userName: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Add the player (will throw if duplicate due to unique constraint)
    await prisma.player.create({
      data: {
        gameId,
        userName,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return game!;
  }

  /**
   * Remove a player from a game
   * @param gameId - The game's unique identifier
   * @param userName - The user's name to remove as a player
   * @returns The updated game with related data
   * @throws Error if game not found or user not a player
   */
  async removePlayer(gameId: string, userName: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Find and delete the player entry
    const deleteResult = await prisma.player.deleteMany({
      where: {
        gameId,
        userName,
      },
    });

    if (deleteResult.count === 0) {
      throw new Error('User is not a player of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return game!;
  }

  /**
   * Add a bringer to a game
   * @param gameId - The game's unique identifier
   * @param userName - The user's name to add as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or user already a bringer
   */
  async addBringer(gameId: string, userName: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Add the bringer (will throw if duplicate due to unique constraint)
    await prisma.bringer.create({
      data: {
        gameId,
        userName,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return game!;
  }

  /**
   * Remove a bringer from a game
   * @param gameId - The game's unique identifier
   * @param userName - The user's name to remove as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or user not a bringer
   */
  async removeBringer(gameId: string, userName: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Find and delete the bringer entry
    const deleteResult = await prisma.bringer.deleteMany({
      where: {
        gameId,
        userName,
      },
    });

    if (deleteResult.count === 0) {
      throw new Error('User is not a bringer of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return game!;
  }

  /**
   * Find a game by its name
   * @param name - The game's name
   * @returns The game with related data, or null if not found
   */
  async findByName(name: string): Promise<GameEntity | null> {
    const game = await prisma.game.findUnique({
      where: { name },
      include: this.includeRelations,
    });
    return game;
  }
}

// Export a singleton instance for convenience
export const gameRepository = new GameRepository();
