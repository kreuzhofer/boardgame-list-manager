import { Router, Request, Response } from 'express';
import { gameService } from '../services/game.service';

const router = Router();

/**
 * GET /api/games
 * Returns all games with their players and bringers.
 * 
 * Response: { games: Game[] }
 * 
 * Requirements: 3.1
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const games = await gameService.getAllGames();
    return res.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/games/:id
 * Returns a single game by ID with its players and bringers.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found
 * 
 * Requirements: 3.1, 3.2 (SSE selective refresh)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGameById(id);
    
    if (!game) {
      return res.status(404).json({
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Spiel nicht gefunden.',
        },
      });
    }
    
    return res.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * POST /api/games
 * Creates a new game with the user as owner (and optionally as player and/or bringer).
 * 
 * Request body: { name: string, userId: string, isBringing: boolean, isPlaying: boolean, bggId?: number, yearPublished?: number, addedAsAlternateName?: string, alternateNames?: string[] }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if name is empty or userId is missing
 *   - 409 if game name already exists
 * 
 * Requirements: 3.1, 3.3, 3.4, 4.1, 4.3, 4.4
 * Feature: 014-alternate-names-search - Accept alternate name data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, userId, isBringing, isPlaying, bggId, yearPublished, bggRating, addedAsAlternateName, alternateNames } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Spielnamen eingeben.',
        },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Benutzer-ID erforderlich.',
        },
      });
    }

    // Validate optional BGG fields
    const validBggId = bggId !== undefined && bggId !== null ? Number(bggId) : undefined;
    const validYearPublished = yearPublished !== undefined && yearPublished !== null ? Number(yearPublished) : undefined;
    const validBggRating = bggRating !== undefined && bggRating !== null ? Number(bggRating) : undefined;
    
    // Validate alternate name fields
    const validAddedAsAlternateName = addedAsAlternateName && typeof addedAsAlternateName === 'string' ? addedAsAlternateName : undefined;
    const validAlternateNames = Array.isArray(alternateNames) ? alternateNames.filter((n): n is string => typeof n === 'string') : undefined;

    const game = await gameService.createGame(
      name,
      userId,
      Boolean(isBringing),
      Boolean(isPlaying),
      validBggId,
      validYearPublished,
      validBggRating,
      validAddedAsAlternateName,
      validAlternateNames
    );

    return res.status(201).json({ game });
  } catch (error) {
    if (error instanceof Error) {
      // Handle duplicate game name
      if (error.message === 'Ein Spiel mit diesem Namen existiert bereits.') {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_GAME',
            message: error.message,
          },
        });
      }
      // Handle validation errors
      if (error.message === 'Bitte einen Spielnamen eingeben.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }
    console.error('Error creating game:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * POST /api/games/:id/players
 * Adds a user as a player to a game.
 * 
 * Request body: { userId: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if userId is missing
 *   - 404 if game not found
 *   - 409 if user is already a player
 * 
 * Requirements: 3.5, 4.2
 */
router.post('/:id/players', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Benutzer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.addPlayer(id, userId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      // Handle game not found
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle already a player
      if (error.message === 'Du bist bereits als Mitspieler eingetragen.') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_PLAYER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error adding player:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/games/:id/players/:userId
 * Removes a user from a game's players list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or user not a player
 * 
 * Requirements: 3.5, 4.4
 */
router.delete('/:id/players/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    const game = await gameService.removePlayer(id, userId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      // Handle game not found
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle user not a player
      if (error.message === 'Du bist nicht in dieser Liste eingetragen.') {
        return res.status(404).json({
          error: {
            code: 'NOT_A_PLAYER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error removing player:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * POST /api/games/:id/bringers
 * Adds a user as a bringer to a game.
 * 
 * Request body: { userId: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if userId is missing
 *   - 404 if game not found
 *   - 409 if user is already a bringer
 * 
 * Requirements: 3.6, 4.3
 */
router.post('/:id/bringers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Benutzer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.addBringer(id, userId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      // Handle game not found
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle already a bringer
      if (error.message === 'Du bringst dieses Spiel bereits mit.') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_BRINGER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error adding bringer:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/games/:id/bringers/:userId
 * Removes a user from a game's bringers list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or user not a bringer
 * 
 * Requirements: 3.6, 4.5
 */
router.delete('/:id/bringers/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    const game = await gameService.removeBringer(id, userId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      // Handle game not found
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle user not a bringer
      if (error.message === 'Du bist nicht in dieser Liste eingetragen.') {
        return res.status(404).json({
          error: {
            code: 'NOT_A_BRINGER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error removing bringer:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/games/:id
 * Deletes a game. Only the owner can delete, and only if the game has no players or bringers.
 * 
 * Request headers: x-user-id (required)
 * Response: { success: true }
 * 
 * Error responses:
 *   - 400 if userId header is missing or game has players/bringers
 *   - 403 if user is not the owner
 *   - 404 if game not found
 * 
 * Requirements: 3.2, 3.5, 3.6, 3.7
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    // Validate required header
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Benutzer-ID erforderlich.',
        },
      });
    }

    await gameService.deleteGame(id, userId);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const errorWithCode = error as Error & { code?: string };
      
      // Handle game not found
      if (errorWithCode.code === 'GAME_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle forbidden (not owner)
      if (errorWithCode.code === 'FORBIDDEN') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
      // Handle game not empty
      if (errorWithCode.code === 'GAME_NOT_EMPTY') {
        return res.status(400).json({
          error: {
            code: 'GAME_NOT_EMPTY',
            message: error.message,
          },
        });
      }
    }
    console.error('Error deleting game:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;
