import { Router, Request, Response } from 'express';
import { gameService } from '../services/game.service';
import { EventService } from '../services/event.service';
import { resolveOptionalAccount } from '../middleware/auth.middleware';
import { resolveEventId } from '../middleware/event.middleware';
import { resolveParticipantId, resolveParticipantIdFromBody, resolveParticipantIdFromParams } from '../middleware/participant.middleware';
import { prisma } from '../db/prisma';

const router = Router();
const eventService = new EventService(prisma);

/**
 * GET /api/games
 * Returns all games with their players and bringers.
 * 
 * Response: { games: Game[] }
 * 
 * Requirements: 3.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = await resolveEventId(req);
    const participantId = resolveParticipantId(req);
    const games = await gameService.getAllGames(eventId, participantId);
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
    const eventId = await resolveEventId(req);
    const participantId = resolveParticipantId(req);
    const game = await gameService.getGameById(eventId, id, participantId);
    
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
 * Creates a new game with the participant as owner (and optionally as player and/or bringer).
 * 
 * Request body: { name: string, participantId: string, isBringing: boolean, isPlaying: boolean, isPrototype?: boolean, bggId?: number, yearPublished?: number, addedAsAlternateName?: string, alternateNames?: string[] }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if name is empty or participantId is missing
 *   - 409 if game name already exists
 * 
 * Requirements: 3.1, 3.3, 3.4, 4.1, 4.3, 4.4
 * Feature: 014-alternate-names-search - Accept alternate name data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, isBringing, isPlaying, isPrototype, bggId, yearPublished, bggRating, addedAsAlternateName, alternateNames } = req.body;
    const eventId = await resolveEventId(req);
    const participantId = resolveParticipantIdFromBody(req);

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Spielnamen eingeben.',
        },
      });
    }

    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    // Validate optional BGG fields
    const validBggId = bggId !== undefined && bggId !== null ? Number(bggId) : undefined;
    const validYearPublished = yearPublished !== undefined && yearPublished !== null ? Number(yearPublished) : undefined;
    const validBggRating = bggRating !== undefined && bggRating !== null ? Number(bggRating) : undefined;
    const hasBggId = validBggId !== undefined && validBggId !== null;
    const validIsPrototype = Boolean(isPrototype) && !hasBggId;
    
    // Validate alternate name fields
    const validAddedAsAlternateName = addedAsAlternateName && typeof addedAsAlternateName === 'string' ? addedAsAlternateName : undefined;
    const validAlternateNames = Array.isArray(alternateNames) ? alternateNames.filter((n): n is string => typeof n === 'string') : undefined;

    const game = await gameService.createGame(
      eventId,
      name,
      participantId,
      Boolean(isBringing),
      Boolean(isPlaying),
      validIsPrototype,
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
 * Adds a participant as a player to a game.
 * 
 * Request body: { participantId: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if participantId is missing
 *   - 404 if game not found
 *   - 409 if participant is already a player
 * 
 * Requirements: 3.5, 4.2
 */
