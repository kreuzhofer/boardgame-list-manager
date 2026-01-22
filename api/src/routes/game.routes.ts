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
 * POST /api/games
 * Creates a new game with the user as a player (and optionally as a bringer).
 * 
 * Request body: { name: string, userName: string, isBringing: boolean }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if name is empty
 *   - 409 if game name already exists
 * 
 * Requirements: 3.1, 3.3, 3.4
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, userName, isBringing } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Spielnamen eingeben.',
        },
      });
    }

    if (!userName || typeof userName !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Benutzernamen angeben.',
        },
      });
    }

    const game = await gameService.createGame(
      name,
      userName,
      Boolean(isBringing)
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
 * Request body: { userName: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if userName is missing
 *   - 404 if game not found
 *   - 409 if user is already a player
 * 
 * Requirements: 3.5
 */
router.post('/:id/players', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName } = req.body;

    // Validate required fields
    if (!userName || typeof userName !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Benutzernamen angeben.',
        },
      });
    }

    const game = await gameService.addPlayer(id, userName);
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
 * DELETE /api/games/:id/players/:userName
 * Removes a user from a game's players list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or user not a player
 * 
 * Requirements: 3.5
 */
router.delete('/:id/players/:userName', async (req: Request, res: Response) => {
  try {
    const { id, userName } = req.params;

    const game = await gameService.removePlayer(id, userName);
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
 * Request body: { userName: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if userName is missing
 *   - 404 if game not found
 *   - 409 if user is already a bringer
 * 
 * Requirements: 3.6
 */
router.post('/:id/bringers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName } = req.body;

    // Validate required fields
    if (!userName || typeof userName !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Benutzernamen angeben.',
        },
      });
    }

    const game = await gameService.addBringer(id, userName);
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
 * DELETE /api/games/:id/bringers/:userName
 * Removes a user from a game's bringers list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or user not a bringer
 * 
 * Requirements: 3.6
 */
router.delete('/:id/bringers/:userName', async (req: Request, res: Response) => {
  try {
    const { id, userName } = req.params;

    const game = await gameService.removeBringer(id, userName);
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

export default router;
