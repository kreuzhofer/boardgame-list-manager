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
   * Include clause for fetching related players and bringers with participant data
   * Requirements: 4.6 - Include full participant object for each player and bringer
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

  private mapGameEntity(game: {
    id: string;
    eventId: string | null;
    name: string;
    ownerId: string | null;
    bggId: number | null;
    yearPublished: number | null;
    bggRating: number | null;
    addedAsAlternateName: string | null;
    alternateNames: unknown;
    isPrototype: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner: GameEntity['owner'];
    players: Array<{
      id: string;
      gameId: string;
      userId: string;
      addedAt: Date;
      user: GameEntity['players'][number]['participant'];
    }>;
    bringers: Array<{
      id: string;
      gameId: string;
      userId: string;
      addedAt: Date;
      user: GameEntity['bringers'][number]['participant'];
    }>;
  }): GameEntity {
    return {
      ...game,
      alternateNames: (game.alternateNames as string[]) ?? [],
      players: game.players.map((player) => ({
        id: player.id,
        gameId: player.gameId,
        participantId: player.userId,
        addedAt: player.addedAt,
        participant: player.user,
      })),
      bringers: game.bringers.map((bringer) => ({
        id: bringer.id,
        gameId: bringer.gameId,
        participantId: bringer.userId,
        addedAt: bringer.addedAt,
        participant: bringer.user,
      })),
    };
  }

  /**
   * Get all games with their players and bringers
   * @returns Array of all games with related data
   */
  async findAll(eventId: string): Promise<GameEntity[]> {
    const games = await prisma.game.findMany({
      where: { eventId },
      include: this.includeRelations,
      orderBy: {
        name: 'asc',
      },
    });
    return games.map((game) => this.mapGameEntity(game));
  }

  /**
   * Get a single game by ID with players and bringers
   * @param id - The game's unique identifier
   * @returns The game with related data, or null if not found
   */
  async findById(id: string, eventId: string): Promise<GameEntity | null> {
    const game = await prisma.game.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!game || game.eventId !== eventId) return null;
    return this.mapGameEntity(game);
  }

  /**
   * Create a new game with optional player and bringer entries
   * @param data - Game creation data including name, participantId, isBringing, and isPlaying flags
   * @returns The created game with related data
   * Requirements: 4.1 - Accept participantId instead of participantName
   * Requirements: 2.2 - Set ownerId to the creating participant's ID
   * Requirements: 4.3, 4.4 - Store bggId and yearPublished if provided
   * Feature: 014-alternate-names-search - Store alternate name data
   */
  async create(data: CreateGameDto): Promise<GameEntity> {
    const {
      eventId,
      name,
      participantId,
      isBringing,
      isPlaying,
      isPrototype,
      bggId,
      yearPublished,
      bggRating,
      addedAsAlternateName,
      alternateNames,
    } = data;

    // Create game with the participant as owner, and optionally as player and/or bringer
    const game = await prisma.game.create({
      data: {
        eventId,
        name,
        ownerId: participantId,
        bggId: bggId ?? null,
        yearPublished: yearPublished ?? null,
        bggRating: bggRating ?? null,
        addedAsAlternateName: addedAsAlternateName ?? null,
        alternateNames: alternateNames ?? [],
        isPrototype: isPrototype ?? false,
        ...(isPlaying && {
          players: {
            create: {
              userId: participantId,
            },
          },
        }),
        ...(isBringing && {
          bringers: {
            create: {
              userId: participantId,
            },
          },
        }),
      },
      include: this.includeRelations,
    });

    return this.mapGameEntity(game);
  }

  /**
   * Add a player to a game
   * @param gameId - The game's unique identifier
   * @param participantId - The participant's ID to add as a player
   * @returns The updated game with related data
   * @throws Error if game not found or participant already a player
   * Requirements: 4.2 - Accept participantId instead of participantName
   */
  async addPlayer(gameId: string, participantId: string, eventId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame || existingGame.eventId !== eventId) {
      throw new Error('Game not found');
    }

    // Add the player (will throw if duplicate due to unique constraint)
    await prisma.player.create({
      data: {
        gameId,
        userId: participantId,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return this.mapGameEntity(game!);
  }

  /**
   * Remove a player from a game
   * @param gameId - The game's unique identifier
   * @param participantId - The participant's ID to remove as a player
   * @returns The updated game with related data
   * @throws Error if game not found or participant not a player
   * Requirements: 4.4 - Use participantId for removal
   */
  async removePlayer(gameId: string, participantId: string, eventId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame || existingGame.eventId !== eventId) {
      throw new Error('Game not found');
    }

    // Delete the player entry using the unique constraint
    const deleteResult = await prisma.player.delete({
      where: {
        gameId_userId: {
          gameId,
          userId: participantId,
        },
      },
    }).catch(() => null);

    if (!deleteResult) {
      throw new Error('Participant is not a player of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return this.mapGameEntity(game!);
  }

  /**
   * Add a bringer to a game
   * @param gameId - The game's unique identifier
   * @param participantId - The participant's ID to add as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or participant already a bringer
   * Requirements: 4.3 - Accept participantId instead of participantName
   */
  async addBringer(gameId: string, participantId: string, eventId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame || existingGame.eventId !== eventId) {
      throw new Error('Game not found');
    }

    // Add the bringer (will throw if duplicate due to unique constraint)
    await prisma.bringer.create({
      data: {
        gameId,
        userId: participantId,
      },
    });

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return this.mapGameEntity(game!);
  }

  /**
   * Remove a bringer from a game
   * @param gameId - The game's unique identifier
   * @param participantId - The participant's ID to remove as a bringer
   * @returns The updated game with related data
   * @throws Error if game not found or participant not a bringer
   * Requirements: 4.5 - Use participantId for removal
   */
  async removeBringer(gameId: string, participantId: string, eventId: string): Promise<GameEntity> {
    // First verify the game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame || existingGame.eventId !== eventId) {
      throw new Error('Game not found');
    }

    // Delete the bringer entry using the unique constraint
    const deleteResult = await prisma.bringer.delete({
      where: {
        gameId_userId: {
          gameId,
          userId: participantId,
        },
      },
    }).catch(() => null);

    if (!deleteResult) {
      throw new Error('Participant is not a bringer of this game');
    }

    // Return the updated game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: this.includeRelations,
    });

    return this.mapGameEntity(game!);
  }

  /**
   * Find a game by its name
   * @param name - The game's name
   * @returns The game with related data, or null if not found
   */
  async findByName(name: string, eventId: string): Promise<GameEntity | null> {
    const game = await prisma.game.findUnique({
      where: {
        eventId_name: {
          eventId,
          name,
        },
      },
      include: this.includeRelations,
    });
    if (!game) return null;
    return this.mapGameEntity(game);
  }

  /**
   * Delete a game by ID
   * @param id - The game's unique identifier
   * @returns true if deleted, false if not found
   * Requirements: 3.5 - Remove the game from the database
   */
  async delete(id: string, eventId: string): Promise<boolean> {
    try {
      const existingGame = await prisma.game.findUnique({
        where: { id },
        select: { eventId: true },
      });
      if (!existingGame || existingGame.eventId !== eventId) {
        return false;
      }
      await prisma.game.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update the prototype status of a game
   * @param gameId - The game's unique identifier
   * @param isPrototype - The new prototype status
   * @returns The updated game entity
   * Requirements: 022-prototype-toggle 1.1
   */
  async updatePrototype(gameId: string, isPrototype: boolean, eventId: string): Promise<GameEntity> {
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
      select: { eventId: true },
    });

    if (!existingGame || existingGame.eventId !== eventId) {
      throw new Error('Game not found');
    }

    const game = await prisma.game.update({
      where: { id: gameId },
      data: { isPrototype },
      include: this.includeRelations,
    });

    return {
      ...this.mapGameEntity(game),
    };
  }

  /**
   * Get all hidden game IDs for a participant
   * @param participantId - The participant's ID
   * @returns Set of game IDs hidden by the participant
   */
  async findHiddenGameIdsByParticipant(participantId: string): Promise<Set<string>> {
    const hidden = await prisma.hiddenGame.findMany({
      where: { userId: participantId },
      select: { gameId: true },
    });
    return new Set(hidden.map((entry) => entry.gameId));
  }

  /**
   * Check if a game is hidden for a participant
   * @param gameId - The game's ID
   * @param participantId - The participant's ID
   * @returns true if hidden, false otherwise
   */
  async isGameHiddenForParticipant(gameId: string, participantId: string): Promise<boolean> {
    const hidden = await prisma.hiddenGame.findUnique({
      where: {
        gameId_userId: {
          gameId,
          userId: participantId,
        },
      },
      select: { id: true },
    });
    return Boolean(hidden);
  }

  /**
   * Hide a game for a participant
   * @param gameId - The game's ID
   * @param participantId - The participant's ID
   */
  async hideGame(gameId: string, participantId: string): Promise<void> {
    await prisma.hiddenGame.create({
      data: {
        gameId,
        userId: participantId,
      },
    });
  }

  /**
   * Unhide a game for a participant
   * @param gameId - The game's ID
   * @param participantId - The participant's ID
   * @returns true if a record was deleted, false otherwise
   */
  async unhideGame(gameId: string, participantId: string): Promise<boolean> {
    const deleted = await prisma.hiddenGame.delete({
      where: {
        gameId_userId: {
          gameId,
          userId: participantId,
        },
      },
    }).catch(() => null);

    return Boolean(deleted);
  }

  /**
   * Remove hidden flag if it exists (no error if missing)
   * @param gameId - The game's ID
   * @param participantId - The participant's ID
   */
  async unhideGameIfExists(gameId: string, participantId: string): Promise<void> {
    await prisma.hiddenGame.deleteMany({
      where: {
        gameId,
        userId: participantId,
      },
    });
  }
}

// Export a singleton instance for convenience
export const gameRepository = new GameRepository();