router.post('/:id/players', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromBody(req);
    const eventId = await resolveEventId(req);

    // Validate required fields
    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.addPlayer(eventId, id, participantId);
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
 * DELETE /api/games/:id/players/:participantId
 * Removes a participant from a game's players list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or participant not a player
 * 
 * Requirements: 3.5, 4.4
 */
router.delete('/:id/players/:participantId', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromParams(req);
    const eventId = await resolveEventId(req);

    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.removePlayer(eventId, id, participantId);
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
      // Handle participant not a player
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
 * Adds a participant as a bringer to a game.
 * 
 * Request body: { participantId: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if participantId is missing
 *   - 404 if game not found
 *   - 409 if participant is already a bringer
 * 
 * Requirements: 3.6, 4.3
 */
router.post('/:id/bringers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromBody(req);
    const eventId = await resolveEventId(req);

    // Validate required fields
    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.addBringer(eventId, id, participantId);
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
 * DELETE /api/games/:id/bringers/:participantId
 * Removes a participant from a game's bringers list.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or participant not a bringer
 * 
 * Requirements: 3.6, 4.5
 */
router.delete('/:id/bringers/:participantId', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromParams(req);
    const eventId = await resolveEventId(req);

    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.removeBringer(eventId, id, participantId);
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
      // Handle participant not a bringer
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
 * POST /api/games/:id/hidden
 * Hides a game for a participant.
 * 
 * Request body: { participantId: string }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if participantId is missing or participant is a bringer
 *   - 404 if game not found
 *   - 409 if already hidden
 */
router.post('/:id/hidden', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromBody(req);
    const eventId = await resolveEventId(req);

    // Validate required fields
    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.hideGame(eventId, id, participantId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message === 'Du bringst dieses Spiel mit und kannst es nicht ausblenden.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      if (error.message === 'Spiel ist bereits ausgeblendet.') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_HIDDEN',
            message: error.message,
          },
        });
      }
    }
    console.error('Error hiding game:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/games/:id/hidden/:participantId
 * Unhides a game for a participant.
 * 
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 404 if game not found or not hidden
 */
router.delete('/:id/hidden/:participantId', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantIdFromParams(req);
    const eventId = await resolveEventId(req);

    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const game = await gameService.unhideGame(eventId, id, participantId);
    return res.json({ game });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Spiel nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message === 'Spiel ist nicht ausgeblendet.') {
        return res.status(404).json({
          error: {
            code: 'NOT_HIDDEN',
            message: error.message,
          },
        });
      }
    }
    console.error('Error unhiding game:', error);
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
 * Deletes a game. Owners can delete only if the game has no other players or bringers.
 * Event owners/admins can delete any game.
 * 
 * Request headers: x-participant-id (required)
 * Response: { success: true }
 * 
 * Error responses:
 *   - 400 if participantId header is missing or game has players/bringers
 *   - 403 if participant is not the owner
 *   - 404 if game not found
 * 
 * Requirements: 3.2, 3.5, 3.6, 3.7
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantId(req);
    const eventId = await resolveEventId(req);

    // Validate required header
    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    const account = await resolveOptionalAccount(req);
    let canForceDelete = false;

    if (account) {
      if (account.role === 'admin') {
        canForceDelete = true;
      } else {
        const event = await eventService.getEventById(eventId);
        if (event && event.ownerAccountId === account.id) {
          canForceDelete = true;
        }
      }
    }

    await gameService.deleteGame(
      eventId,
      id,
      participantId,
      canForceDelete ? { allowNonOwner: true, allowNonEmpty: true } : undefined
    );
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

/**
 * PATCH /api/games/:id/prototype
 * Toggles the prototype status of a game. Only the owner can toggle, and only for non-BGG games.
 * 
 * Request headers: x-participant-id (required)
 * Request body: { isPrototype: boolean }
 * Response: { game: Game }
 * 
 * Error responses:
 *   - 400 if isPrototype is missing or game has BGG ID
 *   - 403 if participant is not the owner
 *   - 404 if game not found
 * 
 * Requirements: 022-prototype-toggle 1.1, 1.2, 1.3, 1.5
 */
router.patch('/:id/prototype', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantId = resolveParticipantId(req);
    const { isPrototype } = req.body;
    const eventId = await resolveEventId(req);

    // Validate required header
    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Teilnehmer-ID erforderlich.',
        },
      });
    }

    // Validate request body
    if (typeof isPrototype !== 'boolean') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ungültige Anfrage.',
        },
      });
    }

    const game = await gameService.togglePrototype(eventId, id, participantId, isPrototype);
    return res.json({ game });
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
      // Handle validation error (has BGG ID)
      if (errorWithCode.code === 'VALIDATION_ERROR') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }
    console.error('Error toggling prototype status:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;
