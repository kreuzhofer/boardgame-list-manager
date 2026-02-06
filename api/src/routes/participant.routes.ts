import { Router, Request, Response } from 'express';
import { participantService } from '../services/participant.service';
import { resolveEventId } from '../middleware/event.middleware';

const router = Router();

/**
 * GET /api/participants
 * Returns all participants sorted by name.
 *
 * Response: { participants: Participant[] }
 *
 * Requirements: 3.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = await resolveEventId(req);
    const participants = await participantService.getAllParticipants(eventId);
    return res.json({ participants, users: participants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/participants/:id
 * Returns a single participant by ID.
 *
 * Response: { participant: Participant }
 *
 * Error responses:
 *   - 404 if participant not found
 *
 * Requirements: 3.2, 3.3
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventId = await resolveEventId(req);
    const participant = await participantService.getParticipantById(id, eventId);
    return res.json({ participant, user: participant });
  } catch (error) {
    if (error instanceof Error) {
      // Handle participant not found
      if (error.message === 'Teilnehmer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
    console.error('Error fetching participant:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * POST /api/participants
 * Creates a new participant.
 *
 * Request body: { name: string }
 * Response: { participant: Participant }
 *
 * Error responses:
 *   - 400 if name is empty or whitespace-only
 *   - 409 if name already exists
 *
 * Requirements: 3.4, 3.5, 3.6
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const eventId = await resolveEventId(req);

    // Validate required fields
    if (name === undefined || name === null || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Namen eingeben.',
        },
      });
    }

    const participant = await participantService.createParticipant(name, eventId);
    return res.status(201).json({ participant, user: participant });
  } catch (error) {
    if (error instanceof Error) {
      // Handle empty/whitespace name
      if (error.message === 'Bitte einen Namen eingeben.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle name too long
      if (error.message === 'Der Name darf maximal 30 Zeichen lang sein.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle duplicate name
      if (error.message === 'Ein Teilnehmer mit diesem Namen existiert bereits.') {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_PARTICIPANT',
            message: error.message,
          },
        });
      }
    }
    console.error('Error creating participant:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * PATCH /api/participants/:id
 * Updates a participant's name.
 *
 * Request body: { name: string }
 * Response: { participant: Participant }
 *
 * Error responses:
 *   - 400 if name is empty or whitespace-only
 *   - 404 if participant not found
 *   - 409 if name already exists for another participant
 *
 * Requirements: 3.7, 3.8, 3.9
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const eventId = await resolveEventId(req);

    // Validate required fields
    if (name === undefined || name === null || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Namen eingeben.',
        },
      });
    }

    const participant = await participantService.updateParticipant(id, name, eventId);
    return res.json({ participant, user: participant });
  } catch (error) {
    if (error instanceof Error) {
      // Handle empty/whitespace name
      if (error.message === 'Bitte einen Namen eingeben.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle name too long
      if (error.message === 'Der Name darf maximal 30 Zeichen lang sein.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle participant not found
      if (error.message === 'Teilnehmer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle duplicate name
      if (error.message === 'Ein Teilnehmer mit diesem Namen existiert bereits.') {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_PARTICIPANT',
            message: error.message,
          },
        });
      }
    }
    console.error('Error updating participant:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/participants/:id
 * Deletes a participant and cascades to Player/Bringer records.
 *
 * Response: { success: true }
 *
 * Error responses:
 *   - 404 if participant not found
 *
 * Requirements: 3.10
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventId = await resolveEventId(req);
    await participantService.deleteParticipant(id, eventId);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      // Handle participant not found
      if (error.message === 'Teilnehmer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
    console.error('Error deleting participant:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;
