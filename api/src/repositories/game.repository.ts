import { prisma } from '../db/prisma';
import type { GameEntity, CreateGameDto } from '../types';

/**
 * Repository for game-related database operations.
 * Uses Prisma client to interact with the PostgreSQL database.
 * 
 * Requirements: 10.3, 10.4, 4.1-4.5
 */
export class GameRepository {
  /**
   * Include clause for fetching related players and bringers with user data
   * Requirements: 4.6 - Include full user object for each player and bringer
   * Requirements: 2.3 - Include owner relation
   */
  private readonly includeRelations = {
    owner: true,
    players: {
      include: {
        user: true,
      },
    },
    bringers: {
      include: {
        user: true,
      },
    },
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
    // Cast alternateNames from Json to string[]
    return games.map(game => ({
      ...game,
      alternateNames: (game.alternateNames as string[]) ?? [],
    })) as GameEntity[];
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
    if (!game) return null;
    // Cast alternateNames from Json to string[]
    return {
      ...game,
      alternateNames: (game.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Create a new game with optional player and bringer entries
   * @param data - Game creation data including name, userId, isBringing, and isPlaying flags
   * @returns The created game with related data
   * Requirements: 4.1 - Accept userId instead of userName
   * Requirements: 2.2 - Set ownerId to the creating user's ID
   * Requirements: 4.3, 4.4 - Store bggId and yearPublished if provided
   * Feature: 014-alternate-names-search - Store alternate name data
   */
  async create(data: CreateGameDto): Promise<GameEntity> {
    const { name, userId, isBringing, isPlaying, isPrototype, bggId, yearPublished, bggRating, addedAsAlternateName, alternateNames } = data;

    // Create game with the user as owner, and optionally as player and/or bringer
    const game = await prisma.game.create({
      data: {
        name,
        ownerId: userId,
        bggId: bggId ?? null,
        yearPublished: yearPublished ?? null,
        bggRating: bggRating ?? null,
        addedAsAlternateName: addedAsAlternateName ?? null,
        alternateNames: alternateNames ?? [],
        isPrototype: isPrototype ?? false,
        ...(isPlaying && {
          players: {
            create: {
              userId,
            },
          },
        }),
        ...(isBringing && {
          bringers: {
            create: {
              userId,
            },
          },
        }),
      },
      include: this.includeRelations,
    });

    return {
      ...game,
      alternateNames: (game.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Add a player to a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to add as a player
   * @returns The updated game with related data
   * @throws Error if game not found or user already a player
   * Requirements: 4.2 - Accept userId instead of userName
   */
  async addPlayer(gameId: string, userId: string): Promise<GameEntity> {
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
        userId,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return {
      ...game!,
      alternateNames: (game!.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Remove a player from a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to remove as a player
   * @returns The updated game with related data
   * @throws Error if game not found or user not a player
   * Requirements: 4.4 - Use userId for removal
   */
  async removePlayer(gameId: string, userId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Delete the player entry using the unique constraint
    const deleteResult = await prisma.player.delete({
      where: {
        gameId_userId: {
          gameId,
          userId,
        },
      },
    }).catch(() => null);

    if (!deleteResult) {
      throw new Error('User is not a player of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return {
      ...game!,
      alternateNames: (game!.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Add a bringer to a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to add as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or user already a bringer
   * Requirements: 4.3 - Accept userId instead of userName
   */
  async addBringer(gameId: string, userId: string): Promise<GameEntity> {
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
        userId,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return {
      ...game!,
      alternateNames: (game!.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Remove a bringer from a game
   * @param gameId - The game's unique identifier
   * @param userId - The user's ID to remove as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or user not a bringer
   * Requirements: 4.5 - Use userId for removal
   */
  async removeBringer(gameId: string, userId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Delete the bringer entry using the unique constraint
    const deleteResult = await prisma.bringer.delete({
      where: {
        gameId_userId: {
          gameId,
          userId,
        },
      },
    }).catch(() => null);

    if (!deleteResult) {
      throw new Error('User is not a bringer of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return {
      ...game!,
      alternateNames: (game!.alternateNames as string[]) ?? [],
    } as GameEntity;
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
    if (!game) return null;
    // Cast alternateNames from Json to string[]
    return {
      ...game,
      alternateNames: (game.alternateNames as string[]) ?? [],
    } as GameEntity;
  }

  /**
   * Delete a game by ID
   * @param id - The game's unique identifier
   * @returns true if deleted, false if not found
   * Requirements: 3.5 - Remove the game from the database
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.game.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance for convenience
export const gameRepository = new GameRepository();
